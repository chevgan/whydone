/**
 * whydone recall subcommand
 *
 * Deterministic smart recall: ranks a FRESH in-memory glob of .whydone
 * entries via the pure ranker in src/lib/rank-entries.ts. Never reads or
 * writes INDEX.md or manifest.json — stale index is impossible by
 * construction (04-DESIGN.md §1.4, §5). Never writes anything at all;
 * --dry-run is a no-op alias kept for flag parity with siblings.
 *
 * Body keyword scanning and open-follow-up counting happen inside this
 * process at zero context cost — the /recall skill only ever sees the
 * capped metadata output (RECALL-02).
 *
 * Exit 0 always except path traversal (exit 1, same message as index).
 */

import { defineCommand } from 'citty'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { JOURNAL_DIR } from '../lib/constants.js'
import { globEntries } from '../lib/glob-entries.js'
import { safeMatter } from '../lib/parse-entry.js'
import { buildManifestEntries } from './build-index.js'
import {
  countOpenFollowUps,
  normalizePath,
  rankEntries,
  resolveLimit,
  tokenizeQuery,
  type RecallCandidate,
  type RecallQuery,
  type ScoredEntry,
} from '../lib/rank-entries.js'

// ─── Exported types ───────────────────────────────────────────────────────────

/**
 * A single result row in the recall report (--json `results[]` shape).
 */
export interface RecallResultItem {
  id: string
  file: string
  date: string
  task: string
  status: string
  tags: string[]
  files: string[]
  score: number
  components: { files: number; tags: number; keywords: number; recency: number }
  superseded: boolean
  supersededBy: string[]
  hasVerifyLater: boolean
  openFollowUps: number
}

/**
 * Aggregate recall report — serialized verbatim by --json.
 */
export interface RecallReport {
  total: number
  eligible: number
  returned: number
  query: { terms: string[]; files: string[]; tags: string[] }
  results: RecallResultItem[]
  parseErrors: string[]
}

/** Options for executeRecall() after flag parsing. */
export interface RecallOptions {
  query?: string
  files: string[]
  tags: string[]
  limit: number
}

// ─── Flag merge helper (exported for testability) ────────────────────────────

/**
 * Collect every occurrence of a repeated `--name value` / `--name=value`
 * flag from rawArgs. citty 0.2.x wraps node:util parseArgs WITHOUT
 * multiple:true, so repeated string flags are last-wins in `args` — the
 * documented repeatable semantics (04-DESIGN.md §1.4) require scanning
 * rawArgs ourselves. Returns [] when rawArgs is unavailable (callers
 * then fall back to the parsed single value).
 */
export function collectRepeatedFlag(rawArgs: readonly string[] | undefined, name: string): string[] {
  if (!rawArgs) return []
  const values: string[] = []
  const eq = `--${name}=`

  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i]
    if (arg === `--${name}`) {
      const next = rawArgs[i + 1]
      if (next !== undefined && !next.startsWith('--')) {
        values.push(next)
        i++
      }
    } else if (arg.startsWith(eq)) {
      values.push(arg.slice(eq.length))
    }
  }

  return values
}

/**
 * Merge a repeatable CSV flag: each occurrence may itself be a
 * comma-separated list; all values are split on commas, transformed
 * (normalize/lowercase), unioned, and deduped (04-DESIGN.md §1.4).
 *
 * Occurrences come from collectRepeatedFlag() (string[]) or from the
 * citty-parsed single value (string) — both are handled.
 */
export function mergeCsvFlag(raw: unknown, transform: (s: string) => string): string[] {
  const occurrences = Array.isArray(raw) ? raw : raw === undefined || raw === null ? [] : [raw]
  const seen = new Set<string>()
  const merged: string[] = []

  for (const occurrence of occurrences) {
    for (const piece of String(occurrence).split(',')) {
      const value = transform(piece.trim())
      if (!value || seen.has(value)) continue
      seen.add(value)
      merged.push(value)
    }
  }

  return merged
}

// ─── Core flow (exported for integration tests) ──────────────────────────────

/**
 * Full recall pipeline: fresh glob → buildManifestEntries (in-memory,
 * _supersededBy computed) → read bodies of non-parse-error entries
 * (keyword scan + openFollowUps counted here, never in context) →
 * rankEntries → report. Never writes anything.
 */
export async function executeRecall(
  changelogDir: string,
  opts: RecallOptions,
): Promise<RecallReport> {
  const entries = await globEntries(changelogDir)
  const manifestEntries = buildManifestEntries(entries)

  // Map computed manifest id → absolute source file. Key derivation must
  // mirror toManifestEntry exactly (String-coerced id ?? _stem) so entries
  // with non-string frontmatter ids still resolve to their bodies.
  const idToFile = new Map<string, string>()
  for (const e of entries) {
    idToFile.set(String((e.id as string | undefined) ?? e._stem), e._file)
  }

  const parseErrors = manifestEntries.filter((me) => me._parseError).map((me) => me.id)

  const candidates: RecallCandidate[] = await Promise.all(
    manifestEntries
      .filter((me) => !me._parseError)
      .map(async (me) => {
        const file = idToFile.get(me.id)
        let body = ''
        if (file) {
          const raw = await readFile(file, 'utf-8')
          try {
            // safeMatter: the same engine lockdown as parseEntry — a body read
            // must never reopen the eval() path parseEntry just refused.
            body = safeMatter(raw).content
          } catch {
            body = raw
          }
        }
        return { ...me, body, openFollowUps: countOpenFollowUps(body) }
      }),
  )

  const query: RecallQuery = {
    terms: opts.query ? tokenizeQuery(opts.query) : [],
    files: opts.files,
    tags: opts.tags,
  }

  // The gate keys off flags GIVEN, not processed terms: a --query of pure
  // stopwords must yield eligible 0 (so the skill discloses its fallback),
  // never a silent recency-only ranking presented as query matches.
  const hasFilters =
    (opts.query !== undefined && opts.query.trim() !== '') ||
    opts.files.length > 0 ||
    opts.tags.length > 0

  const { eligible, results } = rankEntries(candidates, query, opts.limit, hasFilters)

  return {
    // total counts EVERY entry file including parse errors — total: 0 must
    // mean "journal truly empty", not "journal fully corrupted" (the /recall
    // skill routes total == 0 to "no entries yet").
    total: manifestEntries.length,
    eligible,
    returned: results.length,
    query,
    results: results.map((s) => toResultItem(s, idToFile)),
    parseErrors,
  }
}

/** Convert a ScoredEntry to the public result row shape. */
function toResultItem(s: ScoredEntry, idToFile: Map<string, string>): RecallResultItem {
  const e = s.entry
  const absFile = idToFile.get(e.id)
  const relFile = absFile ? path.relative(process.cwd(), absFile) : ''

  return {
    id: e.id,
    file: relFile,
    date: e.date,
    task: e.task,
    status: e.status,
    tags: e.tags,
    files: e.files,
    score: s.score,
    components: s.components,
    superseded: e._supersededBy.length > 0,
    supersededBy: e._supersededBy,
    hasVerifyLater: e.openFollowUps > 0,
    openFollowUps: e.openFollowUps,
  }
}

// ─── citty subcommand ─────────────────────────────────────────────────────────

export default defineCommand({
  meta: {
    name: 'recall',
    description: 'Rank .whydone entries against a query — deterministic, read-only, no LLM',
  },
  args: {
    path: {
      type: 'positional',
      description: 'Path to the .whydone directory (default: .whydone)',
      required: false,
      default: JOURNAL_DIR,
    },
    query: {
      type: 'string',
      description: 'Free-text query (tokenized: lowercase, stopwords dropped)',
    },
    files: {
      type: 'string',
      description: 'File paths to match (repeatable; each value may be a comma-separated list)',
    },
    tags: {
      type: 'string',
      description: 'Tags to match (repeatable; comma-separated; lowercased)',
    },
    limit: {
      type: 'string',
      description: 'Maximum results to return (default 5, clamped 1..20)',
      default: '5',
    },
    all: {
      type: 'boolean',
      description: 'Return all eligible results (no limit)',
      default: false,
    },
    json: {
      type: 'boolean',
      description: 'Output the full recall report as JSON',
      default: false,
    },
    quiet: {
      type: 'boolean',
      description: 'Suppress non-error output',
      default: false,
    },
    'no-color': {
      type: 'boolean',
      description: 'Disable ANSI color output',
      default: false,
    },
    'dry-run': {
      type: 'boolean',
      description: 'No-op alias — recall never writes anything',
      default: false,
    },
  },

  async run({ args, rawArgs }) {
    const changelogDir = path.resolve(process.cwd(), args.path ?? JOURNAL_DIR)

    // Path traversal guard — same message as index (T-02-11)
    const projectRoot = process.cwd()
    if (changelogDir !== projectRoot && !changelogDir.startsWith(projectRoot + path.sep)) {
      process.stderr.write(
        `error: path traversal detected — resolved changelogDir is outside project root\n`,
      )
      process.exit(1)
    }

    // Repeated flags come from rawArgs (citty's parsed args are last-wins);
    // fall back to the parsed value when rawArgs is unavailable (tests).
    const filesOccurrences = collectRepeatedFlag(rawArgs, 'files')
    const tagsOccurrences = collectRepeatedFlag(rawArgs, 'tags')

    const report = await executeRecall(changelogDir, {
      query: typeof args.query === 'string' ? args.query : undefined,
      files: mergeCsvFlag(filesOccurrences.length > 0 ? filesOccurrences : args.files, normalizePath),
      tags: mergeCsvFlag(tagsOccurrences.length > 0 ? tagsOccurrences : args.tags, (s) =>
        s.toLowerCase(),
      ),
      limit: resolveLimit(args.limit, args.all === true),
    })

    // ---- JSON output ----
    if (args.json) {
      process.stdout.write(JSON.stringify(report, null, 2) + '\n')
      return
    }

    // ---- Plain output ----
    if (report.total === 0 && report.parseErrors.length === 0) {
      process.stderr.write(`No entries found in ${path.relative(process.cwd(), changelogDir)}\n`)
      return
    }

    if (!args.quiet) {
      report.results.forEach((r, i) => {
        const supersededNote = r.superseded ? `  (superseded->${r.supersededBy.join(',')})` : ''
        const followUpsNote =
          r.openFollowUps > 0
            ? `  (${r.openFollowUps} open follow-up${r.openFollowUps === 1 ? '' : 's'})`
            : ''
        process.stdout.write(
          `${i + 1}. ${r.file}  ${r.score}  [${r.status}]  ${r.task}${supersededNote}${followUpsNote}\n`,
        )
      })
      process.stdout.write(
        `${report.returned}/${report.eligible} of ${report.total}; ${report.parseErrors.length} unreadable\n`,
      )
    }
  },
})
