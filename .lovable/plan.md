
# Browser Audit Report — GymBuddy Auth & Dashboard

Ran headless Chromium against `localhost:8080` on desktop (1280×1800) and mobile (390×844) viewports. Screenshots saved to `/tmp/browser/audit/screenshots/`.

## 1. What works

- `/auth` renders cleanly on both viewports; correct title `Sign in — GymBuddy`.
- HTML5 native validation fires on **empty submit** (`Please fill out this field.`) and **invalid email** (`Please include an '@'…`) and **short password** (`Please lengthen this text to 6 characters…`). These messages are visible browser bubbles — no JS handler needed.
- **Valid login** for `Joannasilvester@gmail.com` succeeds: `POST /auth/v1/token?grant_type=password` → 200, route advances to `/home`, greeting renders `Hey Joanna 👋`.
- Dashboard navigation (Home → Diet → Calendar → Profile) all route correctly with no console errors and no failed network requests.
- Frozen mobile shell behaves: header anchored at `y=0` (h=63), footer anchored at `y=778` (h=66) inside the 844-tall viewport, `scrollWidth === clientWidth` (no horizontal overflow) on both desktop and mobile.
- No React render loops, no unhandled exceptions, no Supabase RLS violations observed in logs.

## 2. Bugs found

### BUG-1 (critical) — Sonner `<Toaster />` is never mounted

`document.querySelector('[data-sonner-toaster]')` returns nothing on every route. Every `toast.success(...)` / `toast.error(...)` in the codebase (auth errors, plan regenerate, custom prompt, week-complete, etc.) is silently swallowed.

Concrete user-visible regressions caught:
- **Wrong password** for Joanna returns `POST /auth/v1/token` → 400, but the UI shows no error feedback at all. The user sees the form just sit there.
- **Signup** for `Immanalourdu23@gmail.com` succeeded against Supabase, but no "Account created" toast appears, and the redirect to `/home` bounces back to `/auth?` because email confirmation is required (no session minted yet). The user lands silently back on the signup form with zero feedback.
- Plan generation, regenerate confirmation, "week done" notices — all silent.

Root cause: `src/routes/__root.tsx` `RootComponent` renders only `<QueryClientProvider>{<Outlet />}</QueryClientProvider>`. The shadcn `Toaster` (`src/components/ui/sonner.tsx`) is never imported or rendered.

### BUG-2 (high) — Silent signup → bounced-back-to-/auth

In `src/routes/auth.tsx` the signup branch unconditionally calls `navigate({ to: "/home" })` after `supabase.auth.signUp`. When the project requires email confirmation, `signUp` returns a user but no session, the `_authenticated` gate calls `supabase.auth.getUser()`, gets nothing, and redirects to `/auth`. End-user experience: typed credentials, clicked Create account, page flickered, back at signup, no message.

### BUG-3 (low / cosmetic) — Auth page is the only screen not on the dark-glass system

`/auth` still uses the old `bg-[#0b0d12]` + lime-green primary + raw `bg-white/5` inputs. Inconsistent with the new dark-glass design language used on Home/Diet/Calendar/Profile.

### BUG-4 (low) — Auth flow has no `onAuthStateChange` cache invalidation

`__root.tsx` doesn't subscribe to `supabase.auth.onAuthStateChange`. After sign-out (Profile page), React Query keeps protected data cached. Not user-blocking today but worth fixing while we're in the auth area.

## 3. Resolution plan (awaiting your approval before any edits)

### Step A — Mount the toast container (fixes BUG-1)
- In `src/routes/__root.tsx`, import the existing `Toaster` from `@/components/ui/sonner` and render it inside `RootComponent`, after `<Outlet />`, still inside `QueryClientProvider`. Configure `position="top-center"` and `richColors` so errors are obvious on mobile.

### Step B — Make signup feedback honest (fixes BUG-2)
- In `src/routes/auth.tsx` signup handler, after `supabase.auth.signUp`, inspect the result:
  - If `data.session` exists (auto-confirm on) → toast success, `navigate({ to: "/home" })` as today.
  - If `data.session` is null (email confirmation required) → toast info "Check your inbox to confirm your email", switch the form into `signin` mode, do not navigate.
  - If Supabase returns `User already registered` → toast error and prefill the email in `signin` mode.

### Step C — Standardize `/auth` to dark-glass (fixes BUG-3)
- Replace the page chrome with the same `glass-card` / `glass-input` / `glass-btn` primitives used elsewhere, neon-orange primary, Inter font already inherited. Keep the existing form logic and validation untouched.

### Step D — Add a single root auth listener (fixes BUG-4)
- In `RootComponent`, add a `useEffect` that subscribes to `supabase.auth.onAuthStateChange`, filters to `SIGNED_IN | SIGNED_OUT | USER_UPDATED`, calls `router.invalidate()`, and on non-SIGNED_OUT events calls `queryClient.invalidateQueries()`. Unsubscribe on unmount. No per-page subscriptions.

### Out of scope (not changing now)
- Backend, RLS, server functions, plan-generation logic — all healthy in this audit.
- The shell layout itself — passes mobile and desktop tests.

## Technical references
- `src/routes/__root.tsx` (lines 122–131): RootComponent — add Toaster + auth listener.
- `src/routes/auth.tsx` (lines 30–55): `handleSubmit` signup branch — handle session-null path.
- `src/components/ui/sonner.tsx`: existing Toaster wrapper, ready to use.

Reply with **approve** to switch to build mode and apply Steps A–D, or tell me which steps to drop / reorder.
