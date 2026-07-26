import { defineCommand } from 'citty'
import fs from 'node:fs/promises'
import path from 'node:path'
import pc from 'picocolors'
import { JOURNAL_DIR } from '../lib/constants.js'
import { globEntries } from '../lib/glob-entries.js'
import type { ParsedEntry, ManifestEntry } from '../types.js'

// ─── Public helper functions (exported for testability) ──────────────────────

/**
 * Sanitize a value for use as a markdown pipe-table cell: escape `|` as `\|`
 * and collapse newlines to spaces. Frontmatter like `task: "a | b"` or a YAML
 * block-scalar task is schema-valid input and must never break INDEX.md's
 * table structure (one row per entry, columns aligned).
 */
function cell(v: unknown): string {
  return String(v ?? '')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, ' ')
    .trim()
}

/**
 * Build a single markdown pipe-table row from a ParsedEntry.
 *
 * For parse errors: produces "| [PARSE ERROR] | {stem} | — | — | — |"
 * For normal entries: truncates files to first 3 + "+N" suffix when > 3.
 * All cell values are pipe-escaped and newline-collapsed via cell().
 */
export function toIndexRow(e: ParsedEntry): string {
  if (e._parseError) {
    return `| [PARSE ERROR] | ${cell(e._stem)} | — | — | — |`
  }

  const slug = e.slug ?? e._stem
  const task = e.task ?? ''
  const date = e.date ?? ''
  const tags = (e.tags ?? []).join(', ')

  const rawFiles = e.files ?? []
  let filesDisplay: string
  if (rawFiles.length > 3) {
    filesDisplay = [...rawFiles.slice(0, 3), `+${rawFiles.length - 3}`].join(', ')
  } else {
    filesDisplay = rawFiles.join(', ')
  }

  return `| ${cell(date)} | ${cell(slug)} | ${cell(task)} | ${cell(tags)} | ${cell(filesDisplay)} |`
}

/**
 * Build the full INDEX.md content from a list of entries.
 *
 * Entries are sorted newest-first by date string (YYYY-MM-DD lexicographic
 * descending), tie-broken by id desc (falling back to _stem) — mirroring
 * compareDateIdDesc in rank-entries.ts. Without the tie-break, same-date
 * rows keep glob input order, and readdir order differs across filesystems,
 * producing spurious diffs in this committed file.
 * Empty entries → header + separator only (no crash).
 */
export function buildIndexContent(entries: ParsedEntry[]): string {
  const sorted = [...entries].sort((a, b) => {
    const da = a.date ?? ''
    const db = b.date ?? ''
    if (da > db) return -1
    if (da < db) return 1
    const ia = String(a.id ?? a._stem)
    const ib = String(b.id ?? b._stem)
    if (ia > ib) return -1
    if (ia < ib) return 1
    return 0
  })

  const header = '| date | slug | task | tags | files |'
  const separator = '|------|------|------|------|-------|'
  const rows = sorted.map(toIndexRow)

  return [header, separator, ...rows].join('\n') + '\n'
}

/**
 * Convert a ParsedEntry to a ManifestEntry.
 *
 * _supersededBy is always initialized to [] here; it is populated in
 * buildManifest() via a second pass over the supersedes[] fields.
 *
 * Scalar fields are String()-coerced: YAML-valid frontmatter like
 * `task: 12345` or `slug: 42` parses as a number (no _parseError), and
 * the lenient-read contract says malformed entries must degrade, never
 * crash downstream consumers (recall's keyword haystack calls
 * .toLowerCase()). For valid entries String() is the identity, so
 * index output is unchanged.
 */
export function toManifestEntry(e: ParsedEntry): ManifestEntry {
  return {
    id: String((e.id as string | undefined) ?? e._stem),
    date: e.date ?? '',
    slug: String(e.slug ?? ''),
    task: String(e.task ?? ''),
    status: String((e.status as string | undefined) ?? 'done'),
    tags: e.tags ?? [],
    files: e.files ?? [],
    links: e.links ?? [],
    supersedes: e.supersedes ?? [],
    _sections: e._sections ?? [],
    _parseError: e._parseError ?? false,
    _supersededBy: [],
  }
}

/**
 * Build the manifest entry array from a list of entries.
 *
 * Two-pass algorithm:
 *   Pass 1: map entries → ManifestEntry[], sort newest-first by date.
 *   Pass 2: build id→index map; for each manifest entry me, iterate
 *           me.supersedes[] and push me.id into the referenced entry's
 *           _supersededBy array.
 *
 * Consumed directly by `whydone recall` (fresh in-memory ranking corpus)
 * and serialized to manifest.json by buildManifest() below.
 */
export function buildManifestEntries(entries: ParsedEntry[]): ManifestEntry[] {
  // Pass 1: map and sort — date desc, id desc tie-break (same total order as
  // buildIndexContent and rank-entries' compareDateIdDesc, so manifest.json
  // row order is independent of filesystem readdir order)
  const manifestEntries = entries.map(toManifestEntry).sort((a, b) => {
    if (a.date > b.date) return -1
    if (a.date < b.date) return 1
    if (a.id > b.id) return -1
    if (a.id < b.id) return 1
    return 0
  })

  // Pass 2: build _supersededBy inverse relation
  const idToIndex = new Map<string, number>()
  manifestEntries.forEach((me, i) => {
    idToIndex.set(me.id, i)
  })

  for (const me of manifestEntries) {
    for (const supersededId of me.supersedes) {
      const idx = idToIndex.get(supersededId)
      if (idx !== undefined) {
        manifestEntries[idx]._supersededBy.push(me.id)
      }
    }
  }

  return manifestEntries
}

/**
 * Build the full manifest.json content from a list of entries.
 *
 * Thin wrapper over buildManifestEntries() — output stays byte-identical
 * to the pre-refactor implementation.
 */
export function buildManifest(entries: ParsedEntry[]): string {
  return JSON.stringify(buildManifestEntries(entries), null, 2)
}

// ─── citty subcommand ─────────────────────────────────────────────────────────

export default defineCommand({
  meta: {
    name: 'index',
    description: 'Rebuild INDEX.md and manifest.json from .whydone/*.md entries',
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
      description: 'Emit JSON summary to stdout (files are always written)',
      default: false,
    },
    'dry-run': {
      type: 'boolean',
      description: 'Print what would be written without touching disk',
      default: false,
    },
    quiet: {
      type: 'boolean',
      description: 'Suppress non-error output',
      default: false,
    },
    'no-color': {
      type: 'boolean',
      description: 'Disable color output',
      default: false,
    },
  },
  async run({ args }) {
    const changelogDir = path.resolve(process.cwd(), args.path ?? JOURNAL_DIR)

    // T-02-11: path traversal guard — validate resolved path stays within project root
    const projectRoot = process.cwd()
    if (changelogDir !== projectRoot && !changelogDir.startsWith(projectRoot + path.sep)) {
      process.stderr.write(
        `error: path traversal detected — resolved changelogDir is outside project root\n`,
      )
      process.exit(1)
    }

    const entries = await globEntries(changelogDir)
    const indexContent = buildIndexContent(entries)
    const manifestContent = buildManifest(entries)

    const indexPath = path.join(changelogDir, 'INDEX.md')
    const manifestPath = path.join(changelogDir, 'manifest.json')

    // --dry-run is the ONLY no-write path
    if (args['dry-run']) {
      process.stdout.write(`[would write] INDEX.md (${entries.length} rows)\n`)
      process.stdout.write(`[would write] manifest.json (${entries.length} entries)\n`)
      return
    }

    // Always write files — --json changes stdout format only, never suppresses writes
    await fs.writeFile(indexPath, indexContent, 'utf-8')
    await fs.writeFile(manifestPath, manifestContent, 'utf-8')

    // Output
    if (args.json) {
      process.stdout.write(
        JSON.stringify({ written: [indexPath, manifestPath], count: entries.length }, null, 2) +
          '\n',
      )
      return
    }

    if (!args.quiet) {
      process.stdout.write(
        pc.green('✓') + ` INDEX.md (${entries.length} ${entries.length === 1 ? 'entry' : 'entries'})\n`,
      )
    }
  },
})
