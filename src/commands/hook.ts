/**
 * whydone hook — container for hook subcommands (design §3.4 wiring).
 *
 * Only subcommand in v0.2 is `stop`; room for `hook session-start` in v-next
 * (AUTO-02) without CLI surface churn. Invoked by the init-written launcher
 * (.claude/whydone-hook.cjs), which pipes the Stop-hook stdin JSON through
 * unchanged.
 */

import { defineCommand } from 'citty'

export default defineCommand({
  meta: {
    name: 'hook',
    description: 'Internal hook handlers (invoked by Claude Code hooks, not by users)',
  },
  subCommands: {
    stop: () => import('./hook-stop.js').then((m) => m.default),
  },
})
