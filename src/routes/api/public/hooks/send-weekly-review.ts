/**
 * Cron target — 9pm IST reminder to submit the week review, sent only to
 * users whose active week ends today. Invoked by pg_cron at 15:30 UTC daily.
 *
 * A user's active week ends on `weeks.start_date + 6 days`. If that equals
 * today (IST) we notify them; other users are skipped.
 */
import { createFileRoute } from "@tanstack/react-router";

const IST_TZ = "Asia/Kolkata";

function todayIstIso(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: IST_TZ });
}

export const Route = createFileRoute("/api/public/hooks/send-weekly-review")({
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

        // Active weeks whose day-7 is today (IST). `start_date` is a `date`,
        // so `start_date + 6` is a date add.
        const today = todayIstIso();
        const { data: dueWeeks, error: weeksErr } = await supabaseAdmin
          .from("weeks")
          .select("user_id, start_date, status")
          .eq("status", "active");
        if (weeksErr) {
          console.error("[cron:weekly] fetch active weeks failed", weeksErr);
          return Response.json({ ok: false, error: weeksErr.message }, { status: 500 });
        }

        const dueUserIds = new Set<string>();
        for (const w of dueWeeks ?? []) {
          if (!w.start_date) continue;
          const end = new Date(w.start_date + "T00:00:00Z");
          end.setUTCDate(end.getUTCDate() + 6);
          const endIso = end.toISOString().slice(0, 10);
          if (endIso === today) dueUserIds.add(w.user_id);
        }

        if (dueUserIds.size === 0) {
          return Response.json({ ok: true, total: 0, sent: 0, failed: 0, cleaned: 0 });
        }

        const { data: subs, error } = await supabaseAdmin
          .from("push_subscriptions")
          .select("id, endpoint, p256dh, auth, user_id")
          .in("user_id", Array.from(dueUserIds));
        if (error) {
          console.error("[cron:weekly] fetch subs failed", error);
          return Response.json({ ok: false, error: error.message }, { status: 500 });
        }

        const result = await sendPushToMany(subs ?? [], {
          title: "Weekly check-in 🗓️",
          body: "You finished your rolling week — review it and unlock next week.",
          url: "/progress",
          tag: "weekly-review",
        });

        if (result.gone.length > 0) {
          await supabaseAdmin
            .from("push_subscriptions")
            .delete()
            .in("endpoint", result.gone);
        }

        return Response.json({
          ok: true,
          total: subs?.length ?? 0,
          sent: result.sent,
          failed: result.failed,
          cleaned: result.gone.length,
        });
      },
    },
  },
});
