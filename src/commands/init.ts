/**
 * whydone init subcommand
 *
 * Scaffolds the tool in a project directory (design §2):
 *   1. Creates .whydone/ directory + seed INDEX.md
 *   2. Copies skill templates to .claude/skills/ (or ~/.claude/skills/ for --global)
 *   3. Patches CLAUDE.md with the marker block (scope-aware: global patches
 *      ~/.claude/CLAUDE.md — §7.3)
 *   4. Writes .whydone/config.json (journal mode — §1)
 *   5. Writes .whydone/.cache/.gitignore (self-gitignoring hook-state dir)
 *   6. Optionally installs the Stop hook (launcher + settings entry — §3)
 *   7. Writes .claude/whydone.lock.json v2 (lock-dir-relative POSIX paths — §7)
 *
 * Interactive wizard (@clack/prompts, lazily imported) runs only when the
 * §2.1 gate holds; all writes happen AFTER the last prompt resolves
 * (prompt-then-act), so cancel truly writes nothing.
 *
 * Idempotent: second run skips already-present files (unless --force); a bare
 * non-interactive re-run never rewrites an existing committed config (§2.4).
 */

import { defineCommand } from 'citty'
import { existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'
import path from 'node:path'
import pc from 'picocolors'

import { JOURNAL_DIR } from '../lib/constants.js'
import { copySkills } from '../lib/copy-skills.js'
import { patchClaudeMd } from '../lib/marker-block.js'
import { writeLockFile, toPosixPath } from '../lib/lock-file.js'
import {
  readConfigIfValid,
  writeConfigMode,
  isWhydoneMode,
  isLanguageTag,
  CONFIG_BASENAME,
  type WhydoneMode,
} from '../lib/config.js'
import {
  buildLauncherSource,
  installStopHook,
  LAUNCHER_BASENAME,
} from '../lib/settings-hooks.js'
import { ensureExcluded, isTracked } from '../lib/git-exclude.js'
import { buildIndexContent } from './build-index.js'
import type { LockFile } from '../types.js'

// Resolve package root from this file's location.
// - src/commands/init.ts (dev): __dirname = src/commands/ → 2 levels up → pkg root
// - dist/cli.js (bundled): tsdown flattens into dist/ so __dirname = dist/ → 1 level up
// - bin/whydone.mjs (plugin-vendored copy of the same bundle): __dirname = bin/
//   inside the plugin cache → 1 level up = plugin root (which carries
//   package.json and templates/ because the whole repo is the plugin source)
// Detect the case by checking the basename of __dirname.
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PKG_ROOT = path.basename(__dirname) === 'dist' || path.basename(__dirname) === 'bin'
  ? path.resolve(__dirname, '..')
  : path.resolve(__dirname, '..', '..')
const TEMPLATES_DIR = path.join(PKG_ROOT, 'templates', 'skills')

// Read package version via createRequire — avoids import assertion syntax issues (Pitfall 5).
const _require = createRequire(import.meta.url)
const PKG_VERSION: string = (_require(path.join(PKG_ROOT, 'package.json')) as { version: string }).version

/** Per-mode text for the result "Mode:" line (§2.5). */
const MODE_LINE: Record<WhydoneMode, string> = {
  ask: 'ask — Claude offers a drafted entry after substantive work (.whydone/config.json, committed)',
  auto: 'auto — Claude writes entries itself; review them in git diff (.whydone/config.json, committed)',
  manual: 'manual — entries only via /log',
}

/**
 * storage: local variant — a hidden journal never shows in git diff, so the
 * auto line must not promise that review surface (v0.4 review finding).
 */
const MODE_LINE_LOCAL: Record<WhydoneMode, string> = {
  ask: 'ask — Claude offers a drafted entry after substantive work (.whydone/config.json, local)',
  auto: 'auto — Claude writes entries itself; review the files in .whydone/ directly — a local journal never appears in git diff',
  manual: 'manual — entries only via /log',
}

type HookOutcome =
  | 'installed'
  | 'manual-mode'
  | 'no-hook'
  | 'invalid-json'
  | 'conflict'
  | 'not-installed'

export default defineCommand({
  meta: {
    name: 'init',
    description: 'Scaffold whydone: create .whydone/, install skills, patch CLAUDE.md',
  },
  args: {
    mode: {
      type: 'string',
      description: 'Set journal mode non-interactively (ask | auto | manual)',
    },
    language: {
      type: 'string',
      description:
        'Language of the entry prose /log writes, as a tag like en or ru (recorded in .whydone/config.json; default: the language you talk to Claude in)',
    },
    yes: {
      type: 'boolean',
      description: 'Accept the recommended setup non-interactively: mode ask + Stop hook',
      default: false,
    },
    'journal-only': {
      type: 'boolean',
      description:
        'Scaffold only .whydone/ and the CLAUDE.md marker — no skills, no lock-file, no hook (plugin channel provides those)',
      default: false,
    },
    local: {
      type: 'boolean',
      description:
        'Keep the journal out of git: hide .whydone/ (and an untracked CLAUDE.md) via .git/info/exclude, record storage: local',
      default: false,
    },
    // Declared as positive `hook` because mri/citty rewrite `--no-hook` into
    // `{ hook: false }` BEFORE arg-name lookup — a declared 'no-hook' arg is
    // never populated from real argv (v1.0 review finding, reproduced).
    hook: {
      type: 'boolean',
      description: 'Install the Stop hook; --no-hook never touches any settings file',
      default: true,
    },
    force: {
      type: 'boolean',
      description: 'Reinstall/overwrite existing skills',
      default: false,
    },
    global: {
      type: 'boolean',
      description: 'Install into ~/.claude/ instead of project .claude/',
      default: false,
    },
    'dry-run': {
      type: 'boolean',
      description: 'Print plan without writing any files',
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
    const dim = (s: string) => (useColor ? pc.dim(s) : s)
    const green = (s: string) => (useColor ? pc.green(s) : s)
    const bold = (s: string) => (useColor ? pc.bold(s) : s)
    const yellow = (s: string) => (useColor ? pc.yellow(s) : s)

    // ---- Validate --mode before anything else ----
    if (args.mode !== undefined && !isWhydoneMode(args.mode)) {
      process.stderr.write('error: --mode must be ask, auto, or manual\n')
      process.exit(1)
      return
    }
    if (args.language !== undefined && !isLanguageTag(args.language)) {
      process.stderr.write('error: --language must be a language tag like en, ru or pt-BR\n')
      process.exit(1)
      return
    }
    const languageSuffix = args.language !== undefined ? `, language: ${args.language}` : ''

    const cwd = process.cwd()

    // Determine scope and target base directory (D-02)
    const scope: 'project' | 'global' = args.global ? 'global' : 'project'
    const targetBase: string = args.global
      ? path.join(homedir(), '.claude')
      : path.resolve(cwd, '.claude')

    const journalDir = path.resolve(cwd, JOURNAL_DIR)
    const skillsDir = path.join(targetBase, 'skills')
    const lockPath = path.join(targetBase, 'whydone.lock.json')
    // Scope-aware CLAUDE.md (§7.3): global patches ~/.claude/CLAUDE.md.
    const claudeMdPath = args.global
      ? path.join(homedir(), '.claude', 'CLAUDE.md')
      : path.resolve(cwd, 'CLAUDE.md')
    // toPosixPath: the string lands verbatim in the committed CLAUDE.md marker
    // block — Windows backslashes would make the same init produce a different
    // CLAUDE.md per OS.
    const indexPath = args.global
      ? `${JOURNAL_DIR}/INDEX.md`
      : toPosixPath(path.relative(cwd, path.join(journalDir, 'INDEX.md')))
    const settingsPath = args.global
      ? path.join(homedir(), '.claude', 'settings.json')
      : path.resolve(cwd, '.claude', 'settings.local.json')
    const settingsDisplay = args.global ? '~/.claude/settings.json' : '.claude/settings.local.json'
    const launcherPath = path.join(targetBase, LAUNCHER_BASENAME)
    const configPath = path.join(journalDir, CONFIG_BASENAME)

    // ---- --journal-only: scaffold the journal + marker, nothing else ----
    // The plugin channel's bootstrap path: skills and the Stop hook ship with
    // the plugin itself, so only the per-project pieces are created. Always
    // non-interactive (invoked programmatically by the /log skill after user
    // consent). Fresh config defaults to ask — the recommended mode — because
    // the plugin Stop hook is already active for plugin users.
    if (args['journal-only']) {
      if (args.global) {
        process.stderr.write('error: --journal-only is project-scoped; drop --global\n')
        process.exit(1)
        return
      }
      if (args.yes) {
        process.stderr.write('error: --yes implies the Stop-hook setup that --journal-only skips; use --mode instead\n')
        process.exit(1)
        return
      }
      if (args.local && isTracked(cwd, JOURNAL_DIR)) {
        process.stderr.write(
          `error: ${JOURNAL_DIR}/ is already tracked by git — --local cannot hide tracked files.\n` +
            '  Untrack it first (deliberate, history-visible; committed entries stay in git history):\n' +
            `    git rm -r --cached ${JOURNAL_DIR} && git commit -m "untrack journal"\n` +
            '  then re-run with --local, or use `whydone hide`.\n',
        )
        process.exit(1)
        return
      }
      const jlExisting = await readConfigIfValid(journalDir)
      // An existing file that fails readConfigIfValid is broken state, not
      // committed policy — every reader would silently degrade it to manual.
      // Bootstrap owns config, so repair it (and say so) instead of reporting
      // a mode the broken file would never deliver.
      const jlConfigInvalid = existsSync(configPath) && jlExisting === null
      const jlMode: WhydoneMode =
        args.mode !== undefined && isWhydoneMode(args.mode) ? args.mode : jlExisting?.mode ?? 'ask'

      if (args['dry-run']) {
        process.stdout.write(bold('whydone init --journal-only dry-run plan:\n'))
        process.stdout.write(green('  [create]') + ' ' + dim(path.relative(cwd, journalDir) + '/\n'))
        process.stdout.write(green('  [create]') + ' ' + dim(indexPath + ' (seed, skipped if present)\n'))
        process.stdout.write(green('  [create/update]') + ' ' + dim('CLAUDE.md (marker block)\n'))
        process.stdout.write(green('  [create]') + ' ' + dim(`${JOURNAL_DIR}/config.json (mode: ${jlMode}${languageSuffix})\n`))
        process.stdout.write(green('  [create]') + ' ' + dim(`${JOURNAL_DIR}/.cache/.gitignore\n`))
        if (args.local) {
          process.stdout.write(green('  [update]') + ' ' + dim(`.git/info/exclude (hide ${JOURNAL_DIR}/, storage: local)\n`))
        }
        process.stdout.write(green('  [skip]') + ' ' + dim('skills, lock-file, Stop hook (--journal-only)\n'))
        return
      }

      await mkdir(journalDir, { recursive: true })
      try {
        await writeFile(path.join(journalDir, 'INDEX.md'), buildIndexContent([]), {
          encoding: 'utf-8',
          flag: 'wx',
        })
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err
      }
      await patchClaudeMd(claudeMdPath, indexPath, 'project')
      // Same create-or-explicit-update rule as the full init — an existing
      // VALID committed mode is only rewritten when --mode was passed this
      // run — plus the invalid-config repair case above and an explicit
      // --local (which must persist storage even into an untouched config).
      if (
        !existsSync(configPath) ||
        jlConfigInvalid ||
        args.mode !== undefined ||
        args.local ||
        args.language !== undefined
      ) {
        await writeConfigMode(journalDir, jlMode, args.local ? 'local' : undefined, args.language)
        if (jlConfigInvalid) {
          process.stderr.write(
            yellow('warn') + `: ${JOURNAL_DIR}/config.json was invalid — rewritten with mode ${jlMode}\n`,
          )
        }
      }

      // ---- storage: local (v0.4) — hide the journal from git ----
      const jlStorage = args.local ? 'local' : jlExisting?.storage ?? 'committed'
      let jlNoGit = false
      let jlClaudeMdVisible = false
      if (args.local) {
        const toExclude = [`${JOURNAL_DIR}/`]
        const claudeMdTracked = isTracked(cwd, 'CLAUDE.md')
        if (!claudeMdTracked) toExclude.push('CLAUDE.md')
        const wrote = await ensureExcluded(cwd, toExclude)
        jlNoGit = !wrote
        jlClaudeMdVisible = wrote && claudeMdTracked
        // Warning, not info: --quiet must never silence it — the user is about
        // to have a visible CLAUDE.md diff that names the journal.
        if (jlClaudeMdVisible) {
          process.stderr.write(
            yellow('warn') +
              ': CLAUDE.md is tracked by git — the whydone marker block in it shows up in git status.\n' +
              '      Do not commit that change (`git restore CLAUDE.md` removes it; `whydone hide`/`publish` manage it).\n',
          )
        }
      }
      await mkdir(path.join(journalDir, '.cache'), { recursive: true })
      try {
        await writeFile(path.join(journalDir, '.cache', '.gitignore'), '*\n', {
          encoding: 'utf-8',
          flag: 'wx',
        })
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err
      }

      if (!args.quiet) {
        const jlLocal = jlStorage === 'local'
        const jlModeLine = jlLocal ? MODE_LINE_LOCAL[jlMode] : MODE_LINE[jlMode]
        const jlLanguage = args.language ?? jlExisting?.language
        const jlLanguageLine =
          jlLanguage !== undefined ? `  Language:     ${jlLanguage} (entry prose; .whydone/config.json)\n` : ''
        const tail = jlLocal
          ? jlNoGit
            ? '  Storage:      local (no git repo here — nothing was excluded; the journal is machine-only)\n'
            : `  Storage:      LOCAL-ONLY — hidden via .git/info/exclude, never committed, no backup.\n` +
              '                Make it a committed team journal later: whydone publish\n'
          : '  Commit the shared parts: git add ' + JOURNAL_DIR + ' CLAUDE.md\n'
        process.stdout.write(
          bold('whydone init --journal-only') +
            ' complete\n' +
            `  Journal dir:  ${dim(path.relative(cwd, journalDir) + '/')}\n` +
            `  Mode:         ${jlModeLine}\n` +
            jlLanguageLine +
            '  CLAUDE.md:    marker block added/refreshed\n' +
            '  Skipped:      skills, lock-file, Stop hook — the plugin ships them;\n' +
            '                on the npm channel run `npx whydone init` for the full setup\n' +
            '\n' +
            tail,
        )
      }
      return
    }

    // ---- Interactivity gate (§2.1, exact) ----
    const interactive =
      process.stdin.isTTY === true &&
      process.stdout.isTTY === true &&
      !process.env.CI &&
      !args.yes &&
      !args.mode &&
      !args['dry-run'] &&
      !args.quiet

    // ---- Resolve mode: explicit decision > existing config > default (§2.2) ----
    const existingConfig = await readConfigIfValid(journalDir)
    let mode: WhydoneMode
    let explicit: boolean
    let interactiveConsent = false
    let wizardLocal = false
    let wizardAskedStorage = false

    if (args.mode !== undefined && isWhydoneMode(args.mode)) {
      mode = args.mode
      explicit = true
    } else if (args.yes) {
      mode = 'ask'
      explicit = true
    } else if (interactive) {
      // ---- Wizard (§2.3): prompt-then-act — no writes until all prompts resolve ----
      const clack = await import('@clack/prompts')
      clack.intro('whydone — Done. And why.')
      const selected = await clack.select({
        message: 'Journal mode — how entries get written:',
        options: [
          {
            value: 'ask',
            label: 'ask (recommended)',
            hint: 'after substantive work, Claude drafts an entry and asks before writing',
          },
          {
            value: 'auto',
            label: 'auto',
            hint: 'Claude writes entries itself; you review them in git diff',
          },
          { value: 'manual', label: 'manual', hint: 'only when you run /log' },
        ],
        initialValue: existingConfig?.mode ?? 'ask',
      })
      if (clack.isCancel(selected)) {
        clack.cancel('Operation cancelled — nothing was written.')
        process.exit(0)
        return
      }
      mode = selected as WhydoneMode
      explicit = true // a wizard answer counts as explicitly decided (§2.2)

      // Storage question — FRESH setups only. An existing journal already has
      // a storage policy; transitions go through `whydone hide` / `publish`,
      // never a silent wizard flip.
      if (existingConfig === null) {
        wizardAskedStorage = true
        const storageSel = await clack.select({
          message: 'Journal storage — where entries live:',
          options: [
            {
              value: 'committed',
              label: 'committed (recommended)',
              hint: 'ordinary repo files — commit them, teammates and CI see the journal',
            },
            {
              value: 'local',
              label: 'local',
              hint: 'hidden from git via .git/info/exclude — this machine only, no backup',
            },
          ],
          initialValue: 'committed',
        })
        if (clack.isCancel(storageSel)) {
          clack.cancel('Operation cancelled — nothing was written.')
          process.exit(0)
          return
        }
        wizardLocal = storageSel === 'local'
      }

      if (mode !== 'manual' && args.hook !== false) {
        const consent = await clack.confirm({
          message:
            `Install a Stop hook into ${settingsDisplay}?\n` +
            'It runs `whydone hook stop` when Claude finishes a turn and nudges per your mode.\n' +
            'Required for ask/auto to trigger automatically. Remove anytime: npx whydone uninstall',
          initialValue: true,
        })
        if (clack.isCancel(consent)) {
          clack.cancel('Operation cancelled — nothing was written.')
          process.exit(0)
          return
        }
        interactiveConsent = consent === true
      }
      clack.outro('Setting up…')
    } else {
      // Bare CI / non-TTY run: keep an existing committed mode untouched;
      // fresh repo defaults to manual. Never installs a hook (§2.2 rule 3).
      mode = existingConfig?.mode ?? 'manual'
      explicit = false
    }

    const useLocal = args.local || wizardLocal

    // Hook install decision (§2.2): a bare non-interactive run never touches
    // settings files, even when the committed mode is ask/auto.
    const installHook =
      mode !== 'manual' && args.hook !== false && (interactive ? interactiveConsent : explicit)

    // ---- Dry-run: print plan and return without writing (§2.6) ----
    if (args['dry-run']) {
      process.stdout.write(bold('whydone init dry-run plan:\n'))
      process.stdout.write(green('  [create]') + ' ' + dim(path.relative(cwd, journalDir) + '/\n'))
      process.stdout.write(green('  [create]') + ' ' + dim(indexPath + ' (seed, skipped if present)\n'))
      process.stdout.write(green('  [create]') + ' ' + dim(path.join(path.relative(cwd, skillsDir), 'log', 'SKILL.md') + '\n'))
      process.stdout.write(green('  [create]') + ' ' + dim(path.join(path.relative(cwd, skillsDir), 'recall', 'SKILL.md') + '\n'))
      process.stdout.write(green('  [create/update]') + ' ' + dim('CLAUDE.md (marker block)\n'))
      process.stdout.write(green('  [create]') + ' ' + dim(path.relative(cwd, lockPath) + '\n'))
      process.stdout.write(green('  [create]') + ' ' + dim(`${JOURNAL_DIR}/config.json (mode: ${mode}${languageSuffix})\n`))
      process.stdout.write(green('  [create]') + ' ' + dim(`${JOURNAL_DIR}/.cache/.gitignore\n`))
      if (installHook) {
        process.stdout.write(green('  [create/update]') + ' ' + dim(`${settingsDisplay} (Stop hook)\n`))
      } else {
        const why =
          mode === 'manual' ? 'manual mode' : args.hook === false ? '--no-hook' : 'non-interactive run'
        process.stdout.write(green('  [skip]') + ' ' + dim(`Stop hook (${why})\n`))
      }
      if (args.local) {
        process.stdout.write(green('  [update]') + ' ' + dim(`.git/info/exclude (hide ${JOURNAL_DIR}/, storage: local)\n`))
      }
      return
    }

    // --local cannot hide a journal git already tracks (same refusal as hide).
    if (useLocal && isTracked(cwd, JOURNAL_DIR)) {
      process.stderr.write(
        `error: ${JOURNAL_DIR}/ is already tracked by git — --local cannot hide tracked files.\n` +
          '  Untrack it first (deliberate, history-visible; committed entries stay in git history):\n' +
          `    git rm -r --cached ${JOURNAL_DIR} && git commit -m "untrack journal"\n` +
          '  then re-run with --local, or use `whydone hide`.\n',
      )
      process.exit(1)
      return
    }

    // ---- Step 1: Create .whydone/ (idempotent via recursive: true) ----
    await mkdir(journalDir, { recursive: true })

    // Seed an empty INDEX.md (header + separator) so the CLAUDE.md marker
    // block's "read .whydone/INDEX.md" pointer resolves before the first
    // `whydone index` run. flag 'wx' = create-only: never clobber an index
    // already built from real entries (idempotent re-runs included).
    try {
      await writeFile(path.join(journalDir, 'INDEX.md'), buildIndexContent([]), {
        encoding: 'utf-8',
        flag: 'wx',
      })
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err
    }

    // ---- Step 2: Copy skill templates ----
    const result = await copySkills(TEMPLATES_DIR, skillsDir, { force: args.force })

    // ---- Step 3: Patch CLAUDE.md with marker block (scope-aware, §7.3) ----
    // Global installs get the §6.5 conditional variant ("Projects may keep…")
    // — ~/.claude/CLAUDE.md loads in EVERY project, most without a journal.
    await patchClaudeMd(claudeMdPath, indexPath, scope)

    // ---- Step 5 (§2.4): Write .whydone/config.json ----
    // Create if absent; if present, update mode ONLY when explicitly decided
    // this run. A bare non-interactive re-run leaves an existing config
    // byte-untouched (preserves committed team policy, no CI churn).
    const configInvalid = existsSync(configPath) && existingConfig === null
    if (
      !existsSync(configPath) ||
      configInvalid ||
      explicit ||
      useLocal ||
      args.language !== undefined
    ) {
      await writeConfigMode(
        journalDir,
        mode,
        useLocal ? 'local' : wizardAskedStorage ? 'committed' : undefined,
        args.language,
      )
      if (configInvalid) {
        process.stderr.write(
          yellow('warn') + `: ${JOURNAL_DIR}/config.json was invalid — rewritten with mode ${mode}\n`,
        )
      }
    }

    // ---- Step 6 (§2.4): .whydone/.cache/.gitignore — exactly '*\n', create-only ----
    await mkdir(path.join(journalDir, '.cache'), { recursive: true })
    try {
      await writeFile(path.join(journalDir, '.cache', '.gitignore'), '*\n', {
        encoding: 'utf-8',
        flag: 'wx',
      })
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err
    }

    // ---- Step 6b (v0.4): storage local — hide the journal from git ----
    let localNoGit = false
    let localClaudeMdVisible = false
    if (useLocal) {
      const toExclude = [`${JOURNAL_DIR}/`]
      const claudeMdTracked = !args.global && isTracked(cwd, 'CLAUDE.md')
      if (!args.global && !claudeMdTracked) toExclude.push('CLAUDE.md')
      const wrote = await ensureExcluded(cwd, toExclude)
      localNoGit = !wrote
      localClaudeMdVisible = wrote && claudeMdTracked
      if (localClaudeMdVisible) {
        process.stderr.write(
          yellow('warn') +
            ': CLAUDE.md is tracked by git — the whydone marker block in it shows up in git status.\n' +
            '      Do not commit that change (`git restore CLAUDE.md` removes it; `whydone hide`/`publish` manage it).\n',
        )
      }
      if (!args.quiet) {
        process.stderr.write(
          yellow('note') +
            ': the npm channel itself leaves whydone traces in the repo (package.json devDependency,\n' +
            '      .claude/skills, lock-file). For a fully traceless setup use the plugin channel with\n' +
            '      `init --journal-only --local`.\n',
        )
      }
    }

    // ---- Step 7 (§2.4): Stop hook — launcher file + settings entry ----
    let hookOutcome: HookOutcome
    if (installHook) {
      await mkdir(targetBase, { recursive: true })
      await writeFile(launcherPath, buildLauncherSource(), 'utf-8')
      const installResult = await installStopHook(settingsPath, launcherPath)
      if (installResult === 'invalid-json') {
        hookOutcome = 'invalid-json'
        process.stderr.write(
          yellow('warn') +
            `: ${settingsDisplay} is not valid JSON — hook not installed; fix the file and re-run npx whydone init\n`,
        )
      } else if (installResult === 'conflict') {
        hookOutcome = 'conflict'
        process.stderr.write(
          yellow('warn') +
            `: ${settingsDisplay} changed while whydone was editing it — hook not (re)installed, re-run the command\n`,
        )
      } else {
        hookOutcome = 'installed'
      }
    } else if (mode === 'manual') {
      hookOutcome = 'manual-mode'
    } else if (args.hook === false) {
      hookOutcome = 'no-hook'
    } else {
      hookOutcome = 'not-installed'
    }

    // ---- Step 8 (§2.4): Lock file v2 — lock-dir-relative POSIX paths (§7.2) ----
    // skills[] holds every installed skill file, relative to the lock's own
    // directory (targetBase), sorted for a deterministic, committable lock.
    const allSkillRelPaths = [...result.copied, ...result.skipped]
      .map((f) => toPosixPath(path.join('skills', f)))
      .sort()

    const lockFile: LockFile = {
      lockVersion: 2,
      version: PKG_VERSION,
      scope,
      skillsDir: 'skills',
      skills: allSkillRelPaths,
      claudeMdPatched: true,
      claudeMdPath: toPosixPath(path.relative(targetBase, claudeMdPath)),
    }
    await writeLockFile(lockPath, lockFile)

    // ---- Output (§2.5) ----
    if (!args.quiet) {
      const installed = result.copied.length
      const skipped = result.skipped.length

      let hookLine: string
      switch (hookOutcome) {
        case 'installed':
          hookLine = `installed → ${settingsDisplay} (local to this machine)`
          break
        case 'manual-mode':
          hookLine = 'not installed (manual mode)'
          break
        case 'no-hook':
          hookLine = 'not installed (--no-hook)'
          break
        case 'invalid-json':
          hookLine = 'not installed — settings file invalid (see warning)'
          break
        case 'conflict':
          hookLine = 'not installed — settings file changed during edit (see warning; re-run npx whydone init)'
          break
        case 'not-installed':
          hookLine =
            'not installed — ask/auto will only trigger when you invoke /log yourself. Re-run npx whydone init to add it.'
          break
      }

      const claudeMdDisplay = args.global ? '~/.claude/CLAUDE.md' : 'CLAUDE.md'
      const effLocal = useLocal || existingConfig?.storage === 'local'
      const fullModeLine = effLocal ? MODE_LINE_LOCAL[mode] : MODE_LINE[mode]
      const effLanguage = args.language ?? existingConfig?.language
      const languageLine =
        effLanguage !== undefined ? `  Language:         ${effLanguage} (entry prose; .whydone/config.json)\n` : ''
      const storageLine = effLocal
        ? localNoGit
          ? '  Storage:          local (no git repo here — nothing to exclude)\n'
          : '  Storage:          LOCAL-ONLY — .whydone/ hidden via .git/info/exclude; no backup. `whydone publish` reverses.\n'
        : ''
      const step3 = effLocal
        ? '  3. The journal is local-only — nothing of it to commit. Commit the tooling if you want:\n' +
          '       git add .claude/skills .claude/whydone.lock.json\n'
        : '  3. Commit the shared parts:\n' +
          '       git add .whydone .claude/skills .claude/whydone.lock.json CLAUDE.md\n' +
          '     (.claude/settings.local.json stays local — teammates run `npx whydone init` once after cloning.)\n'
      process.stdout.write(
        bold('whydone init') +
          ' complete\n' +
          `  Skills installed: ${green(String(installed))}, skipped: ${dim(String(skipped))}\n` +
          `  Journal dir:      ${dim(path.relative(cwd, journalDir) + '/')}\n` +
          `  Lock-file:        ${dim(path.relative(cwd, lockPath))}\n` +
          `  Mode:             ${fullModeLine}\n` +
          languageLine +
          storageLine +
          `  Stop hook:        ${hookLine}\n` +
          '\n' +
          'Next steps:\n' +
          `  1. ${claudeMdDisplay} was updated — accept the workspace-trust prompt next session so project skills load.\n` +
          '  2. Start a NEW Claude Code session: skills, hooks, and CLAUDE.md are read at session start.\n' +
          step3 +
          '  4. Finish any task, then run /log — in ask or auto mode whydone will also offer it by itself.\n' +
          '\n' +
          'Remove everything: npx whydone uninstall   (add --purge to also delete .whydone/)\n',
      )
    }
  },
})
