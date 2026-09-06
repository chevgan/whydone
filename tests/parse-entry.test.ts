import { describe, it, expect, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseEntry, CANONICAL_HEADINGS } from '../src/lib/parse-entry.js'
import { splitFrontmatter } from '../src/lib/frontmatter.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURE_PATH = path.join(__dirname, 'fixtures', '20260601-design-entry-schema.md')

describe('CANONICAL_HEADINGS', () => {
  it('contains exactly 5 heading strings', () => {
    expect(CANONICAL_HEADINGS).toHaveLength(5)
  })

  it('contains the exact canonical heading strings', () => {
    expect(CANONICAL_HEADINGS).toContain('## What changed')
    expect(CANONICAL_HEADINGS).toContain('## Why / decisions')
    expect(CANONICAL_HEADINGS).toContain('## Alternatives rejected')
    expect(CANONICAL_HEADINGS).toContain('## Gotchas / risks')
    expect(CANONICAL_HEADINGS).toContain('## Verify-later / follow-ups')
  })
})

describe('parseEntry — happy path (canonical fixture)', () => {
  const raw = readFileSync(FIXTURE_PATH, 'utf-8')
  const entry = parseEntry(FIXTURE_PATH, raw)

  it('does not set _parseError', () => {
    expect(entry._parseError).toBeUndefined()
  })

  it('schema === 1', () => {
    expect(entry.schema).toBe(1)
  })

  it('date is string "2026-06-01"', () => {
    expect(entry.date).toBe('2026-06-01')
    expect(typeof entry.date).toBe('string')
  })

  it('tags is an array', () => {
    expect(Array.isArray(entry.tags)).toBe(true)
  })

  it('tags includes "schema"', () => {
    expect(entry.tags).toContain('schema')
  })

  it('files is an array', () => {
    expect(Array.isArray(entry.files)).toBe(true)
  })

  it('_sections includes "## What changed"', () => {
    expect(entry._sections).toContain('## What changed')
  })

  it('_scalarFields is an array (not undefined)', () => {
    expect(Array.isArray(entry._scalarFields)).toBe(true)
  })

  it('_scalarFields does NOT include "tags" (already an array)', () => {
    expect(entry._scalarFields).not.toContain('tags')
  })

  it('_stem equals filename without .md', () => {
    expect(entry._stem).toBe('20260601-design-entry-schema')
  })

  it('_file equals the absolute path', () => {
    expect(entry._file).toBe(FIXTURE_PATH)
  })
})

describe('parseEntry — date coercion', () => {
  it('normalizes unquoted date (YAML parses as Date) to YYYY-MM-DD string', () => {
    // YAML without quotes: "date: 2026-06-01" is parsed as a Date object by js-yaml
    const raw = '---\nschema: 1\nid: x\ndate: 2026-06-01\nslug: x\ntask: t\ntags: [a]\n---\nbody'
    const entry = parseEntry('/fake/path/20260601-test.md', raw)
    expect(typeof entry.date).toBe('string')
    expect(entry.date).toBe('2026-06-01')
  })
})

describe('parseEntry — scalar tag coercion', () => {
  it('coerces scalar tag "recall" to array ["recall"]', () => {
    const raw = '---\nschema: 1\nid: x\ndate: "2026-01-01"\nslug: x\ntask: t\ntags: recall\n---\nbody'
    const entry = parseEntry('/fake/20260101-x.md', raw)
    expect(entry.tags).toEqual(['recall'])
  })

  it('populates _scalarFields with "tags" when scalar coercion applied', () => {
    const raw = '---\nschema: 1\nid: x\ndate: "2026-01-01"\nslug: x\ntask: t\ntags: recall\n---\nbody'
    const entry = parseEntry('/fake/20260101-x.md', raw)
    expect(entry._scalarFields).toContain('tags')
  })
})

describe('parseEntry — scalar files coercion', () => {
  it('coerces scalar files "src/foo.ts" to array ["src/foo.ts"]', () => {
    const raw = '---\nschema: 1\nid: x\ndate: "2026-01-01"\nslug: x\ntask: t\ntags: [a]\nfiles: src/foo.ts\n---\nbody'
    const entry = parseEntry('/fake/20260101-x.md', raw)
    expect(entry.files).toEqual(['src/foo.ts'])
  })

  it('populates _scalarFields with "files" when scalar coercion applied', () => {
    const raw = '---\nschema: 1\nid: x\ndate: "2026-01-01"\nslug: x\ntask: t\ntags: [a]\nfiles: src/foo.ts\n---\nbody'
    const entry = parseEntry('/fake/20260101-x.md', raw)
    expect(entry._scalarFields).toContain('files')
  })
})

describe('parseEntry — non-string scalar coercion (tags: 123, tags: true)', () => {
  it('coerces numeric scalar tags to ["123"] and flags it in _scalarFields', () => {
    const raw = '---\nschema: 1\nid: x\ndate: "2026-01-01"\nslug: x\ntask: t\ntags: 123\n---\nbody'
    const entry = parseEntry('/fake/20260101-x.md', raw)
    expect(entry.tags).toEqual(['123'])
    expect(entry._scalarFields).toContain('tags')
  })

  it('coerces boolean scalar tags to ["true"] and flags it in _scalarFields', () => {
    const raw = '---\nschema: 1\nid: x\ndate: "2026-01-01"\nslug: x\ntask: t\ntags: true\n---\nbody'
    const entry = parseEntry('/fake/20260101-x.md', raw)
    expect(entry.tags).toEqual(['true'])
    expect(entry._scalarFields).toContain('tags')
  })
})

describe('parseEntry — id/slug normalization (non-string YAML scalars)', () => {
  it('normalizes an unquoted all-digit id (YAML number) to a string', () => {
    const raw = '---\nschema: 1\nid: 20260101\ndate: "2026-01-01"\nslug: foo\ntask: t\n---\nbody'
    const entry = parseEntry('/fake/20260101-foo.md', raw)
    expect(typeof entry.id).toBe('string')
    expect(entry.id).toBe('20260101')
  })

  it('normalizes an unquoted date-like id (YAML Date) to a YYYY-MM-DD string', () => {
    const raw = '---\nschema: 1\nid: 2026-01-02\ndate: "2026-01-02"\nslug: foo\ntask: t\n---\nbody'
    const entry = parseEntry('/fake/20260102-foo.md', raw)
    expect(typeof entry.id).toBe('string')
    expect(entry.id).toBe('2026-01-02')
  })

  it('normalizes a numeric slug to a string and keeps missing id/slug undefined', () => {
    const raw = '---\nschema: 1\nid: x\ndate: "2026-01-01"\nslug: 42\ntask: t\n---\nbody'
    const entry = parseEntry('/fake/20260101-x.md', raw)
    expect(entry.slug).toBe('42')

    const rawMissing = '---\nschema: 1\ntask: t\n---\nbody'
    const missing = parseEntry('/fake/20260101-y.md', rawMissing)
    expect(missing.id).toBeUndefined()
    expect(missing.slug).toBeUndefined()
  })
})

describe('parseEntry — _sections is code-fence aware', () => {
  it('does not register a canonical heading that appears only inside a fence', () => {
    const raw = [
      '---',
      'schema: 1',
      'id: x',
      'date: "2026-01-01"',
      'slug: x',
      'task: t',
      '---',
      '## What changed',
      '- documented the entry format',
      '',
      '```markdown',
      '## Verify-later / follow-ups',
      '- [ ] example item',
      '```',
    ].join('\n')
    const entry = parseEntry('/fake/20260101-x.md', raw)
    expect(entry._sections).toContain('## What changed')
    expect(entry._sections).not.toContain('## Verify-later / follow-ups')
  })

  it('still registers a real heading that follows a fenced example', () => {
    const raw = [
      '---',
      'schema: 1',
      '---',
      '```',
      '## Gotchas / risks',
      '```',
      '## Gotchas / risks',
      '- a real gotcha',
    ].join('\n')
    const entry = parseEntry('/fake/20260101-x.md', raw)
    expect(entry._sections).toContain('## Gotchas / risks')
  })
})

describe('parseEntry — array tags (no scalar coercion)', () => {
  it('does NOT include "tags" in _scalarFields when tags is already an array', () => {
    const raw = '---\nschema: 1\nid: x\ndate: "2026-01-01"\nslug: x\ntask: t\ntags: [schema, storage]\n---\nbody'
    const entry = parseEntry('/fake/20260101-x.md', raw)
    expect(entry._scalarFields).not.toContain('tags')
  })
})

describe('parseEntry — malformed YAML', () => {
  it('returns { _parseError: true } without throwing on malformed YAML', () => {
    const raw = '---\ntags: {unclosed\n---\nbody'
    let entry: ReturnType<typeof parseEntry> | undefined
    let threw = false
    try {
      entry = parseEntry('/fake/malformed.md', raw)
    } catch {
      threw = true
    }
    expect(threw).toBe(false)
    expect(entry?._parseError).toBe(true)
  })

  it('populates _file and _stem even on parse error', () => {
    const raw = '---\ntags: {unclosed\n---\nbody'
    const entry = parseEntry('/fake/path/20260101-bad.md', raw)
    expect(entry._file).toBe('/fake/path/20260101-bad.md')
    expect(entry._stem).toBe('20260101-bad')
  })
})

describe('parseEntry — no frontmatter', () => {
  it('returns ParsedEntry without _parseError when there is no frontmatter', () => {
    const raw = 'Just some plain markdown with no frontmatter at all.'
    const entry = parseEntry('/fake/20260101-plain.md', raw)
    expect(entry._parseError).toBeUndefined()
    expect(entry.schema).toBeUndefined()
    expect(entry._stem).toBe('20260101-plain')
  })
})

describe('parseEntry — _stem extraction', () => {
  it('extracts _stem correctly from various paths', () => {
    const raw = '---\nschema: 1\n---\n'
    const entry = parseEntry('/some/dir/20260601-my-task.md', raw)
    expect(entry._stem).toBe('20260601-my-task')
  })
})

describe('parseEntry — frontmatter is YAML only (no language suffix, no eval)', () => {
  // gray-matter (dropped in v1.4) picked a parser from the language after the
  // opening delimiter and its javascript engine was a direct eval(): a `---js`
  // entry executed inside validate/index/recall (v1.3 audit). The splitter
  // never evaluates anything — the probe below must stay unset forever.
  const PROBE = '__whydoneFrontmatterEvalProbe'
  const jsEntry = (lang: string) =>
    `---${lang}\n(globalThis.${PROBE} = true, { schema: 1, id: "20260101-x", date: "2026-01-01", slug: "x", task: "looks normal" })\n---\nbody`

  afterEach(() => {
    delete (globalThis as Record<string, unknown>)[PROBE]
  })

  it('a ---js frontmatter is a parse error and its code never runs', () => {
    const entry = parseEntry('/fake/20260101-x.md', jsEntry('js'))
    expect(entry._parseError).toBe(true)
    expect(entry.schema).toBeUndefined()
    expect(entry.task).toBeUndefined()
    expect((globalThis as Record<string, unknown>)[PROBE]).toBeUndefined()
  })

  it('---javascript and ---JS spellings are refused the same way', () => {
    for (const lang of ['javascript', 'JS', 'JavaScript']) {
      const entry = parseEntry('/fake/20260101-x.md', jsEntry(lang))
      expect(entry._parseError, lang).toBe(true)
      expect((globalThis as Record<string, unknown>)[PROBE], lang).toBeUndefined()
    }
  })

  it('---json is refused too — the contract says YAML, and a JSON block would be a lie about the format', () => {
    const raw = '---json\n{"schema": 1, "id": "20260101-x", "date": "2026-01-01", "slug": "x", "task": "t"}\n---\nbody'
    const entry = parseEntry('/fake/20260101-x.md', raw)
    expect(entry._parseError).toBe(true)
  })

  it('an explicit ---yaml language still parses (the one suffix the contract allows)', () => {
    const entry = parseEntry('/fake/20260101-x.md', '---yaml\nschema: 1\ntask: t\n---\nbody')
    expect(entry._parseError).toBeUndefined()
    expect(entry.schema).toBe(1)
    expect(entry.task).toBe('t')
  })

  it('splitFrontmatter (the body reader used by recall) throws on ---js instead of evaluating it', () => {
    expect(() => splitFrontmatter(jsEntry('js'))).toThrow(/YAML only/)
    expect((globalThis as Record<string, unknown>)[PROBE]).toBeUndefined()
  })

  it('splitFrontmatter treats non-object frontmatter (a bare scalar) as empty data, not a crash', () => {
    const { data, content } = splitFrontmatter('---\njust a string\n---\nbody')
    expect(data).toEqual({})
    expect(content).toBe('body')
  })
})

describe('parseEntry — reserved computed keys in frontmatter are ignored', () => {
  it('_parseError: true in frontmatter does not turn a valid entry into a parse error', () => {
    const raw = '---\nschema: 1\nid: 20260102-x\ndate: "2026-01-02"\nslug: x\ntask: t\n_parseError: true\n---\n## What changed\n- y\n'
    const entry = parseEntry('/fake/20260102-x.md', raw)
    expect(entry._parseError).toBeUndefined()
    expect(entry.task).toBe('t')
    expect(entry._sections).toEqual(['## What changed'])
  })

  it('_sections / _scalarFields / _file / _stem in frontmatter are recomputed, never trusted', () => {
    const raw =
      '---\nschema: 1\nid: 20260102-x\ndate: "2026-01-02"\nslug: x\ntask: t\ntags: [a]\n_sections: [bogus]\n_scalarFields: [tags]\n_file: /elsewhere.md\n_stem: other\nfuture_field: keep-me\n---\nbody'
    const entry = parseEntry('/fake/20260102-x.md', raw)
    expect(entry._sections).toEqual([])
    expect(entry._scalarFields).toEqual([])
    expect(entry._file).toBe('/fake/20260102-x.md')
    expect(entry._stem).toBe('20260102-x')
    // Unknown keys outside the computed namespace are still preserved.
    expect(entry.future_field).toBe('keep-me')
  })
})
