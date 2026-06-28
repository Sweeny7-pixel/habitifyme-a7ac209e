## Plan: Run 28-Test End-to-End Calendar Audit

Execute the full QA script against the live preview as user `Joannasilvester@gmail.com` using Playwright in the sandbox. No code changes — read-only audit producing the structured report.

### Approach

1. **Setup** — Launch headless Chromium at viewport 390×844, navigate to the preview URL, sign in with the seeded credentials, capture console + network errors on every page.
2. **Zone A — Calendar (C-01 → C-11)** — Drive the Calendar tab: tap each weekday pill, toggle Month view, verify highlight ring, dot indicators, Open workout navigation, rest-day card, completion flow, future-day preview, week navigation, empty-state for a fresh user (sign up a throwaway account, then sign back in).
3. **Zone B — Diet (C-12 → C-17)** — Verify calorie sums, workout-pending banner clears after check-in, Open diet plan deep link, scan all 7 days × 4 meals for the substring "egg", empty-state for no-plan user, rest-day meal variation.
4. **Zone C — Gap detection (C-18 → C-23)** — Manipulate `localStorage` (`gymbuddy_lastCheckin`, `gymbuddy_gap_choice`) per the script, reload, observe banner / modal / reset behavior.
5. **Zone D — Navigation (C-24 → C-28)** — Tap each bottom tab, rapid-switch ×10, Diet→Calendar deep link, back-nav preserves selected day, Edit profile → regenerate plan → Calendar resets.
6. **Report** — Emit the exact structured report format requested, with PASS/FAIL/BUG per test, screenshots saved under `/tmp/browser/audit/screenshots/`, console errors grouped by test ID, and a prioritized fix list.

### Technical details

- Playwright async API, one browser context, fresh page per zone to keep console logs scoped.
- Session restored via `LOVABLE_BROWSER_SUPABASE_*` env vars if `LOVABLE_BROWSER_AUTH_STATUS=injected`; otherwise sign in through the `/auth` form with the provided credentials.
- Console + pageerror + response listeners attached; failures captured into a per-test dict.
- Screenshots on every FAIL/BUG via `page.screenshot(path=...)` (no full_page).
- Credentials read from a local `.env` written to `/tmp/browser/audit/` — never echoed.
- No code edits, no migrations, no server restarts. Audit only.

### Deliverable

A single chat reply containing the full **GymBuddy Calendar Audit — Test Report** in the requested markdown format, plus paths to screenshots for any FAIL/BUG.
