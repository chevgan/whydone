/**
 * Unit tests for validate.ts strictCheck() function.
 *
 * All tests call strictCheck() directly (pure function — no FS access).
 * One integration-level test reads the real fixture file and confirms
 * it passes with zero errors and zero warnings.
 *
 * Coverage:
 *   BLOCK checks: PARSE_ERROR, MISSING_FIELD (schema/id/date/slug/task),
 *                 WRONG_SCHEMA, BAD_DATE, BAD_SLUG, ID_STEM_MISMATCH,
 *                 SLUG_MISMATCH, BAD_STATUS, BAD_TYPE (via _scalarFields)
 *   WARNING checks: SUPERSEDES_MISSING (id not in existingIds)
 *   Negative: SUPERSEDES_MISSING not emitted when id IS in existingIds
 *   Negative: BAD_TYPE not emitted when _scalarFields does not include 'tags'
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import validateCommand, { strictCheck } from '../src/commands/validate.js'
import { parseEntry } from '../src/lib/parse-entry.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURE_PATH = path.join(__dirname, 'fixtures', '20260601-design-entry-schema.md')
const FIXTURE_STEM = '20260601-design-entry-schema'

/**
 * A valid base entry matching the canonical fixture's parsed shape.
 * Used as the baseline for mutation-based test cases.
 */
const validBase = {
  _file: `/some/.whydone/${FIXTURE_STEM}.md`,
  _stem: FIXTURE_STEM,
  _scalarFields: [] as string[],
  schema: 1,
  id: '20260601-design-entry-schema',
  date: '2026-06-01',
  slug: 'design-entry-schema',
  task: 'Define the whydone entry schema and storage contract',
  status: 'done',
  tags: ['schema', 'storage-contract'],
  files: ['SCHEMA.md'],
  links: [] as string[],
  supersedes: [] as string[],
  _sections: ['## What changed'],
}

const VALID_STEM = FIXTURE_STEM
const EMPTY_IDS = new Set<string>()

// ─── Integration: real fixture file ─────────────────────────────────────────

describe('strictCheck — canonical fixture', () => {
  const raw = readFileSync(FIXTURE_PATH, 'utf-8')
  const entry = parseEntry(FIXTURE_PATH, raw)

  it('returns zero errors and zero warnings for the canonical fixture', () => {
    const { errors, warnings } = strictCheck(entry, entry._stem, new Set([entry._stem]))
    expect(errors).toHaveLength(0)
    expect(warnings).toHaveLength(0)
  })
})

// ─── BLOCK: PARSE_ERROR ──────────────────────────────────────────────────────

describe('strictCheck — PARSE_ERROR', () => {
  it('emits PARSE_ERROR when entry._parseError is true', () => {
    const entry = { _file: 'bad.md', _stem: 'bad', _parseError: true as const }
    const { errors } = strictCheck(entry, 'bad', EMPTY_IDS)
    expect(errors).toHaveLength(1)
    expect(errors[0].code).toBe('PARSE_ERROR')
  })

  it('emits no other errors when _parseError is true (early return)', () => {
    const entry = { _file: 'bad.md', _stem: 'bad', _parseError: true as const }
    const { errors } = strictCheck(entry, 'bad', EMPTY_IDS)
    expect(errors.every(e => e.code === 'PARSE_ERROR')).toBe(true)
  })
})

// ─── BLOCK: MISSING_FIELD ─────────────────────────────────────────────────────

describe('strictCheck — MISSING_FIELD', () => {
  it('emits MISSING_FIELD for schema when schema is undefined', () => {
    const entry = { ...validBase, schema: undefined }
    const { errors } = strictCheck(entry, VALID_STEM, EMPTY_IDS)
    const err = errors.find(e => e.code === 'MISSING_FIELD' && e.field === 'schema')
    expect(err).toBeDefined()
  })

  it('emits MISSING_FIELD for id when id is undefined', () => {
    const entry = { ...validBase, id: undefined }
    const { errors } = strictCheck(entry, VALID_STEM, EMPTY_IDS)
    const err = errors.find(e => e.code === 'MISSING_FIELD' && e.field === 'id')
    expect(err).toBeDefined()
  })

  it('emits MISSING_FIELD for date when date is undefined', () => {
    const entry = { ...validBase, date: undefined }
    const { errors } = strictCheck(entry, VALID_STEM, EMPTY_IDS)
    const err = errors.find(e => e.code === 'MISSING_FIELD' && e.field === 'date')
    expect(err).toBeDefined()
  })

  it('emits MISSING_FIELD for slug when slug is undefined', () => {
    const entry = { ...validBase, slug: undefined }
    const { errors } = strictCheck(entry, VALID_STEM, EMPTY_IDS)
    const err = errors.find(e => e.code === 'MISSING_FIELD' && e.field === 'slug')
    expect(err).toBeDefined()
  })

  it('emits MISSING_FIELD for task when task is undefined', () => {
    const entry = { ...validBase, task: undefined }
    const { errors } = strictCheck(entry, VALID_STEM, EMPTY_IDS)
    const err = errors.find(e => e.code === 'MISSING_FIELD' && e.field === 'task')
    expect(err).toBeDefined()
  })
})

// ─── BLOCK: WRONG_SCHEMA ─────────────────────────────────────────────────────

describe('strictCheck — WRONG_SCHEMA', () => {
  it('emits WRONG_SCHEMA when schema is 2', () => {
    const entry = { ...validBase, schema: 2 }
    const { errors } = strictCheck(entry, VALID_STEM, EMPTY_IDS)
    const err = errors.find(e => e.code === 'WRONG_SCHEMA')
    expect(err).toBeDefined()
    expect(err?.field).toBe('schema')
  })

  it('emits WRONG_SCHEMA when schema is 0', () => {
    const entry = { ...validBase, schema: 0 }
    const { errors } = strictCheck(entry, VALID_STEM, EMPTY_IDS)
    const err = errors.find(e => e.code === 'WRONG_SCHEMA')
    expect(err).toBeDefined()
  })

  it('does NOT emit WRONG_SCHEMA when schema is 1', () => {
    const entry = { ...validBase, schema: 1 }
    const { errors } = strictCheck(entry, VALID_STEM, EMPTY_IDS)
    const err = errors.find(e => e.code === 'WRONG_SCHEMA')
    expect(err).toBeUndefined()
  })
})

// ─── BLOCK: BAD_DATE ──────────────────────────────────────────────────────────

describe('strictCheck — BAD_DATE', () => {
  it('emits BAD_DATE when date is "20260601" (no dashes)', () => {
    const entry = { ...validBase, date: '20260601' }
    const { errors } = strictCheck(entry, VALID_STEM, EMPTY_IDS)
    const err = errors.find(e => e.code === 'BAD_DATE')
    expect(err).toBeDefined()
    expect(err?.field).toBe('date')
  })

  it('emits BAD_DATE when date is "2026/06/01" (slashes)', () => {
    const entry = { ...validBase, date: '2026/06/01' }
    const { errors } = strictCheck(entry, VALID_STEM, EMPTY_IDS)
    const err = errors.find(e => e.code === 'BAD_DATE')
    expect(err).toBeDefined()
  })

  it('does NOT emit BAD_DATE when date is "2026-06-01"', () => {
    const entry = { ...validBase, date: '2026-06-01' }
    const { errors } = strictCheck(entry, VALID_STEM, EMPTY_IDS)
    const err = errors.find(e => e.code === 'BAD_DATE')
    expect(err).toBeUndefined()
  })
})

// ─── BLOCK: BAD_SLUG ──────────────────────────────────────────────────────────

describe('strictCheck — BAD_SLUG', () => {
  it('emits BAD_SLUG when slug contains uppercase letters', () => {
    const entry = { ...validBase, slug: 'Design-Schema', id: '20260601-Design-Schema' }
    const { errors } = strictCheck(entry, VALID_STEM, EMPTY_IDS)
    const err = errors.find(e => e.code === 'BAD_SLUG')
    expect(err).toBeDefined()
    expect(err?.field).toBe('slug')
  })

  it('emits BAD_SLUG when slug contains spaces', () => {
    const entry = { ...validBase, slug: 'design schema', id: '20260601-design schema' }
    const { errors } = strictCheck(entry, VALID_STEM, EMPTY_IDS)
    const err = errors.find(e => e.code === 'BAD_SLUG')
    expect(err).toBeDefined()
  })

  it('does NOT emit BAD_SLUG for a valid slug', () => {
    const entry = { ...validBase }
    const { errors } = strictCheck(entry, VALID_STEM, EMPTY_IDS)
    const err = errors.find(e => e.code === 'BAD_SLUG')
    expect(err).toBeUndefined()
  })
})

// ─── BLOCK: ID_STEM_MISMATCH ──────────────────────────────────────────────────

describe('strictCheck — ID_STEM_MISMATCH', () => {
  it('emits ID_STEM_MISMATCH when id does not equal stem', () => {
    const entry = { ...validBase, id: 'wrong-id' }
    // stem is still FIXTURE_STEM = '20260601-design-entry-schema'
    const { errors } = strictCheck(entry, VALID_STEM, EMPTY_IDS)
    const err = errors.find(e => e.code === 'ID_STEM_MISMATCH')
    expect(err).toBeDefined()
    expect(err?.field).toBe('id')
  })

  it('does NOT emit ID_STEM_MISMATCH when id equals stem', () => {
    const entry = { ...validBase }
    const { errors } = strictCheck(entry, VALID_STEM, EMPTY_IDS)
    const err = errors.find(e => e.code === 'ID_STEM_MISMATCH')
    expect(err).toBeUndefined()
  })
})

// ─── BLOCK: SLUG_MISMATCH ─────────────────────────────────────────────────────

describe('strictCheck — SLUG_MISMATCH', () => {
  it('emits SLUG_MISMATCH when slug !== id.slice(9)', () => {
    // id = '20260601-design-entry-schema', id.slice(9) = 'design-entry-schema'
    // but slug = 'wrong'
    const entry = { ...validBase, slug: 'wrong' }
    const { errors } = strictCheck(entry, VALID_STEM, EMPTY_IDS)
    const err = errors.find(e => e.code === 'SLUG_MISMATCH')
    expect(err).toBeDefined()
    expect(err?.field).toBe('slug')
  })

  it('does NOT emit SLUG_MISMATCH when slug equals id.slice(9)', () => {
    const entry = { ...validBase }
    // validBase: id = '20260601-design-entry-schema', slug = 'design-entry-schema'
    // id.slice(9) = 'design-entry-schema' ✓
    const { errors } = strictCheck(entry, VALID_STEM, EMPTY_IDS)
    const err = errors.find(e => e.code === 'SLUG_MISMATCH')
    expect(err).toBeUndefined()
  })
})

// ─── BLOCK: BAD_STATUS ───────────────────────────────────────────────────────

describe('strictCheck — BAD_STATUS', () => {
  it('emits BAD_STATUS when status is "unknown"', () => {
    const entry = { ...validBase, status: 'unknown' }
    const { errors } = strictCheck(entry, VALID_STEM, EMPTY_IDS)
    const err = errors.find(e => e.code === 'BAD_STATUS')
    expect(err).toBeDefined()
    expect(err?.field).toBe('status')
  })

  it('emits BAD_STATUS when status is "published"', () => {
    const entry = { ...validBase, status: 'published' }
    const { errors } = strictCheck(entry, VALID_STEM, EMPTY_IDS)
    const err = errors.find(e => e.code === 'BAD_STATUS')
    expect(err).toBeDefined()
  })

  it('does NOT emit BAD_STATUS when status is "done"', () => {
    const entry = { ...validBase, status: 'done' }
    const { errors } = strictCheck(entry, VALID_STEM, EMPTY_IDS)
    const err = errors.find(e => e.code === 'BAD_STATUS')
    expect(err).toBeUndefined()
  })

  it('does NOT emit BAD_STATUS when status is "wip"', () => {
    const entry = { ...validBase, status: 'wip' }
    const { errors } = strictCheck(entry, VALID_STEM, EMPTY_IDS)
    const err = errors.find(e => e.code === 'BAD_STATUS')
    expect(err).toBeUndefined()
  })

  it('does NOT emit BAD_STATUS when status is "blocked"', () => {
    const entry = { ...validBase, status: 'blocked' }
    const { errors } = strictCheck(entry, VALID_STEM, EMPTY_IDS)
    const err = errors.find(e => e.code === 'BAD_STATUS')
    expect(err).toBeUndefined()
  })

  it('does NOT emit BAD_STATUS when status is undefined (optional field)', () => {
    const entry = { ...validBase, status: undefined }
    const { errors } = strictCheck(entry, VALID_STEM, EMPTY_IDS)
    const err = errors.find(e => e.code === 'BAD_STATUS')
    expect(err).toBeUndefined()
  })
})

// ─── BLOCK: BAD_TYPE (via _scalarFields) ─────────────────────────────────────

describe('strictCheck — BAD_TYPE via _scalarFields', () => {
  it('emits BAD_TYPE for tags when _scalarFields includes "tags"', () => {
    const entry = { ...validBase, _scalarFields: ['tags'] }
    const { errors } = strictCheck(entry, VALID_STEM, EMPTY_IDS)
    const err = errors.find(e => e.code === 'BAD_TYPE' && e.field === 'tags')
    expect(err).toBeDefined()
  })

  it('does NOT emit BAD_TYPE when _scalarFields does not include "tags"', () => {
    const entry = { ...validBase, _scalarFields: [] }
    const { errors } = strictCheck(entry, VALID_STEM, EMPTY_IDS)
    const err = errors.find(e => e.code === 'BAD_TYPE')
    expect(err).toBeUndefined()
  })

  it('does NOT emit BAD_TYPE when _scalarFields includes "files" but not "tags"', () => {
    const entry = { ...validBase, _scalarFields: ['files'] }
    const { errors } = strictCheck(entry, VALID_STEM, EMPTY_IDS)
    const tagErr = errors.find(e => e.code === 'BAD_TYPE' && e.field === 'tags')
    expect(tagErr).toBeUndefined()
  })
})

// ─── Regression: non-string frontmatter id must never crash strictCheck ─────

describe('strictCheck — non-string frontmatter id (regression: entry.id.slice crash)', () => {
  it('unquoted all-digit id (YAML number) with slug present reports issues instead of throwing', () => {
    const raw =
      '---\nschema: 1\nid: 20260101\ndate: "2026-01-01"\nslug: foo\ntask: t\ntags: [a]\n---\nbody'
    const entry = parseEntry('/fake/.whydone/20260101-foo.md', raw)
    expect(() => strictCheck(entry, '20260101-foo', EMPTY_IDS)).not.toThrow()
    const { errors } = strictCheck(entry, '20260101-foo', EMPTY_IDS)
    expect(errors.some((e) => e.code === 'ID_STEM_MISMATCH')).toBe(true)
  })

  it('unquoted date-like id (YAML Date) with slug present does not throw', () => {
    const raw = '---\nschema: 1\nid: 2026-01-03\ndate: "2026-01-03"\nslug: foo\ntask: t\n---\nbody'
    const entry = parseEntry('/fake/.whydone/20260103-foo.md', raw)
    expect(() => strictCheck(entry, '20260103-foo', EMPTY_IDS)).not.toThrow()
  })

  it('a hand-built entry with a numeric id (bypassing parseEntry) still does not throw', () => {
    const entry = { ...validBase, id: 20260601 as unknown as string }
    expect(() => strictCheck(entry, VALID_STEM, EMPTY_IDS)).not.toThrow()
  })
})

// ─── Regression: BAD_TYPE fires for numeric scalar tags, not only strings ───

describe('strictCheck — BAD_TYPE for numeric scalar tags (via parseEntry)', () => {
  it('tags: 123 produces BAD_TYPE exactly like tags: docs', () => {
    const rawNum =
      '---\nschema: 1\nid: 20260101-x\ndate: "2026-01-01"\nslug: x\ntask: t\ntags: 123\n---\nbody'
    const entryNum = parseEntry('/fake/.whydone/20260101-x.md', rawNum)
    const { errors } = strictCheck(entryNum, '20260101-x', EMPTY_IDS)
    expect(errors.some((e) => e.code === 'BAD_TYPE' && e.field === 'tags')).toBe(true)
  })
})

// ─── Command-level: exit-code contract (stdout must be flushable) ────────────

describe('validate command — sets process.exitCode instead of calling process.exit', () => {
  it('invalid journal with --json: exitCode 1, process.exit never called, JSON complete', async () => {
    const tmp = await mkdtemp(path.join(os.tmpdir(), 'whydone-validate-exit-'))
    const dir = path.join(tmp, '.whydone')
    await mkdir(dir, { recursive: true })
    // Missing id/date/slug/task → errors → exit code 1
    await writeFile(path.join(dir, '20260101-bad.md'), '---\nschema: 1\n---\nbody', 'utf-8')

    const originalCwd = process.cwd()
    const originalExit = process.exit
    const originalExitCode = process.exitCode
    const originalWrite = process.stdout.write.bind(process.stdout)
    let exitCalled = false
    let out = ''

    process.chdir(tmp)
    // @ts-ignore — process.exit would discard pending async pipe writes (64KB truncation)
    process.exit = () => {
      exitCalled = true
      throw new Error('process.exit called')
    }
    // @ts-ignore
    process.stdout.write = (chunk: unknown) => {
      out += String(chunk)
      return true
    }

    try {
      await (validateCommand as any).run({
        args: { path: '.whydone', json: true, 'dry-run': false, quiet: true, 'no-color': true },
      })
    } finally {
      process.exit = originalExit
      // @ts-ignore
      process.stdout.write = originalWrite
      process.chdir(originalCwd)
    }

    const observedExitCode = process.exitCode
    process.exitCode = originalExitCode
    await rm(tmp, { recursive: true, force: true })

    expect(exitCalled).toBe(false)
    expect(observedExitCode).toBe(1)
    const report = JSON.parse(out) // complete, parseable JSON on stdout
    expect(report.totalErrors).toBeGreaterThan(0)
  })
})

// ─── WARNING: SUPERSEDES_MISSING ─────────────────────────────────────────────

describe('strictCheck — SUPERSEDES_MISSING warning', () => {
  it('emits SUPERSEDES_MISSING warning when supersedes id is not in existingIds', () => {
    const entry = { ...validBase, supersedes: ['nonexistent-id'] }
    const { errors, warnings } = strictCheck(entry, VALID_STEM, EMPTY_IDS)
    expect(errors).toHaveLength(0)
    const warn = warnings.find(w => w.code === 'SUPERSEDES_MISSING')
    expect(warn).toBeDefined()
    expect(warn?.field).toBe('supersedes')
  })

  it('does NOT emit SUPERSEDES_MISSING when the supersedes id IS in existingIds', () => {
    const entry = { ...validBase, supersedes: ['nonexistent-id'] }
    const existingIds = new Set(['nonexistent-id'])
    const { warnings } = strictCheck(entry, VALID_STEM, existingIds)
    const warn = warnings.find(w => w.code === 'SUPERSEDES_MISSING')
    expect(warn).toBeUndefined()
  })

  it('emits no warnings for an entry with empty supersedes array', () => {
    const entry = { ...validBase, supersedes: [] }
    const { warnings } = strictCheck(entry, VALID_STEM, EMPTY_IDS)
    expect(warnings).toHaveLength(0)
  })
})
