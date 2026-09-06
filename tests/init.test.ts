/**
 * Integration tests for src/commands/init.ts
 *
 * Uses real temp directories (os.mkdtemp) to exercise actual filesystem behavior.
 * No mocking of fs — these tests verify the full init lifecycle.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, readFile, access, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import initCommand from '../src/commands/init.js'

/** Run the init command's run() function in a temp directory */
async function runInit(
  projectDir: string,
  args: Record<string, unknown> = {},
): Promise<void> {
  // Temporarily override cwd to the temp project dir
  const originalCwd = process.cwd()
  process.chdir(projectDir)
  try {
    await (initCommand as any).run({ args: { force: false, global: false, 'dry-run': false, quiet: true, 'no-color': true, yes: false, hook: true, ...args } })
  } finally {
    process.chdir(originalCwd)
  }
}

/** Run init capturing stdout (non-quiet) */
async function runInitCaptured(
  projectDir: string,
  args: Record<string, unknown> = {},
): Promise<string> {
  const originalCwd = process.cwd()
  process.chdir(projectDir)
  const chunks: string[] = []
  const originalWrite = process.stdout.write.bind(process.stdout)
  // @ts-ignore
  process.stdout.write = (chunk: unknown) => { chunks.push(String(chunk)); return true }
  try {
    await (initCommand as any).run({ args: { force: false, global: false, 'dry-run': false, quiet: false, 'no-color': true, yes: false, hook: true, ...args } })
  } finally {
    // @ts-ignore
    process.stdout.write = originalWrite
    process.chdir(originalCwd)
  }
  return chunks.join('')
}

describe('init command', () => {
  let projectDir: string

  beforeEach(async () => {
    projectDir = await mkdtemp(path.join(tmpdir(), 'whydone-init-test-'))
  })

  afterEach(async () => {
    await rm(projectDir, { recursive: true, force: true })
  })

  it('creates .whydone/ directory', async () => {
    await runInit(projectDir)
    const s = await stat(path.join(projectDir, '.whydone'))
    expect(s.isDirectory()).toBe(true)
  })

  it('scaffolds a seed INDEX.md (header + separator) as promised by the README', async () => {
    await runInit(projectDir)
    const content = await readFile(path.join(projectDir, '.whydone', 'INDEX.md'), 'utf-8')
    expect(content).toContain('| date | slug | task | tags | files |')
  })

  it('never clobbers an existing INDEX.md on re-run', async () => {
    await runInit(projectDir)
    const indexPath = path.join(projectDir, '.whydone', 'INDEX.md')
    const marker = '| 2026-01-01 | real | built from entries |  |  |\n'
    await import('node:fs/promises').then((fs) => fs.appendFile(indexPath, marker, 'utf-8'))

    await runInit(projectDir)

    const content = await readFile(indexPath, 'utf-8')
    expect(content).toContain('built from entries')
  })

  it('copies log SKILL.md to .claude/skills/log/SKILL.md', async () => {
    await runInit(projectDir)
    await expect(access(path.join(projectDir, '.claude', 'skills', 'log', 'SKILL.md'))).resolves.toBeUndefined()
  })

  it('copies recall SKILL.md to .claude/skills/recall/SKILL.md', async () => {
    await runInit(projectDir)
    await expect(access(path.join(projectDir, '.claude', 'skills', 'recall', 'SKILL.md'))).resolves.toBeUndefined()
  })

  it('patches CLAUDE.md with marker block', async () => {
    await runInit(projectDir)
    const content = await readFile(path.join(projectDir, 'CLAUDE.md'), 'utf-8')
    expect(content).toContain('<!-- whydone:start -->')
    expect(content).toContain('<!-- whydone:end -->')
  })

  it('writes .claude/whydone.lock.json', async () => {
    await runInit(projectDir)
    await expect(access(path.join(projectDir, '.claude', 'whydone.lock.json'))).resolves.toBeUndefined()
  })

  it('lock-file parses as valid LockFile with scope "project"', async () => {
    await runInit(projectDir)
    const raw = await readFile(path.join(projectDir, '.claude', 'whydone.lock.json'), 'utf-8')
    const lock = JSON.parse(raw)
    expect(lock.version).toBeTruthy()
    expect(lock.scope).toBe('project')
    expect(lock.claudeMdPatched).toBe(true)
    expect(Array.isArray(lock.skills)).toBe(true)
    expect(lock.skills.length).toBeGreaterThan(0)
  })

  it('lock-file skills[] contains paths for both log and recall SKILL.md', async () => {
    await runInit(projectDir)
    const raw = await readFile(path.join(projectDir, '.claude', 'whydone.lock.json'), 'utf-8')
    const lock = JSON.parse(raw)
    const skillPaths: string[] = lock.skills
    const hasLog = skillPaths.some((p) => p.includes('log') && p.endsWith('SKILL.md'))
    const hasRecall = skillPaths.some((p) => p.includes('recall') && p.endsWith('SKILL.md'))
    expect(hasLog).toBe(true)
    expect(hasRecall).toBe(true)
  })

  it('is idempotent — second run does not duplicate CLAUDE.md marker block', async () => {
    await runInit(projectDir)
    await runInit(projectDir)
    const content = await readFile(path.join(projectDir, 'CLAUDE.md'), 'utf-8')
    const firstIdx = content.indexOf('<!-- whydone:start -->')
    const lastIdx = content.lastIndexOf('<!-- whydone:start -->')
    expect(firstIdx).toBe(lastIdx) // exactly one occurrence
  })

  it('is idempotent — second run does not duplicate skills', async () => {
    await runInit(projectDir)
    const raw1 = await readFile(path.join(projectDir, '.claude', 'whydone.lock.json'), 'utf-8')
    const lock1 = JSON.parse(raw1)
    const skillCount1 = lock1.skills.length

    await runInit(projectDir)
    const raw2 = await readFile(path.join(projectDir, '.claude', 'whydone.lock.json'), 'utf-8')
    const lock2 = JSON.parse(raw2)
    const skillCount2 = lock2.skills.length

    expect(skillCount2).toBe(skillCount1) // not duplicated
  })

  it('--force copies skills even when they already exist', async () => {
    // First run copies skills
    await runInit(projectDir)

    // Corrupt a skill file to verify --force overwrites
    const logSkillPath = path.join(projectDir, '.claude', 'skills', 'log', 'SKILL.md')
    await import('node:fs/promises').then((fs) =>
      fs.writeFile(logSkillPath, 'corrupted', 'utf-8'),
    )

    // Run with --force
    await runInit(projectDir, { force: true })

    // Skill should be restored to original content
    const content = await readFile(logSkillPath, 'utf-8')
    expect(content).not.toBe('corrupted')
    expect(content.length).toBeGreaterThan(10)
  })

  it('--dry-run does not create any files', async () => {
    const originalCwd = process.cwd()
    process.chdir(projectDir)

    const stdoutCapture: string[] = []
    const originalWrite = process.stdout.write.bind(process.stdout)
    // @ts-ignore
    process.stdout.write = (chunk: unknown) => {
      stdoutCapture.push(String(chunk))
      return true
    }

    try {
      await (initCommand as any).run({
        args: { force: false, global: false, 'dry-run': true, quiet: false, 'no-color': true },
      })
    } finally {
      // @ts-ignore
      process.stdout.write = originalWrite
      process.chdir(originalCwd)
    }

    // .whydone/ should NOT exist after dry-run
    await expect(access(path.join(projectDir, '.whydone'))).rejects.toThrow()
    // .claude/ should NOT exist after dry-run
    await expect(access(path.join(projectDir, '.claude'))).rejects.toThrow()

    // stdout should include [create] lines
    const output = stdoutCapture.join('')
    expect(output).toContain('[create]')
  })

  // ---- v0.2: config.json, wizard flags, Stop hook (design §1, §2, §10.2) ----

  describe('config and journal mode', () => {
    const configPath = () => path.join(projectDir, '.whydone', 'config.json')

    it('bare non-TTY run writes the wizard-bypassed default {configVersion:1, mode:"manual"}', async () => {
      await runInit(projectDir)
      const parsed = JSON.parse(await readFile(configPath(), 'utf-8'))
      expect(parsed).toEqual({ configVersion: 1, mode: 'manual' })
    })

    it('--mode ask writes ask AND installs the hook + launcher', async () => {
      await runInit(projectDir, { mode: 'ask' })
      const parsed = JSON.parse(await readFile(configPath(), 'utf-8'))
      expect(parsed.mode).toBe('ask')
      const settings = JSON.parse(
        await readFile(path.join(projectDir, '.claude', 'settings.local.json'), 'utf-8'),
      )
      expect(JSON.stringify(settings.hooks.Stop)).toContain('whydone-hook.cjs')
      await expect(access(path.join(projectDir, '.claude', 'whydone-hook.cjs'))).resolves.toBeUndefined()
    })

    it('--yes = mode ask + hook install', async () => {
      await runInit(projectDir, { yes: true })
      const parsed = JSON.parse(await readFile(configPath(), 'utf-8'))
      expect(parsed.mode).toBe('ask')
      const settings = JSON.parse(
        await readFile(path.join(projectDir, '.claude', 'settings.local.json'), 'utf-8'),
      )
      expect(JSON.stringify(settings.hooks.Stop)).toContain('whydone-hook.cjs')
    })

    it('--no-hook suppresses the settings write even with --mode ask', async () => {
      await runInit(projectDir, { mode: 'ask', hook: false })
      const parsed = JSON.parse(await readFile(configPath(), 'utf-8'))
      expect(parsed.mode).toBe('ask')
      await expect(access(path.join(projectDir, '.claude', 'settings.local.json'))).rejects.toThrow()
      await expect(access(path.join(projectDir, '.claude', 'whydone-hook.cjs'))).rejects.toThrow()
    })

    it('--mode banana exits 1 with the exact error', async () => {
      const originalCwd = process.cwd()
      process.chdir(projectDir)
      let exitCode: number | undefined
      const originalExit = process.exit
      process.exit = ((code?: number | string) => {
        exitCode = typeof code === 'string' ? parseInt(code, 10) : code
        throw new Error(`process.exit(${code})`)
      }) as typeof process.exit
      const stderrChunks: string[] = []
      const originalStderr = process.stderr.write.bind(process.stderr)
      // @ts-ignore
      process.stderr.write = (chunk: unknown) => { stderrChunks.push(String(chunk)); return true }
      try {
        await expect(
          (initCommand as any).run({
            args: { force: false, global: false, 'dry-run': false, quiet: true, 'no-color': true, yes: false, hook: true, mode: 'banana' },
          }),
        ).rejects.toThrow('process.exit(1)')
      } finally {
        process.exit = originalExit
        // @ts-ignore
        process.stderr.write = originalStderr
        process.chdir(originalCwd)
      }
      expect(exitCode).toBe(1)
      expect(stderrChunks.join('')).toContain('error: --mode must be ask, auto, or manual')
      // Validation happens before any writes
      await expect(access(path.join(projectDir, '.whydone'))).rejects.toThrow()
    })

    it('bare non-TTY re-run over a committed ask config: byte-identical, no hook, no revert (§2.2/§2.4)', async () => {
      await runInit(projectDir, { mode: 'ask', hook: false })
      const before = await readFile(configPath(), 'utf-8')
      const beforeStat = await stat(configPath())

      await runInit(projectDir) // bare re-run — not explicitly decided

      const after = await readFile(configPath(), 'utf-8')
      const afterStat = await stat(configPath())
      expect(after).toBe(before)
      expect(afterStat.mtimeMs).toBe(beforeStat.mtimeMs)
      expect(JSON.parse(after).mode).toBe('ask') // NOT reverted to manual
      // …and no hook was installed by the bare re-run
      await expect(access(path.join(projectDir, '.claude', 'settings.local.json'))).rejects.toThrow()
    })

    it('--mode manual re-run DOES overwrite (explicit decision)', async () => {
      await runInit(projectDir, { mode: 'ask', hook: false })
      await runInit(projectDir, { mode: 'manual' })
      const parsed = JSON.parse(await readFile(configPath(), 'utf-8'))
      expect(parsed.mode).toBe('manual')
    })

    it('unknown keys in an existing config survive an explicit re-run', async () => {
      await runInit(projectDir, { mode: 'ask', hook: false })
      const withExtra = { ...JSON.parse(await readFile(configPath(), 'utf-8')), custom: 'kept' }
      await import('node:fs/promises').then((fs) =>
        fs.writeFile(configPath(), JSON.stringify(withExtra, null, 2), 'utf-8'),
      )
      await runInit(projectDir, { mode: 'auto', hook: false })
      const parsed = JSON.parse(await readFile(configPath(), 'utf-8'))
      expect(parsed.mode).toBe('auto')
      expect(parsed.custom).toBe('kept')
    })

    it('writes .whydone/.cache/.gitignore containing exactly "*\\n"', async () => {
      await runInit(projectDir)
      const content = await readFile(path.join(projectDir, '.whydone', '.cache', '.gitignore'), 'utf-8')
      expect(content).toBe('*\n')
    })
  })

  describe('next-steps output block (§2.5)', () => {
    it('contains the uninstall pointer and the git add line', async () => {
      const output = await runInitCaptured(projectDir)
      expect(output).toContain('npx whydone uninstall')
      expect(output).toContain('git add .whydone .claude/skills .claude/whydone.lock.json CLAUDE.md')
      expect(output).toContain('Next steps:')
      expect(output).toContain('Mode:')
      expect(output).toContain('manual — entries only via /log')
      expect(output).toContain('Stop hook:')
      expect(output).toContain('not installed')
    })

    it('reports the installed hook for --mode ask', async () => {
      const output = await runInitCaptured(projectDir, { mode: 'ask' })
      expect(output).toContain('ask — Claude offers a drafted entry after substantive work')
      expect(output).toContain('installed → .claude/settings.local.json (local to this machine)')
    })

    it('--quiet suppresses the whole block', async () => {
      const originalCwd = process.cwd()
      process.chdir(projectDir)
      const chunks: string[] = []
      const originalWrite = process.stdout.write.bind(process.stdout)
      // @ts-ignore
      process.stdout.write = (chunk: unknown) => { chunks.push(String(chunk)); return true }
      try {
        await (initCommand as any).run({
          args: { force: false, global: false, 'dry-run': false, quiet: true, 'no-color': true, yes: false, hook: true },
        })
      } finally {
        // @ts-ignore
        process.stdout.write = originalWrite
        process.chdir(originalCwd)
      }
      expect(chunks.join('')).toBe('')
    })
  })

  describe('dry-run additions (§2.6)', () => {
    it('prints the three new plan lines and writes nothing', async () => {
      const originalCwd = process.cwd()
      process.chdir(projectDir)
      const chunks: string[] = []
      const originalWrite = process.stdout.write.bind(process.stdout)
      // @ts-ignore
      process.stdout.write = (chunk: unknown) => { chunks.push(String(chunk)); return true }
      try {
        await (initCommand as any).run({
          args: { force: false, global: false, 'dry-run': true, quiet: false, 'no-color': true, yes: false, hook: true },
        })
      } finally {
        // @ts-ignore
        process.stdout.write = originalWrite
        process.chdir(originalCwd)
      }
      const output = chunks.join('')
      expect(output).toContain('.whydone/config.json (mode: manual)')
      expect(output).toContain('.whydone/.cache/.gitignore')
      expect(output).toContain('Stop hook')
      expect(output).toContain('[skip]')
      // Nothing written — including no settings file and no launcher
      await expect(access(path.join(projectDir, '.whydone'))).rejects.toThrow()
      await expect(access(path.join(projectDir, '.claude'))).rejects.toThrow()
    })

    it('dry-run with --mode ask plans the settings write instead of skipping', async () => {
      const originalCwd = process.cwd()
      process.chdir(projectDir)
      const chunks: string[] = []
      const originalWrite = process.stdout.write.bind(process.stdout)
      // @ts-ignore
      process.stdout.write = (chunk: unknown) => { chunks.push(String(chunk)); return true }
      try {
        await (initCommand as any).run({
          args: { force: false, global: false, 'dry-run': true, quiet: false, 'no-color': true, yes: false, hook: true, mode: 'ask' },
        })
      } finally {
        // @ts-ignore
        process.stdout.write = originalWrite
        process.chdir(originalCwd)
      }
      const output = chunks.join('')
      expect(output).toContain('.whydone/config.json (mode: ask)')
      expect(output).toContain('.claude/settings.local.json (Stop hook)')
      await expect(access(path.join(projectDir, '.claude'))).rejects.toThrow()
    })
  })
})

describe('init --journal-only (plugin channel bootstrap)', () => {
  let projectDir: string

  beforeEach(async () => {
    projectDir = await mkdtemp(path.join(tmpdir(), 'whydone-jonly-test-'))
  })

  afterEach(async () => {
    await rm(projectDir, { recursive: true, force: true })
  })

  it('scaffolds .whydone/ with seed INDEX.md, ask-mode config, and the CLAUDE.md marker', async () => {
    await runInit(projectDir, { 'journal-only': true })
    const index = await readFile(path.join(projectDir, '.whydone', 'INDEX.md'), 'utf-8')
    expect(index).toContain('| date | slug | task | tags | files |')
    const config = JSON.parse(await readFile(path.join(projectDir, '.whydone', 'config.json'), 'utf-8'))
    expect(config.mode).toBe('ask')
    const claudeMd = await readFile(path.join(projectDir, 'CLAUDE.md'), 'utf-8')
    expect(claudeMd).toContain('<!-- whydone:start -->')
    const gitignore = await readFile(path.join(projectDir, '.whydone', '.cache', '.gitignore'), 'utf-8')
    expect(gitignore).toBe('*\n')
  })

  it('installs no skills, no lock-file, no hook — .claude/ is never created', async () => {
    await runInit(projectDir, { 'journal-only': true })
    await expect(access(path.join(projectDir, '.claude'))).rejects.toThrow()
  })

  it('respects --mode and never overwrites an existing committed mode on a bare re-run', async () => {
    await runInit(projectDir, { 'journal-only': true, mode: 'manual' })
    let config = JSON.parse(await readFile(path.join(projectDir, '.whydone', 'config.json'), 'utf-8'))
    expect(config.mode).toBe('manual')

    // bare journal-only re-run: existing mode kept, not reset to ask
    await runInit(projectDir, { 'journal-only': true })
    config = JSON.parse(await readFile(path.join(projectDir, '.whydone', 'config.json'), 'utf-8'))
    expect(config.mode).toBe('manual')
  })

  it('dry-run prints the reduced plan and writes nothing', async () => {
    const output = await runInitCaptured(projectDir, { 'journal-only': true, 'dry-run': true })
    expect(output).toContain('journal-only dry-run plan')
    expect(output).toContain('[skip]')
    expect(output).toContain('skills, lock-file, Stop hook')
    await expect(access(path.join(projectDir, '.whydone'))).rejects.toThrow()
    await expect(access(path.join(projectDir, '.claude'))).rejects.toThrow()
  })

  it('repairs an invalid existing config.json instead of silently reporting a mode it cannot deliver', async () => {
    await runInit(projectDir, { 'journal-only': true, mode: 'auto' })
    const configPath = path.join(projectDir, '.whydone', 'config.json')
    const fs = await import('node:fs/promises')
    await fs.writeFile(configPath, '{ broken json', 'utf-8')

    await runInit(projectDir, { 'journal-only': true })
    const config = JSON.parse(await readFile(configPath, 'utf-8'))
    expect(config.mode).toBe('ask')
    expect(config.configVersion).toBe(1)
  })

  it('is idempotent: a second run leaves an existing INDEX.md untouched', async () => {
    await runInit(projectDir, { 'journal-only': true })
    const indexPath = path.join(projectDir, '.whydone', 'INDEX.md')
    const fs = await import('node:fs/promises')
    await fs.appendFile(indexPath, '| 2026-01-01 | real | built from entries |  |  |\n', 'utf-8')

    await runInit(projectDir, { 'journal-only': true })
    const content = await readFile(indexPath, 'utf-8')
    expect(content).toContain('built from entries')
  })
})

describe('init --language (journal language as committed policy)', () => {
  let projectDir: string

  beforeEach(async () => {
    projectDir = await mkdtemp(path.join(tmpdir(), 'whydone-init-lang-test-'))
  })

  afterEach(async () => {
    await rm(projectDir, { recursive: true, force: true })
  })

  const readCfg = async () =>
    JSON.parse(await readFile(path.join(projectDir, '.whydone', 'config.json'), 'utf-8'))

  it('--language en is written to config.json on a fresh non-TTY init (mode stays the bare default)', async () => {
    await runInit(projectDir, { language: 'en' })
    expect(await readCfg()).toEqual({ configVersion: 1, mode: 'manual', language: 'en' })
  })

  it('--journal-only --language ru records it next to the ask default', async () => {
    await runInit(projectDir, { 'journal-only': true, language: 'ru' })
    expect(await readCfg()).toEqual({ configVersion: 1, mode: 'ask', language: 'ru' })
  })

  it('a bare re-run keeps the language; --language alone updates it without touching the mode', async () => {
    await runInit(projectDir, { mode: 'ask', hook: false, language: 'en' })
    await runInit(projectDir)
    expect(await readCfg()).toEqual({ configVersion: 1, mode: 'ask', language: 'en' })
    await runInit(projectDir, { language: 'de' })
    expect(await readCfg()).toEqual({ configVersion: 1, mode: 'ask', language: 'de' })
  })

  it('--language "English (US)" exits 1 with the exact error before any write', async () => {
    const originalCwd = process.cwd()
    process.chdir(projectDir)
    let exitCode: number | undefined
    const originalExit = process.exit
    process.exit = ((code?: number | string) => {
      exitCode = typeof code === 'string' ? parseInt(code, 10) : code
      throw new Error(`process.exit(${code})`)
    }) as typeof process.exit
    const stderrChunks: string[] = []
    const originalStderr = process.stderr.write.bind(process.stderr)
    // @ts-ignore
    process.stderr.write = (chunk: unknown) => { stderrChunks.push(String(chunk)); return true }
    try {
      await expect(
        (initCommand as any).run({
          args: { force: false, global: false, 'dry-run': false, quiet: true, 'no-color': true, yes: false, hook: true, language: 'English (US)' },
        }),
      ).rejects.toThrow('process.exit(1)')
    } finally {
      process.exit = originalExit
      // @ts-ignore
      process.stderr.write = originalStderr
      process.chdir(originalCwd)
    }
    expect(exitCode).toBe(1)
    expect(stderrChunks.join('')).toContain('error: --language must be a language tag like en, ru or pt-BR')
    await expect(access(path.join(projectDir, '.whydone'))).rejects.toThrow()
  })

  it('the result block reports the language (full init and --journal-only)', async () => {
    const full = await runInitCaptured(projectDir, { mode: 'manual', language: 'en' })
    expect(full).toContain('Language:         en (entry prose; .whydone/config.json)')
    const jl = await runInitCaptured(projectDir, { 'journal-only': true })
    // No --language this run: the line still shows the committed policy.
    expect(jl).toContain('Language:     en (entry prose; .whydone/config.json)')
  })

  it('--dry-run mentions the language in the config plan line and writes nothing', async () => {
    const out = await runInitCaptured(projectDir, { 'dry-run': true, language: 'en' })
    expect(out).toContain('config.json (mode: manual, language: en)')
    await expect(access(path.join(projectDir, '.whydone'))).rejects.toThrow()
  })
})
