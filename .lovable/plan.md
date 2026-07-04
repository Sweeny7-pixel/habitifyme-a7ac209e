# Phases 16 + 3 + 20 — implementation plan

## Phase 20 — validator migration (mechanical)
Rename `.inputValidator(` → `.validator(` at the 10 call sites in `src/lib/gym.functions.ts` (lines 66, 100, 193, 337, 350, 417, 441, 515, 1043, 1271). Zero behaviour change; clears the 10 Vite deprecation warnings.

## Phase 16 — diet XP (once per day, idempotent)

**No diet-logging UI exists today** — `getWeekDiet` only fetches the plan. To wire `XP_RULES.DIET_LOGGING = 15` I need a user action to award against. Adding the minimum surface:

**New server fn** `logDietDay` in `src/lib/checkin.ts` (co-located with `gymCheckin` for symmetry):
- `.middleware([requireSupabaseAuth])`
- input: `{ weekId: uuid, dayIndex: 0..6 }`
- computes date string in Asia/Kolkata timezone → `yyyy-mm-dd`
- calls `awardXPInternal(supabase, userId, "DIET_LOGGING", 15, { source: "diet_log", idempotencyKey: "diet:<userId>:<yyyy-mm-dd>" })`
- returns `{ xpAwarded, alreadyLogged }`

Idempotency: `awardXPInternal` already keys on `xp_transactions.idempotency_key` (unique per user); a second call the same day returns `{ alreadyLogged: true, xpAwarded: 0 }`.

**UI wire** in `src/routes/_authenticated/diet.tsx`:
- New "Mark diet followed" pill button below the day badge, only when `isToday`.
- On click → `logDietDay` → toast `+15 XP` (via existing `XpPopup`) or "Already logged today".
- After success, invalidate `["homeStats"]` and `["xp"]`.
- Local `useQuery` `["dietLogged", todayISO]` reads today's log state so the button flips to "Logged today ✓" without a page refresh.

**Where does the "log" state come from?** Reuse the `xp_transactions` row itself: add a small helper `hasDietLogToday(supabase, userId)` (SELECT 1 FROM xp_transactions WHERE reason='DIET_LOGGING' AND idempotency_key='diet:…:<today>' LIMIT 1). No new table.

## Phase 3 — real streak service

**Approach:** derive from existing `workout_days.completed_at` — no schema change.

**New module** `src/lib/streak.ts`:
- `getStreakInternal(supabase, userId): Promise<{ current: number, longest: number, lastCompletedAt: string | null }>`
- Query: `SELECT date_trunc('day', completed_at AT TIME ZONE 'Asia/Kolkata') AS d FROM workout_days WHERE user_id = $1 AND completed_at IS NOT NULL ORDER BY d DESC` (via `.select().order()`).
- In JS: dedupe by day, walk down from today (or yesterday if no workout today) counting consecutive days for `current`; single pass for `longest`.
- Cap query to last 365 rows to keep it cheap.

**Expose** in `getHomeHabitStats` (`src/lib/habit-stats.ts`):
- Add `getStreakInternal(supabase, userId)` to the `Promise.all([...])`.
- Add `currentStreak`, `longestStreak`, `lastWorkoutAt` to the returned DTO.

**Render on Home** (`src/routes/_authenticated/home.tsx`):
- Replace the current "streak = doneDays this week" card with `currentStreak` from `homeStats`.
- Sub-text: "Longest: {longestStreak} days" and "Last workout: {relativeTime(lastWorkoutAt)}".
- If `currentStreak === 0`, show "Start your streak — do today's workout".

## Order of execution
1. Phase 20 rename (one file, ~10 line edits) — ship first, warnings gone.
2. Phase 3 streak service + Home wire — no DB migration, pure additive.
3. Phase 16 diet XP — new server fn + one button in `diet.tsx`.

## Not doing / not needed
- No new tables — both features derive from existing rows.
- No migration — nothing schema-level.
- No changes to `xp.ts` scoring rules or `XP_RULES` values.
- No changes to cron/auth/edge-function surfaces.
- No streak column on `profiles` — keeping it derived avoids drift with `workout_days`.

## Files touched
- `src/lib/gym.functions.ts` — 10 renames
- `src/lib/streak.ts` — new
- `src/lib/habit-stats.ts` — add streak fields to DTO
- `src/routes/_authenticated/home.tsx` — render current/longest streak
- `src/lib/checkin.ts` — add `logDietDay` + `hasDietLogToday`
- `src/routes/_authenticated/diet.tsx` — "Mark diet followed" button + state
