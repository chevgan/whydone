/**
 * whydone uninstall subcommand
 *
 * Scoped, mirroring init (design §3.6): default cleans the project scope
 * (.claude/settings.local.json + .claude/whydone-hook.cjs + project lock);
 * --global cleans only ~/.claude/. A project uninstall NEVER touches
 * ~/.claude/settings.json — stripping a global hook that other projects
 * depend on was rejected in design.
 *
 * Ordering is pinned (§3.6): hook + launcher cleanup runs FIRST, before any
 * lock discovery or lockVersion validation. A missing/stale lock aborts only
 * the lock-recorded removals — it must never leave an orphaned Stop hook.
 *
 * Lock v2 (§7.2): every path in the lock resolves against the lock file's own
 * directory, never against cwd. lockVersion !== 2 ⇒ abort lock-recorded
 * removals with a clear message.
 *
 * Security (T-02-07): before deleting any path from lock.skills, validate it
 * resolves within the lock's own directory. claudeMdPath may additionally sit
 * one level above it (project CLAUDE.md next to .claude/).
 */

import { defineCommand } from 'citty'
import { existsSync } from 'node:fs'
import { rm, rmdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'
import pc from 'picocolors'

import { JOURNAL_DIR } from '../lib/constants.js'
import { listOtherLocalWorktrees, removeExcluded } from '../lib/git-exclude.js'
import { readLockFile, deleteLockFile } from '../lib/lock-file.js'
import { removeMarkerBlock } from '../lib/marker-block.js'
import { hasStopHook, removeStopHook, LAUNCHER_BASENAME } from '../lib/settings-hooks.js'

export default defineCommand({
  meta: {
    name: 'uninstall',
    description: 'Remove whydone skills, Stop hook, CLAUDE.md marker block, and lock-file',
  },
  args: {
    purge: {
      type: 'boolean',
      description: 'Also remove .whydone/ journal directory',
      default: false,
    },
    global: {
      type: 'boolean',
      description: 'Uninstall the ~/.claude/ (global) install instead of the project one',
      default: false,
    },
    'dry-run': {
      type: 'boolean',
      description: 'Print removal plan without deleting files',
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
    const dim = (s: string) => (useColor ? pc.dim(s) : s)
    const bold = (s: string) => (useColor ? pc.bold(s) : s)
    const yellow = (s: string) => (useColor ? pc.yellow(s) : s)

    const cwd = process.cwd()

    // ---- Scope resolution — mirrors init (§3.6) ----
    const targetBase = args.global
      ? path.join(homedir(), '.claude')
      : path.resolve(cwd, '.claude')
    const settingsPath = args.global
      ? path.join(targetBase, 'settings.json')
      : path.join(targetBase, 'settings.local.json')
    const settingsDisplay = args.global ? '~/.claude/settings.json' : '.claude/settings.local.json'
    const launcherPath = path.join(targetBase, LAUNCHER_BASENAME)
    const lockPath = path.join(targetBase, 'whydone.lock.json')

    // ---- Dry-run: print plan and return ----
    if (args['dry-run']) {
      const lock = await readLockFile(lockPath)
      process.stdout.write(bold('whydone uninstall dry-run plan:\n'))
      if (await hasStopHook(settingsPath)) {
        process.stdout.write(yellow('  [remove]') + ' ' + dim(`Stop hook (${settingsDisplay})\n`))
      }
      if (existsSync(launcherPath)) {
        process.stdout.write(yellow('  [remove]') + ' ' + dim(`${LAUNCHER_BASENAME}\n`))
      }
      if (lock === null) {
        process.stderr.write(
          red('error') + ': whydone is not installed (lock-file not found)\n' +
            dim('  Checked: ' + lockPath + '\n') +
            dim('  Run `whydone init` to install.\n'),
        )
        process.exit(1)
        return
      }
      for (const relPath of lock.skills) {
        process.stdout.write(yellow('  [remove]') + ' ' + dim(relPath + '\n'))
      }
      process.stdout.write(yellow('  [remove]') + ' ' + dim('CLAUDE.md marker block\n'))
      process.stdout.write(yellow('  [remove]') + ' ' + dim(path.relative(cwd, lockPath) + '\n'))
      if (args.purge) {
        process.stdout.write(yellow('  [remove]') + ' ' + dim(JOURNAL_DIR + '/ (--purge)\n'))
      }
      return
    }

    // ---- Step 1 (FIRST, before lock lookup — §3.6): hook + launcher cleanup ----
    const launcherExisted = existsSync(launcherPath)

    const hookResult = await removeStopHook(settingsPath)
    if (hookResult === 'conflict') {
      process.stderr.write(
        yellow('warn') +
          `: ${settingsDisplay} changed while whydone was editing it — hook not removed, re-run the command\n`,
      )
    } else if (hookResult !== 'removed' && launcherExisted) {
      // A launcher exists but no marker handler does — a hand-edited handler
      // must never silently become a zombie (§3.1). Note: the lock alone is
      // NOT evidence of a hook (manual-mode installs write no hook), so a
      // hook-less uninstall stays silent per §3.6 "silent when absent".
      process.stderr.write(
        yellow('warn') +
          `: no whydone Stop hook found in ${settingsDisplay} — if you customized the hook command, remove it manually\n`,
      )
    }
    // On 'conflict' the settings entry survived — keep the launcher too, or a
    // still-valid settings file would run `node "<missing .cjs>"` and surface
    // a hook-error notice on EVERY turn until the user re-runs uninstall.
    if (hookResult !== 'conflict') {
      await rm(launcherPath, { force: true })
    }

    // ---- Step 2: locate the scope's lock-file (the hook is already gone) ----
    const lock = await readLockFile(lockPath)

    if (lock === null) {
      process.stderr.write(
        red('error') + ': whydone is not installed in this directory (lock-file not found)\n' +
          dim('  Checked: ' + (args.global ? lockPath : path.relative(cwd, lockPath)) + '\n') +
          (args.global
            ? ''
            : dim('  If you installed with --global, run `npx whydone uninstall --global`.\n')) +
          dim('  Run `whydone init` to install.\n'),
      )
      process.exit(1)
      return // unreachable but satisfies TypeScript
    }

    // ---- Lock v2 guard (§7.2) — governs the lock-recorded removals only ----
    if (lock.lockVersion !== 2) {
      process.stderr.write(
        red('error') +
          `: lock file was written by an older whydone — delete ${path.relative(cwd, lockPath)} and re-run npx whydone init\n`,
      )
      process.exit(1)
      return
    }

    // ---- T-02-07: validate each lock path resolves inside the lock's own dir ----
    const lockDir = path.dirname(lockPath)
    for (const relSkillPath of lock.skills) {
      const absPath = path.resolve(lockDir, relSkillPath)
      const inAllowedScope = absPath === lockDir || absPath.startsWith(lockDir + path.sep)
      if (!inAllowedScope) {
        process.stderr.write(
          red('error') +
            ': lock-file contains a path outside expected scope — aborting for safety\n' +
            dim('  Suspicious path: ' + relSkillPath + '\n') +
            dim('  If this is unexpected, delete .claude/whydone.lock.json manually.\n'),
        )
        process.exit(1)
        return
      }
    }

    // claudeMdPath may legitimately sit one level above the lock dir (§7.2).
    const claudeMdPath = path.resolve(lockDir, lock.claudeMdPath)
    const claudeMdAllowedRoots = [lockDir, path.dirname(lockDir)]
    const claudeMdInScope = claudeMdAllowedRoots.some(
      (root) => claudeMdPath.startsWith(root + path.sep),
    )
    if (!claudeMdInScope) {
      process.stderr.write(
        red('error') +
          ': lock-file claudeMdPath is outside expected scope — aborting for safety\n' +
          dim('  Suspicious path: ' + lock.claudeMdPath + '\n'),
      )
      process.exit(1)
      return
    }

    const journalDir = path.resolve(cwd, JOURNAL_DIR)

    // ---- Step 3: Remove each skill file from lock.skills ----
    // D-04: ONLY paths from lock.skills — no glob/readdir
    const removedPaths: string[] = []
    for (const relSkillPath of lock.skills) {
      const absPath = path.resolve(lockDir, relSkillPath)
      await rm(absPath, { force: true }) // force suppresses ENOENT
      removedPaths.push(relSkillPath)
    }

    // ---- Step 4: Attempt to remove empty skill subdirectories ----
    // Collect unique parent dirs and try rmdir (no-op if not empty)
    const parentDirs = new Set(
      lock.skills.map((p) => path.dirname(path.resolve(lockDir, p))),
    )
    for (const dir of parentDirs) {
      try {
        await rmdir(dir)
      } catch {
        // Ignore — dir not empty or already gone
      }
    }

    // ---- Step 5: Remove marker block from CLAUDE.md (lock-relative path) ----
    if (lock.claudeMdPatched) {
      await removeMarkerBlock(claudeMdPath)
    }

    // ---- Step 6: Delete lock-file ----
    await deleteLockFile(lockPath)

    // ---- Step 7: --purge removes .whydone/ (D-06 explicit opt-in only) ----
    // The .git/info/exclude block is cleaned ONLY here: without --purge a
    // storage-local journal survives the uninstall, and dropping its exclude
    // lines would suddenly expose it in git status — the one thing local
    // storage promised not to do.
    if (args.purge) {
      await rm(journalDir, { recursive: true, force: true })
      // The exclude file is repo-scoped (cwd), not HOME-scoped — clean it in
      // every scope, EXCEPT while another worktree's local journal still
      // depends on the shared pattern.
      const siblings = listOtherLocalWorktrees(cwd)
      if (siblings.length === 0) {
        await removeExcluded(cwd, [`${JOURNAL_DIR}/`, 'CLAUDE.md'])
      } else if (!args.quiet) {
        process.stderr.write(
          'note: .git/info/exclude entries kept — local journal(s) in other worktree(s) still use them\n',
        )
      }
    }

    // ---- Output ----
    if (!args.quiet) {
      process.stdout.write(
        bold('whydone uninstall') +
          ' complete\n' +
          `  Removed ${dim(String(removedPaths.length))} skill file(s)\n` +
          (hookResult === 'removed' ? `  Stop hook removed from ${settingsDisplay}\n` : '') +
          `  CLAUDE.md marker block removed\n` +
          (args.purge ? `  .whydone/ removed (--purge)\n` : `  .whydone/ preserved\n`),
      )
    }
  },
})
