import { readdir, access, copyFile, mkdir } from 'node:fs/promises'
import type { Dirent } from 'node:fs'
import path from 'node:path'

/**
 * Result of a copySkills() call.
 * copied: repo-relative paths of files actually written
 * skipped: repo-relative paths skipped because target existed and !force
 */
export interface CopyResult {
  copied: string[]
  skipped: string[]
}

/**
 * Recursively copy template skill files from templatesDir to targetDir.
 *
 * Idempotent: skips files that already exist at the target when !force.
 * Does NOT write to the lock file — that is the init command's responsibility.
 *
 * @param templatesDir - Absolute path to templates/skills/ in pkg root
 * @param targetDir    - Absolute path to .claude/skills/ (or ~/.claude/skills/)
 * @param opts         - { force?: boolean } — when true, overwrites existing files
 * @returns CopyResult with arrays of copied and skipped relative paths
 */
export async function copySkills(
  templatesDir: string,
  targetDir: string,
  opts: { force?: boolean },
): Promise<CopyResult> {
  const copied: string[] = []
  const skipped: string[] = []

  async function walkDir(currentDir: string): Promise<void> {
    let entries: Dirent[]
    try {
      entries = await readdir(currentDir, { withFileTypes: true }) as Dirent[]
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return // templatesDir doesn't exist — nothing to copy
      }
      throw err
    }

    for (const entry of entries) {
      const fullSrcPath = path.join(currentDir, entry.name as string)
      const relPath = path.relative(templatesDir, fullSrcPath)
      const fullTargetPath = path.join(targetDir, relPath)

      if (entry.isDirectory()) {
        await walkDir(fullSrcPath)
      } else if (entry.isFile()) {
        // Check if target already exists
        let exists = false
        try {
          await access(fullTargetPath)
          exists = true
        } catch {
          exists = false
        }

        if (exists && !opts.force) {
          skipped.push(relPath)
        } else {
          await mkdir(path.dirname(fullTargetPath), { recursive: true })
          await copyFile(fullSrcPath, fullTargetPath)
          copied.push(relPath)
        }
      }
    }
  }

  await walkDir(templatesDir)

  return { copied, skipped }
}
