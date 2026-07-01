## Fix: Home page KCAL & Protein showing empty

**Root cause:** `diet_json` now stores a 7-day format (`SevenDayDiet` with a `.days[]` array), but `home.tsx` still reads it as the old `DietJson` shape with `daily_calories`/`daily_protein_g` at the root — so both fields are `undefined` and render blank.

**Scope:** Only `src/routes/_authenticated/home.tsx`. No other files, no server functions, no DB.

### Changes

1. **Add `SevenDayDiet` types** alongside the existing `DietJson` (kept for fallback + `.notes`).

2. **Add `getTodayDietStats(dietJson)` helper** that:
   - Detects new format (`.days` array of 7) → picks today's entry via `(getDay() + 6) % 7` → returns `totalApproxCalories` and a derived protein `round(kcal * 0.30 / 4)`.
   - Falls back to the old format if `daily_calories` exists at root.
   - Returns `{ calories: null, proteinG: null }` otherwise.

3. **In `HomePage`**, compute `const dietStats = getTodayDietStats(activeWeek.diet_json)` and keep the existing `diet` cast for the old-format `.notes` fallback.

4. **Top metric grid (Calories card, line ~210–215):** render `{dietStats.calories ?? "—"}` instead of `diet?.daily_calories ?? "—"`. The Workouts card is unchanged.

5. **"Today's diet target" section (line ~303–328):**
   - Render condition becomes `{(dietStats.calories || diet) && (...)}`.
   - Kcal cell: `{dietStats.calories ?? diet?.daily_calories ?? "—"}`.
   - Protein cell: `{dietStats.proteinG ? \`${dietStats.proteinG}g\` : diet?.daily_protein_g ? \`${diet.daily_protein_g}g\` : "—"}`.
   - `diet?.notes` rendering and the "View 7-day diet plan" link stay as-is.

### Verification
- KCAL on home matches today's calories on `/diet`.
- Protein shows e.g. `101g` (30% of kcal / 4), not blank.
- Workouts counter unchanged; no TS errors; old-format users still see their stored values.
