/**
 * Unit tests for src/lib/frontmatter.ts — whydone's own splitter, the v1.4
 * replacement for gray-matter. Pins every semantic SCHEMA.md §Parser Notes
 * relies on, plus the two throws the lenient read path turns into
 * _parseError: a non-YAML language suffix and an unclosed block.
 */

import { describe, it, expect } from 'vitest'
import { splitFrontmatter } from '../src/lib/frontmatter.js'

describe('splitFrontmatter — shape', () => {
  it('splits a canonical entry: mapping data, body after the closing line, one line break dropped', () => {
    const { data, content } = splitFrontmatter('---\nschema: 1\ntags: [a, b]\n---\n\n## What changed\n- x\n')
    expect(data).toEqual({ schema: 1, tags: ['a', 'b'] })
    expect(content).toBe('\n## What changed\n- x\n')
  })

  it('no frontmatter ⇒ empty data and the untouched text', () => {
    const text = 'Just some plain markdown.\n\n---\nnot a frontmatter\n'
    expect(splitFrontmatter(text)).toEqual({ data: {}, content: text })
  })

  it('empty and comments-only blocks ⇒ {}', () => {
    expect(splitFrontmatter('---\n---\nbody').data).toEqual({})
    expect(splitFrontmatter('---\n# only a comment\n---\nbody').data).toEqual({})
  })

  it('closing delimiter at EOF without a trailing newline ⇒ empty content', () => {
    expect(splitFrontmatter('---\nschema: 1\n---')).toEqual({ data: { schema: 1 }, content: '' })
  })

  it('CRLF files parse and keep CRLF in the body', () => {
    const { data, content } = splitFrontmatter('---\r\nschema: 1\r\ntask: t\r\n---\r\nbody\r\nmore\r\n')
    expect(data).toEqual({ schema: 1, task: 't' })
    expect(content).toBe('body\r\nmore\r\n')
  })

  it('a leading BOM is ignored', () => {
    expect(splitFrontmatter('\uFEFF---\nschema: 1\n---\nbody')).toEqual({ data: { schema: 1 }, content: 'body' })
  })

  it('trailing whitespace after either delimiter is tolerated', () => {
    expect(splitFrontmatter('---   \nschema: 1\n---  \nbody').data).toEqual({ schema: 1 })
  })

  it('a --- line inside the body is content, not a second delimiter', () => {
    const { content } = splitFrontmatter('---\nschema: 1\n---\ntext\n---\nmore')
    expect(content).toBe('text\n---\nmore')
  })
})

describe('splitFrontmatter — refusals (the lenient read path maps every throw to _parseError)', () => {
  it('---yaml and ---yml openers are accepted, case-insensitively', () => {
    for (const lang of ['yaml', 'yml', 'YAML']) {
      expect(splitFrontmatter(`---${lang}\nschema: 1\n---\nbody`).data, lang).toEqual({ schema: 1 })
    }
  })

  it('any other language suffix throws: ---js, ---json, ---JS, ---toml', () => {
    for (const lang of ['js', 'json', 'JS', 'javascript', 'toml']) {
      expect(() => splitFrontmatter(`---${lang}\nx: 1\n---\nbody`), lang).toThrow(/YAML only/)
    }
  })

  it('an opener without a closing line throws', () => {
    expect(() => splitFrontmatter('---\nschema: 1\nbody without a closing line\n')).toThrow(/never closed/)
    expect(() => splitFrontmatter('---')).toThrow(/never closed/)
  })

  it('YAML syntax errors propagate', () => {
    expect(() => splitFrontmatter('---\ntags: {unclosed\n---\nbody')).toThrow()
    expect(() => splitFrontmatter('---\na: 1\na: 2\n---\nbody')).toThrow(/duplicated/)
  })

  it('js-yaml stays safe by default: a !!js/function tag is refused, never evaluated', () => {
    expect(() => splitFrontmatter('---\nfn: !!js/function "function () { return 1 }"\n---\n')).toThrow()
  })
})

describe('splitFrontmatter — SCHEMA.md §Parser Notes rows', () => {
  it('non-mapping YAML (a scalar, a list) ⇒ {}', () => {
    expect(splitFrontmatter('---\njust a string\n---\nbody').data).toEqual({})
    expect(splitFrontmatter('---\n- a\n- b\n---\nbody').data).toEqual({})
  })

  it('unquoted date parses to a Date (Pitfall 1), quoted stays a string', () => {
    expect(splitFrontmatter('---\ndate: 2026-06-01\n---\n').data.date).toBeInstanceOf(Date)
    expect(splitFrontmatter('---\ndate: "2026-06-01"\n---\n').data.date).toBe('2026-06-01')
  })

  it('bare scalars stay scalars (Pitfall 2 is the reader\'s job) and yes/no stay strings', () => {
    const { data } = splitFrontmatter('---\ntags: recall\nflag: yes\nschema: 01\n---\n')
    expect(data.tags).toBe('recall')
    expect(data.flag).toBe('yes')
    expect(data.schema).toBe(1)
  })

  it('unknown keys are preserved, null and ~ read as null', () => {
    const { data } = splitFrontmatter('---\nfuture_field: x\na: null\nb: ~\n---\n')
    expect(data).toEqual({ future_field: 'x', a: null, b: null })
  })
})
