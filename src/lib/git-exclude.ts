/**
 * Manage whydone's entries in .git/info/exclude — the LOCAL gitignore.
 *
 * Why info/exclude and not .gitignore: a committed .gitignore line
 * (".whydone/") would itself reveal the journal's existence to the team.
 * info/exclude lives inside .git/, is never committed, and hides untracked
 * paths with zero trace in any diff. That is the whole storage: local
 * guarantee (design v0.4).
 *
 * Entries live between "# whydone:start" / "# whydone:end" comment lines so
 * removal is exact and idempotent — the same marker-block idea as CLAUDE.md,
 * in hash-comment form.
 *
 * The exclude file is resolved via `git rev-parse --git-common-dir`, so all
 * worktrees of a repo share one exclusion set (info/exclude lives in the
 * common dir). Every function is a silent no-op outside a git repo — a
 * journal without git is trivially "local" already.
 *
 * Limitation by design: info/exclude only hides UNTRACKED paths. Callers must
 * check isTracked() first and refuse to "hide" something git already tracks.
 */

import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const START = '# whydone:start'
const END = '# whydone:end'
const GIT_TIMEOUT_MS = 2000

/**
 * Split file content into lines, tolerating CRLF (an editor or autocrlf may
 * have normalized info/exclude). \r is stripped during parsing and the file
 * is rewritten LF-only — exact marker matching must never silently fail on
 * line endings (v1.0 review: a CRLF file made publish no-op while flipping
 * config to committed).
 */
function splitLines(content: string): string[] {
  return content.split('\n').map((l) => (l.endsWith('\r') ? l.slice(0, -1) : l))
}

/**
 * Locate the managed block: the LAST start marker with the first end marker
 * after it. lastIndexOf defends against a stray lone END above the block,
 * which with a naive first-indexOf scan made the block invisible to reads —
 * every hide then appended a duplicate block while publish "succeeded"
 * without unhiding anything (v1.0 review, reproduced).
 */
function locateBlock(lines: string[]): { start: number; end: number } | null {
  const start = lines.lastIndexOf(START)
  if (start === -1) return null
  const end = lines.indexOf(END, start + 1)
  if (end === -1) return null
  return { start, end }
}

/** Absolute path of <common-git-dir>/info/exclude, or null outside a repo. */
export function resolveExcludePath(cwd: string): string | null {
  const res = spawnSync('git', ['rev-parse', '--git-common-dir'], {
    cwd,
    encoding: 'utf-8',
    timeout: GIT_TIMEOUT_MS,
  })
  if (res.status !== 0 || typeof res.stdout !== 'string') return null
  const gitDir = res.stdout.trim()
  if (!gitDir) return null
  return path.resolve(cwd, gitDir, 'info', 'exclude')
}

/** True when git tracks the path (committed or staged). False outside a repo. */
export function isTracked(cwd: string, relPath: string): boolean {
  const res = spawnSync('git', ['ls-files', '--error-unmatch', '--', relPath], {
    cwd,
    encoding: 'utf-8',
    timeout: GIT_TIMEOUT_MS,
  })
  return res.status === 0
}

/**
 * Convert a cwd-relative path into a repo-root-anchored gitignore pattern
 * ("/.whydone/", "/CLAUDE.md"). Anchoring matters: an unanchored "CLAUDE.md"
 * would silently hide every future untracked CLAUDE.md anywhere in the tree,
 * not just the one whydone manages. Falls back to the input outside a repo
 * (callers no-op there anyway).
 */
function rootAnchored(cwd: string, relPath: string): string {
  const res = spawnSync('git', ['rev-parse', '--show-toplevel'], {
    cwd,
    encoding: 'utf-8',
    timeout: GIT_TIMEOUT_MS,
  })
  const rawTop = res.status === 0 && typeof res.stdout === 'string' ? res.stdout.trim() : ''
  if (!rawTop) return relPath
  // Canonicalize BOTH sides, or path.relative produces a ../../-riddled
  // garbage pattern: a symlinked cwd (macOS /var → /private/var) and Windows
  // 8.3 short names (RUNNER~1 vs runneradmin — reproduced on the CI runner)
  // both diverge from git's long toplevel. realpathSync.native is the only
  // variant that expands 8.3 names on Windows.
  const canonical = (p: string): string => {
    try {
      return realpathSync.native(p)
    } catch {
      try {
        return realpathSync(p)
      } catch {
        return p
      }
    }
  }
  const rel = path
    .relative(canonical(rawTop), path.resolve(canonical(cwd), relPath))
    .split(path.sep)
    .join('/')
  return '/' + rel + (relPath.endsWith('/') ? '/' : '')
}

/** Current whydone-block lines of the exclude file ([] when absent). */
export async function readExcludedLines(cwd: string): Promise<string[]> {
  const excludePath = resolveExcludePath(cwd)
  if (excludePath === null || !existsSync(excludePath)) return []
  const lines = splitLines(await readFile(excludePath, 'utf-8'))
  const block = locateBlock(lines)
  if (block === null) return []
  return lines.slice(block.start + 1, block.end).filter((l) => l.trim() !== '')
}

async function writeBlock(cwd: string, blockLines: string[]): Promise<boolean> {
  const excludePath = resolveExcludePath(cwd)
  if (excludePath === null) return false
  let content = ''
  if (existsSync(excludePath)) {
    content = await readFile(excludePath, 'utf-8')
  }
  const lines = splitLines(content)
  const block = locateBlock(lines)
  const cut = block !== null ? [...lines.slice(0, block.start), ...lines.slice(block.end + 1)] : lines
  // Drop stray lone markers too — leaving one behind poisons every later
  // read/write (duplicate blocks, absorbed user lines).
  const kept = cut.filter((l) => l !== START && l !== END)
  while (kept.length > 0 && kept[kept.length - 1] === '') kept.pop()

  const next =
    blockLines.length === 0
      ? kept
      : [...kept, ...(kept.length > 0 ? [''] : []), START, ...blockLines, END]

  await mkdir(path.dirname(excludePath), { recursive: true })
  await writeFile(excludePath, next.join('\n') + (next.length > 0 ? '\n' : ''), 'utf-8')
  return true
}

/**
 * Ensure the given repo-relative paths are in the whydone exclude block.
 * Returns true when the exclude file was written, false outside a git repo.
 */
export async function ensureExcluded(cwd: string, relPaths: string[]): Promise<boolean> {
  const current = await readExcludedLines(cwd)
  const merged = [...current]
  for (const p of relPaths.map((r) => rootAnchored(cwd, r))) {
    if (!merged.includes(p)) merged.push(p)
  }
  return writeBlock(cwd, merged)
}

/**
 * Remove the given paths from the whydone exclude block (drops the whole
 * block when it empties). Silent no-op outside a repo or without a block.
 */
export async function removeExcluded(cwd: string, relPaths: string[]): Promise<boolean> {
  const current = await readExcludedLines(cwd)
  if (current.length === 0) return false
  // Match both the anchored and raw spellings: a transient git failure during
  // a past ensureExcluded may have written an unanchored pattern, and publish
  // must still be able to remove it.
  const targets = new Set([...relPaths, ...relPaths.map((r) => rootAnchored(cwd, r))])
  const remaining = current.filter((l) => !targets.has(l))
  if (remaining.length === current.length) return false
  return writeBlock(cwd, remaining)
}

/**
 * Roots of OTHER worktrees of this repo whose journal is storage: local.
 * publish / uninstall --purge must not drop the shared exclude pattern while
 * a sibling worktree still depends on it (the exclude file lives in the
 * common git dir — one line hides .whydone/ in every worktree).
 */
export function listOtherLocalWorktrees(cwd: string): string[] {
  const res = spawnSync('git', ['worktree', 'list', '--porcelain'], {
    cwd,
    encoding: 'utf-8',
    timeout: GIT_TIMEOUT_MS,
  })
  if (res.status !== 0 || typeof res.stdout !== 'string') return []
  const topRes = spawnSync('git', ['rev-parse', '--show-toplevel'], {
    cwd,
    encoding: 'utf-8',
    timeout: GIT_TIMEOUT_MS,
  })
  const currentTop = topRes.status === 0 ? topRes.stdout.trim() : ''
  const out: string[] = []
  for (const line of res.stdout.split('\n')) {
    if (!line.startsWith('worktree ')) continue
    const root = line.slice('worktree '.length).trim()
    if (!root || root === currentTop) continue
    try {
      const raw = readFileSync(path.join(root, '.whydone', 'config.json'), 'utf-8')
      const parsed: unknown = JSON.parse(raw)
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        (parsed as Record<string, unknown>).storage === 'local'
      ) {
        out.push(root)
      }
    } catch {
      // absent or unreadable — not a local journal
    }
  }
  return out
}
