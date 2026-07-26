import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseEntry } from '../src/lib/parse-entry.js'
import {
  toIndexRow,
  buildIndexContent,
  toManifestEntry,
  buildManifest,
  buildManifestEntries,
} from '../src/commands/build-index.js'
import type { ParsedEntry } from '../src/types.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURE_PATH = path.join(__dirname, 'fixtures', '20260601-design-entry-schema.md')

// Parse the real fixture entry once for all tests
const fixtureRaw = readFileSync(FIXTURE_PATH, 'utf-8')
let fixtureEntry: ParsedEntry

beforeAll(() => {
  fixtureEntry = parseEntry(FIXTURE_PATH, fixtureRaw)
})

// ─── buildIndexContent — table header ────────────────────────────────────────

describe('buildIndexContent — table header', () => {
  it('produces markdown table header "| date | slug | task | tags | files |"', () => {
    const result = buildIndexContent([fixtureEntry])
    expect(result).toContain('| date | slug | task | tags | files |')
  })

  it('produces separator row', () => {
    const result = buildIndexContent([fixtureEntry])
    expect(result).toContain('|---')
  })
})

// ─── buildIndexContent — row content ─────────────────────────────────────────

describe('buildIndexContent — row content from fixture', () => {
  it('row contains date "2026-06-01"', () => {
    const result = buildIndexContent([fixtureEntry])
    expect(result).toContain('2026-06-01')
  })

  it('row contains slug "design-entry-schema"', () => {
    const result = buildIndexContent([fixtureEntry])
    expect(result).toContain('design-entry-schema')
  })

  it('row contains file "SCHEMA.md"', () => {
    const result = buildIndexContent([fixtureEntry])
    expect(result).toContain('SCHEMA.md')
  })
})

// ─── buildIndexContent — sort order ──────────────────────────────────────────

describe('buildIndexContent — sort order (newest first)', () => {
  it('entry with date "2026-06-02" appears BEFORE entry with date "2026-06-01"', () => {
    const entry1: ParsedEntry = {
      _file: '/fake/20260602-newer.md',
      _stem: '20260602-newer',
      date: '2026-06-02',
      slug: 'newer',
      task: 'newer task',
      tags: [],
      files: [],
      links: [],
      supersedes: [],
      _sections: [],
      _scalarFields: [],
    }
    const entry2: ParsedEntry = {
      _file: '/fake/20260601-older.md',
      _stem: '20260601-older',
      date: '2026-06-01',
      slug: 'older',
      task: 'older task',
      tags: [],
      files: [],
      links: [],
      supersedes: [],
      _sections: [],
      _scalarFields: [],
    }
    // Pass in reverse order (older first) to ensure sorting happens
    const result = buildIndexContent([entry2, entry1])
    const idx1 = result.indexOf('2026-06-02')
    const idx2 = result.indexOf('2026-06-01')
    expect(idx1).toBeGreaterThan(-1)
    expect(idx2).toBeGreaterThan(-1)
    expect(idx1).toBeLessThan(idx2)
  })
})

// ─── buildIndexContent — same-date tie-break (deterministic row order) ───────

describe('buildIndexContent / buildManifestEntries — same-date entries sort by id desc regardless of input order', () => {
  const mkEntry = (stem: string): ParsedEntry => ({
    _file: `/fake/${stem}.md`,
    _stem: stem,
    id: stem,
    date: '2026-06-01',
    slug: stem.slice(9),
    task: `task ${stem}`,
    tags: [],
    files: [],
    links: [],
    supersedes: [],
    _sections: [],
    _scalarFields: [],
  })
  const a = mkEntry('20260601-aaa')
  const b = mkEntry('20260601-bbb')

  it('buildIndexContent returns identical output for [a,b] and [b,a]', () => {
    const ab = buildIndexContent([a, b])
    const ba = buildIndexContent([b, a])
    expect(ab).toBe(ba)
    // id desc: bbb before aaa
    expect(ab.indexOf('bbb')).toBeLessThan(ab.indexOf('aaa'))
  })

  it('buildManifestEntries returns identical order for [a,b] and [b,a]', () => {
    const ab = buildManifestEntries([a, b]).map((e) => e.id)
    const ba = buildManifestEntries([b, a]).map((e) => e.id)
    expect(ab).toEqual(ba)
    expect(ab).toEqual(['20260601-bbb', '20260601-aaa'])
  })
})

// ─── toIndexRow — cell escaping (pipes and newlines) ─────────────────────────

describe('toIndexRow — pipe and newline escaping', () => {
  const base: ParsedEntry = {
    _file: '/fake/20260601-pipes.md',
    _stem: '20260601-pipes',
    id: '20260601-pipes',
    date: '2026-06-01',
    slug: 'pipes',
    task: 'support a | b syntax in tables',
    tags: ['parser'],
    files: [],
    links: [],
    supersedes: [],
    _sections: [],
    _scalarFields: [],
  }

  it('escapes | in the task cell so the column count stays 5', () => {
    const row = toIndexRow(base)
    expect(row).toContain('support a \\| b syntax in tables')
    // 5 columns = 6 unescaped pipe delimiters
    const unescapedPipes = row.split('').filter((c, i) => c === '|' && row[i - 1] !== '\\').length
    expect(unescapedPipes).toBe(6)
  })

  it('collapses newlines from a block-scalar task into a single physical line', () => {
    const row = toIndexRow({ ...base, task: 'first line\nsecond line\n' })
    expect(row).not.toContain('\n')
    expect(row).toContain('first line second line')
  })
})

// ─── buildIndexContent — parse error row ─────────────────────────────────────

describe('buildIndexContent — parse error row', () => {
  it('parse error row is "| [PARSE ERROR] | bad-file | — | — | — |"', () => {
    const errorEntry: ParsedEntry = {
      _file: '/fake/bad-file.md',
      _stem: 'bad-file',
      _parseError: true,
    }
    const result = buildIndexContent([errorEntry])
    expect(result).toContain('| [PARSE ERROR] | bad-file | — | — | — |')
  })
})

// ─── buildIndexContent — files truncation ────────────────────────────────────

describe('buildIndexContent — files column truncation', () => {
  it('truncates 5 files to first 3 + "+2"', () => {
    const entry: ParsedEntry = {
      _file: '/fake/20260601-test.md',
      _stem: '20260601-test',
      date: '2026-06-01',
      slug: 'test',
      task: 'test task',
      tags: ['a'],
      files: ['a.ts', 'b.ts', 'c.ts', 'd.ts', 'e.ts'],
      links: [],
      supersedes: [],
      _sections: [],
      _scalarFields: [],
    }
    const result = buildIndexContent([entry])
    expect(result).toContain('+2')
    expect(result).toContain('a.ts')
    expect(result).toContain('b.ts')
    expect(result).toContain('c.ts')
    expect(result).not.toContain('d.ts')
  })
})

// ─── buildIndexContent — empty entries ───────────────────────────────────────

describe('buildIndexContent — empty entries array', () => {
  it('produces header-only table without crashing', () => {
    const result = buildIndexContent([])
    expect(result).toContain('| date | slug | task | tags | files |')
    // No data rows — only header + separator
    const lines = result.trim().split('\n').filter((l) => l.trim().startsWith('|'))
    expect(lines.length).toBe(2) // header + separator
  })
})

// ─── toManifestEntry — basic shape ───────────────────────────────────────────

describe('toManifestEntry — basic shape from fixture', () => {
  it('has all required fields', () => {
    const me = toManifestEntry(fixtureEntry)
    expect(me).toHaveProperty('id')
    expect(me).toHaveProperty('date')
    expect(me).toHaveProperty('slug')
    expect(me).toHaveProperty('task')
    expect(me).toHaveProperty('status')
    expect(me).toHaveProperty('tags')
    expect(me).toHaveProperty('files')
    expect(me).toHaveProperty('links')
    expect(me).toHaveProperty('supersedes')
    expect(me).toHaveProperty('_sections')
    expect(me).toHaveProperty('_parseError')
    expect(me).toHaveProperty('_supersededBy')
  })

  it('_sections contains "## What changed" for the fixture', () => {
    const me = toManifestEntry(fixtureEntry)
    expect(me._sections).toContain('## What changed')
  })

  it('status is "done" for fixture entry', () => {
    const me = toManifestEntry(fixtureEntry)
    expect(me.status).toBe('done')
  })

  it('tags is an array', () => {
    const me = toManifestEntry(fixtureEntry)
    expect(Array.isArray(me.tags)).toBe(true)
  })

  it('_supersededBy is empty array for a non-superseded entry', () => {
    const me = toManifestEntry(fixtureEntry)
    expect(me._supersededBy).toEqual([])
  })

  it('_parseError is false for a valid entry', () => {
    const me = toManifestEntry(fixtureEntry)
    expect(me._parseError).toBe(false)
  })
})

// ─── buildManifest — valid JSON ───────────────────────────────────────────────

describe('buildManifest — valid JSON', () => {
  it('output is valid JSON that parses to an array of length 1 for fixture', () => {
    const result = buildManifest([fixtureEntry])
    let parsed: unknown
    expect(() => {
      parsed = JSON.parse(result)
    }).not.toThrow()
    expect(Array.isArray(parsed)).toBe(true)
    expect((parsed as unknown[]).length).toBe(1)
  })

  it('empty entries array produces "[]"', () => {
    const result = buildManifest([])
    expect(JSON.parse(result)).toEqual([])
  })
})

// ─── buildManifest — _supersededBy inversion ─────────────────────────────────

describe('buildManifest — _supersededBy second-pass inversion', () => {
  it('entryA.supersedes=[entryB.id] → entryB._supersededBy contains entryA id', () => {
    const entryA: ParsedEntry = {
      _file: '/fake/20260602-entry-a.md',
      _stem: '20260602-entry-a',
      id: '20260602-entry-a',
      date: '2026-06-02',
      slug: 'entry-a',
      task: 'task A',
      status: 'done',
      tags: [],
      files: [],
      links: [],
      supersedes: ['20260601-entry-b'],
      _sections: [],
      _scalarFields: [],
    }
    const entryB: ParsedEntry = {
      _file: '/fake/20260601-entry-b.md',
      _stem: '20260601-entry-b',
      id: '20260601-entry-b',
      date: '2026-06-01',
      slug: 'entry-b',
      task: 'task B',
      status: 'done',
      tags: [],
      files: [],
      links: [],
      supersedes: [],
      _sections: [],
      _scalarFields: [],
    }

    const result = buildManifest([entryA, entryB])
    const parsed = JSON.parse(result) as Array<{ id: string; _supersededBy: string[] }>

    const entryBManifest = parsed.find((e) => e.id === '20260601-entry-b')
    const entryAManifest = parsed.find((e) => e.id === '20260602-entry-a')

    expect(entryBManifest).toBeDefined()
    expect(entryBManifest!._supersededBy).toContain('20260602-entry-a')

    expect(entryAManifest).toBeDefined()
    expect(entryAManifest!._supersededBy).toEqual([])
  })

  it('entry with supersedes=[] has _supersededBy === []', () => {
    const entryA: ParsedEntry = {
      _file: '/fake/20260601-solo.md',
      _stem: '20260601-solo',
      id: '20260601-solo',
      date: '2026-06-01',
      slug: 'solo',
      task: 'solo task',
      status: 'done',
      tags: [],
      files: [],
      links: [],
      supersedes: [],
      _sections: [],
      _scalarFields: [],
    }

    const result = buildManifest([entryA])
    const parsed = JSON.parse(result) as Array<{ _supersededBy: string[] }>
    expect(parsed[0]._supersededBy).toEqual([])
  })
})

// ─── toIndexRow — direct unit tests ──────────────────────────────────────────

describe('toIndexRow — direct unit tests', () => {
  it('produces correct pipe-table row for normal entry', () => {
    const entry: ParsedEntry = {
      _file: '/fake/20260601-test.md',
      _stem: '20260601-test',
      date: '2026-06-01',
      slug: 'my-slug',
      task: 'my task',
      tags: ['tag1', 'tag2'],
      files: ['src/a.ts', 'src/b.ts'],
      links: [],
      supersedes: [],
      _sections: [],
      _scalarFields: [],
    }
    const row = toIndexRow(entry)
    expect(row).toContain('2026-06-01')
    expect(row).toContain('my-slug')
    expect(row).toContain('my task')
    expect(row).toContain('tag1, tag2')
    expect(row).toContain('src/a.ts, src/b.ts')
  })

  it('uses _stem as slug fallback when slug field is missing', () => {
    const entry: ParsedEntry = {
      _file: '/fake/20260601-stemonly.md',
      _stem: '20260601-stemonly',
      date: '2026-06-01',
      task: 'task without slug',
      tags: [],
      files: [],
      links: [],
      supersedes: [],
      _sections: [],
      _scalarFields: [],
    }
    const row = toIndexRow(entry)
    expect(row).toContain('20260601-stemonly')
  })

  it('produces parse error row for _parseError entry', () => {
    const entry: ParsedEntry = {
      _file: '/fake/bad-file.md',
      _stem: 'bad-file',
      _parseError: true,
    }
    const row = toIndexRow(entry)
    expect(row).toBe('| [PARSE ERROR] | bad-file | — | — | — |')
  })
})
