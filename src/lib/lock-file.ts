import { readFile, writeFile, unlink, mkdir } from 'node:fs/promises'
import path from 'node:path'
import type { LockFile } from '../types.js'

/**
 * Normalize a relative path to POSIX separators for the lock file (v2, §7.2).
 * The committed lock must be byte-stable across machines and OSes.
 */
export function toPosixPath(p: string): string {
  return p.split(path.sep).join('/')
}

/**
 * Read the whydone lock file.
 *
 * T-02-04 mitigation: JSON.parse wrapped in try/catch — returns null on ENOENT
 * or invalid JSON; never throws.
 *
 * @param lockPath - Absolute path to the lock file
 * @returns Parsed LockFile or null if file missing or JSON invalid
 */
export async function readLockFile(lockPath: string): Promise<LockFile | null> {
  try {
    const raw = await readFile(lockPath, 'utf-8')
    return JSON.parse(raw) as LockFile
  } catch {
    return null
  }
}

/**
 * Write the whydone lock file.
 *
 * Creates parent directories if needed (e.g., .claude/ may not exist yet).
 *
 * @param lockPath - Absolute path to the lock file
 * @param data - Lock file data to write
 */
export async function writeLockFile(lockPath: string, data: LockFile): Promise<void> {
  await mkdir(path.dirname(lockPath), { recursive: true })
  await writeFile(lockPath, JSON.stringify(data, null, 2), 'utf-8')
}

/**
 * Delete the whydone lock file.
 *
 * No-ops if the file does not exist. Rethrows other errors.
 *
 * @param lockPath - Absolute path to the lock file
 */
export async function deleteLockFile(lockPath: string): Promise<void> {
  try {
    await unlink(lockPath)
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return // Already gone — no-op
    }
    throw err
  }
}
