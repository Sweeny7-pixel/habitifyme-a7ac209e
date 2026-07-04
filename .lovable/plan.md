# Phase 17 — Verification & Completion

## Current status (verified in code)

| Item | Location | Status |
|---|---|---|
| `calculateHabitScore` | `src/lib/habit-score.ts` (`calculateAndSaveHabitScore`) | ✅ server fn |
| `achievementEngine` | `src/lib/achievements.ts` + `push.functions.ts` (`evaluateAndNotifyAchievements`) | ✅ server fn |
| `weeklyPlanner` | `src/lib/gym.functions.ts` (`generateWeekPlan`) | ✅ server fn |
| `sendReminder` (daily) | `src/routes/api/public/hooks/send-daily-reminder.ts` | ✅ route exists |
| `sendReminder` (weekly) | `src/routes/api/public/hooks/send-weekly-review.ts` | ✅ route exists |
| `recoveryPrompt` | `src/components/RecoveryModal.tsx` (client only) | ⚠️ no server trigger |

Per stack rules, keeping the first three as `createServerFn` is correct — they are app-internal, called by the UI. Only truly external cron/webhook targets belong in `/api/public/*`.

## Gaps to close

1. **No pg_cron schedules exist** for the two `/api/public/hooks/*` routes — the routes are unreachable on a schedule today. Verified via `rg cron.schedule supabase/migrations/`: no matches.
2. **No nightly `habit_scores` recompute** — score only updates when the UI calls it.
3. **No server-side recovery prompt** — RecoveryModal is client-only; no push nudge on missed-day streaks.

## Proposed work

### A. Migration: schedule existing cron hooks
New migration enabling `pg_cron` + `pg_net` and scheduling:
- `send-daily-reminder` at `30 23 * * *` UTC (05:00 IST)
- `send-weekly-review` at `30 15 * * 0` UTC (Sun 21:00 IST)
- `recompute-habit-scores` at `0 0 * * *` UTC (calls new hook below)

Both HTTP calls use `apikey: <SUPABASE_PUBLISHABLE_KEY>` header, matching the existing route guards. URL: `https://project--{id}.lovable.app/api/public/hooks/<name>`.

### B. New hook: `/api/public/hooks/recompute-habit-scores`
- Loads all users with recent activity (last 14 days).
- Calls `calculateHabitScoreInternal` for each, writes to `habit_scores` + `habit_score_history`.
- Same `apikey` guard.

### C. New hook: `/api/public/hooks/send-recovery-prompt`
- Finds users who trained yesterday-or-earlier but have a break in streak (2–3 day gap).
- Sends a "come back" push via `sendPushToMany`.
- Scheduled daily at `0 11 * * *` UTC (16:30 IST).

### D. No refactor of existing server fns
`calculateAndSaveHabitScore`, `generateWeekPlan`, achievement engine stay as `createServerFn` — that's the correct pattern per `server-side-modern`.

## Files touched

- **New:** `supabase/migrations/<ts>_schedule_phase17_cron.sql`
- **New:** `src/routes/api/public/hooks/recompute-habit-scores.ts`
- **New:** `src/routes/api/public/hooks/send-recovery-prompt.ts`
- **Edit:** `.lovable/plan.md` — mark Phase 17 complete

## Verification

After migration runs: `SELECT jobname, schedule FROM cron.job;` should list all 4 jobs. Manually POST each hook with the `apikey` header and confirm 200 + push receipts / row updates.

## Out of scope

- Refactoring server fns into edge functions (would violate stack rules).
- New notification categories beyond recovery.
- Changing existing route auth model.
