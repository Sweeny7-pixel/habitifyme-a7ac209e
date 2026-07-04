## Fix BUG-101, BUG-102, and default Sunday to rest

### Root cause (verified against DB)

Every week of every plan is being inserted with the **same** `start_date` (`ow3` W1–W4 all read `2026-07-04`; `ow2` W1–W2 both read `2026-07-01`). Three consequences:

1. `dateToDay` in Calendar keys by `date.toDateString()` and overwrites, so W1's completed days get replaced by W4's empty days → **BUG-102** (Cal 0/5 vs Home 5/5).
2. `Diet` page's `defaultWeekId` picks "latest" (W4), while `Calendar`'s `selectedWeek` picks the first window that contains the date (W1), while `Home` uses `activeWeek` — three surfaces query **three different weeks** for "today" → **BUG-101**.
3. Home also has a `?? activeWeek.diet_json` fallback to the legacy `{daily_calories,…}` shape, which diverges from the 7-day format returned by `getWeekDiet`.

### Fix plan

**1. Migration — repair existing plans (`supabase/migrations/…_fix_week_dates.sql`)**
   - For every user, order their non-completed weeks by `week_number`, keep the earliest `start_date` as the anchor, and set each subsequent week's `start_date = anchor + (week_number − min_week_number) · 7`.
   - Do **not** touch weeks with `status = 'completed'` (they were the reference calendar week).
   - Recompute `workout_days.workout_date = weeks.start_date + (day_index − 1)` for the affected weeks.

**2. Plan generation — never emit workouts on Sunday**
   - Add a shared helper `pickWorkoutDayIndices(weekStartIso, daysPerWeek)` in `src/lib/gym.functions.ts` that returns the first `daysPerWeek` values from `[1..7]` whose computed weekday is not Sunday.
   - In `generateFourWeekPlan`, `generatePlanFromPrompt`, and `generateSingleWeek`: after the AI returns `plan.weeks[i].days`, re-map each returned day's `day_index` in order to those allowed indices before insertion. Discard extras. This preserves the AI's ordering and titles.
   - Append a hard rule to the AI prompts ("Sunday is always a rest day. Never schedule workouts on Sunday.") so the model matches the enforced constraint.

**3. Diet generation — Sunday is a rest day**
   - `callGeminiForSevenDayDiet` already takes `workoutDayIndices`. Compute those from the (Sunday-free) workout_days rather than from raw `day_index`, and pass `restDayIndices` explicitly with a note in the prompt that any index landing on Sunday must be a rest day with lighter carbs.
   - When today is Sunday, Home / Diet / Calendar should render the diet as a rest day automatically (falls out of the `isWorkoutDay: false` flag returned).

**4. Home (`src/routes/_authenticated/home.tsx`)**
   - Remove the `?? activeWeek.diet_json` legacy fallback in `dietSource`. Show a lightweight skeleton on the CALORIES card and TODAY'S DIET TARGET card while `weekDietQ.isLoading`. Hide those cards entirely if `weekDietQ.data?.diet` is null.
   - Delete the legacy `DietJson` branch in `getTodayDietStats`; the function now returns only the 7-day-indexed value.

**5. Calendar (`src/routes/_authenticated/calendar.tsx`)**
   - Build `dateToDay` using the **currently-viewed** week only (i.e. filter `days` by `week_id === currentViewWeek.id`) so it can no longer be polluted by adjacent weeks that happen to share a date.
   - `WeeklyProgressCard` counts `days.filter(d => d.week_id === currentViewWeek.id)` directly instead of iterating the shared map. This lines up with Home's `activeDays` math and closes BUG-102 even for legacy accounts that skip the migration.
   - `SelectedDayPanel` receives `weekId = currentViewWeek.id`; it must not be re-derived from `selected`, so the diet query keys on the same week Home uses.

**6. Diet (`src/routes/_authenticated/diet.tsx`)**
   - `defaultWeekId`: pick the week whose `[start_date, start_date + 7)` contains today; if none, fall back to `active`, then to the last week. This aligns "which week the Diet page opens on" with Calendar's `selectedWeek`.

### Out of scope (deferred)
- BUG-103 (future-start "Today" labelling), BUG-104 (diet marking a workout day as rest — should be automatically fixed by the Sunday-index alignment for the ow1 case, otherwise re-open), BUG-105 through BUG-124.

### Verification (Playwright, read-only)

After the changes:
- ow3: Home / Calendar / Diet all show identical kcal + meal items for Sat Jul 4; Cal `WEEKLY PROGRESS` reads `5/5` for W1; Cal week nav Prev/Next advances to real Jul 11 / Jul 18 / Jul 25.
- ow2: Diet & Cal show identical meals for Sat Jul 4; Cal W2 reads `1/5`.
- ow4/5/6 (single-week plans): unchanged counts, but any workout that landed on Sun is now shifted; new plan generation for a hypothetical Sun-start plan skips Sunday.
- Regression sweep: no build error, no hydration warnings, no `useEffect+fetch`, no hook-order changes.
