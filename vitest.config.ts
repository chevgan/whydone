import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    include: ['tests/**/*.test.ts'],
    // Four suites drive real git repos and the built CLI through spawnSync
    // (hook-stop, hook-launcher, storage-local, check-versions): a dozen
    // process spawns per test, which a Windows runner can take 300-500 ms
    // each on a slow day — the 5 s default timed out on windows / node 24
    // in CI run #17 with no code change involved. Unit tests still finish in
    // milliseconds; this cap only decides when a hung subprocess is declared
    // dead, and every spawn carries its own 15 s timeout well below it.
    testTimeout: 60_000,
  },
})
