import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { awardXPInternal, XP_RULES } from "./xp";

const IST_TZ = "Asia/Kolkata";
function todayIstKey(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: IST_TZ });
}

export const gymCheckin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ location: z.string().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Insert directly — the DB unique index on (user_id, date(created_at UTC)) rejects
    // a second check-in on the same calendar day atomically, eliminating any TOCTOU race.
    const { error } = await supabase.from("checkins").insert({
      user_id: userId,
      location: data.location ?? null,
    });

    if (error) {
      // PostgreSQL unique_violation = "23505"
      if (error.code === "23505") {
        return { ok: true, alreadyCheckedIn: true, xpAwarded: 0, bonusTriggered: false };
      }
      throw new Error(error.message);
    }

    // Award XP
    let xpAwarded = 0;
    let bonusTriggered = false;
    try {
      const result = await awardXPInternal(
        supabase,
        userId,
        "GYM_CHECKIN",
        XP_RULES.GYM_CHECKIN,
        { source: "home_checkin" },
      );
      xpAwarded = result.xpAwarded;
      bonusTriggered = result.bonusTriggered;
    } catch (err) {
      console.warn("[checkin] XP award failed", err);
    }

    // Track analytics (never block on this)
    Promise.resolve(
      supabase.from("analytics_events").insert({
        user_id: userId,
        event_name: "checkin_completed",
        properties: { location: data.location ?? null },
      }),
    )
      .then(() => {})
      .catch(() => {});

    return { ok: true, alreadyCheckedIn: false, xpAwarded, bonusTriggered };
  });

export const getTodayCheckin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data } = await supabase
      .from("checkins")
      .select("id, created_at")
      .eq("user_id", userId)
      .gte("created_at", todayStart.toISOString())
      .maybeSingle();

    return { checkedIn: !!data, checkin: data ?? null };
  });

export const getCheckinStreak = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("checkins")
      .select("created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(60);

    if (!data || data.length === 0) return { streak: 0 };

    // Count consecutive days ending today (or yesterday)
    let streak = 0;
    let cursor = new Date();
    cursor.setHours(23, 59, 59, 999);

    for (const row of data as { created_at: string }[]) {
      const rowDay = new Date(row.created_at);
      rowDay.setHours(0, 0, 0, 0);
      const cursorDay = new Date(cursor);
      cursorDay.setHours(0, 0, 0, 0);
      const diff = Math.round(
        (cursorDay.getTime() - rowDay.getTime()) / 86_400_000,
      );
      if (diff === 0 || diff === 1) {
        if (diff === 1) streak++; // new day
        else if (streak === 0) streak = 1; // same day as cursor (today)
        cursor = rowDay;
      } else {
        break;
      }
    }

    return { streak };
  });

/**
 * Awards diet-logging XP at most once per day (Asia/Kolkata calendar day).
 * Idempotency enforced by unique index on xp_transactions(user_id, dedupe_key).
 */
export const logDietDay = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        weekId: z.string().uuid().optional(),
        dayIndex: z.number().int().min(0).max(6).optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const dayKey = todayIstKey();
    const dedupeKey = `diet:${dayKey}`;

    const result = await awardXPInternal(
      supabase,
      userId,
      "DIET_LOGGING",
      XP_RULES.DIET_LOGGING,
      { source: "diet_log", day: dayKey },
      dedupeKey,
    );

    return {
      ok: true,
      alreadyLogged: result.alreadyAwarded,
      xpAwarded: result.xpAwarded,
      bonusTriggered: result.bonusTriggered,
    };
  });

/** Returns whether the user has already logged their diet today (IST). */
export const getTodayDietLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const dayKey = todayIstKey();
    const { data } = await supabase
      .from("xp_transactions")
      .select("id")
      .eq("user_id", userId)
      .eq("dedupe_key", `diet:${dayKey}`)
      .maybeSingle();
    return { logged: !!data, day: dayKey };
  });
