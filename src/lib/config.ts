import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

/**
 * Reader/writer for .whydone/config.json — the committed journal-mode policy.
 *
 * Shape (exact, design §1.1):
 *   { "configVersion": 1, "mode": "ask" | "auto" | "manual" }
 *
 * Lenient contract identical to readLockFile: ENOENT, invalid JSON, wrong
 * configVersion, unknown mode ⇒ mode 'manual' (v0.1-compatible, fail-quiet).
 * Never throws. Default-on-absence is 'manual' forever — the safety floor.
 */

export type WhydoneMode = 'ask' | 'auto' | 'manual'

/**
 * Where the journal lives relative to git (v0.4). Orthogonal to mode:
 * 'committed' (default) — .whydone/ is ordinary repo content;
 * 'local' — .whydone/ is hidden via .git/info/exclude, never committed.
 * Absent/unknown value reads as 'committed' (v0.3-compatible).
 */
export type WhydoneStorage = 'committed' | 'local'

export interface WhydoneConfig {
  mode: WhydoneMode
  storage: WhydoneStorage
}

/** Basename of the config file inside the journal dir. */
export const CONFIG_BASENAME = 'config.json'

const VALID_MODES: ReadonlySet<string> = new Set(['ask', 'auto', 'manual'])

/** Type guard for the closed mode enum. */
export function isWhydoneMode(value: unknown): value is WhydoneMode {
  return typeof value === 'string' && VALID_MODES.has(value)
}

/** Lenient storage reader: only the literal 'local' opts in. */
export function asStorage(value: unknown): WhydoneStorage {
  return value === 'local' ? 'local' : 'committed'
}

/**
 * Read the config strictly: returns the parsed config only when the file
 * exists, parses, has configVersion === 1, and a valid mode. Otherwise null.
 * Used by init to distinguish "valid committed policy" from "absent/broken".
 */
export async function readConfigIfValid(journalDir: string): Promise<WhydoneConfig | null> {
  try {
    const raw = await readFile(path.join(journalDir, CONFIG_BASENAME), 'utf-8')
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null
    const obj = parsed as Record<string, unknown>
    if (obj.configVersion !== 1) return null
    if (!isWhydoneMode(obj.mode)) return null
    return { mode: obj.mode, storage: asStorage(obj.storage) }
  } catch {
    return null
  }
}

/**
 * Read the config leniently (design §1.3). Absent/unreadable/invalid ⇒
 * { mode: 'manual', storage: 'committed' }. Never throws.
 */
export async function readConfig(journalDir: string): Promise<WhydoneConfig> {
  return (await readConfigIfValid(journalDir)) ?? { mode: 'manual', storage: 'committed' }
}

/**
 * Create or update .whydone/config.json with the given mode (and optionally
 * storage). Read-modify-write: unknown keys in an existing (parseable) file
 * are preserved (design §1.1). storage is only written when passed explicitly
 * or already present — a v0.3-era two-key config stays byte-stable across
 * mode-only rewrites. Serialized with JSON.stringify(_, null, 2).
 */
export async function writeConfigMode(
  journalDir: string,
  mode: WhydoneMode,
  storage?: WhydoneStorage,
): Promise<void> {
  const configPath = path.join(journalDir, CONFIG_BASENAME)
  let existing: Record<string, unknown> = {}
  try {
    const parsed: unknown = JSON.parse(await readFile(configPath, 'utf-8'))
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      existing = parsed as Record<string, unknown>
    }
  } catch {
    // Absent or broken — start from the canonical shape.
  }
  const next: Record<string, unknown> = { ...existing, configVersion: 1, mode }
  if (storage !== undefined) next.storage = storage
  await writeFile(configPath, JSON.stringify(next, null, 2), 'utf-8')
}
