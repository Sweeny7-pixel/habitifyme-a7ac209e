## Goal

Web push notifications for:
1. **Daily 5am IST** — nudge to start today's workout.
2. **Sunday 9pm IST** — nudge to submit week review and prep for next week.
3. **Achievement unlocks** — First Week, 4-Week Streak, 80%+ Avg, Review Pro.
4. **Test notification button** in the profile page.

## Approach

Native **Web Push + VAPID** (no Firebase account needed). A dedicated messaging service worker handles incoming push events — this SW is exempt from the "no service worker in preview" PWA rule because it's a messaging worker, not an app-shell cache.

## Backend

### 1. Migration — two new tables

- `push_subscriptions(id, user_id, endpoint UNIQUE, p256dh, auth, user_agent, created_at)` — RLS: user owns; `GRANT` for authenticated + service_role.
- `notified_achievements(id, user_id, achievement_key, notified_at, UNIQUE(user_id, achievement_key))` — dedupe so each badge push fires only once.

### 2. Secrets

Generate `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (mailto). Public key also exposed as `VITE_VAPID_PUBLIC_KEY` so the client can subscribe.

### 3. Server functions (`src/lib/push.functions.ts`)

- `savePushSubscription({ endpoint, p256dh, auth, userAgent })` — upsert on endpoint.
- `deletePushSubscription({ endpoint })` — for opt-out.
- `sendTestPush()` — sends "Test notification working" to the caller's own subscriptions.

Sending uses `@block65/webcrypto-web-push` (Cloudflare Worker-compatible; pure Web Crypto). Dead subscriptions (410/404) are deleted.

### 4. Public cron endpoints (`src/routes/api/public/hooks/`)

- `send-daily-reminder.ts` — POST, authed via `apikey: <anon>` header. Loads all subscriptions, sends "Time to train — today's workout is ready" with a deep link to today's workout day.
- `send-weekly-review.ts` — POST, same auth. Sends "Sunday check-in: review this week & prep for next" linking to `/progress` (review flow).

Both return `{ sent, failed, cleaned }`. Signature-verify not needed since payload is fixed; `apikey` gate is the boundary.

### 5. pg_cron schedules (IST = UTC+5:30)

- `0 23 * * *` UTC → 04:30 IST daily. Actually 5am IST = **23:30 UTC prev day** → cron `30 23 * * *`.
- Sunday 9pm IST = **15:30 UTC Sunday** → cron `30 15 * * 0`.

Both call the corresponding `/api/public/hooks/*` route via `pg_net`.

### 6. Achievement notifications

Hook into two existing server functions:

- `completeWorkoutDay` → after marking complete, evaluate: weeks fully completed count, avg completion. Insert into `notified_achievements` with `ON CONFLICT DO NOTHING`; if inserted, enqueue push. Badges checked: **First Week**, **4-Week Streak**, **80%+ Avg**.
- `submitWeekReview` → after upsert, count distinct reviews for user; if ≥3, try insert `review_pro` badge and push. Also re-check completion badges.

Extract a shared helper `evaluateAndNotifyAchievements(supabase, userId)` in `push.functions.ts` (uses `supabaseAdmin` inside handler so the insert isn't blocked by RLS on the write path from other users' data — actually RLS is fine here, keep authed client).

## Client

### 1. Service worker `public/push-sw.js`

Handles `push` (shows notification with title/body/icon/deep-link URL in `data.url`) and `notificationclick` (focuses existing tab or opens the URL).

### 2. Registration helper `src/lib/push-client.ts`

- `registerPushSW()` — registers `/push-sw.js` with scope `/`. Safe to call in production; skipped in Lovable preview (same host guards as the PWA skill) so a preview iframe never subscribes to a phantom endpoint.
- `subscribeToPush()` — requests permission, calls `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: VITE_VAPID_PUBLIC_KEY })`, persists via `savePushSubscription`.
- `unsubscribeFromPush()` — reverse.
- `sendTestNotification()` — calls `sendTestPush` server function.

### 3. Profile page UI

Add a "Notifications" section above Achievements:
- Status pill (Enabled / Disabled / Blocked).
- **Enable notifications** button → `subscribeToPush()`.
- **Send test notification** button (visible only when subscribed) → `sendTestNotification()`, toast on success.
- **Disable** button when subscribed.

If `Notification.permission === "denied"`, show inline "Blocked in browser settings — enable to receive reminders."

### 4. Manifest / icons

Add minimal `public/manifest.webmanifest` and root `<link rel="manifest">` + `theme-color` so notifications on Android show the app icon. No `display: standalone` (not asking for installability). Reuse existing app icon under `public/`.

## Verification

1. Migration + secrets applied; `VITE_VAPID_PUBLIC_KEY` present in env.
2. In published app: open Profile → Enable notifications → grant permission → click Send test → notification appears.
3. Invoke `/api/public/hooks/send-daily-reminder` and `/api/public/hooks/send-weekly-review` with `apikey` header; confirm delivery.
4. Complete a workout day that finishes week 1 → confirm First Week push arrives.
5. Confirm `cron.job` lists both schedules with correct UTC times.
6. Confirm messaging SW registration is skipped in Lovable preview host (`preview--*.lovable.app`), only registers on published domain.

## Files touched

- **New**: `supabase/migrations/*` (2 tables), `src/lib/push.functions.ts`, `src/lib/push.server.ts` (web-push sender), `src/lib/push-client.ts`, `src/routes/api/public/hooks/send-daily-reminder.ts`, `src/routes/api/public/hooks/send-weekly-review.ts`, `public/push-sw.js`, `public/manifest.webmanifest`.
- **Edited**: `src/lib/gym.functions.ts` (hook `completeWorkoutDay` + `submitWeekReview`), `src/routes/_authenticated/profile.tsx` (Notifications UI), `src/routes/__root.tsx` (manifest link + theme-color).
- **Package**: `bun add @block65/webcrypto-web-push`.
- **Secrets**: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `VITE_VAPID_PUBLIC_KEY`.
- **pg_cron**: 2 schedules via insert tool.

## Known caveats

- **iOS Safari**: web push requires the site to be installed to the Home Screen (iOS 16.4+). The Enable button will show a "iOS: add to Home Screen first" hint when we detect iOS Safari.
- **IST-only schedule**: users outside India will get pushes at odd local times. Per-user timezone is out of scope for this pass.
- **No user-visible fallback if push send fails**: cron logs are the source of truth; failures surface only in server logs.
