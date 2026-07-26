#!/usr/bin/env node
/**
 * whydone CLI entry point
 *
 * shebang + citty root command + six subCommands wired via lazy imports.
 *
 * CRITICAL: NO args on the root defineCommand — citty issue #133 (Pitfall 4):
 *   If root command declares args alongside subCommands, citty misinterprets
 *   flag values as subcommand names. All shared flags live in each subcommand.
 *
 * Package name/version/description read via createRequire (Pitfall 5) to avoid
 * import assertion syntax incompatibility across Node 20 vs 22.
 */

import { defineCommand, runMain } from 'citty'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Compute __dirname from import.meta.url — works in both dev (src/) and dist/
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Read package.json via createRequire — avoids import assertion syntax issues (Pitfall 5)
const _require = createRequire(import.meta.url)
const pkg = _require(path.join(__dirname, '..', 'package.json')) as {
  name: string
  version: string
  description: string
}

const main = defineCommand({
  meta: {
    name: pkg.name,
    version: pkg.version,
    description: pkg.description,
  },
  // CRITICAL: No args here — citty bug with root args + subCommands (Pitfall 4, issue #133).
  // All shared flags (--json, --dry-run, --quiet, --no-color) are defined in each subcommand.
  subCommands: {
    init: () => import('./commands/init.js').then((m) => m.default),
    index: () => import('./commands/build-index.js').then((m) => m.default),
    validate: () => import('./commands/validate.js').then((m) => m.default),
    recall: () => import('./commands/recall.js').then((m) => m.default),
    update: () => import('./commands/update.js').then((m) => m.default),
    uninstall: () => import('./commands/uninstall.js').then((m) => m.default),
    hide: () => import('./commands/hide.js').then((m) => m.default),
    publish: () => import('./commands/publish.js').then((m) => m.default),
    hook: () => import('./commands/hook.js').then((m) => m.default),
  },
})

runMain(main)
