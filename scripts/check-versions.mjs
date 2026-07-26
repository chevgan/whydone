import { readFileSync } from 'node:fs'
const read = (p) => JSON.parse(readFileSync(p, 'utf8'))
const pkg = read('package.json')
const plugin = read('.claude-plugin/plugin.json')
if (pkg.version !== plugin.version) {
  console.error(`version mismatch: package.json=${pkg.version} .claude-plugin/plugin.json=${plugin.version}`)
  process.exit(1)
}
