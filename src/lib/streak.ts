/**
 * Streak service — derived from workout_days.completed_at.
 *
 * Days are bucketed in Asia/Kolkata (the app's operational timezone) so that
 * a workout finished at 11pm IST and another at 6am IST the next morning
 * count as two consecutive days regardless of the user's browser locale.
 *
 * No new tables — completely derived from existing rows so the streak can
 * never drift from the source of truth.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

const IST_TZ = "Asia/Kolkata";
const MS_PER_DAY = 86_400_000;

/** Returns "yyyy-mm-dd" for the given UTC instant in Asia/Kolkata. */
function toIstDayKey(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  // en-CA → "yyyy-mm-dd"
  return d.toLocaleDateString("en-CA", { timeZone: IST_TZ });
}

/** Difference in whole days between two "yyyy-mm-dd" keys. */
function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  const au = Date.UTC(ay, am - 1, ad);
  const bu = Date.UTC(by, bm - 1, bd);
  return Math.round((au - bu) / MS_PER_DAY);
}

export type StreakStats = {
  current: number;
  longest: number;
  lastCompletedAt: string | null;
};

export async function getStreakInternal(
  supabase: SupabaseClient,
  userId: string,
): Promise<StreakStats> {
  const { data, error } = await supabase
    .from("workout_days")
    .select("completed_at")
    .eq("user_id", userId)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(365);

  if (error) {
    console.warn("[streak] fetch failed", error);
    return { current: 0, longest: 0, lastCompletedAt: null };
  }

  const rows = (data ?? []) as { completed_at: string }[];
  if (rows.length === 0) {
    return { current: 0, longest: 0, lastCompletedAt: null };
  }

  // Dedupe by IST day; keep descending order.
  const dayKeys: string[] = [];
  const seen = new Set<string>();
  for (const r of rows) {
    const key = toIstDayKey(r.completed_at);
    if (!seen.has(key)) {
      seen.add(key);
      dayKeys.push(key);
    }
  }

  const todayKey = toIstDayKey(new Date());

  // Current streak: consecutive days ending today OR yesterday.
  let current = 0;
  const firstOffset = daysBetween(todayKey, dayKeys[0]);
  if (firstOffset === 0 || firstOffset === 1) {
    current = 1;
    for (let i = 1; i < dayKeys.length; i++) {
      if (daysBetween(dayKeys[i - 1], dayKeys[i]) === 1) current++;
      else break;
    }
  }

  // Longest streak: single pass over sorted-desc day keys.
  let longest = 1;
  let run = 1;
  for (let i = 1; i < dayKeys.length; i++) {
    if (daysBetween(dayKeys[i - 1], dayKeys[i]) === 1) {
      run++;
      if (run > longest) longest = run;
    } else {
      run = 1;
    }
  }
  if (dayKeys.length === 0) longest = 0;

  return {
    current,
    longest,
    lastCompletedAt: rows[0].completed_at,
  };
}
