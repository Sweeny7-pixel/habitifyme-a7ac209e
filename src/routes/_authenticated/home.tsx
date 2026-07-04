import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, useCallback } from "react";
import {
  getProfile,
  getAllPlanWeeks,
  generateFourWeekPlan,
  generatePlanFromPrompt,
} from "@/lib/gym.functions";
import { gymCheckin } from "@/lib/checkin";
import { awardSundayPlanningXP } from "@/lib/xp";
import { getHomeHabitStats } from "@/lib/habit-stats";
import { ACHIEVEMENT_MAP } from "@/lib/achievements";
import {
  CheckCircle2,
  Circle,
  ChevronRight,
  Sparkles,
  RefreshCw,
  Utensils,
  Wand2,
  Flame,
  Target,
  Trophy,
  X,
  Zap,
  Star,
  TrendingUp,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { XpPopupManager, type XpEvent } from "@/components/XpPopup";
import { RecoveryModal, hasSeenRecoveryToday, markRecoveryDismissed } from "@/components/RecoveryModal";
import { SundayPlanningModal, isSundayEvening, hasCompletedSundayPlanningThisWeek, markSundayPlanningDone } from "@/components/SundayPlanningModal";
import { detectGap, readLastCheckin } from "@/lib/gap-detector";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "Your plan — HabitifyMe" },
      { name: "description", content: "Your 4-week training block, day by day." },
    ],
  }),
  component: HomePage,
});

type DietJson = {
  daily_calories: number;
  daily_protein_g: number;
  notes: string;
  meals: { name: string; items: string }[];
};

type Meal = { items: string[]; approxCalories: number };
type DietDay = {
  day: string;
  isWorkoutDay: boolean;
  meals: {
    breakfast: Meal;
    lunch: Meal;
    eveningSnack: Meal;
    dinner: Meal;
  };
  totalApproxCalories: number;
  proteinNote: string;
};
type SevenDayDiet = { days: DietDay[] };

function getTodayDietStats(dietJson: unknown): {
  calories: number | null;
  proteinG: number | null;
  isNewFormat: boolean;
} {
  if (!dietJson) return { calories: null, proteinG: null, isNewFormat: false };
  const asNew = dietJson as SevenDayDiet;
  if (Array.isArray(asNew?.days) && asNew.days.length === 7) {
    const jsDay = new Date().getDay();
    const idx = (jsDay + 6) % 7;
    const today = asNew.days[idx];
    if (today) {
      const kcal = today.totalApproxCalories;
      const proteinG = Math.round((kcal * 0.3) / 4);
      return { calories: kcal, proteinG, isNewFormat: true };
    }
  }
  const asOld = dietJson as { daily_calories?: number; daily_protein_g?: number };
  if (asOld?.daily_calories) {
    return {
      calories: asOld.daily_calories,
      proteinG: asOld.daily_protein_g ?? null,
      isNewFormat: false,
    };
  }
  return { calories: null, proteinG: null, isNewFormat: false };
}

function HomePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const getProfileFn = useServerFn(getProfile);
  const getAllFn = useServerFn(getAllPlanWeeks);
  const generateFn = useServerFn(generateFourWeekPlan);
  const generatePromptFn = useServerFn(generatePlanFromPrompt);
  const gymCheckinFn = useServerFn(gymCheckin);
  const awardSundayPlanningXPFn = useServerFn(awardSundayPlanningXP);
  const getHabitStatsFn = useServerFn(getHomeHabitStats);

  const profileQ = useQuery({ queryKey: ["profile"], queryFn: () => getProfileFn() });
  const planQ = useQuery({ queryKey: ["planWeeks"], queryFn: () => getAllFn() });
  const habitStatsQ = useQuery({
    queryKey: ["homeHabitStats"],
    queryFn: () => getHabitStatsFn(),
    staleTime: 60_000,
  });

  // XP popup queue
  const [xpEvents, setXpEvents] = useState<XpEvent[]>([]);
  const pushXpEvent = useCallback((xp: number, bonus: boolean) => {
    setXpEvents((prev) => [
      ...prev,
      { id: crypto.randomUUID(), xp, bonus },
    ]);
  }, []);
  const removeXpEvent = useCallback((id: string) => {
    setXpEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  // Recovery / Sunday modals
  const [showRecovery, setShowRecovery] = useState(false);
  const [showSunday, setShowSunday] = useState(false);

  useEffect(() => {
    if (profileQ.isSuccess && !profileQ.data) navigate({ to: "/onboarding" });
  }, [profileQ.isSuccess, profileQ.data, navigate]);

  // Detect 3–6 day gap for recovery modal
  useEffect(() => {
    const gap = detectGap(readLastCheckin());
    if ((gap.tier === "short" || gap.tier === "medium") && (gap.daysMissed ?? 0) >= 3) {
      if (!hasSeenRecoveryToday()) setShowRecovery(true);
    }
  }, []);

  // Sunday planning modal
  useEffect(() => {
    if (isSundayEvening() && !hasCompletedSundayPlanningThisWeek()) {
      setShowSunday(true);
    }
  }, []);

  const [selectedWeekNum, setSelectedWeekNum] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");

  const generate = useMutation({
    mutationFn: async () => generateFn(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["planWeeks"] });
      qc.invalidateQueries({ queryKey: ["currentWeek"] });
      setSelectedWeekNum(null);
      setConfirmOpen(false);
      toast.success("Your 4-week plan is ready!");
    },
    onError: (e: Error) => {
      setConfirmOpen(false);
      toast.error(e.message);
    },
  });

  const generateFromPrompt = useMutation({
    mutationFn: async (prompt: string) => generatePromptFn({ data: { prompt } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["planWeeks"] });
      qc.invalidateQueries({ queryKey: ["currentWeek"] });
      setSelectedWeekNum(null);
      setPromptOpen(false);
      setCustomPrompt("");
      toast.success("Custom plan generated!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const checkinMutation = useMutation({
    mutationFn: () => gymCheckinFn({ data: {} }),
    onSuccess: (res) => {
      if (res.alreadyCheckedIn) {
        toast.info("Already checked in today 👍");
        return;
      }
      qc.invalidateQueries({ queryKey: ["homeHabitStats"] });
      pushXpEvent(res.xpAwarded, res.bonusTriggered);
      toast.success("Gym check-in logged! 💪");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sundayPlanMutation = useMutation({
    mutationFn: () => awardSundayPlanningXPFn(),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["homeHabitStats"] });
      if (!res.alreadyAwarded) pushXpEvent(res.xpAwarded, res.bonusTriggered);
    },
  });

  const weeks = useMemo(() => planQ.data?.weeks ?? [], [planQ.data]);
  const days = planQ.data?.days ?? [];

  const activeWeek = useMemo(() => {
    if (weeks.length === 0) return null;
    const sel =
      selectedWeekNum != null
        ? weeks.find((w) => w.week_number === selectedWeekNum)
        : weeks.find((w) => w.status === "active") ?? weeks[0];
    return sel ?? weeks[0];
  }, [weeks, selectedWeekNum]);

  const activeDays = useMemo(
    () => days.filter((d) => activeWeek && d.week_id === activeWeek.id),
    [days, activeWeek],
  );

  if (profileQ.isLoading || planQ.isLoading) {
    return (
      <div className="space-y-3 pt-3">
        <div className="h-7 w-32 animate-pulse rounded bg-white/5" />
        <div className="h-20 w-full animate-pulse rounded-2xl bg-white/5" />
        <div className="h-16 w-full animate-pulse rounded-xl bg-white/5" />
      </div>
    );
  }

  if (weeks.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-4">
        <div className="grid h-14 w-14 place-items-center rounded-[18px] bg-[var(--neon-orange)] text-white shadow-[0_0_24px_rgba(255,107,53,0.45)] mb-4">
          <Sparkles className="h-7 w-7" />
        </div>
        <h2 className="text-lg font-extrabold text-[var(--text-primary)]">No plan yet</h2>
        <p className="mt-1 max-w-xs text-sm text-[var(--text-secondary)]">
          Generate a personalized 4-week training plan based on your profile.
        </p>
        <button
          disabled={generate.isPending}
          onClick={() => generate.mutate()}
          className="glass-btn mt-5 max-w-xs"
        >
          {generate.isPending ? "Generating…" : "Generate 4-week plan"}
        </button>
      </div>
    );
  }

  if (!activeWeek) return null;
  const diet = activeWeek.diet_json as DietJson | null;
  const dietStats = getTodayDietStats(activeWeek.diet_json);
  const totalDays = activeDays.length;
  const doneDays = activeDays.filter((d) => d.completed_at).length;
  const allDone = doneDays === totalDays && totalDays > 0;
  const monthName = new Date().toLocaleString(undefined, { month: "long" });

  const stats = habitStatsQ.data;
  const checkedInToday = stats?.checkedInToday ?? false;

  return (
    <div className="space-y-4 pt-2">
      {/* XP Popup overlay */}
      <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[100] pointer-events-none">
        <XpPopupManager events={xpEvents} onRemove={removeXpEvent} />
      </div>

      {/* Greeting */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[22px] font-extrabold tracking-tight text-[var(--text-primary)] leading-tight">
            {profileQ.data?.name ? `Hey ${profileQ.data.name} 👋` : "Hey there 👋"}
          </h1>
          <span className="glass-pill mt-1.5">
            Week {activeWeek.week_number} · {monthName}
          </span>
        </div>
        <div className="flex shrink-0 flex-col gap-1.5">
          <button
            onClick={() => setPromptOpen(true)}
            disabled={generateFromPrompt.isPending}
            className="glass-btn glass-btn-ghost glass-btn-sm"
            title="Generate from prompt"
          >
            <Wand2 className="h-3.5 w-3.5" /> Prompt
          </button>
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={generate.isPending}
            className="glass-btn glass-btn-ghost glass-btn-sm"
            title="Regenerate"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${generate.isPending ? "animate-spin" : ""}`}
            />
            Reset
          </button>
        </div>
      </div>

      {/* Streak hero + Check-in */}
      <div className="glass-card glass-card-orange relative flex items-center gap-3.5">
        <div className="flame-halo">
          <Flame className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-lg font-extrabold tracking-tight text-[var(--text-primary)]">
            {stats?.currentStreak ?? 0} day streak
          </div>
          <div className="text-xs text-[var(--text-secondary)] mt-0.5">
            {(stats?.currentStreak ?? 0) === 0
              ? "Start your streak — do today's workout"
              : `Longest: ${stats?.longestStreak ?? 0} days · ${doneDays}/${totalDays} this week`}
          </div>
        </div>
        {/* Gym Check-in button */}
        <button
          onClick={() => checkinMutation.mutate()}
          disabled={checkinMutation.isPending || checkedInToday}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-extrabold transition-all ${
            checkedInToday
              ? "bg-[rgba(0,229,160,0.15)] text-[var(--neon-green)] border border-[rgba(0,229,160,0.35)]"
              : "bg-[rgba(255,107,53,0.18)] text-[var(--neon-orange)] border border-[rgba(255,107,53,0.45)] hover:bg-[rgba(255,107,53,0.28)]"
          }`}
          title={checkedInToday ? "Checked in today" : "Gym check-in (+20 XP)"}
        >
          {checkedInToday ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <MapPin className="h-4 w-4" />
          )}
          {checkedInToday ? "In" : "Check-in"}
        </button>
        <span
          className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider"
          style={{
            background: "rgba(255,184,48,0.12)",
            borderColor: "rgba(255,184,48,0.35)",
            color: "var(--neon-amber)",
          }}
        >
          <Trophy className="h-2.5 w-2.5" /> Personal best
        </span>
      </div>

      {/* XP Level Card */}
      {stats && (
        <div className="glass-card p-3.5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div
                className="grid h-7 w-7 place-items-center rounded-lg text-xs font-extrabold"
                style={{
                  background: "rgba(166,123,255,0.15)",
                  border: "1px solid rgba(166,123,255,0.35)",
                  color: "var(--neon-purple)",
                }}
              >
                {stats.level}
              </div>
              <div>
                <div className="text-xs font-extrabold text-[var(--text-primary)]">
                  {stats.title}
                </div>
                <div className="text-[10px] text-[var(--text-muted)]">
                  {stats.totalXP.toLocaleString()} XP total · {stats.weeklyXP} this week
                </div>
              </div>
            </div>
            <div
              className="text-xs font-extrabold"
              style={{ color: "var(--neon-purple)" }}
            >
              {stats.progress}%
            </div>
          </div>
          <div className="prog-bar">
            <div
              className="h-full transition-all"
              style={{
                width: `${stats.progress}%`,
                background: "var(--neon-purple)",
                boxShadow: "0 0 10px rgba(166,123,255,0.45)",
              }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-[var(--text-muted)]">
              {stats.currentXP} / {stats.nextLevelXP} XP to Level {stats.level + 1}
            </span>
          </div>
        </div>
      )}

      {/* Metric grid */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="glass-card glass-card-green p-3">
          <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Workouts
          </div>
          <div className="mt-1 text-xl font-extrabold tracking-tight text-[var(--neon-green)]">
            {doneDays}
            <span className="text-sm text-[var(--text-secondary)]">/{totalDays}</span>
          </div>
        </div>
        <div className="glass-card glass-card-amber p-3">
          <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Calories
          </div>
          <div className="mt-1 text-xl font-extrabold tracking-tight text-[var(--neon-amber)]">
            {dietStats.calories ?? "—"}
          </div>
        </div>
        {/* Habit Score */}
        {stats && (
          <div className="glass-card p-3" style={{ background: "rgba(77,158,255,0.06)" }}>
            <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Habit
            </div>
            <div
              className="mt-1 text-xl font-extrabold tracking-tight"
              style={{ color: stats.segment.color }}
            >
              {stats.habitScore}
            </div>
            <div className="text-[8px] text-[var(--text-muted)] mt-0.5 leading-none">
              {stats.segment.label}
            </div>
          </div>
        )}
      </div>

      {/* Focus */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="focus-pill">
          <Target className="h-3.5 w-3.5" />{" "}
          {activeWeek.plan_summary?.slice(0, 38) ?? "Your focus"}
        </span>
        {stats && stats.segment.label !== "Building" && (
          <span
            className="glass-pill text-[10px]"
            style={{ color: stats.segment.color, borderColor: `${stats.segment.color}44` }}
          >
            <TrendingUp className="h-3 w-3" /> {stats.segment.label}
          </span>
        )}
      </div>

      {/* Recent Achievements strip */}
      {stats && stats.recentAchievements.length > 0 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
          {stats.recentAchievements.map((a) => {
            const def = ACHIEVEMENT_MAP.get(a.achievement_key);
            if (!def) return null;
            return (
              <div
                key={a.achievement_key}
                className="flex items-center gap-1.5 shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold"
                style={{
                  background: "rgba(255,184,48,0.10)",
                  border: "1px solid rgba(255,184,48,0.30)",
                  color: "var(--neon-amber)",
                }}
                title={def.description}
              >
                <span>{def.icon}</span>
                <span>{def.label}</span>
              </div>
            );
          })}
          <Link
            to="/profile"
            className="flex items-center gap-1 shrink-0 rounded-xl px-3 py-1.5 text-[10px] text-[var(--text-muted)]"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <Star className="h-3 w-3" /> All badges
          </Link>
        </div>
      )}

      {/* Week switcher */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
        {weeks.map((w) => {
          const isActive = activeWeek.id === w.id;
          const wDays = days.filter((d) => d.week_id === w.id);
          const wDone = wDays.filter((d) => d.completed_at).length;
          return (
            <button
              key={w.id}
              onClick={() => setSelectedWeekNum(w.week_number)}
              className={`glass-day-btn min-w-[68px] ${isActive ? "glass-day-btn-active" : ""}`}
            >
              <div className="text-[9px] font-bold uppercase tracking-wider opacity-70">Week</div>
              <div className="text-base font-extrabold mt-0.5">{w.week_number}</div>
              <div className="text-[9px] opacity-80 mt-0.5">
                {wDone}/{wDays.length}
              </div>
            </button>
          );
        })}
      </div>

      {/* Progress */}
      <div className="glass-card">
        <div className="flex items-center justify-between text-sm">
          <span className="font-bold text-[var(--text-primary)]">
            Progress · Week {activeWeek.week_number}
          </span>
          <span className="text-[var(--neon-orange)] font-extrabold">
            {totalDays ? Math.round((doneDays / totalDays) * 100) : 0}%
          </span>
        </div>
        <div className="prog-bar mt-2">
          <div
            className="h-full bg-[var(--neon-orange)] shadow-[0_0_12px_var(--neon-orange-glow)] transition-all"
            style={{ width: totalDays ? `${(doneDays / totalDays) * 100}%` : "0%" }}
          />
        </div>
      </div>

      {/* Days */}
      <section>
        <div className="sec-label mb-2">Training days</div>
        <div className="glass-card divide-y divide-dashed divide-white/10 p-0">
          {activeDays.map((d, i) => {
            const done = !!d.completed_at;
            const exCount = Array.isArray(d.exercises_json) ? d.exercises_json.length : 0;
            return (
              <Link
                key={d.id}
                to="/day/$dayId"
                params={{ dayId: d.id }}
                className="day-row flex items-center gap-3 px-4 py-3.5 first:rounded-t-[20px] last:rounded-b-[20px]"
              >
                {done ? (
                  <CheckCircle2 className="h-5 w-5 text-[var(--neon-green)] shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-[var(--text-muted)] shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[var(--text-primary)] truncate">{d.title}</p>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                    {d.focus} · {exCount} exercises
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-[var(--text-muted)] shrink-0" />
                <span className="sr-only">{i}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {allDone && activeWeek.status === "active" && (
        <Link to="/review/$weekId" params={{ weekId: activeWeek.id }} className="block">
          <div className="glass-card glass-card-orange flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--neon-orange)]" />
            <span className="text-sm font-bold text-[var(--neon-orange)]">
              Week done — submit review +40 XP →
            </span>
          </div>
        </Link>
      )}

      {/* Diet preview */}
      {(dietStats.calories || diet) && (
        <section>
          <div className="sec-label mb-2 flex items-center gap-1.5">
            <Utensils className="h-3.5 w-3.5" /> Today's diet target
          </div>
          <div className="glass-card">
            <div className="grid grid-cols-2 gap-3">
              <div className="glass-stat">
                <div className="text-[22px] font-extrabold text-[var(--text-primary)]">
                  {dietStats.calories ?? diet?.daily_calories ?? "—"}
                </div>
                <div className="sec-label mt-1">Kcal</div>
              </div>
              <div className="glass-stat">
                <div className="text-[22px] font-extrabold text-[var(--text-primary)]">
                  {dietStats.proteinG
                    ? `${dietStats.proteinG}g`
                    : diet?.daily_protein_g
                      ? `${diet.daily_protein_g}g`
                      : "—"}
                </div>
                <div className="sec-label mt-1">Protein</div>
              </div>
            </div>
            {diet?.notes && (
              <p className="mt-3 text-xs text-[var(--text-secondary)] leading-relaxed">
                {diet.notes}
              </p>
            )}
            <Link to="/diet" className="glass-btn glass-btn-ghost glass-btn-sm mt-3 w-full">
              View 7-day diet plan
            </Link>
          </div>
        </section>
      )}

      {/* XP tip strip */}
      <div
        className="rounded-2xl px-4 py-3 flex items-center gap-2"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <Zap className="h-3.5 w-3.5 shrink-0 text-[var(--neon-amber)]" />
        <p className="text-[11px] text-[var(--text-muted)] leading-snug">
          Earn XP: workout +50 · check-in +20 · weekly review +40 · 10% chance of a surprise bonus!
        </p>
      </div>

      {/* Confirm regenerate modal */}
      {confirmOpen && (
        <Modal onClose={() => setConfirmOpen(false)} title="Regenerate 4-week plan?">
          <p className="text-sm text-[var(--text-secondary)]">
            This replaces your upcoming weeks with a freshly generated plan. Completed weeks stay in
            your history.
          </p>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setConfirmOpen(false)}
              className="glass-btn glass-btn-ghost flex-1"
            >
              Cancel
            </button>
            <button
              disabled={generate.isPending}
              onClick={() => generate.mutate()}
              className="glass-btn flex-[2]"
            >
              {generate.isPending ? "Generating…" : "Yes, regenerate"}
            </button>
          </div>
        </Modal>
      )}

      {/* Custom prompt modal */}
      {promptOpen && (
        <Modal
          onClose={() => {
            setPromptOpen(false);
            setCustomPrompt("");
          }}
          title="Generate from a prompt"
        >
          <p className="text-sm text-[var(--text-secondary)]">
            Describe the plan you want. We'll match each exercise against the real exercise catalog
            (images + form videos).
          </p>
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            rows={4}
            maxLength={500}
            placeholder="create a beginner friendly 5 day gym workout plan, include exercises, reps, sets and rest time"
            className="glass-input mt-3"
          />
          <p className="mt-1 text-right text-[10px] text-[var(--text-muted)]">
            {customPrompt.length}/500
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => {
                setPromptOpen(false);
                setCustomPrompt("");
              }}
              className="glass-btn glass-btn-ghost flex-1"
            >
              Cancel
            </button>
            <button
              disabled={generateFromPrompt.isPending || customPrompt.trim().length < 10}
              onClick={() => generateFromPrompt.mutate(customPrompt.trim())}
              className="glass-btn flex-[2]"
            >
              {generateFromPrompt.isPending ? "Generating…" : "Generate plan"}
            </button>
          </div>
        </Modal>
      )}

      {/* Recovery modal (3–6 day gap) */}
      {showRecovery && (
        <RecoveryModal
          daysMissed={detectGap(readLastCheckin()).daysMissed ?? 3}
          onClose={() => {
            markRecoveryDismissed();
            setShowRecovery(false);
          }}
        />
      )}

      {/* Sunday planning modal */}
      {showSunday && (
        <SundayPlanningModal
          onClose={() => {
            markSundayPlanningDone();
            setShowSunday(false);
          }}
          onConfirm={async () => {
            markSundayPlanningDone();
            await sundayPlanMutation.mutateAsync();
            setShowSunday(false);
            toast.success("Plan confirmed! +30 XP 🎉");
          }}
        />
      )}
    </div>
  );
}

function Modal({
  onClose,
  title,
  children,
}: {
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass-modal-overlay" onClick={onClose}>
      <div className="glass-bottom-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="glass-sheet-handle" />
        <div className="mb-3 flex items-start justify-between gap-2">
          <h3 className="text-base font-extrabold text-[var(--text-primary)]">{title}</h3>
          <button onClick={onClose} className="glass-sheet-close" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
