/**
 * whydone publish — switch the journal to storage: committed (v0.4).
 *
 * The inverse of `whydone hide`: removes whydone's entries from
 * .git/info/exclude, makes sure the CLAUDE.md marker block is present, and
 * records storage: committed. Entries are ordinary files, so "going public"
 * is exactly this plus one `git add` — the whole local-journal history
 * becomes the team journal.
 */

import { defineCommand } from 'citty'
import { existsSync } from 'node:fs'
import path from 'node:path'
import pc from 'picocolors'

import { JOURNAL_DIR } from '../lib/constants.js'
import { readConfig, readConfigIfValid, writeConfigMode, CONFIG_BASENAME } from '../lib/config.js'
import { listOtherLocalWorktrees, removeExcluded } from '../lib/git-exclude.js'
import { patchClaudeMd } from '../lib/marker-block.js'
import { toPosixPath } from '../lib/lock-file.js'

export default defineCommand({
  meta: {
    name: 'publish',
    description: 'Make the journal committed: unhide .whydone/ and point the next git add at it',
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

    const cwd = process.cwd()
    const journalDir = path.resolve(cwd, JOURNAL_DIR)

    if (!existsSync(journalDir)) {
      process.stderr.write(`error: no ${JOURNAL_DIR}/ here — run \`whydone init\` first\n`)
      process.exit(1)
      return
    }

    // The exclude pattern lives in the COMMON git dir — one line serves every
    // worktree. Dropping it here would instantly expose a sibling worktree's
    // local journal in its git status (v1.0 review, reproduced).
    const siblings = listOtherLocalWorktrees(cwd)
    if (siblings.length > 0) {
      process.stderr.write(
        'error: other worktree(s) of this repo keep a LOCAL journal that shares the same\n' +
          '  .git/info/exclude entries — publishing here would expose them:\n' +
          siblings.map((r) => `    ${r}\n`).join('') +
          '  Run `whydone publish` in those worktrees first (or delete their journals).\n',
      )
      process.exit(1)
      return
    }

    if (args['dry-run']) {
      process.stdout.write(bold('whydone publish dry-run plan:\n'))
      process.stdout.write(dim(`  [update] .git/info/exclude  (- ${JOURNAL_DIR}/, - CLAUDE.md)\n`))
      process.stdout.write(dim('  [create/update] CLAUDE.md  (marker block ensured)\n'))
      process.stdout.write(dim(`  [update] ${JOURNAL_DIR}/config.json  (storage: committed)\n`))
      return
    }

    await removeExcluded(cwd, [`${JOURNAL_DIR}/`, 'CLAUDE.md'])
    const indexPath = toPosixPath(path.relative(cwd, path.join(journalDir, 'INDEX.md')))
    await patchClaudeMd(path.resolve(cwd, 'CLAUDE.md'), indexPath, 'project')
    const configWasInvalid =
      existsSync(path.join(journalDir, CONFIG_BASENAME)) &&
      (await readConfigIfValid(journalDir)) === null
    const { mode } = await readConfig(journalDir)
    await writeConfigMode(journalDir, mode, 'committed')
    if (configWasInvalid) {
      process.stderr.write(`warn: ${JOURNAL_DIR}/config.json was invalid — rewritten with mode ${mode}\n`)
    }

    if (!args.quiet) {
      process.stdout.write(
        bold('whydone publish') +
          ' complete — the journal is COMMITTED-storage now\n' +
          `  ${JOURNAL_DIR}/ and CLAUDE.md are visible to git again.\n` +
          '  Ship it to the team:\n' +
          `    git add ${JOURNAL_DIR} CLAUDE.md && git commit -m "chore: publish whydone journal"\n`,
      )
    }
  },
})
