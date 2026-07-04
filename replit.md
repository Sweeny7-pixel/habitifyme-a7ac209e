# HabitifyMe — AI Gym Coach

## Overview

HabitifyMe is a full-stack React/TypeScript fitness app that transforms gym-going into a habit-forming experience. It uses AI to generate personalized 4-week workout plans with demo videos, adaptive weekly reviews, and a comprehensive habit formation engine.

## Stack

- **Frontend**: React 19, TanStack Start (SSR), TanStack Router, Tailwind CSS v4
- **UI**: Radix UI + Shadcn components with a custom dark glassmorphism design system
- **Backend**: TanStack Start server functions (no separate API server)
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **AI**: Google Gemini via Lovable AI Gateway for workout + diet generation
- **Push Notifications**: Web Push API with VAPID
- **Package manager**: Bun

## Running Locally

```bash
bun install
bun run dev
```

The dev server runs on port 5000.

## Environment Variables

Set in `.env` (also in Replit Secrets/Env Vars):

- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_PUBLISHABLE_KEY` — Supabase anon key
- `SUPABASE_PROJECT_ID` — Supabase project ID
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` — same values prefixed for Vite client-side access
- `SESSION_SECRET` — server session secret (in Replit Secrets)
- `GEMINI_API_KEY` — Google Gemini API key (stored in Replit Secrets). Used for all AI-generated workout and diet plans.

## Database Migrations

Migrations live in `supabase/migrations/`. Apply with:

```bash
supabase db push
```

The V4 migration (`20260703000001_v4_habit_engine.sql`) adds:
- `xp_transactions` — every XP event
- `habit_scores` — latest habit score per user
- `habit_score_history` — trend data
- `checkins` — gym check-ins
- `achievements` — unlocked badges
- `analytics_events` — event stream

## Project Structure

```
src/
  routes/
    index.tsx              Landing page
    auth.tsx               Auth (Supabase UI)
    _authenticated/
      home.tsx             Main dashboard (habit engine + workout plan)
      day.$dayId.tsx       Workout execution & logging
      diet.tsx             7-day diet plan
      progress.tsx         Weekly review
      calendar.tsx         History
      profile.tsx          User settings, XP, achievements
      onboarding.tsx       Initial profile setup
  lib/
    gym.functions.ts       AI plan generation, workout logging, reviews
    xp.ts                  XP engine + level system
    habit-score.ts         Habit Score calculation (0–100)
    habit-stats.ts         Combined home dashboard stats query
    checkin.ts             Gym check-in server functions
    achievements.ts        Achievement badge engine
    analytics.ts           Event tracking helpers
    push.functions.ts      Web Push subscription management
    push.server.ts         VAPID push delivery
    push-client.ts         Browser-side push helpers
    gap-detector.ts        Detects days-missed for recovery flow
  components/
    XpPopup.tsx            Floating "+50 XP" animation
    RecoveryModal.tsx      3–6 day gap recovery prompt
    SundayPlanningModal.tsx Sunday evening plan confirmation
    GapChoiceModal.tsx     7+ day gap restart/resume choice
```

## V4 Habit Formation Engine (XP + Habit Score)

### XP Rules
| Action | XP |
|---|---|
| Workout complete | +50 |
| Gym check-in | +20 |
| Weekly review | +40 |
| Sunday planning | +30 |
| 10% surprise bonus | +150 |

### Level Thresholds
L1→L2: 150 XP · L2→L3: 400 · L3→L4: 800 · L4→L5: 1400 · …(exponential)

### Habit Score (0–100)
Weighted composite: workout completion (40%) + check-ins (25%) + diet (20%) + reviews (15%), computed over 7-day rolling window.

### Achievements
first_workout · checkin_streak_3 · checkin_streak_7 · week_complete · workouts_10 · xp_1000 · perfect_week · habit_champion · four_week_streak · eighty_pct_avg · review_pro

## User Preferences

- Preserve existing dark glassmorphism design system (glass-*, flame-halo, neon-* CSS vars)
- Keep TypeScript strict
- Never put XP/habit business logic inside UI components — all calculations are server-side
- Reuse existing components before creating new ones
- No hardcoded XP values — always reference `XP_RULES` from `lib/xp.ts`
