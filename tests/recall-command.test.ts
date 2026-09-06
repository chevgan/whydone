/**
 * Integration tests for src/commands/recall.ts
 *
 * Uses real temp directories (os.mkdtemp) — no fs mocking. Coverage per
 * 04-DESIGN.md §7: --json shape, plain output lines, empty dir, parse
 * errors, path traversal exit 1, read-only guarantee (mtimes unchanged),
 * zero-arg = 5 newest, --files repeatable+csv merge semantics, and the
 * buildManifestEntries refactor (buildManifest stays a byte-identical
 * thin wrapper).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtemp, mkdir, rm, writeFile, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import recallCommand, {
  collectRepeatedFlag,
  executeRecall,
  mergeCsvFlag,
} from '../src/commands/recall.js'
import { buildManifest, buildManifestEntries } from '../src/commands/build-index.js'
import { normalizePath } from '../src/lib/rank-entries.js'
import type { ParsedEntry } from '../src/types.js'

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface EntrySpec {
  stem: string
  date: string
  slug: string
  task: string
  tags?: string[]
  files?: string[]
  supersedes?: string[]
  body?: string
}

function entryContent(spec: EntrySpec): string {
  const lines = [
    '---',
    'schema: 1',
    `id: ${spec.stem}`,
    `date: "${spec.date}"`,
    `slug: ${spec.slug}`,
    `task: "${spec.task}"`,
    'status: done',
  ]
  if (spec.tags) lines.push(`tags: [${spec.tags.join(', ')}]`)
  if (spec.files) lines.push(`files: [${spec.files.join(', ')}]`)
  if (spec.supersedes) lines.push(`supersedes: [${spec.supersedes.join(', ')}]`)
  lines.push('---', '', spec.body ?? '## What changed\nSomething.')
  return lines.join('\n') + '\n'
}

async function writeEntry(changelogDir: string, spec: EntrySpec): Promise<void> {
  await writeFile(path.join(changelogDir, `${spec.stem}.md`), entryContent(spec), 'utf-8')
}

const defaultArgs = {
  path: '.whydone',
  query: undefined,
  files: undefined,
  tags: undefined,
  limit: '5',
  all: false,
  json: false,
  quiet: false,
  'no-color': true,
  'dry-run': false,
}

/** Run the recall command's run() in projectDir, capturing stdout/stderr. */
async function runRecall(
  projectDir: string,
  args: Record<string, unknown> = {},
  rawArgs?: string[],
): Promise<{ stdout: string; stderr: string }> {
  const originalCwd = process.cwd()
  process.chdir(projectDir)
  let stdout = ''
  let stderr = ''
  const outSpy = vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
    stdout += String(chunk)
    return true
  })
  const errSpy = vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
    stderr += String(chunk)
    return true
  })
  try {
    await (recallCommand as any).run({ args: { ...defaultArgs, ...args }, rawArgs })
  } finally {
    outSpy.mockRestore()
    errSpy.mockRestore()
    process.chdir(originalCwd)
  }
  return { stdout, stderr }
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('recall command', () => {
  let projectDir: string
  let changelogDir: string

  beforeEach(async () => {
    projectDir = await mkdtemp(path.join(tmpdir(), 'whydone-recall-test-'))
    changelogDir = path.join(projectDir, '.whydone')
    await mkdir(changelogDir)
  })

  afterEach(async () => {
    await rm(projectDir, { recursive: true, force: true })
  })

  // ─── --json shape ──────────────────────────────────────────────────────────

  it('--json output has the exact report shape', async () => {
    await writeEntry(changelogDir, {
      stem: '20260701-fix-auth',
      date: '2026-07-01',
      slug: 'fix-auth',
      task: 'Fix auth',
      tags: ['auth'],
      files: ['src/auth.ts'],
      body: [
        '## What changed',
        'Fixed the token refresh.',
        '',
        '## Verify-later / follow-ups',
        '- [ ] check expiry',
        '- [ ] verify CI',
        '- [x] already done',
      ].join('\n'),
    })

    const { stdout } = await runRecall(projectDir, {
      json: true,
      query: 'auth',
      files: 'src/auth.ts',
    })
    const report = JSON.parse(stdout)

    expect(Object.keys(report)).toEqual([
      'total',
      'eligible',
      'returned',
      'query',
      'results',
      'parseErrors',
    ])
    expect(report.total).toBe(1)
    expect(report.eligible).toBe(1)
    expect(report.returned).toBe(1)
    expect(report.query).toEqual({ terms: ['auth'], files: ['src/auth.ts'], tags: [] })
    expect(report.parseErrors).toEqual([])

    const result = report.results[0]
    expect(Object.keys(result)).toEqual([
      'id',
      'file',
      'date',
      'task',
      'status',
      'tags',
      'files',
      'score',
      'components',
      'superseded',
      'supersededBy',
      'hasVerifyLater',
      'openFollowUps',
    ])
    expect(result.id).toBe('20260701-fix-auth')
    expect(result.file).toBe(path.join('.whydone', '20260701-fix-auth.md'))
    expect(result.date).toBe('2026-07-01')
    expect(result.status).toBe('done')
    expect(result.components).toEqual({ files: 1, tags: 0, keywords: 1, recency: 1 })
    // signal = 3*1 + 2*0 + 2*1 = 5; score = 5 + 1*1 = 6
    expect(result.score).toBe(6)
    expect(result.superseded).toBe(false)
    expect(result.supersededBy).toEqual([])
    expect(result.hasVerifyLater).toBe(true)
    expect(result.openFollowUps).toBe(2)
  })

  // ─── plain output ──────────────────────────────────────────────────────────

  it('plain mode prints one line per hit plus a summary line', async () => {
    await writeEntry(changelogDir, {
      stem: '20260702-newer',
      date: '2026-07-02',
      slug: 'newer',
      task: 'Newer task',
    })
    await writeEntry(changelogDir, {
      stem: '20260701-older',
      date: '2026-07-01',
      slug: 'older',
      task: 'Older task',
      supersedes: ['20260630-gone'],
      body: ['## Verify-later / follow-ups', '- [ ] one open item'].join('\n'),
    })

    const { stdout } = await runRecall(projectDir)
    const lines = stdout.trim().split('\n')

    expect(lines[0]).toBe(
      `1. ${path.join('.whydone', '20260702-newer.md')}  1  [done]  Newer task`,
    )
    expect(lines[1]).toContain('20260701-older.md')
    expect(lines[1]).toContain('(1 open follow-up)')
    expect(lines[lines.length - 1]).toBe('2/2 of 2; 0 unreadable')
  })

  it('plain mode marks superseded entries with (superseded-><id>)', async () => {
    await writeEntry(changelogDir, {
      stem: '20260702-successor',
      date: '2026-07-02',
      slug: 'successor',
      task: 'Successor',
      supersedes: ['20260701-stale'],
    })
    await writeEntry(changelogDir, {
      stem: '20260701-stale',
      date: '2026-07-01',
      slug: 'stale',
      task: 'Stale entry',
    })

    const { stdout } = await runRecall(projectDir)
    expect(stdout).toContain('(superseded->20260702-successor)')
  })

  // ─── empty journal ─────────────────────────────────────────────────────────

  it('empty dir: exit 0, total 0, plain-mode stderr message', async () => {
    const exitSpy = vi.spyOn(process, 'exit')
    const { stdout, stderr } = await runRecall(projectDir)
    expect(exitSpy).not.toHaveBeenCalled()
    exitSpy.mockRestore()
    expect(stderr).toContain('No entries found in .whydone')
    expect(stdout).toBe('')
  })

  it('empty dir with --json reports total 0', async () => {
    const { stdout } = await runRecall(projectDir, { json: true })
    const report = JSON.parse(stdout)
    expect(report.total).toBe(0)
    expect(report.results).toEqual([])
  })

  // ─── parse errors ──────────────────────────────────────────────────────────

  it('parse-error entry lands in parseErrors, not results', async () => {
    await writeEntry(changelogDir, {
      stem: '20260701-good',
      date: '2026-07-01',
      slug: 'good',
      task: 'Good entry',
    })
    await writeFile(
      path.join(changelogDir, '20260615-broken.md'),
      '---\ntags: {unclosed\n---\nbody\n',
      'utf-8',
    )

    const { stdout } = await runRecall(projectDir, { json: true })
    const report = JSON.parse(stdout)
    expect(report.parseErrors).toEqual(['20260615-broken'])
    // total counts EVERY entry file including parse errors — total: 0 must
    // mean "truly empty journal", never "journal fully corrupted".
    expect(report.total).toBe(2)
    expect(report.results.map((r: { id: string }) => r.id)).toEqual(['20260701-good'])
  })

  it('journal with ONLY malformed entries reports total > 0 (not "empty")', async () => {
    // Content differs from the previous test: gray-matter caches parses by
    // input string, and a post-throw cache hit would return an empty parse.
    await writeFile(
      path.join(changelogDir, '20260615-broken.md'),
      '---\ntags: {unclosed-only-malformed\n---\nbody\n',
      'utf-8',
    )

    const { stdout } = await runRecall(projectDir, { json: true })
    const report = JSON.parse(stdout)
    expect(report.total).toBe(1)
    expect(report.parseErrors).toEqual(['20260615-broken'])
    expect(report.results).toEqual([])
  })

  it('a ---js frontmatter entry is a parse error and its code never runs (gray-matter eval lockdown)', async () => {
    const PROBE = '__whydoneRecallEvalProbe'
    await writeEntry(changelogDir, {
      stem: '20260701-good',
      date: '2026-07-01',
      slug: 'good',
      task: 'Good entry',
    })
    // A frontmatter "language" of js makes gray-matter eval() the block. The
    // payload sets a global AND returns a perfectly valid-looking entry, so a
    // successful parse would even rank it as a normal result.
    await writeFile(
      path.join(changelogDir, '20260702-evil.md'),
      `---js\n(globalThis.${PROBE} = true, { schema: 1, id: "20260702-evil", date: "2026-07-02", slug: "evil", task: "looks normal" })\n---\n## What changed\n- nothing\n`,
      'utf-8',
    )

    const { stdout } = await runRecall(projectDir, { json: true })
    const report = JSON.parse(stdout)
    expect((globalThis as Record<string, unknown>)[PROBE]).toBeUndefined()
    expect(report.parseErrors).toEqual(['20260702-evil'])
    expect(report.total).toBe(2)
    expect(report.results.map((r: { id: string }) => r.id)).toEqual(['20260701-good'])
  })

  // ─── lenient read: non-string frontmatter scalars never crash ──────────────

  it('YAML-valid entry with numeric task/slug is coerced, not a crash', async () => {
    await writeFile(
      path.join(changelogDir, '20260701-weird.md'),
      '---\nschema: 1\nid: 20260701-weird\ndate: "2026-07-01"\nslug: 42\ntask: 12345\n---\nbody mentions auth\n',
      'utf-8',
    )

    const { stdout } = await runRecall(projectDir, { json: true, query: 'auth' })
    const report = JSON.parse(stdout)
    expect(report.parseErrors).toEqual([])
    expect(report.total).toBe(1)
    expect(report.results[0].task).toBe('12345')
    expect(report.results[0].slug).toBeUndefined() // slug is not an output field
    expect(report.results[0].id).toBe('20260701-weird')
  })

  // ─── path traversal ────────────────────────────────────────────────────────

  it('path traversal exits 1 with the index-identical message', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`exit:${code}`)
    }) as never)
    try {
      await expect(runRecall(projectDir, { path: '../outside' })).rejects.toThrow('exit:1')
    } finally {
      exitSpy.mockRestore()
    }
  })

  // ─── read-only guarantee ───────────────────────────────────────────────────

  it('never writes: mtimes of INDEX.md, manifest.json and the dir unchanged', async () => {
    await writeEntry(changelogDir, {
      stem: '20260701-entry',
      date: '2026-07-01',
      slug: 'entry',
      task: 'Some entry',
    })
    const indexPath = path.join(changelogDir, 'INDEX.md')
    const manifestPath = path.join(changelogDir, 'manifest.json')
    await writeFile(indexPath, '| stale index |\n', 'utf-8')
    await writeFile(manifestPath, '[]\n', 'utf-8')

    const before = await Promise.all([stat(indexPath), stat(manifestPath), stat(changelogDir)])
    await runRecall(projectDir, { query: 'entry', json: true })
    const after = await Promise.all([stat(indexPath), stat(manifestPath), stat(changelogDir)])

    expect(after[0].mtimeMs).toBe(before[0].mtimeMs)
    expect(after[1].mtimeMs).toBe(before[1].mtimeMs)
    expect(after[2].mtimeMs).toBe(before[2].mtimeMs)
  })

  // ─── zero-arg = 5 newest ───────────────────────────────────────────────────

  it('zero-arg returns the 5 newest entries', async () => {
    for (let day = 1; day <= 7; day++) {
      const dd = String(day).padStart(2, '0')
      await writeEntry(changelogDir, {
        stem: `202607${dd}-entry-${dd}`,
        date: `2026-07-${dd}`,
        slug: `entry-${dd}`,
        task: `Task ${dd}`,
      })
    }

    const report = await executeRecall(changelogDir, { files: [], tags: [], limit: 5 })
    expect(report.total).toBe(7)
    expect(report.eligible).toBe(7)
    expect(report.returned).toBe(5)
    expect(report.results.map((r) => r.id)).toEqual([
      '20260707-entry-07',
      '20260706-entry-06',
      '20260705-entry-05',
      '20260704-entry-04',
      '20260703-entry-03',
    ])
  })

  // ─── filters narrow ────────────────────────────────────────────────────────

  it('filters given with nothing matching: eligible 0, no padding', async () => {
    await writeEntry(changelogDir, {
      stem: '20260701-entry',
      date: '2026-07-01',
      slug: 'entry',
      task: 'Unrelated task',
    })

    const report = await executeRecall(changelogDir, {
      query: 'zzznomatch',
      files: [],
      tags: [],
      limit: 5,
    })
    expect(report.total).toBe(1)
    expect(report.eligible).toBe(0)
    expect(report.results).toEqual([])
  })

  // ─── --files merge semantics ───────────────────────────────────────────────

  describe('mergeCsvFlag — repeatable + csv union + dedupe', () => {
    it('splits each occurrence on commas and unions', () => {
      expect(mergeCsvFlag(['src/a.ts,src/b.ts', 'src/c.ts'], normalizePath)).toEqual([
        'src/a.ts',
        'src/b.ts',
        'src/c.ts',
      ])
    })

    it('dedupes after normalization (./ and \\ variants collapse)', () => {
      expect(mergeCsvFlag(['./src/a.ts,src\\a.ts', 'src/a.ts'], normalizePath)).toEqual([
        'src/a.ts',
      ])
    })

    it('handles a single string occurrence', () => {
      expect(mergeCsvFlag('src/a.ts, src/b.ts', normalizePath)).toEqual(['src/a.ts', 'src/b.ts'])
    })

    it('lowercases tags via the transform and dedupes', () => {
      expect(mergeCsvFlag(['Auth,DB', 'auth'], (s) => s.toLowerCase())).toEqual(['auth', 'db'])
    })

    it('returns [] for undefined and drops empty pieces', () => {
      expect(mergeCsvFlag(undefined, normalizePath)).toEqual([])
      expect(mergeCsvFlag('a.ts,,  ,b.ts', normalizePath)).toEqual(['a.ts', 'b.ts'])
    })
  })

  describe('collectRepeatedFlag — repeated occurrences from rawArgs', () => {
    it('collects every --name value and --name=value occurrence', () => {
      expect(
        collectRepeatedFlag(
          ['--files', 'src/a.ts', '--json', '--files=src/b.ts', '--files', 'src/c.ts'],
          'files',
        ),
      ).toEqual(['src/a.ts', 'src/b.ts', 'src/c.ts'])
    })

    it('returns [] for undefined rawArgs and for absent flags', () => {
      expect(collectRepeatedFlag(undefined, 'files')).toEqual([])
      expect(collectRepeatedFlag(['--tags', 'auth'], 'files')).toEqual([])
    })

    it('does not swallow a following flag as a value', () => {
      expect(collectRepeatedFlag(['--files', '--json'], 'files')).toEqual([])
    })
  })

  it('repeated --files flags union instead of last-wins (citty parses last-wins)', async () => {
    await writeEntry(changelogDir, {
      stem: '20260701-auth',
      date: '2026-07-01',
      slug: 'auth',
      task: 'Touch auth',
      files: ['src/a.ts'],
    })
    await writeEntry(changelogDir, {
      stem: '20260702-other',
      date: '2026-07-02',
      slug: 'other',
      task: 'Other work',
      files: ['src/b.ts'],
    })

    // citty/parseArgs would deliver args.files === 'src/b.ts' (last-wins);
    // rawArgs carries both occurrences and both must count.
    const { stdout } = await runRecall(
      projectDir,
      { json: true, files: 'src/b.ts' },
      ['--files', 'src/a.ts', '--files', 'src/b.ts', '--json'],
    )
    const report = JSON.parse(stdout)
    expect(report.query.files).toEqual(['src/a.ts', 'src/b.ts'])
    expect(report.eligible).toBe(2)
  })

  // ─── stopword-only query: gate still applies ───────────────────────────────

  it('stopword-only --query yields eligible 0, never a silent recency ranking', async () => {
    await writeEntry(changelogDir, {
      stem: '20260701-entry',
      date: '2026-07-01',
      slug: 'entry',
      task: 'Some task',
    })

    const report = await executeRecall(changelogDir, {
      query: 'fix the',
      files: [],
      tags: [],
      limit: 5,
    })
    expect(report.query.terms).toEqual([])
    expect(report.total).toBe(1)
    expect(report.eligible).toBe(0)
    expect(report.results).toEqual([])
  })

  it('--files flag values are matched against entries (via run)', async () => {
    await writeEntry(changelogDir, {
      stem: '20260701-auth',
      date: '2026-07-01',
      slug: 'auth',
      task: 'Touch auth',
      files: ['src/auth.ts'],
    })
    await writeEntry(changelogDir, {
      stem: '20260702-other',
      date: '2026-07-02',
      slug: 'other',
      task: 'Other work',
      files: ['docs/readme-notes.md'],
    })

    const { stdout } = await runRecall(projectDir, { json: true, files: 'src/auth.ts' })
    const report = JSON.parse(stdout)
    expect(report.eligible).toBe(1)
    expect(report.results[0].id).toBe('20260701-auth')
  })

  // ─── buildManifestEntries refactor ─────────────────────────────────────────

  it('buildManifest output matches the pinned pre-refactor JSON byte-for-byte', () => {
    const entryA: ParsedEntry = {
      _file: '/fake/20260702-a.md',
      _stem: '20260702-a',
      id: '20260702-a',
      date: '2026-07-02',
      slug: 'a',
      task: 'task a',
      status: 'done',
      tags: ['x'],
      files: ['src/a.ts'],
      links: [],
      supersedes: ['20260701-b'],
      _sections: [],
      _scalarFields: [],
    }
    const entryB: ParsedEntry = {
      _file: '/fake/20260701-b.md',
      _stem: '20260701-b',
      id: '20260701-b',
      date: '2026-07-01',
      slug: 'b',
      task: 'task b',
      status: 'done',
      tags: [],
      files: [],
      links: [],
      supersedes: [],
      _sections: [],
      _scalarFields: [],
    }

    // Hard-coded fixture: pins field order, sort (newest-first), and the
    // _supersededBy inverse pass against the PRE-refactor output. Comparing
    // buildManifest to buildManifestEntries would be tautological — both
    // sides would drift together.
    const expected = `[
  {
    "id": "20260702-a",
    "date": "2026-07-02",
    "slug": "a",
    "task": "task a",
    "status": "done",
    "tags": [
      "x"
    ],
    "files": [
      "src/a.ts"
    ],
    "links": [],
    "supersedes": [
      "20260701-b"
    ],
    "_sections": [],
    "_parseError": false,
    "_supersededBy": []
  },
  {
    "id": "20260701-b",
    "date": "2026-07-01",
    "slug": "b",
    "task": "task b",
    "status": "done",
    "tags": [],
    "files": [],
    "links": [],
    "supersedes": [],
    "_sections": [],
    "_parseError": false,
    "_supersededBy": [
      "20260702-a"
    ]
  }
]`
    expect(buildManifest([entryA, entryB])).toBe(expected)

    const parsed = buildManifestEntries([entryA, entryB])
    expect(parsed.find((e) => e.id === '20260701-b')!._supersededBy).toEqual(['20260702-a'])
  })
})
