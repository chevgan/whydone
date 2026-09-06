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
 * Structural check for a parsed lock. A v2 lock must carry every field the
 * commands dereference (skills[], skillsDir, claudeMdPath, …): a truncated or
 * hand-edited `{"lockVersion": 2}` used to crash uninstall/update with a
 * TypeError instead of a clean message (v1.3 audit). Any other object passes
 * through untouched — a v1-era lock has no lockVersion at all — so the
 * callers' "older whydone — delete and re-init" message still fires for it.
 */
export function isLockFileShape(value: unknown): value is LockFile {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const o = value as Record<string, unknown>
  if (o.lockVersion !== 2) return true
  return (
    typeof o.version === 'string' &&
    (o.scope === 'project' || o.scope === 'global') &&
    typeof o.skillsDir === 'string' &&
    Array.isArray(o.skills) &&
    o.skills.every((s) => typeof s === 'string') &&
    typeof o.claudeMdPatched === 'boolean' &&
    typeof o.claudeMdPath === 'string'
  )
}

/**
 * Read the whydone lock file.
 *
 * T-02-04 mitigation: JSON.parse wrapped in try/catch — returns null on ENOENT,
 * invalid JSON, or a structurally invalid lock (isLockFileShape); never throws.
 *
 * @param lockPath - Absolute path to the lock file
 * @returns Parsed LockFile or null if file missing, JSON invalid, or shape wrong
 */
export async function readLockFile(lockPath: string): Promise<LockFile | null> {
  try {
    const raw = await readFile(lockPath, 'utf-8')
    const parsed: unknown = JSON.parse(raw)
    return isLockFileShape(parsed) ? parsed : null
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
