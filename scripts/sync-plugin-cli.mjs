/**
 * Vendors the built CLI into the plugin channel.
 *
 * dist/cli.js (fully bundled, self-contained — see tsdown.config.mjs) is copied
 * to cli/whydone.mjs, which IS committed to git: plugin installs fetch the git
 * tree, where dist/ is ignored, so the plugin's copy must live in a tracked
 * path. Skills and the plugin Stop hook invoke it as
 * `node "$CLAUDE_PLUGIN_ROOT/cli/whydone.mjs"`.
 *
 * Why cli/ and not bin/: Claude Code puts a plugin's top-level bin/ on the
 * Bash PATH while the plugin is enabled, and claude.ai organization plugin
 * distribution rejects plugins that ship a top-level bin/. whydone never
 * wanted either — the file is reached by explicit path only.
 *
 * The .mjs extension makes the module format explicit regardless of any
 * surrounding package.json. CI guards drift with `git diff --exit-code -- cli`
 * after a fresh build.
 */
import { copyFileSync, mkdirSync } from 'node:fs'

mkdirSync('cli', { recursive: true })
copyFileSync('dist/cli.js', 'cli/whydone.mjs')
console.log('synced dist/cli.js -> cli/whydone.mjs')
