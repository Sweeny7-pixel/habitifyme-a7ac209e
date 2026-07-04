## Part A — "Home page not loading" (diagnose blank screen)

**What I already verified**
- `GET /` and `/home` both return HTTP 200 on preview and on `habitifyme.lovable.app`.
- Landing (`/`) renders correctly in your preview right now (headline + "Sign in" visible, no Vite error overlay).
- Dev-server logs show only harmless `inputValidator` deprecation warnings — no runtime errors.

**Most likely cause**
`/home` lives under `src/routes/_authenticated/home.tsx`. When you're not signed in, the `_authenticated` gate redirects to `/auth`. If the redirect handler or the home loader throws during SSR (e.g. `getHomeHabitStats` calling `requireSupabaseAuth` in the loader without a session), the SSR normalizer in `src/server.ts` can serve a blank/error shell.

**Investigation steps (no code changes yet)**
1. Open the preview at `/home` in an incognito/logged-out tab and capture: final URL, DOM text, console errors, network 401/500s.
2. Sign in and repeat — confirm whether blank happens only for one state.
3. Read `src/routes/_authenticated/home.tsx` and `src/routes/_authenticated/route.tsx` to check whether the loader calls a `requireSupabaseAuth` server function during SSR (per `auth-protected-server-functions` rule, that would 401 the prerender).
4. Grep for any home-page loader that awaits `getHomeHabitStats` or similar without moving it to `useQuery` in the component.

**Fix (if the diagnosis holds)**
- Move any protected server-fn call out of the `home` route `loader` and into the component via `useServerFn` + `useSuspenseQuery`, OR
- Ensure `home.tsx` only relies on the managed `_authenticated` gate and does no SSR-time protected reads.

I'll only apply a code fix after step 1–3 confirm which failure mode you hit.

---

## Part B — Full 20-phase audit

I'll grep the codebase for the deliverables listed in `attached_assets/Pasted-Below-…txt` (Phases 1–20) and produce a compact status table with:

| Phase | Title | Key files expected | Status | Gap |

The audit checks — not a rewrite:
1. **Phase 1** — read-only review baseline.
2. **Phase 2** — XP engine (`src/lib/xp.ts`, `xp_transactions` table, `awardXP`).
3. **Phase 3** — Streak engine (streak table, streak calc).
4. **Phase 4** — Daily check-in (`checkins` table, check-in UI).
5. **Phase 5** — Home dashboard (Habit Score, XP bar, weekly graph, achievements panel in `home.tsx`).
6. **Phase 6** — Habit Score (`src/lib/habit-score.ts`, `habit_scores` table).
7. **Phase 7** — Trigger engine (onboarding time/day/tz + 30m/missed/3d/7d/14d schedules).
8. **Phase 8** — Reward loops (XP popups, level titles, celebration UI).
9. **Phase 9** — Investment (Sunday planning modal, weekly review).
10. **Phase 10** — Achievements engine (`src/lib/achievements.ts`, `achievements` table).
11. **Phase 11** — Recovery flow (`RecoveryModal`, gap detector, `GapChoiceModal`).
12. **Phase 12** — Push notifications (VAPID, `push_subscriptions`, `push-sw.js`, `sendPush`).
13. **Phase 13** — Level system + titles.
14. **Phase 14** — Weekly review v2.
15. **Phase 15** — Progress dashboard.
16. **Phase 16** — Diet integration into habit loop.
17. **Phase 17** — Server jobs (daily reminder, weekly review, recompute scores, recovery prompt) + `pg_cron` schedules.
18. **Phase 18** — Refactors / consolidation (single XP module, no duplicate migrations).
19. **Phase 19** — Analytics events.
20. **Phase 20** — Polish / QA pass.

**Deliverable**: one status table posted in chat + a short bullet list of concrete gaps to close, ordered by user impact. No code edits in this pass.

---

## Order of work

1. Diagnose the blank-screen (Part A) — quick, unblocks you.
2. Post the 20-phase audit table (Part B) — read-only.
3. You pick which gap(s) to close next; I plan those as separate turns.