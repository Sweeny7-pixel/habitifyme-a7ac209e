/**
 * Single server call that fetches all V4 Habit Engine data needed by the
 * home dashboard. Keeps the UI at one round-trip instead of four.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getTotalXPInternal, getLevelProgress, getLevelTitle } from "./xp";
import { getHabitSegment } from "./habit-score";
import { getStreakInternal } from "./streak";

export const getHomeHabitStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();

    // All queries in parallel
    const [
      totalXP,
      checkinRes,
      habitScoreRes,
      achievementsRes,
      weeklyXPRes,
      streak,
    ] = await Promise.all([
      getTotalXPInternal(supabase, userId),
      supabase
        .from("checkins")
        .select("id, created_at")
        .eq("user_id", userId)
        .gte("created_at", todayStart.toISOString())
        .maybeSingle(),
      supabase
        .from("habit_scores")
        .select("score, score_7d, score_30d")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("achievements")
        .select("achievement_key, unlocked_at")
        .eq("user_id", userId)
        .order("unlocked_at", { ascending: false })
        .limit(3),
      supabase
        .from("xp_transactions")
        .select("amount")
        .eq("user_id", userId)
        .gte("created_at", weekAgo),
    ]);

    const levelInfo = getLevelProgress(totalXP);
    const title = getLevelTitle(levelInfo.level);
    const checkedInToday = !!checkinRes.data;
    const habitScore = (habitScoreRes.data as { score?: number } | null)?.score ?? 0;
    const segment = getHabitSegment(habitScore);
    const recentAchievements = (achievementsRes.data ?? []) as {
      achievement_key: string;
      unlocked_at: string;
    }[];
    const weeklyXP = (weeklyXPRes.data ?? []).reduce(
      (s: number, r: { amount: number }) => s + (r.amount ?? 0),
      0,
    );

    return {
      totalXP,
      ...levelInfo,
      title,
      checkedInToday,
      habitScore,
      segment,
      recentAchievements,
      weeklyXP,
    };
  });
