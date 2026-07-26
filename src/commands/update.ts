/**
 * whydone update subcommand
 *
 * Re-copies skills from the npm package templates/skills/ into the installed
 * skills directory, always with force:true (equivalent to init --force).
 *
 * Lock v2 (§7.2): the lock is self-contained — every path resolves against
 * the lock file's own directory, never against cwd. lockVersion !== 2 ⇒
 * abort with the delete-and-re-init message.
 *
 * Hook refresh (§3.3): after re-copying skills, rewrite the launcher file and
 * refresh the settings handler ONLY where the marker is already present —
 * update never adds a hook that init didn't, and installStopHook never
 * reverts a user-raised timeout.
 *
 * Security (T-02-15): before calling copySkills with lock.skillsDir as target,
 * validate that skillsDir resolves within the lock's own directory.
 */

import { defineCommand } from 'citty'
import { writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'
import path from 'node:path'
import pc from 'picocolors'

import { copySkills } from '../lib/copy-skills.js'
import { readLockFile, writeLockFile, toPosixPath } from '../lib/lock-file.js'
import {
  buildLauncherSource,
  hasStopHook,
  installStopHook,
  LAUNCHER_BASENAME,
} from '../lib/settings-hooks.js'
import type { LockFile } from '../types.js'

// Resolve package root from this file's location.
// - src/commands/update.ts (dev): __dirname = src/commands/ → 2 levels up → pkg root
// - dist/cli.js (bundled): tsdown flattens into dist/ so __dirname = dist/ → 1 level up
// - bin/whydone.mjs (plugin-vendored bundle): __dirname = bin/ → 1 level up = plugin root
// Detect the case by checking the basename of __dirname.
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PKG_ROOT = path.basename(__dirname) === 'dist' || path.basename(__dirname) === 'bin'
  ? path.resolve(__dirname, '..')
  : path.resolve(__dirname, '..', '..')
const TEMPLATES_DIR = path.join(PKG_ROOT, 'templates', 'skills')

// Read package version via createRequire — avoids import assertion syntax issues (Pitfall 5).
const _require = createRequire(import.meta.url)
const PKG_VERSION: string = (_require(path.join(PKG_ROOT, 'package.json')) as { version: string }).version

export default defineCommand({
  meta: {
    name: 'update',
    description: 'Re-install skills from current package (always force-overwrites existing files)',
  },
  args: {
    'dry-run': {
      type: 'boolean',
      description: 'Print update plan without writing any files',
      default: false,
    },
    quiet: {
      type: 'boolean',
      description: 'Suppress non-error output',
      default: false,
    },
    'no-color': {
      type: 'boolean',
      description: 'Disable ANSI color output',
      default: false,
    },
  },

  async run({ args }) {
    const useColor = !args['no-color']
    const red = (s: string) => (useColor ? pc.red(s) : s)
    const green = (s: string) => (useColor ? pc.green(s) : s)
    const dim = (s: string) => (useColor ? pc.dim(s) : s)
    const bold = (s: string) => (useColor ? pc.bold(s) : s)
    const yellow = (s: string) => (useColor ? pc.yellow(s) : s)

    const cwd = process.cwd()

    // ---- Locate lock-file: project scope first, then global ----
    const projectLockPath = path.resolve(cwd, '.claude', 'whydone.lock.json')
    const globalLockPath = path.join(homedir(), '.claude', 'whydone.lock.json')

    let lockPath = projectLockPath
    let lock = await readLockFile(lockPath)

    if (lock === null) {
      lock = await readLockFile(globalLockPath)
      if (lock !== null) {
        lockPath = globalLockPath
      }
    }

    // ---- Missing lock-file → clear error ----
    if (lock === null) {
      process.stderr.write(
        red('error') + ': whydone is not initialized. Run `npx whydone init` first.\n' +
          dim('  Checked: ' + path.relative(cwd, projectLockPath) + '\n') +
          dim('  Checked: ' + globalLockPath + '\n'),
      )
      process.exit(1)
      return
    }

    // ---- Lock v2 guard (§7.2) ----
    if (lock.lockVersion !== 2) {
      process.stderr.write(
        red('error') +
          `: lock file was written by an older whydone — delete ${path.relative(cwd, lockPath)} and re-run npx whydone init\n`,
      )
      process.exit(1)
      return
    }

    // ---- T-02-15: validate lock.skillsDir resolves inside the lock's own dir ----
    const lockDir = path.dirname(lockPath)
    const resolvedSkillsDir = path.resolve(lockDir, lock.skillsDir)
    const inAllowedScope =
      resolvedSkillsDir === lockDir || resolvedSkillsDir.startsWith(lockDir + path.sep)
    if (!inAllowedScope) {
      process.stderr.write(
        red('error') +
          ': lock-file skillsDir is outside expected scope — aborting for safety\n' +
          dim('  skillsDir: ' + lock.skillsDir + '\n') +
          dim('  If this is unexpected, delete .claude/whydone.lock.json manually.\n'),
      )
      process.exit(1)
      return
    }

    // Scope-derived hook locations: the lock dir IS the scope's .claude/ dir.
    const settingsPath =
      lock.scope === 'global'
        ? path.join(lockDir, 'settings.json')
        : path.join(lockDir, 'settings.local.json')
    const launcherPath = path.join(lockDir, LAUNCHER_BASENAME)

    // ---- Dry-run: print plan and return ----
    if (args['dry-run']) {
      process.stdout.write(bold('whydone update dry-run plan:\n'))
      process.stdout.write(yellow('  [would update]') + ' ' + dim(lock.skillsDir + '/log/SKILL.md\n'))
      process.stdout.write(yellow('  [would update]') + ' ' + dim(lock.skillsDir + '/recall/SKILL.md\n'))
      if (await hasStopHook(settingsPath)) {
        process.stdout.write(yellow('  [would refresh]') + ' ' + dim(`Stop hook launcher (${LAUNCHER_BASENAME})\n`))
      }
      process.stdout.write(dim(`  Target: ${resolvedSkillsDir}\n`))
      return
    }

    // ---- Re-copy skills with force:true ----
    const result = await copySkills(TEMPLATES_DIR, resolvedSkillsDir, { force: true })

    // ---- Refresh the Stop hook ONLY where the marker is already present ----
    let hookRefreshed = false
    if (await hasStopHook(settingsPath)) {
      await writeFile(launcherPath, buildLauncherSource(), 'utf-8')
      const refreshResult = await installStopHook(settingsPath, launcherPath)
      if (refreshResult === 'conflict') {
        process.stderr.write(
          yellow('warn') +
            `: ${settingsPath} changed while whydone was editing it — hook not (re)installed, re-run the command\n`,
        )
      } else if (refreshResult === 'installed' || refreshResult === 'updated') {
        hookRefreshed = true
      }
    }

    // ---- Update lock-file: v2 shape, new version, fresh skills list ----
    const allSkillRelPaths = [...result.copied, ...result.skipped]
      .map((f) => `${lock!.skillsDir}/${toPosixPath(f)}`)
      .sort()

    const updatedLock: LockFile = {
      lockVersion: 2,
      version: PKG_VERSION,
      scope: lock.scope,
      skillsDir: lock.skillsDir,
      skills: allSkillRelPaths,
      claudeMdPatched: lock.claudeMdPatched,
      claudeMdPath: lock.claudeMdPath,
    }
    await writeLockFile(lockPath, updatedLock)

    // ---- Output ----
    if (!args.quiet) {
      const updatedCount = result.copied.length
      process.stdout.write(
        bold('whydone update') +
          ' complete\n' +
          `  Updated ${green(String(updatedCount))} skill file(s) to version ${dim(PKG_VERSION)}\n` +
          `  Skills dir: ${dim(lock.skillsDir)}\n` +
          (hookRefreshed ? `  Stop hook launcher refreshed\n` : ''),
      )
    }
  },
})
