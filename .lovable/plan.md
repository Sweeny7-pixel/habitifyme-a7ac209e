# Rename: GymBuddy → HabitifyMe

Pure text rebrand. No identifiers, file names, routes, queryKeys, table names, or localStorage keys change.

## Files to edit (user-facing strings only)

- `src/routes/index.tsx` — title, og:title, header logo text, body copy, footer text
- `src/routes/auth.tsx` — title, description, logo text
- `src/routes/_authenticated/route.tsx` — header brand text (line 98)
- `src/routes/_authenticated/home.tsx` — page title
- `src/routes/_authenticated/diet.tsx` — page title
- `src/routes/_authenticated/calendar.tsx` — page title
- `src/routes/_authenticated/day.$dayId.tsx` — page title
- `src/routes/_authenticated/profile.tsx` — page title
- `src/routes/_authenticated/progress.tsx` — page title
- `src/routes/_authenticated/onboarding.tsx` — page title
- `src/routes/_authenticated/review.$weekId.tsx` — page title

## LLM system prompts (open question)

`src/lib/gym.functions.ts` has 3 occurrences inside system prompts ("You are GymBuddy…"). These aren't shown to the user, but they shape the assistant's self-identity in generated copy. Default: update them to "HabitifyMe" for consistency. Skip if you'd rather leave the model persona alone.

## Not touching

- `src/styles.css` line 8 — code comment (not user-facing, but harmless to update; will update for consistency)
- localStorage keys `gymbuddy_lastCheckin`, `gymbuddy_plan` — left as-is per instructions
- All variable/function/class names, file names, queryKeys, table names

## Verification

After edits, run `rg -n "GymBuddy" src/` and report remaining occurrences (expected: 0 user-facing; localStorage key strings will still show as `gymbuddy_…` which is acceptable).
