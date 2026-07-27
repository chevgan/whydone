/**
 * whydone hook stop — the Stop-hook subcommand (design §3.4).
 *
 * Global contract: the process ALWAYS exits 0 and prints nothing, except the
 * single success path that prints the block JSON (still exit 0). The entire
 * run body is wrapped in try/catch ⇒ silent exit 0. Every git spawn carries
 * its own 2 s timeout — a slow command degrades that one signal instead of
 * eating the 10 s budget and killing the nudge invisibly.
 *
 * Injection containment (§3.7): the block reason is delivered to Claude as
 * its next instruction, so nothing repo-derived is interpolated into it.
 * The summary is built from TWO INTEGERS and fixed literals only — no commit
 * subjects (%s is never fetched), no filenames, no slugs.
 */

import { defineCommand } from 'citty'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import { JOURNAL_DIR } from '../lib/constants.js'
import { readConfig, type WhydoneMode } from '../lib/config.js'
import { EXCLUDED_BASENAMES } from '../lib/glob-entries.js'

/** Handshake prefix — the /log skill description names this exact string. */
export const NUDGE_PREFIX = 'whydone: unlogged work detected'

const GIT_TIMEOUT_MS = 2000
const STDIN_TIMEOUT_MS = 5000
const MAX_COMMITS = 20
/** Upper bound on each `git log --since` spawn — keeps %h output far under spawnSync's 1 MB maxBuffer. */
const LOG_COMMIT_CAP = 500
const CACHE_DIR_BASENAME = '.cache'
const STATE_BASENAME = 'hook-state.json'

/** The <summary>: two integers + fixed literals ONLY (§3.7). */
export function buildSummary(commitCount: number, dirtyCount: number): string {
  return `${commitCount} unlogged commit(s) and ${dirtyCount} changed file(s) since the last journal entry`
}

/** REASON_ASK (§3.7, exact). */
export function buildReasonAsk(summary: string): string {
  return (
    `${NUDGE_PREFIX} — ${summary}. Journal mode is "ask".\n` +
    'Invoke the "log" skill now (Skill tool). Follow it exactly: draft the entry, show the user\n' +
    "the byte-exact preview, and ask the standard confirm question in the user's language —\n" +
    'never write without their explicit confirmation. If the user declines, accept that and do\n' +
    'not offer again this session. If the remaining work is trivial or purely conversational,\n' +
    'you may instead tell the user in one line that nothing seems worth logging.'
  )
}

/** REASON_AUTO (§3.7, exact). */
export function buildReasonAuto(summary: string): string {
  return (
    `${NUDGE_PREFIX} — ${summary}. Journal mode is "auto" (user-configured in\n` +
    '.whydone/config.json). Invoke the "log" skill now (Skill tool). Auto mode per the skill\'s\n' +
    'STEP 7: print the full preview for visibility, then write the entry and update the index\n' +
    "WITHOUT asking for confirmation — unless the skill's own ambiguity rules force a question."
  )
}

/** Parsed subset of the Stop-hook stdin JSON. */
export interface StopHookInput {
  sessionId: string
  stopHookActive: boolean
}

/** A dirty journal entry file seen in git status (feeds the anchor). */
export interface DirtyEntry {
  path: string
  mtimeSec: number
}

/**
 * Git facts gathered by the impure layer (or injected by tests).
 * listCommitsSince returns %h hashes of commits since the given epoch second
 * (+1 s applied by the caller of git), EXCLUDING commits that touch any
 * .whydone/ file (self-covering-commit exclusion), capped at 20; empty on
 * unborn HEAD.
 */
export interface GitFacts {
  /** HEAD sha, or null on unborn HEAD */
  headSha: string | null
  /** epoch seconds of the last commit touching .whydone/; 0 = never committed */
  journalCommitTime: number
  /** porcelain status lines NOT under .whydone/ (the work signal) */
  dirty: string[]
  /** dirty journal entry files — max mtime advances the anchor */
  dirtyEntries: DirtyEntry[]
  /** true when git status timed out — dirty arrays are empty, commit signal remains */
  statusTimedOut: boolean
  listCommitsSince: (epochSec: number) => string[]
}

/** Debounce state file shape (§3.5). */
export interface HookState {
  stateVersion: number
  lastNudge?: {
    sessionId: string
    fingerprint: string
    at: string
  }
}

/** Everything decideStop needs — injected, so the decision core is pure. */
export interface StopContext {
  mode: WhydoneMode
  journalDirExists: boolean
  entryCount: number
  git: GitFacts | null
  state: HookState | null
  now: Date
}

export type StopDecision =
  | { block: false }
  | { block: true; reason: string; newState: HookState }

/** sha256(HEAD-sha or 'unborn' + '\n' + sorted dirty lines).slice(0,16) (§3.4 step 9). */
export function buildFingerprint(headSha: string | null, dirty: string[]): string {
  const material = (headSha ?? 'unborn') + '\n' + [...dirty].sort().join('\n')
  return createHash('sha256').update(material).digest('hex').slice(0, 16)
}

/**
 * The decision core — pure function of input + context (§3.4 algorithm).
 * Every guard failure ⇒ allow-stop ({ block: false }).
 */
export function decideStop(input: StopHookInput, ctx: StopContext): StopDecision {
  // 2. Loop guard.
  if (input.stopHookActive) return { block: false }
  // 4. Journal check.
  if (!ctx.journalDirExists) return { block: false }
  // 5. Mode — manual (including absent/broken config) is the silence guarantee.
  if (ctx.mode === 'manual') return { block: false }
  // 6. Git guard.
  if (ctx.git === null) return { block: false }
  // 7. Cold-journal guard: a journal nobody has ever written to does not nudge.
  if (ctx.entryCount === 0) return { block: false }

  // 7. Anchor — deliberately NOT plain max-mtime (git does not preserve mtime;
  // a fresh clone must still nudge). Clone-stable journal commit time, advanced
  // by the mtime of any uncommitted/modified entry (the just-/log-ged case).
  const uncommittedEntryMtime = ctx.git.dirtyEntries.reduce(
    (max, e) => Math.max(max, e.mtimeSec),
    0,
  )
  const anchor = Math.max(ctx.git.journalCommitTime, uncommittedEntryMtime)

  // 8. Work signal.
  const commits = ctx.git.listCommitsSince(anchor)
  const dirty = ctx.git.dirty
  if (commits.length === 0 && dirty.length === 0) return { block: false }

  // 9. Debounce: once per session AND once per work-fingerprint.
  const fingerprint = buildFingerprint(ctx.git.headSha, dirty)
  const last = ctx.state?.lastNudge
  if (last !== undefined && (last.sessionId === input.sessionId || last.fingerprint === fingerprint)) {
    return { block: false }
  }

  // 10. Nudge.
  const summary = buildSummary(commits.length, dirty.length)
  const reason = ctx.mode === 'auto' ? buildReasonAuto(summary) : buildReasonAsk(summary)
  return {
    block: true,
    reason,
    newState: {
      stateVersion: 1,
      lastNudge: {
        sessionId: input.sessionId,
        fingerprint,
        at: ctx.now.toISOString(),
      },
    },
  }
}

/** IO seams for applyDecision — spy-able in tests to pin write-first ordering. */
export interface DecisionIO {
  writeState: (state: HookState) => void
  emit: (line: string) => void
}

/**
 * Record state FIRST, then nudge (§3.4 step 10): a crash after the state write
 * costs one lost nudge, never a loop. writeState throwing ⇒ nudge skipped
 * entirely (the caller's catch turns it into a silent allow).
 */
export function applyDecision(decision: StopDecision, io: DecisionIO): void {
  if (!decision.block) return
  io.writeState(decision.newState)
  io.emit(JSON.stringify({ decision: 'block', reason: decision.reason }))
}

// ---------------------------------------------------------------------------
// Impure gathering layer
// ---------------------------------------------------------------------------

interface GitRun {
  ok: boolean
  stdout: string
  timedOut: boolean
}

function runGit(projectDir: string, gitArgs: string[]): GitRun {
  try {
    const r = spawnSync('git', ['-C', projectDir, ...gitArgs], {
      timeout: GIT_TIMEOUT_MS,
      encoding: 'utf8',
    })
    const timedOut =
      r.error !== undefined &&
      (r.error as NodeJS.ErrnoException).code === 'ETIMEDOUT'
    return { ok: r.error === undefined && r.status === 0, stdout: r.stdout ?? '', timedOut }
  } catch {
    return { ok: false, stdout: '', timedOut: false }
  }
}

function isEntryBasename(basename: string): boolean {
  return basename.endsWith('.md') && !EXCLUDED_BASENAMES.has(basename)
}

/** Count journal entries: *.md minus INDEX.md/manifest.json (cold-journal guard). */
function countEntries(journalDir: string): number {
  try {
    return readdirSync(journalDir).filter((f) => isEntryBasename(f)).length
  } catch {
    return 0
  }
}

/** Extract the path from a `git status --porcelain` line (rename ⇒ new path). */
function porcelainPath(line: string): string {
  const raw = line.slice(3)
  const arrow = raw.indexOf(' -> ')
  return arrow === -1 ? raw : raw.slice(arrow + 4)
}

/** Stat every entry file directly — the anchor source when git can't see them. */
function statJournalEntries(projectDir: string): DirtyEntry[] {
  const out: DirtyEntry[] = []
  try {
    for (const f of readdirSync(path.join(projectDir, JOURNAL_DIR))) {
      if (!isEntryBasename(f)) continue
      const st = statSync(path.join(projectDir, JOURNAL_DIR, f))
      out.push({ path: JOURNAL_DIR + '/' + f, mtimeSec: Math.floor(st.mtimeMs / 1000) })
    }
  } catch {
    // Unreadable journal dir — no mtime to contribute.
  }
  return out
}

function gatherGitFacts(projectDir: string): GitFacts | null {
  const inside = runGit(projectDir, ['rev-parse', '--is-inside-work-tree'])
  if (!inside.ok || inside.stdout.trim() !== 'true') return null

  const head = runGit(projectDir, ['rev-parse', 'HEAD'])
  const headSha: string | null = head.ok ? head.stdout.trim() : null

  const journalLog = runGit(projectDir, ['log', '-1', '--format=%ct', '--', JOURNAL_DIR])
  const journalCommitTime = journalLog.ok ? parseInt(journalLog.stdout.trim(), 10) || 0 : 0

  // core.quotepath=off: non-ASCII paths arrive raw instead of C-quoted
  // ('".whydone/\321…"'), so the journal-side prefix check below stays sound.
  const status = runGit(projectDir, [
    '-c', 'core.quotepath=off',
    'status', '--porcelain', '--untracked-files=normal',
  ])
  const dirty: string[] = []
  const dirtyEntries: DirtyEntry[] = []
  if (status.ok) {
    for (const line of status.stdout.split('\n')) {
      if (line.trim() === '') continue
      const filePath = porcelainPath(line)
      if (filePath === JOURNAL_DIR + '/' || filePath === JOURNAL_DIR) {
        // Entirely-untracked journal: --untracked-files=normal collapses it to
        // a single '?? .whydone/' line, hiding the entry files. Stat them
        // directly so the anchor still covers a just-/log-ged, never-committed
        // entry (§3.4 step 7) — otherwise anchor stays 0 and the whole repo
        // history counts as unlogged (false nudge right after the first /log).
        dirtyEntries.push(...statJournalEntries(projectDir))
      } else if (filePath.startsWith(JOURNAL_DIR + '/')) {
        // Journal-side line: entry files feed the anchor; generated files
        // (INDEX.md, manifest.json, .cache/) are never a work signal.
        if (isEntryBasename(path.posix.basename(filePath))) {
          try {
            const st = statSync(path.join(projectDir, filePath))
            dirtyEntries.push({ path: filePath, mtimeSec: Math.floor(st.mtimeMs / 1000) })
          } catch {
            // Deleted/unstattable entry — no mtime to contribute.
          }
        }
      } else {
        dirty.push(line)
      }
    }
  }

  // storage: local (v1.0.1) — an excluded journal produces NO porcelain line
  // at all (git ignores it by design), so neither branch above ran and the
  // anchor would stay 0: every pre-journal commit counts as unlogged, capped
  // at MAX_COMMITS (reproduced in the first field test as a false "20
  // unlogged commit(s)" nudge right after /log). When the journal has never
  // been committed AND contributed no status lines, stat the entries
  // directly. A fresh CLONE is unaffected (journalCommitTime > 0 there), so
  // the deliberate clone-must-nudge behavior of the mtime-free design holds.
  if (status.ok && journalCommitTime === 0 && dirtyEntries.length === 0) {
    dirtyEntries.push(...statJournalEntries(projectDir))
  }

  const listCommitsSince = (epochSec: number): string[] => {
    if (headSha === null) return [] // unborn HEAD — skip entirely
    const sinceIso = new Date((epochSec + 1) * 1000).toISOString()
    // -n cap: anchor=0 (journal never committed) would otherwise list the
    // entire history — past ~100k commits the %h output exceeds spawnSync's
    // 1 MB maxBuffer and the commit signal silently dies fail-open. The cap
    // is sound for the set difference: any journal commit within the newest
    // LOG_COMMIT_CAP overall is within the newest LOG_COMMIT_CAP journal ones.
    const cap = `-n${LOG_COMMIT_CAP}`
    const all = runGit(projectDir, ['log', cap, `--since=${sinceIso}`, '--format=%h'])
    if (!all.ok) return []
    const journal = runGit(projectDir, ['log', cap, `--since=${sinceIso}`, '--format=%h', '--', JOURNAL_DIR])
    const journalSet = new Set(
      journal.ok ? journal.stdout.split('\n').filter((l) => l.trim() !== '') : [],
    )
    return all.stdout
      .split('\n')
      .map((l) => l.trim())
      .filter((h) => h !== '' && !journalSet.has(h))
      .slice(0, MAX_COMMITS)
  }

  return {
    headSha,
    journalCommitTime,
    dirty,
    dirtyEntries,
    statusTimedOut: status.timedOut,
    listCommitsSince,
  }
}

function readStateFile(projectDir: string): HookState | null {
  try {
    const raw = readFileSync(
      path.join(projectDir, JOURNAL_DIR, CACHE_DIR_BASENAME, STATE_BASENAME),
      'utf8',
    )
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null
    return parsed as HookState
  } catch {
    return null // lenient read — broken ⇒ treated as absent
  }
}

function writeStateFile(projectDir: string, state: HookState): void {
  const cacheDir = path.join(projectDir, JOURNAL_DIR, CACHE_DIR_BASENAME)
  mkdirSync(cacheDir, { recursive: true })
  try {
    // Self-gitignoring cache dir — create-only, in case init didn't.
    writeFileSync(path.join(cacheDir, '.gitignore'), '*\n', { encoding: 'utf8', flag: 'wx' })
  } catch {
    // EEXIST (normal) or unwritable — either way, proceed to the state write.
  }
  writeFileSync(path.join(cacheDir, STATE_BASENAME), JSON.stringify(state, null, 2), 'utf8')
}

/** Read stdin fully with a self-timeout (§3.4 step 1). */
function readStdin(timeoutMs: number): Promise<string> {
  return new Promise((resolve) => {
    let data = ''
    const timer = setTimeout(() => resolve(data), timeoutMs)
    timer.unref?.()
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', (chunk: string) => {
      data += chunk
    })
    process.stdin.on('end', () => {
      clearTimeout(timer)
      resolve(data)
    })
    process.stdin.on('error', () => {
      clearTimeout(timer)
      resolve(data)
    })
  })
}

async function runStop(): Promise<void> {
  // 1. Read stdin fully; empty/invalid ⇒ silent allow.
  const raw = await readStdin(STDIN_TIMEOUT_MS)
  if (raw.trim() === '') return
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return
  }
  if (typeof parsed !== 'object' || parsed === null) return
  const obj = parsed as Record<string, unknown>
  const input: StopHookInput = {
    sessionId: typeof obj.session_id === 'string' ? obj.session_id : '',
    // Defensive read: field missing ⇒ not active (§3.4 step 2).
    stopHookActive: obj.stop_hook_active === true,
  }

  // 3. Resolve project dir (launcher already spawned us with cwd=projectDir).
  const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd()
  const journalDir = path.join(projectDir, JOURNAL_DIR)

  // 4. Journal check — makes a global hook safe in every repo.
  const journalDirExists = existsSync(journalDir)
  if (!journalDirExists) return

  // 5. Mode — manual (incl. absent/broken config) ⇒ silent.
  const { mode } = await readConfig(journalDir)
  if (mode === 'manual') return

  const ctx: StopContext = {
    mode,
    journalDirExists,
    entryCount: countEntries(journalDir),
    git: gatherGitFacts(projectDir),
    state: readStateFile(projectDir),
    now: new Date(),
  }

  const decision = decideStop(input, ctx)
  applyDecision(decision, {
    writeState: (state) => writeStateFile(projectDir, state),
    emit: (line) => writeFileSync(1, line + '\n'),
  })
}

export default defineCommand({
  meta: {
    name: 'stop',
    description: 'Internal: Claude Code Stop-hook handler (reads hook JSON on stdin)',
  },
  async run() {
    try {
      await runStop()
    } catch (err) {
      if (process.env.WHYDONE_HOOK_DEBUG === '1') {
        try {
          process.stderr.write(String(err) + '\n')
        } catch {
          // even debug output must never break the fail-open contract
        }
      }
    }
    // The process ALWAYS exits 0 — a hook failure can never block the user.
    process.exit(0)
  },
})
