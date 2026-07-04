/**
 * Cron target — daily recovery nudge. Finds users whose most recent completed
 * workout was 2–3 days ago (streak at risk) and pushes a "come back" reminder.
 * Gated by the Supabase `apikey` header.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/send-recovery-prompt")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = request.headers.get("apikey");
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!expected || apiKey !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { sendPushToMany } = await import("@/lib/push.server");

        const now = Date.now();
        const windowStart = new Date(now - 4 * 86_400_000).toISOString();
        const twoDaysAgo = now - 2 * 86_400_000;
        const threeDaysAgo = now - 3 * 86_400_000;

        // Pull recent completed workouts, group by user, keep max(completed_at)
        const { data: recent, error } = await supabaseAdmin
          .from("workout_days")
          .select("user_id, completed_at")
          .not("completed_at", "is", null)
          .gte("completed_at", windowStart);

        if (error) {
          console.error("[cron:recovery] fetch workouts failed", error);
          return Response.json({ ok: false, error: error.message }, { status: 500 });
        }

        const lastByUser = new Map<string, number>();
        for (const row of recent ?? []) {
          if (!row.user_id || !row.completed_at) continue;
          const t = new Date(row.completed_at).getTime();
          const prev = lastByUser.get(row.user_id) ?? 0;
          if (t > prev) lastByUser.set(row.user_id, t);
        }

        const targets: string[] = [];
        for (const [uid, t] of lastByUser) {
          if (t <= twoDaysAgo && t >= threeDaysAgo) targets.push(uid);
        }

        if (targets.length === 0) {
          return Response.json({ ok: true, candidates: 0, sent: 0 });
        }

        const { data: subs } = await supabaseAdmin
          .from("push_subscriptions")
          .select("id, endpoint, p256dh, auth, user_id")
          .in("user_id", targets);

        const result = await sendPushToMany(subs ?? [], {
          title: "Streak at risk 🔥",
          body: "It's been a couple of days — a 10-minute session keeps the habit alive.",
          url: "/gym",
          tag: "recovery-prompt",
        });

        if (result.gone.length > 0) {
          await supabaseAdmin
            .from("push_subscriptions")
            .delete()
            .in("endpoint", result.gone);
        }

        return Response.json({
          ok: true,
          candidates: targets.length,
          subscriptions: subs?.length ?? 0,
          sent: result.sent,
          failed: result.failed,
        });
      },
    },
  },
});
