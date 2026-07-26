/**
 * whydone hide — switch the journal to storage: local (v0.4).
 *
 * Adds .whydone/ (and an untracked CLAUDE.md) to .git/info/exclude — the
 * local, never-committed gitignore — and records storage: local in
 * config.json. The inverse of `whydone publish`.
 *
 * Refuses when .whydone/ is already tracked: info/exclude only hides
 * untracked paths, and untracking is a history-visible git operation the
 * user must perform deliberately (old entries stay in git history forever —
 * hiding cannot unpublish them).
 */

import { defineCommand } from 'citty'
import { existsSync } from 'node:fs'
import path from 'node:path'
import pc from 'picocolors'

import { JOURNAL_DIR } from '../lib/constants.js'
import { readConfig, readConfigIfValid, writeConfigMode, CONFIG_BASENAME } from '../lib/config.js'
import { ensureExcluded, isTracked, resolveExcludePath } from '../lib/git-exclude.js'

export default defineCommand({
  meta: {
    name: 'hide',
    description: 'Make the journal local-only: hide .whydone/ from git via .git/info/exclude',
  },
  args: {
    'dry-run': {
      type: 'boolean',
      description: 'Print the plan without changing anything',
      default: false,
    },
    quiet: { type: 'boolean', description: 'Suppress non-error output', default: false },
    'no-color': { type: 'boolean', description: 'Disable ANSI color output', default: false },
  },

  async run({ args }) {
    const useColor = !args['no-color']
    const dim = (s: string) => (useColor ? pc.dim(s) : s)
    const bold = (s: string) => (useColor ? pc.bold(s) : s)
    const yellow = (s: string) => (useColor ? pc.yellow(s) : s)

    const cwd = process.cwd()
    const journalDir = path.resolve(cwd, JOURNAL_DIR)

    if (!existsSync(journalDir)) {
      process.stderr.write(`error: no ${JOURNAL_DIR}/ here — run \`whydone init\` first\n`)
      process.exit(1)
      return
    }

    const noGit = resolveExcludePath(cwd) === null
    if (!noGit && isTracked(cwd, JOURNAL_DIR)) {
      process.stderr.write(
        `error: ${JOURNAL_DIR}/ is already tracked by git — .git/info/exclude cannot hide tracked files.\n` +
          '  To untrack it first (a deliberate, history-visible step — committed entries stay in git\n' +
          '  history forever, hiding cannot unpublish them):\n' +
          `    git rm -r --cached ${JOURNAL_DIR} && git commit -m "untrack journal"\n` +
          '  then re-run `whydone hide`.\n',
      )
      process.exit(1)
      return
    }

    const claudeMdTracked = !noGit && isTracked(cwd, 'CLAUDE.md')
    const toExclude = [`${JOURNAL_DIR}/`]
    if (!noGit && !claudeMdTracked) toExclude.push('CLAUDE.md')

    if (args['dry-run']) {
      process.stdout.write(bold('whydone hide dry-run plan:\n'))
      if (noGit) {
        process.stdout.write(dim('  no git repo — only config.json gets storage: local\n'))
      } else {
        process.stdout.write(dim(`  [update] .git/info/exclude  (+ ${toExclude.join(', ')})\n`))
      }
      process.stdout.write(dim(`  [update] ${JOURNAL_DIR}/config.json  (storage: local)\n`))
      return
    }

    if (!noGit) await ensureExcluded(cwd, toExclude)
    const configWasInvalid =
      existsSync(path.join(journalDir, CONFIG_BASENAME)) &&
      (await readConfigIfValid(journalDir)) === null
    const { mode } = await readConfig(journalDir)
    await writeConfigMode(journalDir, mode, 'local')
    if (configWasInvalid) {
      process.stderr.write(
        yellow('warn') + `: ${JOURNAL_DIR}/config.json was invalid — rewritten with mode ${mode}\n`,
      )
    }

    if (claudeMdTracked) {
      process.stderr.write(
        yellow('warn') +
          ': CLAUDE.md is tracked by git — the whydone marker block in it shows up in git status.\n' +
          '      Do not commit that change (`git restore CLAUDE.md` removes it).\n',
      )
    }
    if (!args.quiet) {
      process.stdout.write(
        bold('whydone hide') +
          ' complete — the journal is LOCAL-ONLY now\n' +
          (noGit
            ? '  No git repo here: nothing to exclude; storage: local recorded.\n'
            : `  ${JOURNAL_DIR}/ is hidden via .git/info/exclude — invisible to git status and diffs.\n`) +
          '  Remember: a local journal has NO backup — this folder is the only copy.\n' +
          '  Reverse anytime: whydone publish\n',
      )
    }
  },
})
