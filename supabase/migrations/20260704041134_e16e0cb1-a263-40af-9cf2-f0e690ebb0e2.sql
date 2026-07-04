-- V4 Habit Engine: create missing tables idempotently.
-- xp_transactions already exists; the rest are needed by achievements/checkin/habit-score/analytics code paths.

CREATE TABLE IF NOT EXISTS public.habit_scores (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  score INT NOT NULL DEFAULT 0,
  score_7d INT NOT NULL DEFAULT 0,
  score_30d INT NOT NULL DEFAULT 0,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.habit_scores TO authenticated;
GRANT ALL ON public.habit_scores TO service_role;
ALTER TABLE public.habit_scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own habit_scores" ON public.habit_scores;
CREATE POLICY "own habit_scores" ON public.habit_scores
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.habit_score_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score INT NOT NULL,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.habit_score_history TO authenticated;
GRANT ALL ON public.habit_score_history TO service_role;
ALTER TABLE public.habit_score_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own habit_score_history" ON public.habit_score_history;
CREATE POLICY "own habit_score_history" ON public.habit_score_history
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_habit_score_history_user ON public.habit_score_history(user_id, calculated_at DESC);

CREATE TABLE IF NOT EXISTS public.checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.checkins TO authenticated;
GRANT ALL ON public.checkins TO service_role;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own checkins" ON public.checkins;
CREATE POLICY "own checkins" ON public.checkins
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_checkins_user ON public.checkins(user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS checkins_user_date_uniq
  ON public.checkins (user_id, date(created_at AT TIME ZONE 'UTC'));

CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_key TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(user_id, achievement_key)
);
GRANT SELECT, INSERT ON public.achievements TO authenticated;
GRANT ALL ON public.achievements TO service_role;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own achievements" ON public.achievements;
CREATE POLICY "own achievements" ON public.achievements
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_user ON public.achievements(user_id, unlocked_at DESC);

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.analytics_events TO authenticated;
GRANT ALL ON public.analytics_events TO service_role;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own analytics_events insert" ON public.analytics_events;
CREATE POLICY "own analytics_events insert" ON public.analytics_events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "own analytics_events select" ON public.analytics_events;
CREATE POLICY "own analytics_events select" ON public.analytics_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON public.analytics_events(user_id, created_at DESC);

-- Ensure xp_transactions has the dedupe_key column and unique index (were only added by a follow-up migration).
ALTER TABLE public.xp_transactions ADD COLUMN IF NOT EXISTS dedupe_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS xp_transactions_dedupe_uniq
  ON public.xp_transactions (user_id, dedupe_key)
  WHERE dedupe_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_xp_transactions_user
  ON public.xp_transactions (user_id, created_at DESC);
