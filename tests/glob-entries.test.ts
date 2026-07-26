import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, writeFile, rm, mkdir } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { globEntries } from '../src/lib/glob-entries.js'

let tmpDir: string

beforeEach(async () => {
  tmpDir = await mkdtemp(path.join(os.tmpdir(), 'whydone-glob-test-'))
})

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true })
})

describe('globEntries', () => {
  it('returns empty array for empty directory', async () => {
    const entries = await globEntries(tmpDir)
    expect(entries).toEqual([])
  })

  it('returns empty array when directory contains only INDEX.md and manifest.json', async () => {
    await writeFile(path.join(tmpDir, 'INDEX.md'), '# Index\n')
    await writeFile(path.join(tmpDir, 'manifest.json'), '{}')
    const entries = await globEntries(tmpDir)
    expect(entries).toEqual([])
  })

  it('excludes INDEX.md but includes a real entry file', async () => {
    // Write a valid entry file
    const entryContent = `---\nschema: 1\nid: 20260601-test\ndate: "2026-06-01"\nslug: test\ntask: "Test task"\ntags: [test]\n---\n## What changed\n- Did something\n`
    await writeFile(path.join(tmpDir, '20260601-test.md'), entryContent)
    await writeFile(path.join(tmpDir, 'INDEX.md'), '# Index\n')

    const entries = await globEntries(tmpDir)
    expect(entries).toHaveLength(1)
    expect(entries[0]._stem).toBe('20260601-test')
  })

  it('excludes manifest.json (not a .md file, so excluded by glob pattern)', async () => {
    // manifest.json is not a .md file — it won't match *.md glob
    // but we test explicitly that adding it doesn't affect results
    const entryContent = `---\nschema: 1\nid: 20260601-entry\ndate: "2026-06-01"\nslug: entry\ntask: "An entry"\ntags: [a]\n---\nbody\n`
    await writeFile(path.join(tmpDir, '20260601-entry.md'), entryContent)
    await writeFile(path.join(tmpDir, 'manifest.json'), '{}')

    const entries = await globEntries(tmpDir)
    expect(entries).toHaveLength(1)
  })

  it('includes multiple entry files', async () => {
    const makeEntry = (stem: string) =>
      `---\nschema: 1\nid: ${stem}\ndate: "2026-06-01"\nslug: ${stem.slice(9)}\ntask: "Task"\ntags: [a]\n---\nbody\n`
    await writeFile(path.join(tmpDir, '20260601-alpha.md'), makeEntry('20260601-alpha'))
    await writeFile(path.join(tmpDir, '20260602-beta.md'), makeEntry('20260602-beta'))
    await writeFile(path.join(tmpDir, 'INDEX.md'), '# Index\n')

    const entries = await globEntries(tmpDir)
    expect(entries).toHaveLength(2)
    const stems = entries.map((e) => e._stem).sort()
    expect(stems).toEqual(['20260601-alpha', '20260602-beta'])
  })
})
