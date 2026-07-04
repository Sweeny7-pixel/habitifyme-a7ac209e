## QA Test Pass — HabitifyMe

Act as Senior QA. No code fixes. Deliverable = one Bug Log ordered by severity + a Pass/Fail/N/A row for every checklist item.

### Approach

1. **Read the full checklist** (`/mnt/user-uploads/HabitifyMe_UI_Test_Checklist_1.md`, all 174 lines) so every one of the ~90 rows gets an outcome.
2. **Drive the live app via Playwright** (headless Chromium, 390×844 mobile viewport to match the current preview, plus a 1280×1800 desktop pass for responsive checks) against `http://localhost:8080`.
   - The six test accounts are managed Supabase logins; `LOVABLE_BROWSER_AUTH_STATUS` in this sandbox is `signed_out` for them (only the previewer's session gets pre-injected). I'll log in through the `/auth` UI using the provided email/password for each account, one per browser context, and reuse `storage_state` between steps for that account.
   - Per account, walk: Home → Training Days → Workout Detail (open ≥1 day) → Diet → Calendar (week + month) → Profile → Notifications. Screenshot each screen + any bug evidence into `/tmp/browser/qa/<account>/`.
3. **Exploratory pass** on 1–2 accounts: rapid double-tap (Check-in, Mark diet followed, Finish workout), account switching mid-session, browser back/forward, viewport resize, empty/boundary states (new week, day 7, streak 0/1/2+).
4. **Cross-screen consistency check** per account: dates, week #, workout names, exercise counts, calorie totals, progress % must agree across Home / Training list / Workout detail / Diet / Calendar / Profile. Diff into a small table per account.
5. **Prioritize ⚠️ rows first** (dates not advancing across weeks, missing Week-3 header, static Shoulders sub-label, etc.), then ❓ rows, then the rest.
6. **Log every issue** in the exact template the user specified (BUG-ID, Severity, Screen, Account, Steps, Expected, Actual, Evidence path, Related checklist item). Order the final log Critical → Cosmetic.
7. **Summary header**: total cases run, pass, fail, N/A, and counts by severity.

### Deliverable shape

```
# HabitifyMe QA Report — <date>

## Summary
- Cases run: X / ~90
- Pass: X   Fail: X   N/A: X
- Severity: Critical X · High X · Medium X · Low X · Cosmetic X

## Checklist outcomes
| # | Title | Result | Note / Bug-ID |
...

## Bug Log (Critical → Cosmetic)
### [BUG-001] ...
...
```

### Notes / assumptions

- No code changes, no migrations, no fixes — read-only + UI interaction only.
- Secrets rule: the six account passwords were pasted inline by the user; I'll use them only to sign in via Playwright and won't echo them in reports or screenshots.
- If any account fails to sign in (wrong creds, rate-limit, or empty state that blocks a flow), I'll log that as its own bug and continue with the remaining accounts rather than stopping.
- Report saved to `/mnt/documents/habitifyme-qa-report-<date>.md` and posted inline in chat.

Approve to switch to build mode and start the test run.
