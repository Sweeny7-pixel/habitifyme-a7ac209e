/**
 * Cron target — nightly recompute of habit_scores for all users active in the
 * last 14 days. Invoked by pg_cron; gated by the Supabase `apikey` header.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/recompute-habit-scores")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = request.headers.get("apikey");
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!expected || apiKey !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { calculateHabitScoreInternal } = await import("@/lib/habit-score");

        const since = new Date(Date.now() - 14 * 86_400_000).toISOString();

        const [workoutUsers, checkinUsers] = await Promise.all([
          supabaseAdmin
            .from("workout_days")
            .select("user_id")
            .gte("created_at", since),
          supabaseAdmin
            .from("checkins")
            .select("user_id")
            .gte("created_at", since),
        ]);

        const ids = new Set<string>();
        (workoutUsers.data ?? []).forEach((r) => r.user_id && ids.add(r.user_id));
        (checkinUsers.data ?? []).forEach((r) => r.user_id && ids.add(r.user_id));

        let ok = 0;
        let failed = 0;
        for (const userId of ids) {
          try {
            await calculateHabitScoreInternal(supabaseAdmin as never, userId);
            ok++;
          } catch (err) {
            console.error("[cron:habit-score] user failed", userId, err);
            failed++;
          }
        }

        return Response.json({ ok: true, users: ids.size, updated: ok, failed });
      },
    },
  },
});
