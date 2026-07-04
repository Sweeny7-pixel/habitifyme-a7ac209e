import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";
import { z } from "zod";
import { awardXPInternal } from "./xp.functions";

// ============ Schemas ============

// Normalises the free-text allergies field. Treats sentinel words like
// "no" / "none" as "no allergies" so the diet generator doesn't ban a
// non-food.
function normalizeAllergies(raw: string | null | undefined): string {
  const v = (raw ?? "").trim();
  if (!v) return "";
  if (/^(no|none|n\/a|na|false|nil|n)$/i.test(v)) return "";
  return v;
}

const ProfileInput = z.object({
  name: z.string().min(1),
  age: z.number().int().min(10).max(100),
  gender: z.string(),
  height_cm: z.number().int().min(100).max(250),
  weight_kg: z.number().min(30).max(300),
  goal: z.string(),
  days_per_week: z.number().int().min(2).max(6),
  equipment: z.string(),
  injuries: z.string().optional().default(""),
  allergies: z.string().optional().default(""),
  experience: z.string(),
});

const ExerciseSchema = z.object({
  name: z.string(),
  sets: z.number().int(),
  reps: z.string(),
  rest_seconds: z.number().int(),
  form_cue: z.string(),
  youtube_query: z.string(),
});

const DaySchema = z.object({
  day_index: z.number().int(),
  title: z.string(),
  focus: z.string(),
  exercises: z.array(ExerciseSchema),
});

const PlanSchema = z.object({
  plan_summary: z.string(),
  diet: z.object({
    daily_calories: z.number().int(),
    daily_protein_g: z.number().int(),
    notes: z.string(),
    meals: z.array(z.object({ name: z.string(), items: z.string() })),
  }),
  days: z.array(DaySchema),
});

export type Plan = z.infer<typeof PlanSchema>;

// ============ Save profile ============

export const saveProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ProfileInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("profiles").upsert({
      id: userId,
      ...data,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    try {
      await awardXPInternal(supabase, userId, {
        reason: "profile_complete",
        dedupeKey: `profile:${userId}`,
      });
    } catch (err) {
      console.warn("[xp] profile_complete award failed", err);
    }
    return { ok: true };
  });

export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    return data;
  });

export const updateAllergies = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ allergies: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update({ allergies: data.allergies, updated_at: new Date().toISOString() })
      .eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ Generate plan ============

function mapAiError(err: unknown): Error {
  const e = err as { statusCode?: number; status?: number; message?: string } | undefined;
  const status = e?.statusCode ?? e?.status;
  const msg = e?.message ?? "";
  if (status === 429 || /rate.?limit/i.test(msg)) {
    return new Error("AI is rate limited right now. Please try again in a minute.");
  }
  if (status === 402 || /credit|payment|quota/i.test(msg)) {
    return new Error("AI credits exhausted. Add credits in your workspace billing to continue.");
  }
  return new Error(msg || "AI request failed. Please try again.");
}

async function callGeminiForPlan(systemPrompt: string, userPrompt: string): Promise<Plan> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY missing");

  const { generateText } = await import("ai");
  const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
  const gateway = createLovableAiGatewayProvider(key);

  let text: string;
  try {
    const result = await generateText({
    model: gateway("google/gemini-3-flash-preview"),
    system: systemPrompt,
    prompt: userPrompt + "\n\nReturn ONLY a valid JSON object matching this TypeScript type and nothing else (no markdown, no backticks):\n\n" +
`{
  "plan_summary": string,
  "diet": {
    "daily_calories": number,
    "daily_protein_g": number,
    "notes": string,
    "meals": [{ "name": string, "items": string }]
  },
  "days": [{
    "day_index": number,
    "title": string,
    "focus": string,
    "exercises": [{
      "name": string,
      "sets": number,
      "reps": string,
      "rest_seconds": number,
      "form_cue": string,
      "youtube_query": string
    }]
  }]
}`,
    });
    text = result.text;
  } catch (err) {
    throw mapAiError(err);
  }

  // Extract JSON safely
  let jsonText = text.trim();
  const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) jsonText = fenceMatch[1].trim();
  const firstBrace = jsonText.indexOf("{");
  const lastBrace = jsonText.lastIndexOf("}");
  if (firstBrace > -1 && lastBrace > firstBrace) {
    jsonText = jsonText.slice(firstBrace, lastBrace + 1);
  }
  const parsed = JSON.parse(jsonText);
  return PlanSchema.parse(parsed);
}

const SYSTEM_PROMPT = `You are HabitifyMe, a cautious, encouraging fitness coach for budget gym beginners in India. Rules:
- Design safe, simple programs appropriate for beginners.
- Use standard barbell, dumbbell, machine, and bodyweight movements available in a basic gym.
- Always include warm-up cues in form_cue when relevant.
- Avoid loading any body area the user listed as injured; substitute safer movements and mention the swap in form_cue.
- Reps as a string like "8-12" or "AMRAP". Rest in seconds (60, 90, 120).
- Diet must be India-friendly (dal, roti, paneer, eggs, rice, chicken, curd). Provide 3 sample meals.
- If the user lists food allergies / foods to avoid, NEVER include them in any meal. Replace them with safe substitutes that hit the same calorie and protein target. Mention the substitution briefly in diet.notes.
- Daily calories should suit the user's weight and goal; protein 1.4-2.0 g/kg bodyweight.
- youtube_query should be a precise search like "barbell back squat proper form" so a beginner finds a demo.
- Number of training days MUST equal days_per_week. Include only training days (no rest days).
- Never give medical advice. If injuries are serious, suggest consulting a doctor in the diet notes.`;

export const generateWeekPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ weekNumber: z.number().int().min(1).max(52) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { weekNumber } = data;

    const { data: profile, error: pErr } = await supabase
      .from("profiles").select("*").eq("id", userId).maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!profile) throw new Error("Complete onboarding first");

    // If a week already exists, return it
    const { data: existing } = await supabase
      .from("weeks").select("*").eq("user_id", userId).eq("week_number", weekNumber).maybeSingle();
    if (existing) return { weekId: existing.id };

    // Optionally include previous week summary for adaptation
    let adaptation = "";
    if (weekNumber > 1) {
      const { data: prev } = await supabase
        .from("weeks").select("id, plan_summary").eq("user_id", userId).eq("week_number", weekNumber - 1).maybeSingle();
      if (prev) {
        const { data: review } = await supabase
          .from("week_reviews").select("*").eq("week_id", prev.id).maybeSingle();
        const { data: prevDays } = await supabase
          .from("workout_days").select("title, completed_at").eq("week_id", prev.id);
        const completedCount = prevDays?.filter(d => d.completed_at).length ?? 0;
        const totalDays = prevDays?.length ?? 0;
        adaptation = `\n\nPREVIOUS WEEK ADAPTATION:
- Previous plan summary: ${prev.plan_summary}
- Completed ${completedCount}/${totalDays} sessions
- Reflection: energy=${review?.energy ?? "?"}/5, soreness=${review?.soreness ?? "?"}/5, wants=${review?.difficulty_pref ?? "same"}
- If completion < 60%: simplify, reduce volume, easier movements.
- If completion >= 80% and user wants harder: progress weight/reps slightly.
- Otherwise: keep similar structure with small progression.`;
      }
    }

    const userPrompt = `Generate Week ${weekNumber} for this user:
- Name: ${profile.name}
- Age: ${profile.age}, Gender: ${profile.gender}
- Height: ${profile.height_cm}cm, Weight: ${profile.weight_kg}kg
- Goal: ${profile.goal}
- Days per week: ${profile.days_per_week}
- Equipment: ${profile.equipment}
- Experience: ${profile.experience}
- Injuries/health notes: ${profile.injuries || "none"}
- Food allergies / foods to avoid: ${normalizeAllergies(profile.allergies) || "none"}${adaptation}`;

    const plan = await callGeminiForPlan(SYSTEM_PROMPT, userPrompt);

    // Hydrate each AI exercise with catalog data (images, instructions,
    // primaryMuscles, equipment, level, youtubeLink) so the UI can render
    // thumbnails and demo images. Falls back to the raw AI exercise when no
    // catalog match is found so the workout still shows.
    const { findExercise } = await import("./exercise-db.server");
    const hydratedDays = await Promise.all(
      plan.days.map(async (d) => {
        const exercises = await Promise.all(
          d.exercises.map(async (ex) => {
            const match = await findExercise({ name: ex.name });
            if (!match) {
              return {
                name: ex.name,
                sets: ex.sets,
                reps: ex.reps,
                rest_seconds: ex.rest_seconds,
                form_cue: ex.form_cue,
                images: [] as string[],
                instructions: [] as string[],
                primaryMuscles: [] as string[],
                equipment: null as string | null,
                level: null as string | null,
                youtubeLink:
                  "https://www.youtube.com/results?search_query=" +
                  encodeURIComponent(ex.youtube_query || `${ex.name} proper form`).replaceAll("+", "%20"),
              };
            }
            return {
              name: match.name,
              sets: ex.sets,
              reps: ex.reps,
              rest_seconds: ex.rest_seconds,
              form_cue: ex.form_cue,
              instructions: Array.isArray(match.instructions)
                ? match.instructions
                : match.instructions
                  ? [String(match.instructions)]
                  : [],
              images: (match.images ?? []).map(toImageUrl),
              youtubeLink: match.youtubeLink,
              primaryMuscles: match.primaryMuscles,
              equipment: match.equipment ?? null,
              level: match.level,
            };
          }),
        );
        return { ...d, exercises };
      }),
    );

    // Insert week
    const { data: week, error: wErr } = await supabase
      .from("weeks").insert({
        user_id: userId,
        week_number: weekNumber,
        plan_summary: plan.plan_summary,
        diet_json: plan.diet,
        status: "active",
      }).select().single();
    if (wErr) throw new Error(wErr.message);

    // Insert days
    const daysToInsert = hydratedDays.map(d => ({
      week_id: week.id,
      user_id: userId,
      day_index: d.day_index,
      title: d.title,
      focus: d.focus,
      exercises_json: d.exercises,
    }));
    const { error: dErr } = await supabase.from("workout_days").insert(daysToInsert);
    if (dErr) throw new Error(dErr.message);


    return { weekId: week.id };
  });

// ============ Read current week ============

export const getCurrentWeek = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: week } = await supabase
      .from("weeks").select("*").eq("user_id", userId)
      .order("week_number", { ascending: false }).limit(1).maybeSingle();
    if (!week) return null;
    const { data: days } = await supabase
      .from("workout_days").select("*").eq("week_id", week.id).order("day_index");
    return { week, days: days ?? [] };
  });

export const getWeek = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ weekId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: week } = await supabase
      .from("weeks").select("*").eq("id", data.weekId).eq("user_id", userId).maybeSingle();
    if (!week) throw new Error("Week not found");
    const { data: days } = await supabase
      .from("workout_days").select("*").eq("week_id", week.id).order("day_index");
    return { week, days: days ?? [] };
  });

export const getDay = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ dayId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: day } = await supabase
      .from("workout_days").select("*").eq("id", data.dayId).eq("user_id", userId).maybeSingle();
    if (!day) return { day: null, logs: [] as never[] };
    const { data: logs } = await supabase
      .from("exercise_logs").select("*").eq("workout_day_id", data.dayId);

    // Backfill missing catalog metadata (images, instructions, primaryMuscles,
    // equipment, level, youtubeLink) for rows saved before hydration existed.
    const rawExercises = Array.isArray(day.exercises_json)
      ? (day.exercises_json as Record<string, unknown>[])
      : [];
    const needsHydration = rawExercises.some(
      (ex) => !Array.isArray(ex?.images) || (ex.images as unknown[]).length === 0,
    );
    if (needsHydration && rawExercises.length > 0) {
      const { findExercise } = await import("./exercise-db.server");
      const hydrated = await Promise.all(
        rawExercises.map(async (ex) => {
          if (Array.isArray(ex.images) && (ex.images as unknown[]).length > 0) return ex;
          const name = typeof ex.name === "string" ? ex.name : "";
          const match = name ? await findExercise({ name }) : null;
          const ytQuery = typeof ex.youtube_query === "string" ? ex.youtube_query : "";
          if (!match) {
            return {
              ...ex,
              images: [],
              instructions: Array.isArray(ex.instructions) ? ex.instructions : [],
              primaryMuscles: Array.isArray(ex.primaryMuscles) ? ex.primaryMuscles : [],
              equipment: ex.equipment ?? null,
              level: ex.level ?? null,
              youtubeLink:
                (typeof ex.youtubeLink === "string" && ex.youtubeLink) ||
                "https://www.youtube.com/results?search_query=" +
                  encodeURIComponent(ytQuery || `${name} proper form`).replaceAll("+", "%20"),
            };
          }
          return {
            ...ex,
            name: match.name,
            images: (match.images ?? []).map(toImageUrl),
            instructions: Array.isArray(match.instructions)
              ? match.instructions
              : match.instructions
                ? [String(match.instructions)]
                : [],
            primaryMuscles: match.primaryMuscles,
            equipment: match.equipment ?? null,
            level: match.level,
            youtubeLink: match.youtubeLink,
          };
        }),
      );
      return { day: { ...day, exercises_json: hydrated as unknown as Json }, logs: logs ?? [] };
    }

    return { day, logs: logs ?? [] };
  });



// ============ Log exercise / complete day ============

export const logExercise = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    workout_day_id: z.string().uuid(),
    exercise_index: z.number().int(),
    exercise_name: z.string(),
    sets_completed: z.number().int().min(0),
    reps: z.string().optional(),
    weight_kg: z.number().nullable().optional(),
    rpe: z.number().int().min(1).max(10).nullable().optional(),
    skipped: z.boolean().default(false),
    notes: z.string().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("exercise_logs").upsert({
      ...data,
      user_id: userId,
      logged_at: new Date().toISOString(),
    }, { onConflict: "workout_day_id,exercise_index" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const completeWorkoutDay = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ dayId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("workout_days")
      .update({ completed_at: new Date().toISOString() })
      .eq("id", data.dayId).eq("user_id", userId);
    if (error) throw new Error(error.message);
    try {
      await awardXPInternal(supabase, userId, {
        reason: "workout_complete",
        dedupeKey: `workout_day:${data.dayId}`,
        metadata: { workout_day_id: data.dayId },
      });
    } catch (err) {
      console.warn("[xp] workout_complete award failed", err);
    }
    return { ok: true };
  });

// Resets the user's plan: clears completed_at on every workout day and
// marks week 1 active again. Used by the "long gap" recovery flow.
export const resetUserPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await supabase
      .from("workout_days")
      .update({ completed_at: null })
      .eq("user_id", userId);
    await supabase
      .from("weeks")
      .update({ status: "active" })
      .eq("user_id", userId)
      .eq("week_number", 1);
    return { ok: true };
  });

// ============ Week review ============

export const submitWeekReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    week_id: z.string().uuid(),
    energy: z.number().int().min(1).max(5),
    soreness: z.number().int().min(1).max(5),
    difficulty_pref: z.enum(["easier", "same", "harder"]),
    notes: z.string().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Compute completion %
    const { data: days } = await supabase
      .from("workout_days").select("completed_at").eq("week_id", data.week_id);
    const total = days?.length ?? 0;
    const completed = days?.filter(d => d.completed_at).length ?? 0;
    const completion_pct = total > 0 ? Math.round((completed / total) * 100) : 0;

    const { error } = await supabase.from("week_reviews").upsert({
      ...data,
      user_id: userId,
      completion_pct,
    }, { onConflict: "week_id" });
    if (error) throw new Error(error.message);

    // Mark week complete
    await supabase.from("weeks").update({ status: "completed" })
      .eq("id", data.week_id).eq("user_id", userId);

    // Fire achievement pushes for any newly-unlocked badges. Never let a
    // push failure block the review from being saved.
    try {
      const { evaluateAndNotifyAchievements } = await import("./push.functions");
      await evaluateAndNotifyAchievements(supabase, userId);
    } catch (err) {
      console.warn("[achievements] notify failed", err);
    }

    try {
      await awardXPInternal(supabase, userId, {
        reason: "weekly_review",
        dedupeKey: `week_review:${data.week_id}`,
        metadata: { week_id: data.week_id, completion_pct },
      });
    } catch (err) {
      console.warn("[xp] weekly_review award failed", err);
    }

    return { ok: true, completion_pct };
  });


// ============ Progress history ============

export const getAllWeeks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: weeks } = await supabase
      .from("weeks").select("*").eq("user_id", userId).order("week_number");
    const { data: reviews } = await supabase
      .from("week_reviews").select("*").eq("user_id", userId);
    return { weeks: weeks ?? [], reviews: reviews ?? [] };
  });

// ============ Exercise catalog (free-exercise-db) ============

type CatalogExercise = {
  id: string;
  name: string;
  force?: string | null;
  level: string;
  mechanic?: string | null;
  equipment?: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[] | string;
  category: string;
  images: string[];
};

const CATALOG_URL =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";
const IMAGE_BASE =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";

function toImageUrl(img: string): string {
  if (!img) return "";
  if (img.startsWith("http://") || img.startsWith("https://")) return img;
  return `${IMAGE_BASE}${img}`;
}

let catalogPromise: Promise<CatalogExercise[]> | null = null;
function loadExerciseCatalog(): Promise<CatalogExercise[]> {
  if (!catalogPromise) {
    catalogPromise = fetch(CATALOG_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`Catalog fetch failed: ${r.status}`);
        return r.json();
      })
      .catch((e) => {
        catalogPromise = null;
        throw e;
      });
  }
  return catalogPromise;
}

function mapEquipmentToAllowed(profileEquipment: string): Set<string> {
  const e = (profileEquipment || "").toLowerCase();
  // Always allow bodyweight
  const allowed = new Set<string>(["body only", "bands", "other"]);
  if (/full|gym|barbell/.test(e)) {
    ["barbell", "dumbbell", "cable", "machine", "kettlebells", "ez curl bar", "medicine ball", "exercise ball", "foam roll"].forEach((x) => allowed.add(x));
  }
  if (/dumbbell|home/.test(e)) {
    allowed.add("dumbbell");
    allowed.add("kettlebells");
  }
  if (/kettle/.test(e)) allowed.add("kettlebells");
  if (/cable/.test(e)) allowed.add("cable");
  if (/machine/.test(e)) allowed.add("machine");
  if (/none|bodyweight|home only/.test(e) && allowed.size <= 3) {
    // strictly bodyweight
  }
  return allowed;
}

function mapLevel(experience: string): string[] {
  const e = (experience || "").toLowerCase();
  if (/beginner|new|none/.test(e)) return ["beginner"];
  if (/inter/.test(e)) return ["beginner", "intermediate"];
  if (/adv|expert/.test(e)) return ["beginner", "intermediate", "expert"];
  return ["beginner", "intermediate"];
}

function parseInjuredMuscles(injuries: string): Set<string> {
  const s = (injuries || "").toLowerCase();
  const muscles = [
    "biceps", "triceps", "forearms", "shoulders", "chest", "lats", "middle back",
    "lower back", "traps", "neck", "abdominals", "abductors", "adductors",
    "glutes", "hamstrings", "quadriceps", "calves",
  ];
  const out = new Set<string>();
  for (const m of muscles) if (s.includes(m)) out.add(m);
  // common synonyms
  if (/back pain|spine|disc/.test(s)) out.add("lower back");
  if (/knee/.test(s)) { out.add("quadriceps"); out.add("hamstrings"); }
  if (/shoulder/.test(s)) out.add("shoulders");
  return out;
}

function filterCatalog(
  catalog: CatalogExercise[],
  opts: { equipment: string; experience: string; injuries: string }
): CatalogExercise[] {
  const allowedEq = mapEquipmentToAllowed(opts.equipment);
  const levels = new Set(mapLevel(opts.experience));
  const injured = parseInjuredMuscles(opts.injuries);
  return catalog.filter((ex) => {
    if (ex.equipment && !allowedEq.has(ex.equipment.toLowerCase())) return false;
    if (!levels.has((ex.level || "").toLowerCase())) return false;
    if (ex.primaryMuscles?.some((m) => injured.has(m.toLowerCase()))) return false;
    return true;
  });
}

// ============ 4-week plan generation ============

const PickSchema = z.object({
  exerciseId: z.string(),
  sets: z.number().int().min(1).max(10),
  reps: z.string(),
  rest_seconds: z.number().int().min(15).max(600),
  form_cue: z.string(),
});

const FourWeekDaySchema = z.object({
  day_index: z.number().int(),
  title: z.string(),
  focus: z.string(),
  exercises: z.array(PickSchema).min(1),
});

const FourWeekSchema = z.object({
  plan_summary: z.string(),
  diet: z.object({
    daily_calories: z.number().int(),
    daily_protein_g: z.number().int(),
    notes: z.string(),
    meals: z.array(z.object({ name: z.string(), items: z.string() })),
  }),
  weeks: z.array(z.object({
    week_number: z.number().int().min(1).max(4),
    focus: z.string(),
    days: z.array(FourWeekDaySchema).min(1),
  })).length(4),
});

type FourWeekPlan = z.infer<typeof FourWeekSchema>;

async function callGeminiForFourWeekPlan(
  profile: Record<string, unknown>,
  allowed: { id: string; name: string; primaryMuscles: string[]; equipment: string | null; level: string }[],
): Promise<FourWeekPlan> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY missing");

  const { generateText } = await import("ai");
  const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
  const gateway = createLovableAiGatewayProvider(key);

  const system = `You are HabitifyMe, a careful coach for budget-gym beginners in India. You will design a 4-week training block.
RULES:
- You MUST ONLY pick exercises from the provided allowed_exercises list, using their exact "id".
- Use exactly profile.days_per_week training days per week (no rest days listed).
- Apply gentle progressive overload week-over-week (more sets, harder reps, or shorter rest).
- Reps as a string like "8-12" or "AMRAP". Rest in seconds.
- Diet must be India-friendly (dal, roti, paneer, eggs, rice, chicken, curd). Provide 3 sample meals. Protein 1.4-2.0 g/kg.
- If profile.allergies lists foods to avoid, NEVER include them in any meal. Substitute with safe foods that hit the same calorie and protein target, and briefly mention the substitution in diet.notes.
- Never recommend exercises that load an injured area. The list has been pre-filtered for you.
- 5-7 exercises per day. Cover the whole body across the week.`;

  const user = `profile = ${JSON.stringify(profile)}
allowed_exercises = ${JSON.stringify(allowed)}

Return ONLY a JSON object (no markdown) matching:
{
  "plan_summary": string,
  "diet": { "daily_calories": number, "daily_protein_g": number, "notes": string,
            "meals": [{ "name": string, "items": string }] },
  "weeks": [
    { "week_number": 1|2|3|4, "focus": string,
      "days": [{ "day_index": number, "title": string, "focus": string,
                 "exercises": [{ "exerciseId": string, "sets": number, "reps": string,
                                  "rest_seconds": number, "form_cue": string }] }] }
  ]
}`;

  let text: string;
  try {
    const result = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system,
      prompt: user,
    });
    text = result.text;
  } catch (err) {
    throw mapAiError(err);
  }

  let jsonText = text.trim();
  const fence = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) jsonText = fence[1].trim();
  const first = jsonText.indexOf("{");
  const last = jsonText.lastIndexOf("}");
  if (first > -1 && last > first) jsonText = jsonText.slice(first, last + 1);
  return FourWeekSchema.parse(JSON.parse(jsonText));
}

export const generateFourWeekPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: profile, error: pErr } = await supabase
      .from("profiles").select("*").eq("id", userId).maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!profile) throw new Error("Complete onboarding first");

    // Load + locally filter catalog
    const catalog = await loadExerciseCatalog();
    const filtered = filterCatalog(catalog, {
      equipment: String(profile.equipment ?? ""),
      experience: String(profile.experience ?? ""),
      injuries: String(profile.injuries ?? ""),
    });

    // Ensure muscle-group coverage with a capped, diverse slice for the prompt
    const PER_MUSCLE_CAP = 6;
    const perMuscle = new Map<string, number>();
    const slice: CatalogExercise[] = [];
    for (const ex of filtered) {
      const pm = (ex.primaryMuscles[0] || "other").toLowerCase();
      const n = perMuscle.get(pm) ?? 0;
      if (n >= PER_MUSCLE_CAP) continue;
      perMuscle.set(pm, n + 1);
      slice.push(ex);
      if (slice.length >= 120) break;
    }
    if (slice.length < 12) throw new Error("Not enough exercises matched your equipment/level. Try widening equipment in onboarding.");

    const allowedForPrompt = slice.map((e) => ({
      id: e.id, name: e.name,
      primaryMuscles: e.primaryMuscles,
      equipment: e.equipment ?? null,
      level: e.level,
    }));

    const profileForPrompt = {
      name: profile.name, age: profile.age, gender: profile.gender,
      height_cm: profile.height_cm, weight_kg: profile.weight_kg,
      goal: profile.goal, days_per_week: profile.days_per_week,
      equipment: profile.equipment, experience: profile.experience,
      injuries: profile.injuries ?? "",
      allergies: normalizeAllergies(profile.allergies),
    };

    const plan = await callGeminiForFourWeekPlan(profileForPrompt, allowedForPrompt);

    const byId = new Map(slice.map((e) => [e.id, e]));

    // Remove existing non-completed weeks (preserve completed for history)
    const { data: existingWeeks } = await supabase
      .from("weeks").select("id, status").eq("user_id", userId);
    const toDelete = (existingWeeks ?? []).filter((w) => w.status !== "completed").map((w) => w.id);
    if (toDelete.length > 0) {
      await supabase.from("workout_days").delete().in("week_id", toDelete);
      await supabase.from("weeks").delete().in("id", toDelete);
    }

    // Determine starting week number to avoid colliding with completed weeks
    const { data: completedWeeks } = await supabase
      .from("weeks").select("week_number").eq("user_id", userId).eq("status", "completed");
    const startNum = Math.max(0, ...(completedWeeks ?? []).map((w) => w.week_number ?? 0)) + 1;

    // Insert weeks + days
    const firstWeekId: string[] = [];
    for (let i = 0; i < plan.weeks.length; i++) {
      const w = plan.weeks[i];
      const weekNumber = startNum + i;
      const { data: wRow, error: wErr } = await supabase
        .from("weeks").insert({
          user_id: userId,
          week_number: weekNumber,
          plan_summary: i === 0 ? plan.plan_summary : `${plan.plan_summary} — Week ${weekNumber}: ${w.focus}`,
          diet_json: plan.diet,
          status: i === 0 ? "active" : "upcoming",
        }).select().single();
      if (wErr) throw new Error(wErr.message);
      if (i === 0) firstWeekId.push(wRow.id);

      const daysRows = w.days.map((d) => {
        const hydrated = d.exercises.map((p) => {
          const cat = byId.get(p.exerciseId);
          const name = cat?.name ?? p.exerciseId;
          const equipment = cat?.equipment ?? null;
          return {
            name,
            sets: p.sets,
            reps: p.reps,
            rest_seconds: p.rest_seconds,
            form_cue: p.form_cue,
            instructions: Array.isArray(cat?.instructions)
              ? cat?.instructions
              : cat?.instructions
                ? [cat.instructions as unknown as string]
                : [],
            images: (cat?.images ?? []).map(toImageUrl),
            youtubeLink:
              "https://www.youtube.com/results?search_query=" +
              [
                "how to do",
                name,
                ...(equipment && equipment.toLowerCase() !== "body only" ? [equipment] : []),
                "form",
              ]
                .map((s) => encodeURIComponent(s))
                .join("+"),
            primaryMuscles: cat?.primaryMuscles ?? [],
            equipment,
            level: cat?.level ?? null,
          };
        });
        return {
          week_id: wRow.id,
          user_id: userId,
          day_index: d.day_index,
          title: d.title,
          focus: d.focus,
          exercises_json: hydrated,
        };
      });
      const { error: dErr } = await supabase.from("workout_days").insert(daysRows);
      if (dErr) throw new Error(dErr.message);
    }

    return { ok: true, weeks: plan.weeks.length, firstWeekId: firstWeekId[0] ?? null };
  });

export const getAllPlanWeeks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: weeks } = await supabase
      .from("weeks").select("*").eq("user_id", userId).order("week_number");
    const ids = (weeks ?? []).map((w) => w.id);
    if (ids.length === 0) return { weeks: [], days: [] };
    const { data: days } = await supabase
      .from("workout_days").select("*").in("week_id", ids).order("day_index");
    return { weeks: weeks ?? [], days: days ?? [] };
  });

// ============ Prompt-driven plan (matched to free-exercise-db) ============

const PromptExerciseSchema = z.object({
  name: z.string(),
  muscle: z.string().optional().default(""),
  equipment: z.string().optional().default(""),
  sets: z.number().int().min(1).max(10),
  reps: z.string(),
  rest_seconds: z.number().int().min(15).max(600),
  form_cue: z.string().optional().default(""),
});

const PromptDaySchema = z.object({
  day_index: z.number().int(),
  title: z.string(),
  focus: z.string(),
  exercises: z.array(PromptExerciseSchema).min(1),
});

const PromptPlanSchema = z.object({
  plan_summary: z.string(),
  days_per_week: z.number().int().min(1).max(7),
  level: z.string(),
  diet: z.object({
    daily_calories: z.number().int(),
    daily_protein_g: z.number().int(),
    notes: z.string(),
    meals: z.array(z.object({ name: z.string(), items: z.string() })),
  }),
  days: z.array(PromptDaySchema).min(1),
});

type PromptPlan = z.infer<typeof PromptPlanSchema>;

async function callGeminiForPromptPlan(
  userPrompt: string,
  profile: Record<string, unknown> | null,
): Promise<PromptPlan> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY missing");

  const { generateText } = await import("ai");
  const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
  const gateway = createLovableAiGatewayProvider(key);

  const system = `You are HabitifyMe. Convert a user's workout-plan request into a structured JSON plan.
RULES:
- Use canonical exercise names from the yuhonas/free-exercise-db catalog (e.g. "Barbell Curl", "Dumbbell Bench Press", "Wide-Grip Lat Pulldown"). No slang, no abbreviations.
- For each exercise, also provide the primary muscle ("chest", "biceps", "quadriceps", ...) and equipment ("barbell", "dumbbell", "cable", "machine", "body only", ...). These hints help match real exercises.
- Number of days MUST equal days_per_week. List only training days (no rest days).
- 4-7 exercises per day. Reps as a string like "8-12" or "AMRAP". Rest in seconds (60, 90, 120).
- Diet must be India-friendly (dal, roti, paneer, eggs, rice, chicken, curd). 3 sample meals. Protein 1.4-2.0 g/kg bodyweight.
- If allergies are listed, NEVER include them in any meal; substitute safely and mention substitution in diet.notes.
- Never give medical advice.`;

  const profileBlock = profile
    ? `\n\nUSER PROFILE (use for calorie/protein targets and as defaults when the prompt is silent):
${JSON.stringify(profile)}`
    : "";

  const prompt = `USER REQUEST: ${userPrompt}${profileBlock}

Return ONLY a JSON object (no markdown, no backticks) matching:
{
  "plan_summary": string,
  "days_per_week": number,
  "level": "beginner" | "intermediate" | "advanced",
  "diet": { "daily_calories": number, "daily_protein_g": number, "notes": string,
            "meals": [{ "name": string, "items": string }] },
  "days": [{
    "day_index": number,
    "title": string,
    "focus": string,
    "exercises": [{
      "name": string,
      "muscle": string,
      "equipment": string,
      "sets": number,
      "reps": string,
      "rest_seconds": number,
      "form_cue": string
    }]
  }]
}`;

  let text: string;
  try {
    const result = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system,
      prompt,
    });
    text = result.text;
  } catch (err) {
    throw mapAiError(err);
  }

  let jsonText = text.trim();
  const fence = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) jsonText = fence[1].trim();
  const first = jsonText.indexOf("{");
  const last = jsonText.lastIndexOf("}");
  if (first > -1 && last > first) jsonText = jsonText.slice(first, last + 1);
  return PromptPlanSchema.parse(JSON.parse(jsonText));
}

export const generatePlanFromPrompt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ prompt: z.string().min(10).max(500) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Profile is optional context for calorie/protein/allergies
    const { data: profile } = await supabase
      .from("profiles").select("*").eq("id", userId).maybeSingle();

    const profileForPrompt = profile
      ? {
          weight_kg: profile.weight_kg,
          height_cm: profile.height_cm,
          age: profile.age,
          gender: profile.gender,
          goal: profile.goal,
          equipment: profile.equipment,
          experience: profile.experience,
          injuries: profile.injuries ?? "",
          allergies: normalizeAllergies(profile.allergies),
        }
      : null;

    const plan = await callGeminiForPromptPlan(data.prompt, profileForPrompt);

    // Match against local enriched catalog
    const { findExercise, searchExercises } = await import("./exercise-db.server");
    const level = plan.level.toLowerCase();
    const hydratedDays = await Promise.all(
      plan.days.map(async (d) => {
        const exercises: Record<string, unknown>[] = [];
        for (const ex of d.exercises) {
          let match = await findExercise({
            name: ex.name,
            muscle: ex.muscle,
            equipment: ex.equipment,
          });
          if (!match) {
            const subs = await searchExercises({
              muscle: ex.muscle,
              equipment: ex.equipment,
              level,
              limit: 1,
            });
            match = subs[0] ?? null;
          }
          if (!match) continue; // never fabricate
          exercises.push({
            name: match.name,
            sets: ex.sets,
            reps: ex.reps,
            rest_seconds: ex.rest_seconds,
            form_cue: ex.form_cue || "",
            instructions: Array.isArray(match.instructions)
              ? match.instructions
              : match.instructions
                ? [String(match.instructions)]
                : [],
            images: (match.images ?? []).map(toImageUrl),
            youtubeLink: match.youtubeLink,
            primaryMuscles: match.primaryMuscles,
            equipment: match.equipment ?? null,
            level: match.level,
          });
        }
        return {
          day_index: d.day_index,
          title: d.title,
          focus: d.focus,
          exercises_json: exercises,
        };
      }),
    );

    const validDays = hydratedDays.filter((d) => d.exercises_json.length > 0);
    if (validDays.length === 0) {
      throw new Error("Couldn't match any exercises from the catalog. Try a more specific prompt.");
    }

    // Replace non-completed weeks (mirror Regenerate behavior)
    const { data: existingWeeks } = await supabase
      .from("weeks").select("id, status").eq("user_id", userId);
    const toDelete = (existingWeeks ?? [])
      .filter((w) => w.status !== "completed")
      .map((w) => w.id);
    if (toDelete.length > 0) {
      await supabase.from("workout_days").delete().in("week_id", toDelete);
      await supabase.from("weeks").delete().in("id", toDelete);
    }

    const { data: completedWeeks } = await supabase
      .from("weeks").select("week_number").eq("user_id", userId).eq("status", "completed");
    const startNum =
      Math.max(0, ...(completedWeeks ?? []).map((w) => w.week_number ?? 0)) + 1;

    const { data: wRow, error: wErr } = await supabase
      .from("weeks")
      .insert({
        user_id: userId,
        week_number: startNum,
        plan_summary: plan.plan_summary,
        diet_json: plan.diet,
        status: "active",
      })
      .select()
      .single();
    if (wErr) throw new Error(wErr.message);

    const daysRows = validDays.map((d) => ({
      week_id: wRow.id,
      user_id: userId,
      day_index: d.day_index,
      title: d.title,
      focus: d.focus,
      exercises_json: d.exercises_json as unknown as Json,
    }));
    const { error: dErr } = await supabase.from("workout_days").insert(daysRows);
    if (dErr) throw new Error(dErr.message);

    return { ok: true, weekId: wRow.id, days: validDays.length };
  });

// ============ 7-day Indian diet plan ============

const MealSchema = z.object({
  items: z.array(z.string()).min(1),
  approxCalories: z.number().int().min(0),
});

const DietDaySchema = z.object({
  day: z.enum(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]),
  isWorkoutDay: z.boolean(),
  meals: z.object({
    breakfast: MealSchema,
    lunch: MealSchema,
    eveningSnack: MealSchema,
    dinner: MealSchema,
  }),
  totalApproxCalories: z.number().int().min(0),
  proteinNote: z.string(),
});

const SevenDayDietSchema = z.object({
  version: z.literal(2).optional().default(2),
  days: z.array(DietDaySchema).length(7),
});

export type SevenDayDiet = z.infer<typeof SevenDayDietSchema>;

function isSevenDayDiet(value: unknown): value is SevenDayDiet {
  return SevenDayDietSchema.safeParse(value).success;
}

async function callGeminiForSevenDayDiet(input: {
  profile: Record<string, unknown>;
  workoutDays: string[];
  restDayCount: number;
}): Promise<SevenDayDiet> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY missing");

  const { generateText } = await import("ai");
  const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
  const gateway = createLovableAiGatewayProvider(key);

  const system = `You are a certified Indian sports nutritionist. You design simple, budget-friendly Indian diet plans for beginner gym-goers. Never give medical advice.`;

  const prompt = `Generate a 7-day diet plan for the following user.

User profile:
- Goal: ${input.profile.goal}
- Weight: ${input.profile.weight_kg}kg, Height: ${input.profile.height_cm}cm, Age: ${input.profile.age}
- Gender: ${input.profile.gender}
- Workout sessions this week (${input.workoutDays.length}): ${input.workoutDays.join(", ") || "none"}
- Rest days this week: ${input.restDayCount}
- Allergies / foods to avoid: ${normalizeAllergies(input.profile.allergies as string | null | undefined) || "none"}

STRICT RULES:
1. Use only common Indian foods: roti, rice, dal, sabzi, eggs, paneer, curd, chicken (optional), fruits, nuts.
2. No whey protein, no salads as a main meal, no Western foods unless the user explicitly eats them.
3. Maximum 4 meals per day: Breakfast, Lunch, Evening snack, Dinner.
4. Workout days: higher protein, moderate carbs.
5. Rest days: lighter meals, fewer carbs.
6. Budget-friendly. No expensive ingredients.
7. Goal = weight loss → slight caloric deficit. Goal = muscle gain → slight caloric surplus.
8. Respect allergies — NEVER include them in any meal; substitute safely.
9. Spread the user's workout sessions across the week (Mon..Sun) sensibly; mark each day's isWorkoutDay accordingly. Exactly ${input.workoutDays.length} days must have isWorkoutDay=true.

Return ONLY valid JSON (no markdown, no backticks) matching:
{
  "days": [
    {
      "day": "Monday" | ... | "Sunday",
      "isWorkoutDay": boolean,
      "meals": {
        "breakfast":    { "items": [string, ...], "approxCalories": number },
        "lunch":        { "items": [string, ...], "approxCalories": number },
        "eveningSnack": { "items": [string, ...], "approxCalories": number },
        "dinner":       { "items": [string, ...], "approxCalories": number }
      },
      "totalApproxCalories": number,
      "proteinNote": string
    }
  ]
}
The "days" array MUST have exactly 7 entries in order Monday..Sunday.`;

  let text: string;
  try {
    const result = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system,
      prompt,
    });
    text = result.text;
  } catch (err) {
    throw mapAiError(err);
  }

  let jsonText = text.trim();
  const fence = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) jsonText = fence[1].trim();
  const first = jsonText.indexOf("{");
  const last = jsonText.lastIndexOf("}");
  if (first > -1 && last > first) jsonText = jsonText.slice(first, last + 1);
  return SevenDayDietSchema.parse(JSON.parse(jsonText));
}

export const getWeekDiet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      weekId: z.string().uuid().optional(),
      regenerate: z.boolean().optional().default(false),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Resolve target week (default = latest)
    const weekQuery = supabase.from("weeks").select("*").eq("user_id", userId);
    const { data: week } = data.weekId
      ? await weekQuery.eq("id", data.weekId).maybeSingle()
      : await weekQuery.order("week_number", { ascending: false }).limit(1).maybeSingle();
    if (!week) return null;

    // Return cached 7-day diet if present and not regenerating
    if (!data.regenerate && isSevenDayDiet(week.diet_json)) {
      return { week, diet: week.diet_json as SevenDayDiet };
    }

    // Load profile + workout days for context
    const { data: profile } = await supabase
      .from("profiles").select("*").eq("id", userId).maybeSingle();
    if (!profile) throw new Error("Complete onboarding first");
    const { data: days } = await supabase
      .from("workout_days").select("title, focus, day_index")
      .eq("week_id", week.id).order("day_index");
    const workoutDays = (days ?? []).map((d) => `${d.title} (${d.focus})`);
    const restDayCount = Math.max(0, 7 - workoutDays.length);

    const diet = await callGeminiForSevenDayDiet({
      profile: {
        goal: profile.goal,
        weight_kg: profile.weight_kg,
        height_cm: profile.height_cm,
        age: profile.age,
        gender: profile.gender,
        allergies: normalizeAllergies(profile.allergies),
      },
      workoutDays,
      restDayCount,
    });

    const { error: uErr } = await supabase
      .from("weeks").update({ diet_json: diet as unknown as Json })
      .eq("id", week.id).eq("user_id", userId);
    if (uErr) throw new Error(uErr.message);

    return { week: { ...week, diet_json: diet as unknown as Json }, diet };
  });

// ============ Backfill media (images + youtubeLink) for legacy plans ============

function serverYouTubeSearchUrl(name: string, equipment?: string | null): string {
  const parts = ["how to do", String(name || "").trim()];
  const eq = String(equipment || "").trim().toLowerCase();
  if (eq && eq !== "body only" && eq !== "none" && eq !== "null") {
    parts.push(String(equipment).trim());
  }
  parts.push("form");
  const query = parts.filter(Boolean).join(" ");
  return "https://www.youtube.com/results?search_query=" + encodeURIComponent(query).replaceAll("+", "%20");
}

export const backfillPlanMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { findExercise } = await import("./exercise-db.server");

    const { data: days, error } = await supabase
      .from("workout_days")
      .select("id, exercises_json")
      .eq("user_id", userId);
    if (error) throw new Error(error.message);

    let updatedDays = 0;

    for (const row of days ?? []) {
      const list = Array.isArray(row.exercises_json)
        ? (row.exercises_json as unknown as Record<string, unknown>[])
        : [];
      let changed = false;

      for (const ex of list) {
        const imgs = Array.isArray(ex.images) ? (ex.images as string[]) : [];
        const yt = typeof ex.youtubeLink === "string" ? ex.youtubeLink : "";
        const needsImages = imgs.length === 0;
        const needsYt = !yt;
        if (!needsImages && !needsYt) continue;

        const name = String(ex.name ?? "");
        const equipment = (ex.equipment as string | null | undefined) ?? null;
        const primaryMuscles = Array.isArray(ex.primaryMuscles)
          ? (ex.primaryMuscles as string[])
          : [];

        let matched = false;
        try {
          const match = await findExercise({
            name,
            muscle: primaryMuscles[0],
            equipment: equipment ?? undefined,
          });
          if (match) {
            if (needsImages && match.images.length > 0) {
              ex.images = match.images;
              changed = true;
            }
            if (needsYt && match.youtubeLink) {
              ex.youtubeLink = match.youtubeLink;
              changed = true;
              matched = true;
            }
          }
        } catch {
          // ignore; fall through to synthetic YT link
        }

        if (needsYt && !matched && !ex.youtubeLink) {
          ex.youtubeLink = serverYouTubeSearchUrl(name, equipment);
          changed = true;
        }
      }

      if (changed) {
        const { error: uErr } = await supabase
          .from("workout_days")
          .update({ exercises_json: list as unknown as Json })
          .eq("id", row.id)
          .eq("user_id", userId);
        if (!uErr) updatedDays += 1;
      }
    }

    return { updatedDays };
  });
