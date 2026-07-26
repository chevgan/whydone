/**
 * whydone validate subcommand
 *
 * Strict schema validation for .whydone entries. CI-safe: exits non-zero
 * when any BLOCK error is found. No LLM or network calls (D-14).
 *
 * strictCheck() is a pure function — no filesystem access inside it.
 * The existingIds set is passed in by the caller (run()) which builds it
 * from globEntries() output. _scalarFields is read from the upstream ParsedEntry
 * produced by parseEntry() in plan 02-02 — validate does not re-read raw files
 * or modify parse-entry.ts.
 *
 * BLOCK checks (non-zero exit on any):
 *   PARSE_ERROR, MISSING_FIELD (schema/id/date/slug/task), WRONG_SCHEMA,
 *   BAD_DATE, BAD_SLUG, ID_STEM_MISMATCH, SLUG_MISMATCH, BAD_STATUS, BAD_TYPE
 *
 * WARNING checks (zero exit unless future --strict flag):
 *   SUPERSEDES_MISSING
 *
 * Security (T-02-14): path traversal guard on --path argument.
 */

import { defineCommand } from 'citty'
import path from 'node:path'
import pc from 'picocolors'

import { JOURNAL_DIR } from '../lib/constants.js'
import { globEntries } from '../lib/glob-entries.js'
import type { ParsedEntry, ValidationResult, ValidationIssue } from '../types.js'

// ─── Exported types ───────────────────────────────────────────────────────────

/**
 * Aggregate report returned by the validate command.
 * Used for --json output and testability.
 */
export interface ValidationReport {
  results: ValidationResult[]
  totalErrors: number
  totalWarnings: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_STATUSES = new Set(['done', 'wip', 'blocked'])
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const SLUG_RE = /^[a-z0-9-]+$/

// ─── Pure strict-check function ───────────────────────────────────────────────

/**
 * Strict schema check for a single parsed entry.
 *
 * Pure function — no filesystem access. The caller passes:
 *   - entry: ParsedEntry from parseEntry() (upstream plan 02-02)
 *   - stem: the filename stem (without .md)
 *   - existingIds: Set of all entry stems in the changelog dir
 *
 * Returns { errors, warnings } where:
 *   - errors cause a non-zero exit code
 *   - warnings are informational (zero exit)
 */
export function strictCheck(
  entry: ParsedEntry,
  stem: string,
  existingIds: Set<string>,
): { errors: ValidationIssue[]; warnings: ValidationIssue[] } {
  const errors: ValidationIssue[] = []
  const warnings: ValidationIssue[] = []

  // BLOCK: PARSE_ERROR — early return; no other checks make sense
  if (entry._parseError) {
    errors.push({
      code: 'PARSE_ERROR',
      message: `YAML parse error in ${entry._file} — fix frontmatter syntax`,
    })
    return { errors, warnings }
  }

  // BLOCK: MISSING_FIELD — schema
  if (entry.schema === undefined || entry.schema === null) {
    errors.push({
      code: 'MISSING_FIELD',
      field: 'schema',
      message: 'Required field "schema" is missing',
    })
  } else {
    // BLOCK: WRONG_SCHEMA — only check value when field is present
    if (entry.schema !== 1) {
      errors.push({
        code: 'WRONG_SCHEMA',
        field: 'schema',
        message: `schema must be 1, got ${entry.schema}`,
      })
    }
  }

  // BLOCK: MISSING_FIELD — id
  if (!entry.id) {
    errors.push({
      code: 'MISSING_FIELD',
      field: 'id',
      message: 'Required field "id" is missing',
    })
  } else {
    // BLOCK: ID_STEM_MISMATCH — id must equal filename stem
    if (entry.id !== stem) {
      errors.push({
        code: 'ID_STEM_MISMATCH',
        field: 'id',
        message: `id "${entry.id}" does not match filename stem "${stem}"`,
      })
    }
  }

  // BLOCK: MISSING_FIELD — date
  if (!entry.date) {
    errors.push({
      code: 'MISSING_FIELD',
      field: 'date',
      message: 'Required field "date" is missing',
    })
  } else {
    // BLOCK: BAD_DATE — must match YYYY-MM-DD
    if (!DATE_RE.test(entry.date)) {
      errors.push({
        code: 'BAD_DATE',
        field: 'date',
        message: `date "${entry.date}" must be in YYYY-MM-DD format`,
      })
    }
  }

  // BLOCK: MISSING_FIELD — slug
  if (!entry.slug) {
    errors.push({
      code: 'MISSING_FIELD',
      field: 'slug',
      message: 'Required field "slug" is missing',
    })
  } else {
    // BLOCK: BAD_SLUG — must be ASCII kebab-case [a-z0-9-]+
    if (!SLUG_RE.test(entry.slug)) {
      errors.push({
        code: 'BAD_SLUG',
        field: 'slug',
        message: `slug "${entry.slug}" must match /^[a-z0-9-]+$/`,
      })
    }

    // BLOCK: SLUG_MISMATCH — slug must equal id.slice(9) (YYYYMMDD- prefix is 9 chars)
    // Only check when id is present AND a string: parseEntry normalizes id, but
    // strictCheck is also fed hand-built entries (tests, future callers) and a
    // validator must never crash on the malformed input it exists to report.
    if (typeof entry.id === 'string' && entry.id) {
      const expectedSlug = entry.id.slice(9)
      if (entry.slug !== expectedSlug) {
        errors.push({
          code: 'SLUG_MISMATCH',
          field: 'slug',
          message: `slug "${entry.slug}" does not match id.slice(9) "${expectedSlug}"`,
        })
      }
    }
  }

  // BLOCK: MISSING_FIELD — task
  if (!entry.task) {
    errors.push({
      code: 'MISSING_FIELD',
      field: 'task',
      message: 'Required field "task" is missing',
    })
  }

  // BLOCK: BAD_STATUS — when present, must be one of done | wip | blocked
  if (entry.status !== undefined && entry.status !== null && entry.status !== '') {
    if (!VALID_STATUSES.has(entry.status as string)) {
      errors.push({
        code: 'BAD_STATUS',
        field: 'status',
        message: `status "${entry.status}" is not in enum [done, wip, blocked]`,
      })
    }
  }

  // BLOCK: BAD_TYPE — tags written as bare scalar (detected via _scalarFields from parseEntry)
  // validate reads _scalarFields as-is from the ParsedEntry — it does NOT re-read the raw file
  if (entry._scalarFields?.includes('tags')) {
    errors.push({
      code: 'BAD_TYPE',
      field: 'tags',
      message: 'tags must be a YAML array [...] not a bare scalar — see SCHEMA.md §Frontmatter Fields',
    })
  }

  // WARNING: SUPERSEDES_MISSING — supersedes ids must exist as entries on disk
  // exit code is 0; this is informational
  for (const supId of entry.supersedes ?? []) {
    if (!existingIds.has(supId)) {
      warnings.push({
        code: 'SUPERSEDES_MISSING',
        field: 'supersedes',
        message: `supersedes "${supId}" not found on disk`,
      })
    }
  }

  return { errors, warnings }
}

// ─── citty subcommand ─────────────────────────────────────────────────────────

export default defineCommand({
  meta: {
    name: 'validate',
    description: 'Validate .whydone entries against the whydone schema (CI-safe, no LLM)',
  },
  args: {
    path: {
      type: 'positional',
      description: 'Path to the .whydone directory (default: .whydone)',
      required: false,
      default: JOURNAL_DIR,
    },
    json: {
      type: 'boolean',
      description: 'Output JSON validation report to stdout',
      default: false,
    },
    'dry-run': {
      type: 'boolean',
      description: 'Alias for validate — runs checks but does not write files',
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
  },

  async run({ args }) {
    const useColor = !args['no-color']
    const red = (s: string) => (useColor ? pc.red(s) : s)
    const yellow = (s: string) => (useColor ? pc.yellow(s) : s)
    const green = (s: string) => (useColor ? pc.green(s) : s)
    const dim = (s: string) => (useColor ? pc.dim(s) : s)
    const bold = (s: string) => (useColor ? pc.bold(s) : s)

    const changelogDir = path.resolve(process.cwd(), args.path ?? JOURNAL_DIR)

    // T-02-14: path traversal guard — validate resolved path stays within project root
    const projectRoot = process.cwd()
    if (changelogDir !== projectRoot && !changelogDir.startsWith(projectRoot + path.sep)) {
      process.stderr.write(
        red('error') + ': path traversal detected — resolved changelogDir is outside project root\n',
      )
      process.exit(1)
    }

    const entries = await globEntries(changelogDir)

    // Build existingIds from all entry stems — used by SUPERSEDES_MISSING check
    const existingIds = new Set(entries.map((e) => e._stem))

    const results: ValidationResult[] = entries.map((e) => ({
      file: e._file,
      stem: e._stem,
      ...strictCheck(e, e._stem, existingIds),
    }))

    const totalErrors = results.reduce((n, r) => n + r.errors.length, 0)
    const totalWarnings = results.reduce((n, r) => n + r.warnings.length, 0)
    const report: ValidationReport = { results, totalErrors, totalWarnings }

    // Exit-code contract: set process.exitCode and return instead of calling
    // process.exit() — process.exit() discards pending async pipe writes, which
    // truncates large --json reports at one 64KB pipe buffer in CI pipelines
    // (`whydone validate --json | jq ...`). exitCode lets Node flush stdout.

    // ---- JSON output ----
    if (args.json) {
      process.stdout.write(JSON.stringify(report, null, 2) + '\n')
      process.exitCode = totalErrors > 0 ? 1 : 0
      return
    }

    // ---- Human-readable output ----
    if (entries.length === 0) {
      if (!args.quiet) {
        process.stdout.write(dim(`No entries found in ${path.relative(process.cwd(), changelogDir)}\n`))
        process.stdout.write(green('0 entries') + ', 0 errors, 0 warnings\n')
      }
      process.exitCode = 0
      return
    }

    for (const result of results) {
      const hasIssues = result.errors.length > 0 || result.warnings.length > 0
      if (!hasIssues) continue

      const relFile = path.relative(process.cwd(), result.file)
      process.stdout.write(bold(relFile) + '\n')

      for (const err of result.errors) {
        const field = err.field ? ` [${err.field}]` : ''
        process.stdout.write(`  ${red('error')}${field} ${err.code}: ${err.message}\n`)
      }
      for (const warn of result.warnings) {
        const field = warn.field ? ` [${warn.field}]` : ''
        process.stdout.write(`  ${yellow('warn')}${field} ${warn.code}: ${warn.message}\n`)
      }
    }

    // ---- Summary line ----
    const statusColor = totalErrors > 0 ? red : (totalWarnings > 0 ? yellow : green)
    const summary = `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}, ${totalErrors} error${totalErrors !== 1 ? 's' : ''}, ${totalWarnings} warning${totalWarnings !== 1 ? 's' : ''}`
    if (!args.quiet || totalErrors > 0) {
      process.stdout.write(statusColor(summary) + '\n')
    }

    process.exitCode = totalErrors > 0 ? 1 : 0
  },
})
