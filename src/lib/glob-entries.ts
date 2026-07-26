import { glob } from 'tinyglobby'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { parseEntry } from './parse-entry.js'
import type { ParsedEntry } from '../types.js'

/**
 * Basenames that are always excluded from the entry glob.
 * INDEX.md and manifest.json are generated files, not changelog entries.
 */
export const EXCLUDED_BASENAMES = new Set(['INDEX.md', 'manifest.json'])

/**
 * Glob all changelog entry files in a directory, parse each one leniently.
 *
 * Excludes INDEX.md and manifest.json by basename.
 * Uses Promise.all for parallel file reads.
 *
 * @param changelogDir - Absolute path to the .whydone/ directory
 * @returns Array of ParsedEntry objects (may include entries with _parseError: true)
 */
export async function globEntries(changelogDir: string): Promise<ParsedEntry[]> {
  const files = await glob('*.md', { cwd: changelogDir, absolute: true })

  const entryFiles = files.filter((f) => !EXCLUDED_BASENAMES.has(path.basename(f)))

  const entries = await Promise.all(
    entryFiles.map(async (f) => {
      const raw = await readFile(f, 'utf-8')
      return parseEntry(f, raw)
    }),
  )

  return entries
}
