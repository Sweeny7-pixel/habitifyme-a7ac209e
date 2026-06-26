import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { getWeekDiet, getAllWeeks } from "@/lib/gym.functions";
import { Utensils, Flame, Loader2, Dumbbell, Moon, RefreshCw, Coffee, Soup, Apple, ChefHat, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/diet")({
  head: () => ({
    meta: [
      { title: "Diet — GymBuddy" },
      { name: "description", content: "Your 7-day India-friendly diet plan, tuned for workout and rest days." },
    ],
  }),
  component: DietPage,
});

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
type DayName = (typeof DAYS)[number];

type Meal = { items: string[]; approxCalories: number };
type DietDay = {
  day: DayName;
  isWorkoutDay: boolean;
  meals: { breakfast: Meal; lunch: Meal; eveningSnack: Meal; dinner: Meal };
  totalApproxCalories: number;
  proteinNote: string;
};
type SevenDayDiet = { days: DietDay[] };

function isSevenDayDiet(value: unknown): value is SevenDayDiet {
  const v = value as { days?: unknown } | null;
  return !!v && Array.isArray(v.days) && v.days.length === 7 && !!(v.days[0] as DietDay)?.meals;
}

function todayIndex() {
  const js = new Date().getDay();
  return (js + 6) % 7;
}

function DietPage() {
  const getAllWeeksFn = useServerFn(getAllWeeks);
  const allQ = useQuery({ queryKey: ["allWeeksDiet"], queryFn: () => getAllWeeksFn() });

  const weeks = useMemo(() => (allQ.data?.weeks ?? []).slice().sort((a, b) => a.week_number - b.week_number), [allQ.data]);
  const defaultWeekId = useMemo(() => {
    const active = weeks.find((w) => w.status === "active");
    return active?.id ?? weeks[weeks.length - 1]?.id ?? null;
  }, [weeks]);

  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);
  const weekId = selectedWeekId ?? defaultWeekId;

  if (allQ.isLoading) return <CenterSpinner label="Loading your diet plan…" />;
  if (!weeks.length) {
    return (
      <EmptyState
        title="No diet plan yet"
        body="Generate your first week and your 7-day diet plan will show up here."
        cta={<Link to="/home" className="glass-btn glass-btn-sm">Go to home</Link>}
      />
    );
  }

  return (
    <div className="space-y-4 pt-2">
      <header>
        <h1 className="text-[22px] font-extrabold tracking-tight text-[var(--text-primary)] leading-tight">
          7-day Indian plan 🍛
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">Workout-day vs rest-day meals tuned to your goal.</p>
      </header>

      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
        {weeks.map((w) => {
          const active = w.id === weekId;
          return (
            <button
              key={w.id}
              onClick={() => setSelectedWeekId(w.id)}
              className="glass-pill whitespace-nowrap px-4 py-2"
              style={
                active
                  ? {
                      background: "rgba(255,107,53,0.15)",
                      borderColor: "rgba(255,107,53,0.40)",
                      color: "var(--neon-orange)",
                      boxShadow: "0 0 16px rgba(255,107,53,0.20)",
                    }
                  : undefined
              }
            >
              Week {w.week_number}
            </button>
          );
        })}
      </div>

      {weekId && <WeekDietView weekId={weekId} />}
    </div>
  );
}

function WeekDietView({ weekId }: { weekId: string }) {
  const qc = useQueryClient();
  const getDietFn = useServerFn(getWeekDiet);
  const dietQ = useQuery({
    queryKey: ["weekDiet", weekId],
    queryFn: () => getDietFn({ data: { weekId } }),
    retry: 1,
  });

  const [dayIdx, setDayIdx] = useState<number>(() => todayIndex());

  if (dietQ.isLoading || dietQ.isFetching) return <CenterSpinner label="Generating your diet plan…" />;
  if (dietQ.isError) {
    return (
      <div className="glass-card glass-card-red text-sm text-[var(--text-primary)]">
        Couldn't load your diet plan. {(dietQ.error as Error)?.message}
        <button onClick={() => dietQ.refetch()} className="glass-btn glass-btn-sm mt-3">
          Try again
        </button>
      </div>
    );
  }
  if (!dietQ.data) return <EmptyState title="No diet for this week" body="Try selecting another week." />;

  const diet = dietQ.data.diet as SevenDayDiet | undefined;
  if (!diet || !isSevenDayDiet(diet)) {
    return (
      <div className="glass-card">
        <p className="font-bold text-[var(--text-primary)]">Upgrade to the new 7-day plan?</p>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Your old plan was a single daily target. The new plan gives you Mon–Sun meals tuned for workout vs rest days.
        </p>
        <button
          onClick={async () => {
            await getDietFn({ data: { weekId, regenerate: true } });
            qc.invalidateQueries({ queryKey: ["weekDiet", weekId] });
          }}
          className="glass-btn glass-btn-sm mt-3"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Generate 7-day plan
        </button>
      </div>
    );
  }

  const day = diet.days[dayIdx];
  const isToday = dayIdx === todayIndex();
  const KCAL_TARGET = 2500;
  const kcalPct = Math.min(1, day.totalApproxCalories / KCAL_TARGET);
  const proteinG = Math.round((day.totalApproxCalories * 0.30) / 4);
  const carbsG = Math.round((day.totalApproxCalories * 0.45) / 4);
  const fatG = Math.round((day.totalApproxCalories * 0.25) / 9);

  return (
    <div className="space-y-4">
      {/* Day strip */}
      <div className="grid grid-cols-7 gap-1.5">
        {DAY_SHORT.map((label, i) => {
          const active = i === dayIdx;
          const isWorkout = diet.days[i]?.isWorkoutDay;
          return (
            <button
              key={label}
              onClick={() => setDayIdx(i)}
              className={`glass-day-btn ${active ? "glass-day-btn-active" : ""}`}
            >
              <div className={`text-[9px] font-bold uppercase tracking-wider ${active ? "text-[var(--neon-orange)]" : "text-[var(--text-muted)]"}`}>
                {label}
              </div>
              <span
                className="glass-macro-dot mt-1"
                style={{ background: isWorkout ? "var(--neon-orange)" : "transparent" }}
              />
            </button>
          );
        })}
      </div>

      {/* Day badge */}
      <div className="flex items-center gap-2 flex-wrap">
        {day.isWorkoutDay ? (
          <span className="focus-pill"><Dumbbell className="h-3.5 w-3.5" /> Workout day</span>
        ) : (
          <span className="glass-pill"><Moon className="h-3 w-3" /> Rest day</span>
        )}
        {isToday && <span className="glass-pill">Today</span>}
        <span className="ml-auto text-[11px] font-semibold text-[var(--text-secondary)]">{day.day}</span>
      </div>

      {/* Calorie donut + macro pills */}
      <div className="glass-card glass-card-amber flex items-center gap-4">
        <CalorieDonut value={day.totalApproxCalories} target={KCAL_TARGET} pct={kcalPct} />
        <div className="flex flex-1 flex-col gap-2">
          <MacroPill color="var(--neon-green)" label="Protein" value={`${proteinG}g`} />
          <MacroPill color="var(--neon-blue)" label="Carbs" value={`${carbsG}g`} />
          <MacroPill color="var(--neon-orange)" label="Fat" value={`${fatG}g`} />
        </div>
      </div>

      {/* Meals */}
      <div className="space-y-3">
        <MealCard title="Breakfast" icon={<Coffee className="h-3.5 w-3.5" />} meal={day.meals.breakfast} />
        <MealCard title="Lunch" icon={<Soup className="h-3.5 w-3.5" />} meal={day.meals.lunch} />
        <MealCard title="Evening Snack" icon={<Apple className="h-3.5 w-3.5" />} meal={day.meals.eveningSnack} />
        <MealCard title="Dinner" icon={<ChefHat className="h-3.5 w-3.5" />} meal={day.meals.dinner} />
      </div>

      {/* Total */}
      <div className="glass-card glass-card-amber flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-[var(--neon-amber)] font-bold">
          <Flame className="h-4 w-4" /> Total today
        </div>
        <div className="text-lg font-extrabold tracking-tight text-[var(--text-primary)]">
          ~{day.totalApproxCalories} kcal
        </div>
      </div>

      {/* Protein note */}
      {day.proteinNote && (
        <div className="protein-highlight">
          💪 {day.proteinNote}
        </div>
      )}

      <button
        onClick={async () => {
          await getDietFn({ data: { weekId, regenerate: true } });
          qc.invalidateQueries({ queryKey: ["weekDiet", weekId] });
        }}
        className="glass-btn glass-btn-ghost glass-btn-sm"
      >
        <RefreshCw className="h-3.5 w-3.5" /> Regenerate this week
      </button>
    </div>
  );
}

function CalorieDonut({ value, target, pct }: { value: number; target: number; pct: number }) {
  const r = 36;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct);
  return (
    <div className="relative h-24 w-24 shrink-0">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={r} stroke="rgba(255,255,255,0.08)" strokeWidth="10" fill="none" />
        <circle
          cx="50" cy="50" r={r}
          stroke="var(--neon-amber)"
          strokeWidth="10"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ filter: "drop-shadow(0 0 6px var(--neon-amber-glow))" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-[15px] font-extrabold leading-none text-[var(--text-primary)]">{value}</div>
        <div className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
          / {target} kcal
        </div>
      </div>
    </div>
  );
}

function MacroPill({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="glass-pill flex items-center gap-2 w-full">
      <span className="glass-macro-dot" style={{ background: color }} />
      <span className="text-[var(--text-secondary)]">{label}</span>
      <span className="ml-auto font-extrabold text-[var(--text-primary)]">{value}</span>
    </div>
  );
}

function MealCard({ title, icon, meal }: { title: string; icon: React.ReactNode; meal: Meal }) {
  const [flagged, setFlagged] = useState(false);
  return (
    <div className="glass-card">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-extrabold text-[var(--text-primary)] flex items-center gap-1.5">
          <span className="text-[var(--neon-orange)]">{icon}</span> {title}
        </h3>
        <div className="flex items-center gap-1.5">
          <span className="kcal-pill">~{meal.approxCalories} kcal</span>
          <button
            type="button"
            onClick={() => {
              const next = !flagged;
              setFlagged(next);
              toast(next ? "Allergy flagged for this meal" : "Allergy flag removed");
            }}
            className="allergy-pill"
            style={flagged ? { background: "rgba(255,70,70,0.25)" } : undefined}
          >
            <AlertTriangle className="h-2.5 w-2.5" /> {flagged ? "Flagged" : "Flag"}
          </button>
        </div>
      </div>
      <ul className="mt-2.5 space-y-1.5">
        {meal.items.map((item, i) => (
          <li key={i} className="flex items-center gap-2 text-[12px] text-[var(--text-secondary)]">
            <span className="glass-macro-dot" style={{ background: "var(--neon-orange)", width: 6, height: 6 }} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CenterSpinner({ label }: { label: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
      <Loader2 className="h-6 w-6 animate-spin text-[var(--neon-orange)]" />
      <p className="text-sm text-[var(--text-secondary)]">{label}</p>
    </div>
  );
}

function EmptyState({ title, body, cta }: { title: string; body: string; cta?: React.ReactNode }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center px-4">
      <Utensils className="mb-3 h-8 w-8 text-[var(--text-muted)]" />
      <h2 className="text-lg font-extrabold text-[var(--text-primary)]">{title}</h2>
      <p className="mt-1 max-w-xs text-sm text-[var(--text-secondary)]">{body}</p>
      {cta && <div className="mt-4">{cta}</div>}
    </div>
  );
}
