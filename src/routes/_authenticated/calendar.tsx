import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { getAllPlanWeeks, getWeekDiet } from "@/lib/gym.functions";
import {
  CalendarDays,
  LayoutGrid,
  Dumbbell,
  Utensils,
  Loader2,
  Activity,
  ChevronLeft,
  ChevronRight,
  Bed,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar — GymBuddy" },
      { name: "description", content: "Your day-by-day workout and diet plan in one view." },
    ],
  }),
  component: CalendarPage,
});

const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type Exercise = { name: string; primaryMuscles?: string[]; equipment?: string | null };

function startOfWeekMon(d: Date) {
  const out = new Date(d);
  const day = out.getDay(); // 0=Sun..6=Sat
  const diff = (day + 6) % 7; // days since Monday
  out.setDate(out.getDate() - diff);
  out.setHours(0, 0, 0, 0);
  return out;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function CalendarPage() {
  const getPlanFn = useServerFn(getAllPlanWeeks);
  const planQ = useQuery({ queryKey: ["planWeeks"], queryFn: () => getPlanFn() });

  const [view, setView] = useState<"week" | "month">("week");
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);
  const [selected, setSelected] = useState<Date>(today);
  const [monthCursor, setMonthCursor] = useState<Date>(() => new Date(today.getFullYear(), today.getMonth(), 1));

  const weeks = planQ.data?.weeks ?? [];
  const days = planQ.data?.days ?? [];

  // Map calendar dates → workout day. We assume weeks[0] starts on the Monday
  // of that week's start_date, and day_index 1..N maps to consecutive days.
  // If no start_date, fall back to today's week.
  const weekStartMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof startOfWeekMon>>();
    weeks.forEach((w) => {
      const base = w.start_date ? new Date(w.start_date) : today;
      map.set(w.id, startOfWeekMon(base));
    });
    return map;
  }, [weeks, today]);

  const dateToDay = useMemo(() => {
    const map = new Map<string, (typeof days)[number]>();
    weeks.forEach((w) => {
      const start = weekStartMap.get(w.id);
      if (!start) return;
      const wDays = days.filter((d) => d.week_id === w.id).sort((a, b) => a.day_index - b.day_index);
      wDays.forEach((d, i) => {
        const dt = addDays(start, i);
        map.set(dt.toDateString(), d);
      });
    });
    return map;
  }, [weeks, days, weekStartMap]);

  // Diet preview comes from the week the selected date belongs to.
  const selectedWeek = useMemo(() => {
    for (const w of weeks) {
      const start = weekStartMap.get(w.id);
      if (!start) continue;
      const end = addDays(start, 7);
      if (selected >= start && selected < end) return w;
    }
    return weeks.find((w) => w.status === "active") ?? weeks[0] ?? null;
  }, [weeks, weekStartMap, selected]);

  const selectedDay = dateToDay.get(selected.toDateString()) ?? null;

  if (planQ.isLoading) {
    return (
      <div className="flex justify-center pt-16">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--neon-orange)]" />
      </div>
    );
  }

  if (!weeks.length) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-4">
        <CalendarDays className="mb-3 h-8 w-8 text-[var(--text-muted)]" />
        <h2 className="text-lg font-extrabold text-[var(--text-primary)]">No schedule yet</h2>
        <p className="mt-1 max-w-xs text-sm text-[var(--text-secondary)]">
          Generate your plan to see workouts and meals laid out by day.
        </p>
        <Link to="/home" className="glass-btn glass-btn-sm mt-4">Go to home</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-2">
      <header>
        <h1 className="text-[22px] font-extrabold tracking-tight text-[var(--text-primary)] leading-tight">
          Calendar
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Pick a day to see your workout and meals.
        </p>
      </header>

      {/* View toggle */}
      <div className="flex gap-2 glass-card p-1.5">
        <button
          onClick={() => setView("week")}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full py-2 text-xs font-bold transition"
          style={
            view === "week"
              ? { background: "rgba(255,107,53,0.15)", color: "var(--neon-orange)", boxShadow: "0 0 14px rgba(255,107,53,0.20)" }
              : { color: "var(--text-secondary)" }
          }
        >
          <CalendarDays className="h-3.5 w-3.5" /> Week
        </button>
        <button
          onClick={() => setView("month")}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full py-2 text-xs font-bold transition"
          style={
            view === "month"
              ? { background: "rgba(255,107,53,0.15)", color: "var(--neon-orange)", boxShadow: "0 0 14px rgba(255,107,53,0.20)" }
              : { color: "var(--text-secondary)" }
          }
        >
          <LayoutGrid className="h-3.5 w-3.5" /> Month
        </button>
      </div>

      {view === "week" ? (
        <>
          <WeekStrip selected={selected} setSelected={setSelected} dateToDay={dateToDay} today={today} />
          <WeeklyProgressCard selected={selected} dateToDay={dateToDay} />
        </>
      ) : (
        <MonthGrid
          monthCursor={monthCursor}
          setMonthCursor={setMonthCursor}
          selected={selected}
          setSelected={setSelected}
          dateToDay={dateToDay}
          today={today}
        />
      )}

      {/* Selected day cards */}
      <SelectedDayPanel
        date={selected}
        day={selectedDay}
        weekId={selectedWeek?.id ?? null}
      />
    </div>
  );
}

function WeekStrip({
  selected,
  setSelected,
  dateToDay,
  today,
}: {
  selected: Date;
  setSelected: (d: Date) => void;
  dateToDay: Map<string, { id: string; completed_at: string | null }>;
  today: Date;
}) {
  const start = useMemo(() => startOfWeekMon(selected), [selected]);
  const cells = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(start, i)), [start]);

  return (
    <div className="grid grid-cols-7 gap-1.5">
      {cells.map((d, i) => {
        const key = d.toDateString();
        const wd = dateToDay.get(key);
        const isSelected = d.toDateString() === selected.toDateString();
        const isToday = d.toDateString() === today.toDateString();
        const done = !!wd?.completed_at;
        let cls = "glass-day-btn";
        if (isSelected) cls += " glass-day-btn-active";
        else if (done) cls += " glass-day-btn-completed";
        return (
          <button key={i} onClick={() => setSelected(d)} className={cls}>
            <div className={`text-[9px] font-bold uppercase tracking-wider ${isSelected ? "text-[var(--neon-orange)]" : done ? "text-[var(--neon-green)]" : "text-[var(--text-muted)]"}`}>
              {DAY_SHORT[i]}
            </div>
            <div className={`text-[13px] font-extrabold mt-0.5 ${isSelected ? "text-[var(--text-primary)]" : done ? "text-[var(--neon-green)]" : "text-[var(--text-primary)]"}`}>
              {d.getDate()}
            </div>
            {(wd || isToday) && (
              <span
                className="glass-macro-dot mt-1"
                style={{
                  background: done ? "var(--neon-green)" : "var(--neon-orange)",
                  boxShadow: done
                    ? "0 0 6px var(--neon-green-glow)"
                    : "0 0 6px var(--neon-orange-glow)",
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

function WeeklyProgressCard({
  selected,
  dateToDay,
}: {
  selected: Date;
  dateToDay: Map<string, { id: string; completed_at: string | null }>;
}) {
  const start = useMemo(() => startOfWeekMon(selected), [selected]);
  const week = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(start, i)), [start]);
  const scheduled = week.filter((d) => dateToDay.get(d.toDateString())).length;
  const completed = week.filter((d) => dateToDay.get(d.toDateString())?.completed_at).length;
  const pct = scheduled ? Math.round((completed / scheduled) * 100) : 0;
  return (
    <div className="glass-card glass-card-orange">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
          Weekly progress
        </div>
        <div className="text-sm font-extrabold text-[var(--neon-orange)]">
          {completed}/{scheduled || 0}
        </div>
      </div>
      <div className="weekly-progress-fill">
        <div style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-2 text-[11px] text-[var(--text-secondary)]">
        {pct}% of this week's workouts logged.
      </div>
    </div>
  );
}

function MonthGrid({
  monthCursor,
  setMonthCursor,
  selected,
  setSelected,
  dateToDay,
  today,
}: {
  monthCursor: Date;
  setMonthCursor: (d: Date) => void;
  selected: Date;
  setSelected: (d: Date) => void;
  dateToDay: Map<string, { id: string; completed_at: string | null }>;
  today: Date;
}) {
  const cells = useMemo(() => {
    const first = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1);
    const startGrid = startOfWeekMon(first);
    return Array.from({ length: 42 }, (_, i) => addDays(startGrid, i));
  }, [monthCursor]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))}
          className="glass-sheet-close"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-sm font-extrabold text-[var(--text-primary)]">
          {MONTH_NAMES[monthCursor.getMonth()]} {monthCursor.getFullYear()}
        </div>
        <button
          onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))}
          className="glass-sheet-close"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_SHORT.map((d) => (
          <div key={d} className="text-[9px] font-bold text-[var(--text-muted)] uppercase text-center">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          const otherMonth = d.getMonth() !== monthCursor.getMonth();
          const key = d.toDateString();
          const wd = dateToDay.get(key);
          const isSelected = key === selected.toDateString();
          const isToday = key === today.toDateString();
          const done = !!wd?.completed_at;
          if (otherMonth) {
            return (
              <div key={i} className="min-h-[36px] grid place-items-center">
                <span className="text-[11px] text-white/15">{d.getDate()}</span>
              </div>
            );
          }
          const style: React.CSSProperties = {};
          if (isSelected) {
            style.background = "rgba(255,107,53,0.18)";
            style.boxShadow = "0 0 14px rgba(255,107,53,0.30), inset 0 0 0 1px rgba(255,107,53,0.45)";
          } else if (done) {
            style.background = "rgba(0,212,143,0.12)";
            style.boxShadow = "inset 0 0 0 1px rgba(0,212,143,0.35)";
          } else {
            style.background = "rgba(255,255,255,0.04)";
            style.boxShadow = "inset 0 0 0 1px rgba(255,255,255,0.06)";
          }
          return (
            <button
              key={i}
              onClick={() => setSelected(d)}
              className="min-h-[36px] flex flex-col items-center justify-center gap-0.5 cursor-pointer rounded-[10px] transition"
              style={style}
            >
              <span
                className={`text-[11px] font-extrabold ${
                  isSelected ? "text-[var(--neon-orange)]" : done ? "text-[var(--neon-green)]" : "text-[var(--text-primary)]"
                }`}
              >
                {d.getDate()}
              </span>
              {(wd || isToday) && (
                <span
                  className="h-1 w-1 rounded-full"
                  style={{ background: done ? "var(--neon-green)" : "var(--neon-orange)" }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SelectedDayPanel({
  date,
  day,
  weekId,
}: {
  date: Date;
  day: { id: string; title: string; focus: string | null; exercises_json: unknown; completed_at: string | null } | null;
  weekId: string | null;
}) {
  const getDietFn = useServerFn(getWeekDiet);
  const dietQ = useQuery({
    queryKey: ["weekDiet", weekId],
    queryFn: () => getDietFn({ data: { weekId: weekId! } }),
    enabled: !!weekId,
    retry: 1,
  });

  const dayOfWeek = (date.getDay() + 6) % 7; // 0=Mon
  const diet = dietQ.data?.diet as { days?: { day: string; isWorkoutDay: boolean; totalApproxCalories: number; meals: Record<string, { items: string[]; approxCalories: number }> }[] } | undefined;
  const dietForDay = diet?.days?.[dayOfWeek];

  const dateLabel = date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });

  return (
    <div className="space-y-3">
      <div className="sec-label">{dateLabel}</div>

      {/* Workout */}
      {day ? (
        <div className="glass-card">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="grid h-8 w-8 place-items-center rounded-[10px] bg-[rgba(255,107,53,0.15)] text-[var(--neon-orange)] shrink-0">
                <Dumbbell className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-extrabold text-[var(--text-primary)] truncate">{day.title}</div>
                <div className="text-[11px] text-[var(--text-secondary)] truncate">{day.focus}</div>
              </div>
            </div>
            {day.completed_at && (
              <span className="kcal-pill" style={{ background: "rgba(0,212,143,0.15)", color: "var(--neon-green)" }}>
                Done
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {(day.exercises_json as Exercise[] ?? []).slice(0, 6).map((ex, i) => (
              <span key={i} className="muscle-pill">{ex.name}</span>
            ))}
            {((day.exercises_json as Exercise[]) ?? []).length > 6 && (
              <span className="muscle-pill">+{((day.exercises_json as Exercise[]) ?? []).length - 6}</span>
            )}
          </div>
          <Link to="/day/$dayId" params={{ dayId: day.id }} className="glass-btn glass-btn-sm w-full mt-3">
            Open workout
          </Link>
        </div>
      ) : (
        <div className="glass-card flex items-center gap-3">
          <div className="grid h-8 w-8 place-items-center rounded-[10px] bg-white/5 text-[var(--text-muted)]">
            <Bed className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-extrabold text-[var(--text-primary)]">Rest day</div>
            <div className="text-[11px] text-[var(--text-secondary)]">No workout scheduled for this day.</div>
          </div>
        </div>
      )}

      {/* Diet */}
      <div className="glass-card">
        <div className="flex items-center gap-2 mb-2">
          <div className="grid h-8 w-8 place-items-center rounded-[10px] bg-[rgba(255,107,53,0.15)] text-[var(--neon-orange)]">
            <Utensils className="h-4 w-4" />
          </div>
          <div className="text-sm font-extrabold text-[var(--text-primary)]">Meals</div>
          {dietForDay && (
            <span className="ml-auto kcal-pill">~{dietForDay.totalApproxCalories} kcal</span>
          )}
        </div>
        {dietQ.isLoading || dietQ.isFetching ? (
          <div className="text-xs text-[var(--text-secondary)]">Loading meals…</div>
        ) : dietForDay ? (
          <div className="divide-y divide-white/5">
            {(["breakfast", "lunch", "eveningSnack", "dinner"] as const).map((k) => {
              const meal = dietForDay.meals[k];
              if (!meal) return null;
              const label = k === "eveningSnack" ? "Snack" : k[0].toUpperCase() + k.slice(1);
              return (
                <div key={k} className="flex items-center justify-between gap-2 py-2">
                  <div className="min-w-0">
                    <div className="text-[12px] font-bold text-[var(--text-primary)]">{label}</div>
                    <div className="text-[11px] text-[var(--text-secondary)] truncate">{meal.items.slice(0, 3).join(", ")}</div>
                  </div>
                  <span className="kcal-pill">~{meal.approxCalories}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-xs text-[var(--text-secondary)]">No diet plan for this date yet.</div>
        )}
        <Link to="/diet" className="glass-btn glass-btn-ghost glass-btn-sm w-full mt-3">
          Open diet plan
        </Link>
      </div>

      {/* Day status */}
      <div className="glass-card glass-card-orange flex items-center gap-3">
        <Activity className="h-5 w-5 text-[var(--neon-orange)]" />
        <div className="text-xs font-bold text-[var(--text-primary)]">
          {day?.completed_at
            ? "Workout completed — nice work!"
            : day
              ? "Workout pending. Log it when you're done."
              : "Active recovery suggested."}
        </div>
      </div>
    </div>
  );
}
