/**
 * Vendors the built CLI into the plugin channel.
 *
 * dist/cli.js (fully bundled, self-contained — see tsdown.config.ts) is copied
 * to bin/whydone.mjs, which IS committed to git: plugin installs fetch the git
 * tree, where dist/ is ignored, so the plugin's copy must live in a tracked
 * path. Skills and the plugin Stop hook invoke it as
 * `node "$CLAUDE_PLUGIN_ROOT/bin/whydone.mjs"`.
 *
 * The .mjs extension makes the module format explicit regardless of any
 * surrounding package.json. CI guards drift with `git diff --exit-code -- bin`
 * after a fresh build.
 */
import { copyFileSync, mkdirSync } from 'node:fs'

mkdirSync('bin', { recursive: true })
copyFileSync('dist/cli.js', 'bin/whydone.mjs')
console.log('synced dist/cli.js -> bin/whydone.mjs')
