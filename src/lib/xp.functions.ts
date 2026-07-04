import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import {
  BONUS_SURPRISE_CHANCE,
  XP_REWARDS,
  getLevelProgress,
  type XpReason,
} from "./xp-config";

type DB = SupabaseClient<Database>;

const REASON_VALUES = Object.keys(XP_REWARDS) as [XpReason, ...XpReason[]];
const ReasonSchema = z.enum(REASON_VALUES);

/**
 * Internal helper — insertable from other server functions with an already
 * authenticated supabase client. Handles idempotency (via dedupe_key partial
 * unique index) and the 10% surprise bonus roll.
 *
 * Returns awarded amounts (0 when a duplicate was suppressed).
 */
export async function awardXPInternal(
  supabase: DB,
  userId: string,
  input: {
    reason: XpReason;
    dedupeKey?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<{ awarded: number; bonus: number }> {
  const amount: number = XP_REWARDS[input.reason];
  const row = {
    user_id: userId,
    reason: input.reason,
    amount,
    metadata: (input.metadata ?? {}) as Json,
    dedupe_key: input.dedupeKey ?? null,
  };

  const { error } = await supabase.from("xp_transactions").insert(row);
  let awarded: number = amount;
  if (error) {
    // Unique-violation on dedupe key = already awarded; treat as no-op.
    if (error.code === "23505") awarded = 0;
    else throw new Error(error.message);
  }

  let bonus = 0;
  // Never chain a surprise onto a surprise; only when the source was awarded.
  if (
    awarded > 0 &&
    input.reason !== "bonus_surprise" &&
    Math.random() < BONUS_SURPRISE_CHANCE
  ) {
    const bonusAmount = XP_REWARDS.bonus_surprise;
    const { error: bErr } = await supabase.from("xp_transactions").insert({
      user_id: userId,
      reason: "bonus_surprise",
      amount: bonusAmount,
      metadata: { source_reason: input.reason } as Json,
      dedupe_key: input.dedupeKey ? `${input.dedupeKey}:bonus` : null,
    });
    if (!bErr) bonus = bonusAmount;
    else if (bErr.code !== "23505") {
      // Non-dedupe errors on bonus shouldn't fail the primary award.
      console.warn("[xp] bonus insert failed", bErr);
    }
  }

  return { awarded, bonus };
}

// ============ Public server functions ============

export const awardXP = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        reason: ReasonSchema,
        dedupeKey: z.string().optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    return awardXPInternal(supabase as DB, userId, data);
  });

export const deductXP = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        reason: z.string().min(1),
        amount: z.number().int().positive(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("xp_transactions").insert({
      user_id: userId,
      reason: data.reason,
      amount: -data.amount,
      metadata: (data.metadata ?? {}) as Json,
    });
    if (error) throw new Error(error.message);
    return { deducted: data.amount };
  });

export const getXPHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ limit: z.number().int().min(1).max(200).optional() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: rows, error } = await supabase
      .from("xp_transactions")
      .select("id, reason, amount, metadata, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 50);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getXPSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: rows, error } = await supabase
      .from("xp_transactions")
      .select("amount, created_at")
      .eq("user_id", userId);
    if (error) throw new Error(error.message);

    const totalXP = (rows ?? []).reduce((s, r) => s + (r.amount ?? 0), 0);

    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const weeklyXP = (rows ?? []).reduce(
      (s, r) =>
        new Date(r.created_at).getTime() >= weekAgo ? s + (r.amount ?? 0) : s,
      0,
    );

    const progress = getLevelProgress(totalXP);

    const { data: recent } = await supabase
      .from("xp_transactions")
      .select("id, reason, amount, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    return {
      totalXP,
      weeklyXP,
      level: progress.level,
      xpIntoLevel: progress.xpIntoLevel,
      xpForNextLevel: progress.xpForNextLevel,
      pct: progress.pct,
      recent: recent ?? [],
    };
  });
