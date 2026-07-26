/**
 * v0.4 local-storage tests: the git-exclude lib, `init --local`, and the
 * `hide` / `publish` pair. Real temp dirs + real `git init` — the whole
 * feature is about actual git visibility, so nothing is mocked.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { spawnSync } from 'node:child_process'
import { mkdtemp, rm, readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import {
  ensureExcluded,
  removeExcluded,
  readExcludedLines,
  isTracked,
  resolveExcludePath,
} from '../src/lib/git-exclude.js'
import initCommand from '../src/commands/init.js'
import hideCommand from '../src/commands/hide.js'
import publishCommand from '../src/commands/publish.js'

function git(cwd: string, ...argv: string[]): void {
  const res = spawnSync('git', argv, { cwd, encoding: 'utf-8' })
  if (res.status !== 0) throw new Error(`git ${argv.join(' ')} failed: ${res.stderr}`)
}

/** git status --porcelain, trimmed lines. */
function gitStatus(cwd: string): string[] {
  const res = spawnSync('git', ['status', '--porcelain'], { cwd, encoding: 'utf-8' })
  return res.stdout.split('\n').filter((l) => l.trim() !== '')
}

async function runCmd(cmd: unknown, projectDir: string, args: Record<string, unknown>): Promise<void> {
  const originalCwd = process.cwd()
  process.chdir(projectDir)
  try {
    await (cmd as any).run({
      args: { 'dry-run': false, quiet: true, 'no-color': true, ...args },
    })
  } finally {
    process.chdir(originalCwd)
  }
}

const INIT_DEFAULTS = {
  force: false,
  global: false,
  yes: false,
  hook: true,
  local: false,
}

describe('git-exclude lib', () => {
  let repo: string

  beforeEach(async () => {
    repo = await mkdtemp(path.join(tmpdir(), 'whydone-exclude-test-'))
    git(repo, 'init', '-q')
  })

  afterEach(async () => {
    await rm(repo, { recursive: true, force: true })
  })

  it('resolves the exclude path inside .git and returns null outside a repo', async () => {
    expect(resolveExcludePath(repo)).toContain(path.join('.git', 'info', 'exclude'))
    const notRepo = await mkdtemp(path.join(tmpdir(), 'whydone-norepo-'))
    try {
      expect(resolveExcludePath(notRepo)).toBeNull()
    } finally {
      await rm(notRepo, { recursive: true, force: true })
    }
  })

  it('ensureExcluded writes a marker-delimited block and actually hides the path', async () => {
    await mkdir(path.join(repo, '.whydone'))
    await writeFile(path.join(repo, '.whydone', 'x.md'), 'x', 'utf-8')
    expect(gitStatus(repo).length).toBeGreaterThan(0)

    await ensureExcluded(repo, ['.whydone/'])

    expect(gitStatus(repo)).toEqual([])
    const excl = await readFile(resolveExcludePath(repo)!, 'utf-8')
    expect(excl).toContain('# whydone:start')
    expect(excl).toContain('/.whydone/')
    expect(excl).toContain('# whydone:end')
  })

  it('is idempotent and preserves foreign exclude content', async () => {
    const exclPath = resolveExcludePath(repo)!
    await mkdir(path.dirname(exclPath), { recursive: true })
    await writeFile(exclPath, 'user-stuff.txt\n', 'utf-8')

    await ensureExcluded(repo, ['.whydone/'])
    await ensureExcluded(repo, ['.whydone/', 'CLAUDE.md'])

    const excl = await readFile(exclPath, 'utf-8')
    expect(excl).toContain('user-stuff.txt')
    expect(excl.match(/# whydone:start/g)).toHaveLength(1)
    expect(await readExcludedLines(repo)).toEqual(['/.whydone/', '/CLAUDE.md'])
  })

  it('removeExcluded drops lines and the whole block when empty', async () => {
    await ensureExcluded(repo, ['.whydone/', 'CLAUDE.md'])
    await removeExcluded(repo, ['CLAUDE.md'])
    expect(await readExcludedLines(repo)).toEqual(['/.whydone/'])

    await removeExcluded(repo, ['.whydone/'])
    expect(await readExcludedLines(repo)).toEqual([])
    const excl = await readFile(resolveExcludePath(repo)!, 'utf-8')
    expect(excl).not.toContain('# whydone:start')
  })

  it('isTracked distinguishes tracked from untracked', async () => {
    await writeFile(path.join(repo, 'a.txt'), 'a', 'utf-8')
    expect(isTracked(repo, 'a.txt')).toBe(false)
    git(repo, 'add', 'a.txt')
    expect(isTracked(repo, 'a.txt')).toBe(true)
  })
})

describe('init --local', () => {
  let repo: string

  beforeEach(async () => {
    repo = await mkdtemp(path.join(tmpdir(), 'whydone-initlocal-test-'))
    git(repo, 'init', '-q')
  })

  afterEach(async () => {
    await rm(repo, { recursive: true, force: true })
  })

  it('journal-only --local: scaffold is invisible to git and storage is recorded', async () => {
    await runCmd(initCommand, repo, { ...INIT_DEFAULTS, 'journal-only': true, local: true })

    expect(existsSync(path.join(repo, '.whydone', 'INDEX.md'))).toBe(true)
    expect(existsSync(path.join(repo, 'CLAUDE.md'))).toBe(true)
    // The whole point: nothing shows up in git.
    expect(gitStatus(repo)).toEqual([])

    const config = JSON.parse(await readFile(path.join(repo, '.whydone', 'config.json'), 'utf-8'))
    expect(config.storage).toBe('local')
    expect(await readExcludedLines(repo)).toContain('/.whydone/')
    expect(await readExcludedLines(repo)).toContain('/CLAUDE.md')
  })

  it('with a TRACKED CLAUDE.md: journal hidden, CLAUDE.md not excluded (marker visible by design)', async () => {
    await writeFile(path.join(repo, 'CLAUDE.md'), '# proj\n', 'utf-8')
    git(repo, 'add', 'CLAUDE.md')
    git(repo, '-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'init')

    await runCmd(initCommand, repo, { ...INIT_DEFAULTS, 'journal-only': true, local: true })

    const lines = await readExcludedLines(repo)
    expect(lines).toContain('/.whydone/')
    expect(lines).not.toContain('/CLAUDE.md')
    // journal invisible, but the marker edit IS visible — the documented trade-off
    const status = gitStatus(repo).join('\n')
    expect(status).not.toContain('.whydone')
    expect(status).toContain('CLAUDE.md')
  })

  it('bare re-run without --local keeps storage: local (never silently re-publishes)', async () => {
    await runCmd(initCommand, repo, { ...INIT_DEFAULTS, 'journal-only': true, local: true })
    await runCmd(initCommand, repo, { ...INIT_DEFAULTS, 'journal-only': true })

    const config = JSON.parse(await readFile(path.join(repo, '.whydone', 'config.json'), 'utf-8'))
    expect(config.storage).toBe('local')
    expect(await readExcludedLines(repo)).toContain('/.whydone/')
  })

  it('--local without a git repo still records storage and does not crash', async () => {
    const noRepo = await mkdtemp(path.join(tmpdir(), 'whydone-nogit-test-'))
    try {
      await runCmd(initCommand, noRepo, { ...INIT_DEFAULTS, 'journal-only': true, local: true })
      const config = JSON.parse(await readFile(path.join(noRepo, '.whydone', 'config.json'), 'utf-8'))
      expect(config.storage).toBe('local')
    } finally {
      await rm(noRepo, { recursive: true, force: true })
    }
  })
})

describe('v1.0 hardening', () => {
  let repo: string

  beforeEach(async () => {
    repo = await mkdtemp(path.join(tmpdir(), 'whydone-harden-test-'))
    git(repo, 'init', '-q')
  })

  afterEach(async () => {
    await rm(repo, { recursive: true, force: true })
  })

  it('init --local refuses when .whydone/ is already tracked (same contract as hide)', async () => {
    await runCmd(initCommand, repo, { ...INIT_DEFAULTS, 'journal-only': true })
    git(repo, 'add', '.whydone')
    git(repo, '-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'journal')

    const originalExit = process.exit
    let exitCode: number | undefined
    // @ts-ignore
    process.exit = (code?: number) => { exitCode = code; throw new Error('exit-called') }
    try {
      await expect(
        runCmd(initCommand, repo, { ...INIT_DEFAULTS, 'journal-only': true, local: true }),
      ).rejects.toThrow('exit-called')
      expect(exitCode).toBe(1)
    } finally {
      process.exit = originalExit
    }
    // nothing was hidden, config untouched (no storage: local leak into the tracked file)
    expect(await readExcludedLines(repo)).toEqual([])
    const config = JSON.parse(await readFile(path.join(repo, '.whydone', 'config.json'), 'utf-8'))
    expect(config.storage ?? 'committed').toBe('committed')
  })

  it('a stray lone END marker above the block does not break reads or duplicate blocks', async () => {
    const exclPath = resolveExcludePath(repo)!
    await mkdir(path.dirname(exclPath), { recursive: true })
    await writeFile(exclPath, '# whydone:end\nuser-line.txt\n', 'utf-8')

    await ensureExcluded(repo, ['.whydone/'])
    await ensureExcluded(repo, ['.whydone/'])

    const content = await readFile(exclPath, 'utf-8')
    expect(content.match(/# whydone:start/g)).toHaveLength(1)
    expect(content.match(/# whydone:end/g)).toHaveLength(1)
    expect(content).toContain('user-line.txt')
    expect(await readExcludedLines(repo)).toEqual(['/.whydone/'])

    await removeExcluded(repo, ['.whydone/'])
    expect(await readExcludedLines(repo)).toEqual([])
  })

  it('CRLF-normalized exclude file still round-trips hide -> publish', async () => {
    await ensureExcluded(repo, ['.whydone/'])
    const exclPath = resolveExcludePath(repo)!
    const crlf = (await readFile(exclPath, 'utf-8')).replace(/\n/g, '\r\n')
    await writeFile(exclPath, crlf, 'utf-8')

    expect(await readExcludedLines(repo)).toEqual(['/.whydone/'])
    await removeExcluded(repo, ['.whydone/'])
    expect(await readExcludedLines(repo)).toEqual([])
  })
})

describe('hide / publish round-trip', () => {
  let repo: string

  beforeEach(async () => {
    repo = await mkdtemp(path.join(tmpdir(), 'whydone-hidepub-test-'))
    git(repo, 'init', '-q')
  })

  afterEach(async () => {
    await rm(repo, { recursive: true, force: true })
  })

  it('hide makes an untracked journal invisible; publish reverses and keeps mode', async () => {
    await runCmd(initCommand, repo, { ...INIT_DEFAULTS, 'journal-only': true, mode: 'auto' })
    expect(gitStatus(repo).length).toBeGreaterThan(0)

    await runCmd(hideCommand, repo, {})
    expect(gitStatus(repo)).toEqual([])
    let config = JSON.parse(await readFile(path.join(repo, '.whydone', 'config.json'), 'utf-8'))
    expect(config).toMatchObject({ mode: 'auto', storage: 'local' })

    await runCmd(publishCommand, repo, {})
    expect(gitStatus(repo).length).toBeGreaterThan(0)
    config = JSON.parse(await readFile(path.join(repo, '.whydone', 'config.json'), 'utf-8'))
    expect(config).toMatchObject({ mode: 'auto', storage: 'committed' })
    expect(await readExcludedLines(repo)).toEqual([])
    // publish restores the marker even if the user had stripped it
    const claudeMd = await readFile(path.join(repo, 'CLAUDE.md'), 'utf-8')
    expect(claudeMd).toContain('<!-- whydone:start -->')
  })

  it('hide refuses when .whydone/ is already tracked', async () => {
    await runCmd(initCommand, repo, { ...INIT_DEFAULTS, 'journal-only': true })
    git(repo, 'add', '.whydone')
    git(repo, '-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'journal')

    const exitSpy = { code: undefined as number | undefined }
    const originalExit = process.exit
    // @ts-ignore
    process.exit = (code?: number) => {
      exitSpy.code = code
      throw new Error('exit-called')
    }
    try {
      await expect(runCmd(hideCommand, repo, {})).rejects.toThrow('exit-called')
      expect(exitSpy.code).toBe(1)
    } finally {
      process.exit = originalExit
    }
    // nothing was excluded
    expect(await readExcludedLines(repo)).toEqual([])
  })

  it('uninstall --purge cleans the exclude block; plain uninstall leaves it (journal stays hidden)', async () => {
    // Full init (writes the lock uninstall requires) + local storage.
    await runCmd(initCommand, repo, { ...INIT_DEFAULTS, local: true })
    expect(await readExcludedLines(repo)).toContain('/.whydone/')

    const { default: uninstallCommand } = await import('../src/commands/uninstall.js')
    await runCmd(uninstallCommand, repo, { purge: false, global: false })
    // no --purge: the hidden journal survives, so its exclusion MUST survive too
    expect(await readExcludedLines(repo)).toContain('/.whydone/')

    await runCmd(initCommand, repo, { ...INIT_DEFAULTS, local: true, force: true })
    await runCmd(uninstallCommand, repo, { purge: true, global: false })
    expect(await readExcludedLines(repo)).toEqual([])
    expect(existsSync(path.join(repo, '.whydone'))).toBe(false)
  })
})
