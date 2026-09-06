import path from 'node:path'
import { splitFrontmatter } from './frontmatter.js'
import type { ParsedEntry } from '../types.js'

/**
 * The five canonical body headings from SCHEMA.md §Canonical Body Headings.
 * These exact strings are matched in the entry body to populate _sections.
 */
export const CANONICAL_HEADINGS: string[] = [
  '## What changed',
  '## Why / decisions',
  '## Alternatives rejected',
  '## Gotchas / risks',
  '## Verify-later / follow-ups',
]

/**
 * Computed-field namespace of ParsedEntry. Unknown frontmatter keys are
 * preserved by contract (forward-compatible spread), but a key with one of
 * these names — `_parseError: true` in an otherwise valid file — would
 * masquerade as a tooling verdict, so they are dropped before the spread.
 */
const RESERVED_KEYS: ReadonlySet<string> = new Set([
  '_file',
  '_stem',
  '_parseError',
  '_sections',
  '_scalarFields',
])

// ─── Field normalization ─────────────────────────────────────────────────────

/**
 * Internal result type for scalar-to-array coercion.
 */
interface ToArrayResult {
  value: string[]
  wasScalar: boolean
}

/**
 * Coerce a value to an array. Returns wasScalar=true when the raw value
 * was a non-array (scalar coercion was applied).
 *
 * SCHEMA.md Pitfall 2: bare scalar "tags: schema" parses as string — must coerce.
 * ANY defined non-array scalar counts (string, number, boolean, …): js-yaml
 * parses `tags: 123` as a number, and strict validate must flag it via
 * _scalarFields exactly like the string case — never silently drop the data.
 */
function toArrayResult(v: unknown): ToArrayResult {
  if (Array.isArray(v)) {
    return { value: (v as unknown[]).filter(Boolean).map(String), wasScalar: false }
  }
  if (v === undefined || v === null || v === '') {
    return { value: [], wasScalar: false }
  }
  return { value: [String(v)], wasScalar: true }
}

/**
 * Normalize a date value to a YYYY-MM-DD string.
 *
 * SCHEMA.md Pitfall 1: unquoted "date: 2026-06-01" is parsed by js-yaml as a
 * JavaScript Date object. Normalize it back to a string here.
 */
function normDate(v: unknown): string {
  if (typeof v === 'string') return v
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  return String(v ?? '')
}

/**
 * Normalize an identity-bearing scalar (id, slug) to a string, preserving
 * undefined/null so MISSING_FIELD checks still fire.
 *
 * Unquoted `id: 2026-01-02` parses as a JS Date (mirror normDate's handling)
 * and an unquoted all-digit `id: 20260101` parses as a number — both must
 * become strings so ParsedEntry honors its typed contract and strict
 * validate (entry.id.slice) never crashes on a malformed entry.
 */
function normOptionalString(v: unknown): string | undefined {
  if (v === undefined || v === null) return undefined
  if (typeof v === 'string') return v
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  return String(v)
}

/**
 * Detect which canonical headings are present in the body.
 *
 * Fence-aware line scan: a heading counts only when a line equals the
 * canonical string outside a ``` / ~~~ code fence — a fenced example of
 * the entry format must not register as a real section (same rule as
 * countOpenFollowUps in rank-entries.ts).
 */
function detectSections(content: string): string[] {
  const present = new Set<string>()
  let inFence = false

  for (const line of content.split('\n')) {
    const trimmed = line.trimEnd()
    if (/^\s*(```|~~~)/.test(trimmed)) {
      inFence = !inFence
      continue
    }
    if (inFence) continue
    if (CANONICAL_HEADINGS.includes(trimmed)) present.add(trimmed)
  }

  return CANONICAL_HEADINGS.filter((h) => present.has(h))
}

// ─── Entry parsing ───────────────────────────────────────────────────────────

/**
 * Parse a single changelog entry file leniently.
 *
 * Always returns a ParsedEntry — never throws.
 * On a YAML error, a refused non-YAML frontmatter language, or an unclosed
 * frontmatter block: returns { _file, _stem, _parseError: true }.
 *
 * Handles all three SCHEMA.md §Parser Notes pitfalls:
 *   Pitfall 1 — date coercion (Date → YYYY-MM-DD string)
 *   Pitfall 2 — scalar-to-array coercion for tags/files/links/supersedes
 *   Pitfall 3 — YAMLException caught, returns _parseError flag
 */
export function parseEntry(filePath: string, rawContent: string): ParsedEntry {
  const stem = path.basename(filePath, '.md')

  try {
    const { data, content } = splitFrontmatter(rawContent)

    // Forward-compatible spread of unknown keys — minus the computed namespace.
    const extra: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data)) {
      if (!RESERVED_KEYS.has(key)) extra[key] = value
    }

    // Apply scalar-to-array coercion to all array fields and track which ones needed it
    const tagsResult = toArrayResult(data.tags)
    const filesResult = toArrayResult(data.files)
    const linksResult = toArrayResult(data.links)
    const supersResult = toArrayResult(data.supersedes)

    const scalarFields: string[] = []
    if (tagsResult.wasScalar) scalarFields.push('tags')
    if (filesResult.wasScalar) scalarFields.push('files')
    if (linksResult.wasScalar) scalarFields.push('links')
    if (supersResult.wasScalar) scalarFields.push('supersedes')

    // Detect which canonical headings are present in the body (fence-aware)
    const sections = detectSections(content)

    // Spread the preserved frontmatter, then override normalized fields
    const entry: ParsedEntry = {
      ...extra,
      _file: filePath,
      _stem: stem,
      id: normOptionalString(data.id),
      slug: normOptionalString(data.slug),
      date: normDate(data.date),
      tags: tagsResult.value,
      files: filesResult.value,
      links: linksResult.value,
      supersedes: supersResult.value,
      _scalarFields: scalarFields,
      _sections: sections,
    }

    return entry
  } catch {
    // Pitfall 3: YAMLException (or a refused language / unclosed block) — degrade gracefully
    return {
      _file: filePath,
      _stem: stem,
      _parseError: true,
    }
  }
}
