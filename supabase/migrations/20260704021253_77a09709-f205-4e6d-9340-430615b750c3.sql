CREATE TABLE public.xp_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  reason text NOT NULL,
  amount integer NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  dedupe_key text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.xp_transactions TO authenticated;
GRANT ALL ON public.xp_transactions TO service_role;

ALTER TABLE public.xp_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own xp_transactions select" ON public.xp_transactions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "own xp_transactions insert" ON public.xp_transactions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE INDEX xp_transactions_user_created_idx
  ON public.xp_transactions (user_id, created_at DESC);

CREATE UNIQUE INDEX xp_transactions_user_dedupe_uidx
  ON public.xp_transactions (user_id, dedupe_key)
  WHERE dedupe_key IS NOT NULL;