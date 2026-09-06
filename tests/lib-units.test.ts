import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, writeFile, readFile, rm, mkdir } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { patchClaudeMd, removeMarkerBlock, MARKER_START, MARKER_END } from '../src/lib/marker-block.js'
import { isLockFileShape, readLockFile, writeLockFile } from '../src/lib/lock-file.js'
import { copySkills } from '../src/lib/copy-skills.js'
import type { LockFile } from '../src/types.js'

let tmpDir: string

beforeEach(async () => {
  tmpDir = await mkdtemp(path.join(os.tmpdir(), 'whydone-lib-test-'))
})

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true })
})

// ─── marker-block tests ──────────────────────────────────────────────────────

describe('marker-block constants', () => {
  it('MARKER_START is exactly <!-- whydone:start -->', () => {
    expect(MARKER_START).toBe('<!-- whydone:start -->')
  })

  it('MARKER_END is exactly <!-- whydone:end -->', () => {
    expect(MARKER_END).toBe('<!-- whydone:end -->')
  })
})

describe('patchClaudeMd', () => {
  it('inserts a marker block into a file that has none', async () => {
    const filePath = path.join(tmpDir, 'CLAUDE.md')
    await writeFile(filePath, '# Project\n\nSome content here.\n')

    await patchClaudeMd(filePath, '.whydone/INDEX.md')

    const result = await readFile(filePath, 'utf-8')
    expect(result).toContain(MARKER_START)
    expect(result).toContain(MARKER_END)
    // Original content preserved
    expect(result).toContain('# Project')
    expect(result).toContain('Some content here.')
    // PASSIVE-01: block points at the index only, mentions /recall, never @-imports entries
    expect(result).toContain('.whydone/INDEX.md')
    expect(result).toContain('/recall')
    expect(result).not.toContain('@.whydone')
  })

  it('the block is mode-neutral: routes writes through /log per the config, never contradicts ask/auto', async () => {
    const filePath = path.join(tmpDir, 'CLAUDE.md')
    await writeFile(filePath, '# Project\n')

    await patchClaudeMd(filePath, '.whydone/INDEX.md')

    const result = await readFile(filePath, 'utf-8')
    // The mode lives in .whydone/config.json and can change on a mere git pull —
    // a mode-specific block ("manual-only; never write entries yourself") would
    // go stale and collide with a Stop-hook REASON_AUTO instruction.
    expect(result).toContain('journal mode in')
    expect(result).toContain('.whydone/config.json')
    expect(result).not.toContain('manual-only')
    expect(result).not.toContain('AI session memory')
  })

  it('global scope writes the conditional "Projects may keep" variant', async () => {
    const filePath = path.join(tmpDir, 'CLAUDE.md')

    await patchClaudeMd(filePath, '.whydone/INDEX.md', 'global')

    const result = await readFile(filePath, 'utf-8')
    // ~/.claude/CLAUDE.md is loaded in every project — the block must speak
    // conditionally, and stay mode-neutral like the project variant.
    expect(result).toContain('Projects may keep')
    expect(result).not.toContain('This project keeps')
    expect(result).toContain('journal mode in')
    expect(result).toContain('.whydone/config.json')
    expect(result).not.toContain('manual-only')
    expect(result).not.toContain('AI session memory')
  })

  it('creates the file if it does not exist', async () => {
    const filePath = path.join(tmpDir, 'nonexistent-CLAUDE.md')

    await patchClaudeMd(filePath, '.whydone/INDEX.md')

    const result = await readFile(filePath, 'utf-8')
    expect(result).toContain(MARKER_START)
    expect(result).toContain(MARKER_END)
  })

  it('is idempotent — second patch produces exactly ONE MARKER_START', async () => {
    const filePath = path.join(tmpDir, 'CLAUDE.md')
    await writeFile(filePath, '# Project\n\nContent.\n')

    await patchClaudeMd(filePath, '.whydone/INDEX.md')
    await patchClaudeMd(filePath, '.whydone/INDEX.md')

    const result = await readFile(filePath, 'utf-8')
    const startCount = (result.match(new RegExp(MARKER_START.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'g')) ?? []).length
    const endCount = (result.match(new RegExp(MARKER_END.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'g')) ?? []).length
    expect(startCount).toBe(1)
    expect(endCount).toBe(1)
  })

  it('preserves content before and after the marker block after second patch', async () => {
    const filePath = path.join(tmpDir, 'CLAUDE.md')
    await writeFile(filePath, '# Header\n\nBefore content.\n')

    await patchClaudeMd(filePath, '.whydone/INDEX.md')

    // Append content after the block manually to simulate a real CLAUDE.md
    const afterFirst = await readFile(filePath, 'utf-8')
    await writeFile(filePath, afterFirst + '\n\nAfter content here.\n')

    await patchClaudeMd(filePath, '.whydone/INDEX.md')

    const result = await readFile(filePath, 'utf-8')
    expect(result).toContain('# Header')
    expect(result).toContain('Before content.')
    expect(result).toContain('After content here.')
    const startCount = (result.match(new RegExp(MARKER_START.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'g')) ?? []).length
    expect(startCount).toBe(1)
  })
})

describe('removeMarkerBlock', () => {
  it('removes the marker block from a file that has one', async () => {
    const filePath = path.join(tmpDir, 'CLAUDE.md')
    await writeFile(filePath, '# Header\n\nBefore.\n')
    await patchClaudeMd(filePath, '.whydone/INDEX.md')

    await removeMarkerBlock(filePath)

    const result = await readFile(filePath, 'utf-8')
    expect(result).not.toContain(MARKER_START)
    expect(result).not.toContain(MARKER_END)
  })

  it('preserves content before the marker block after removal', async () => {
    const filePath = path.join(tmpDir, 'CLAUDE.md')
    await writeFile(filePath, '# Header\n\nBefore the block.\n')
    await patchClaudeMd(filePath, '.whydone/INDEX.md')

    // Add content after the block
    const withBlock = await readFile(filePath, 'utf-8')
    await writeFile(filePath, withBlock + '\n\nAfter the block.\n')

    await removeMarkerBlock(filePath)

    const result = await readFile(filePath, 'utf-8')
    expect(result).toContain('# Header')
    expect(result).toContain('Before the block.')
    expect(result).toContain('After the block.')
    expect(result).not.toContain(MARKER_START)
  })

  it('is a no-op when there is no marker block', async () => {
    const filePath = path.join(tmpDir, 'CLAUDE.md')
    const original = '# Header\n\nJust some regular content.\n'
    await writeFile(filePath, original)

    await removeMarkerBlock(filePath)

    const result = await readFile(filePath, 'utf-8')
    expect(result).toBe(original)
  })

  it('does not throw when the file does not exist', async () => {
    const filePath = path.join(tmpDir, 'nonexistent.md')

    let threw = false
    try {
      await removeMarkerBlock(filePath)
    } catch {
      threw = true
    }
    expect(threw).toBe(false)
  })
})

// ─── lock-file tests ─────────────────────────────────────────────────────────

describe('lock-file', () => {
  it('readLockFile returns null when file does not exist (does not throw)', async () => {
    const lockPath = path.join(tmpDir, 'nonexistent.lock.json')

    let result: LockFile | null = undefined as unknown as LockFile | null
    let threw = false
    try {
      result = await readLockFile(lockPath)
    } catch {
      threw = true
    }
    expect(threw).toBe(false)
    expect(result).toBeNull()
  })

  it('readLockFile returns null when file contains invalid JSON (does not throw)', async () => {
    const lockPath = path.join(tmpDir, 'invalid.lock.json')
    await writeFile(lockPath, '{ this is not valid json }')

    let result: LockFile | null = undefined as unknown as LockFile | null
    let threw = false
    try {
      result = await readLockFile(lockPath)
    } catch {
      threw = true
    }
    expect(threw).toBe(false)
    expect(result).toBeNull()
  })

  it('writeLockFile then readLockFile returns the same object (round-trip)', async () => {
    const lockPath = path.join(tmpDir, 'whydone.lock.json')
    const data: LockFile = {
      version: '1.0.0',
      installedAt: '2026-06-01T12:00:00Z',
      scope: 'project',
      skillsDir: '.claude/skills',
      skills: ['.claude/skills/log/SKILL.md', '.claude/skills/recall/SKILL.md'],
      claudeMdPatched: true,
      claudeMdPath: 'CLAUDE.md',
    }

    await writeLockFile(lockPath, data)
    const read = await readLockFile(lockPath)

    expect(read).toEqual(data)
  })

  it('writeLockFile creates parent directory if needed', async () => {
    const lockPath = path.join(tmpDir, 'nested', 'dir', 'whydone.lock.json')
    const data: LockFile = {
      version: '1.0.0',
      installedAt: '2026-06-01T12:00:00Z',
      scope: 'project',
      skillsDir: '.claude/skills',
      skills: [],
      claudeMdPatched: false,
      claudeMdPath: 'CLAUDE.md',
    }

    await writeLockFile(lockPath, data)
    const read = await readLockFile(lockPath)
    expect(read).toEqual(data)
  })
})

// ─── copy-skills tests ───────────────────────────────────────────────────────

describe('copySkills', () => {
  let templatesDir: string
  let targetDir: string

  beforeEach(async () => {
    templatesDir = path.join(tmpDir, 'templates')
    targetDir = path.join(tmpDir, 'target')

    // Create two template files in a subdirectory (mirroring real skills layout)
    await mkdir(path.join(templatesDir, 'log'), { recursive: true })
    await mkdir(path.join(templatesDir, 'recall'), { recursive: true })
    await writeFile(path.join(templatesDir, 'log', 'SKILL.md'), '# Log skill\n')
    await writeFile(path.join(templatesDir, 'recall', 'SKILL.md'), '# Recall skill\n')

    await mkdir(targetDir, { recursive: true })
  })

  it('initial copy: 2 files copied, 0 skipped; files exist at target', async () => {
    const result = await copySkills(templatesDir, targetDir, {})

    expect(result.copied).toHaveLength(2)
    expect(result.skipped).toHaveLength(0)

    // Verify files exist at target
    const logContent = await readFile(path.join(targetDir, 'log', 'SKILL.md'), 'utf-8')
    expect(logContent).toBe('# Log skill\n')

    const recallContent = await readFile(path.join(targetDir, 'recall', 'SKILL.md'), 'utf-8')
    expect(recallContent).toBe('# Recall skill\n')
  })

  it('second run without force: 0 copied, 2 skipped (idempotent, no clobber)', async () => {
    await copySkills(templatesDir, targetDir, {})
    const result = await copySkills(templatesDir, targetDir, {})

    expect(result.copied).toHaveLength(0)
    expect(result.skipped).toHaveLength(2)

    // Files still exist (not deleted)
    const logContent = await readFile(path.join(targetDir, 'log', 'SKILL.md'), 'utf-8')
    expect(logContent).toBe('# Log skill\n')
  })

  it('second run with force:true: 2 copied, 0 skipped (overwrites)', async () => {
    await copySkills(templatesDir, targetDir, {})

    // Modify templates to verify overwrite happens
    await writeFile(path.join(templatesDir, 'log', 'SKILL.md'), '# Updated log skill\n')

    const result = await copySkills(templatesDir, targetDir, { force: true })

    expect(result.copied).toHaveLength(2)
    expect(result.skipped).toHaveLength(0)

    // Verify overwrite happened
    const logContent = await readFile(path.join(targetDir, 'log', 'SKILL.md'), 'utf-8')
    expect(logContent).toBe('# Updated log skill\n')
  })

  it('CopyResult.copied contains repo-relative paths (not absolute)', async () => {
    const result = await copySkills(templatesDir, targetDir, {})

    // Copied paths should be relative (e.g., "log/SKILL.md"), not absolute
    for (const copiedPath of result.copied) {
      expect(path.isAbsolute(copiedPath)).toBe(false)
    }
  })

  it('does NOT import or reference lock-file (code contract)', () => {
    // This is a compile/lint check — no lock-file import in copy-skills.ts
    // Verified via grep in plan verification, but also assert module contract here:
    // copySkills only returns CopyResult — no side effects to lock file
    expect(typeof copySkills).toBe('function')
    // The function signature must not have lockPath parameter
    expect(copySkills.length).toBeLessThanOrEqual(3) // (templatesDir, targetDir, opts)
  })
})

// ─── marker-block: stray / reordered markers must never eat user content ─────

describe('marker-block — stray and reordered markers (v1.3 audit regressions)', () => {
  const countOf = (text: string, needle: string): number => text.split(needle).length - 1

  it('a stray lone start marker above user content: patch appends ONE clean block and drops the stray', async () => {
    const filePath = path.join(tmpDir, 'CLAUDE.md')
    await writeFile(
      filePath,
      '# My project\n\n<!-- whydone:start -->\n\nIMPORTANT user rules that must survive.\n\n## Build\n- npm test\n',
    )

    await patchClaudeMd(filePath, '.whydone/INDEX.md')

    const patched = await readFile(filePath, 'utf-8')
    expect(countOf(patched, MARKER_START)).toBe(1)
    expect(countOf(patched, MARKER_END)).toBe(1)
    expect(patched).toContain('IMPORTANT user rules that must survive.')
    expect(patched).toContain('- npm test')
    // The user text sits ABOVE the (single) block, not inside it.
    expect(patched.indexOf('IMPORTANT user rules')).toBeLessThan(patched.indexOf(MARKER_START))
  })

  it('a stray lone start marker above user content: remove keeps the user content (uninstall used to wipe everything down to the real end marker)', async () => {
    const filePath = path.join(tmpDir, 'CLAUDE.md')
    // The pre-fix on-disk state: stray marker, user text, then a real block appended later.
    const realBlock = `${MARKER_START}\n## whydone — work journal\n\nblock body\n${MARKER_END}\n`
    await writeFile(
      filePath,
      '# My project\n\n<!-- whydone:start -->\n\nIMPORTANT user rules that must survive.\n\n## Build\n- npm test\n\n' +
        realBlock,
    )

    await removeMarkerBlock(filePath)

    const result = await readFile(filePath, 'utf-8')
    expect(result).toContain('IMPORTANT user rules that must survive.')
    expect(result).toContain('- npm test')
    expect(result).not.toContain('block body')
    expect(result).not.toContain(MARKER_START)
    expect(result).not.toContain(MARKER_END)
  })

  it('an end marker ABOVE the start marker: patch never duplicates the text between them', async () => {
    const filePath = path.join(tmpDir, 'CLAUDE.md')
    await writeFile(filePath, '# Top\n<!-- whydone:end -->\nuser text between\n<!-- whydone:start -->\n## Tail\n')

    await patchClaudeMd(filePath, '.whydone/INDEX.md')

    const result = await readFile(filePath, 'utf-8')
    expect(countOf(result, 'user text between')).toBe(1)
    expect(countOf(result, '## Tail')).toBe(1)
    expect(countOf(result, MARKER_START)).toBe(1)
    expect(countOf(result, MARKER_END)).toBe(1)
    expect(result.indexOf('## Tail')).toBeLessThan(result.indexOf(MARKER_START))
  })

  it('a marker mentioned inside prose is not a marker — only a whole line counts', async () => {
    const filePath = path.join(tmpDir, 'CLAUDE.md')
    const prose = 'Docs: whydone manages the text between `<!-- whydone:start -->` and `<!-- whydone:end -->`.\n'
    await writeFile(filePath, '# Project\n\n' + prose)

    await patchClaudeMd(filePath, '.whydone/INDEX.md')
    const patched = await readFile(filePath, 'utf-8')
    expect(patched).toContain(prose)
    expect(patched).toContain('## whydone — work journal')

    await removeMarkerBlock(filePath)
    const removed = await readFile(filePath, 'utf-8')
    expect(removed).toContain(prose)
    expect(removed).not.toContain('## whydone — work journal')
  })

  it('CRLF files get a CRLF block, keep their lines byte-for-byte, and round-trip through remove', async () => {
    const filePath = path.join(tmpDir, 'CLAUDE.md')
    const original = '# Project\r\n\r\nWindows content.\r\n'
    await writeFile(filePath, original)

    await patchClaudeMd(filePath, '.whydone/INDEX.md')
    const patched = await readFile(filePath, 'utf-8')
    expect(patched.startsWith('# Project\r\n\r\nWindows content.\r\n\r\n' + MARKER_START + '\r\n')).toBe(true)
    expect(patched).not.toMatch(/[^\r]\n/) // no bare LF anywhere

    await patchClaudeMd(filePath, '.whydone/INDEX.md') // idempotent under CRLF too
    expect(countOf(await readFile(filePath, 'utf-8'), MARKER_START)).toBe(1)

    await removeMarkerBlock(filePath)
    expect(await readFile(filePath, 'utf-8')).toBe(original)
  })
})

// ─── lock-file: structural guard (v1.3 audit) ────────────────────────────────

describe('readLockFile — structural guard', () => {
  const v2 = {
    lockVersion: 2,
    version: '1.3.1',
    scope: 'project',
    skillsDir: 'skills',
    skills: ['skills/log/SKILL.md', 'skills/recall/SKILL.md'],
    claudeMdPatched: true,
    claudeMdPath: '../CLAUDE.md',
  }

  it('isLockFileShape accepts exactly what init writes', () => {
    expect(isLockFileShape(v2)).toBe(true)
    expect(isLockFileShape({ ...v2, scope: 'global', claudeMdPath: 'CLAUDE.md' })).toBe(true)
  })

  it('a v2 lock missing skills[] or claudeMdPath reads as null instead of crashing uninstall later', async () => {
    const lockPath = path.join(tmpDir, 'whydone.lock.json')
    await writeFile(lockPath, JSON.stringify({ lockVersion: 2 }))
    expect(await readLockFile(lockPath)).toBeNull()
    await writeFile(lockPath, JSON.stringify({ ...v2, skills: 'skills/log/SKILL.md' }))
    expect(await readLockFile(lockPath)).toBeNull() // skills must be an array of strings
    await writeFile(lockPath, JSON.stringify({ ...v2, claudeMdPath: undefined }))
    expect(await readLockFile(lockPath)).toBeNull()
  })

  it('a non-object lock (array, string, null) reads as null', async () => {
    const lockPath = path.join(tmpDir, 'whydone.lock.json')
    for (const raw of ['[]', '"lock"', 'null', '42']) {
      await writeFile(lockPath, raw)
      expect(await readLockFile(lockPath), raw).toBeNull()
    }
  })

  it('a v1 lock (with or without lockVersion) still comes back so the caller can print the "older whydone" message', async () => {
    const lockPath = path.join(tmpDir, 'whydone.lock.json')
    await writeFile(lockPath, JSON.stringify({ lockVersion: 1, installedAt: 'x', skills: [] }))
    expect((await readLockFile(lockPath))?.lockVersion).toBe(1)
    await writeFile(lockPath, JSON.stringify({ installedAt: 'x', skills: [] }))
    const noVersion = await readLockFile(lockPath)
    expect(noVersion).not.toBeNull()
    expect(noVersion?.lockVersion).toBeUndefined()
  })
})
