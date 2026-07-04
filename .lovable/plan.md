## QA Test Pass — HabitifyMe

Act as Senior QA. No code fixes. Deliverable = one Bug Log ordered by severity + a Pass/Fail/N/A row for every checklist item.

Requires build mode: the run itself needs `code--exec` to drive Playwright. Approving this plan is the only way to actually execute it.

### Approach

1. **Read the checklist** — 174 lines, ~89 numbered rows across sections 1–10, already loaded.
2. **Drive the app via Playwright** (headless Chromium, 390×844 mobile viewport primary, one 1280×1800 desktop pass for responsive checks) against `http://localhost:8080`. The six accounts are managed Supabase logins; sign in via `/auth` UI per account (new browser context each), reuse `storage_state` for the account.
3. **Per account walk**: Home → Training list → Workout Detail (open ≥1 day) → Diet → Calendar (Week + Month) → Profile → Notifications. Screenshot each screen + evidence into `/tmp/browser/qa/<account>/`.
4. **Exploratory (1–2 accounts)**: browser back/forward, viewport resize, empty/boundary states (new week, streak 0/1/2+). Rapid double-tap of Check-in / Mark diet / Finish workout — described in report but **only observed, not executed**, so the run doesn't corrupt state.
5. **Cross-screen consistency** per account: dates, week #, workout names, exercise counts, calorie totals, progress % must agree across Home / Training / Workout / Diet / Calendar / Profile. Diff table per account.
6. **Priority order** — ⚠️ rows first (1.4, 1.5, 3.2, 6.8, 7.1, 7.2, 7.3, 9.1, 9.2), then ❓ (6.4, 6.7, 6.9, 6.10, 7.6, 8.1, 8.4, 9.3, 9.8), then the rest. Re-verify previously-shipped fixes (auth mode, rolling-week calendar, calorie parity, focus truncation, streak/PB/label polish).
7. **Log every issue** in the user's exact template (BUG-ID, Severity, Screen, Account, Steps, Expected, Actual, Evidence path, Related checklist item). Order Critical → Cosmetic.
8. **Summary header** — total cases run, pass/fail/N/A, counts by severity.

### Deliverable shape

```
# HabitifyMe QA Report — <date>

## Summary
- Cases run: X / ~89
- Pass: X   Fail: X   N/A: X
- Severity: Critical X · High X · Medium X · Low X · Cosmetic X

## Checklist outcomes
| # | Title | Result | Note / Bug-ID |

## Bug Log (Critical → Cosmetic)
### [BUG-001] ...
```

### Constraints

- **Read-only run** — no check-in taps, no "Mark diet followed", no Finish workout, no Regenerate. Tests requiring a mutation are marked N/A with a note.
- Account passwords used only for Playwright sign-in; never echoed in reports or screenshots.
- If an account fails to sign in, log it as its own bug and continue with the rest.
- No code changes, no migrations, no fixes.
- Report saved to `/mnt/documents/habitifyme-qa-report-<date>.md` and inline in chat.
