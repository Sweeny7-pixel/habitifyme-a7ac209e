import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
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
      { title: "Calendar — HabitifyMe" },
      { name: "description", content: "Your day-by-day workout and diet plan in one view." },
    ],
  }),
  component: CalendarPage,
});

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
// Month grid stays conventionally Monday-first for the calendar-style layout.
const MONTH_DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type Exercise = { name: string; primaryMuscles?: string[]; equipment?: string | null };

/** Weekday short label for a Date object, e.g. "Sat". */
function weekdayShortLabel(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

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

/** Parse a `YYYY-MM-DD` from the DB as a local-midnight Date so `.toDateString()`
 * matches user-facing calendar cells. */
function parseDbDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map((n) => parseInt(n, 10));
  return new Date(y, (m ?? 1) - 1, d ?? 1);
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

  // Week-strip navigation (Prev/Next/dots above the day pills).
  const [viewWeekNum, setViewWeekNum] = useState<number | null>(null);
  useEffect(() => {
    if (viewWeekNum != null || weeks.length === 0) return;
    const active = weeks.find((w) => w.status === "active");
    setViewWeekNum(active?.week_number ?? weeks[0].week_number);
  }, [weeks, viewWeekNum]);
  const totalWeeks = weeks.length;
  const currentViewWeek = weeks.find((w) => w.week_number === viewWeekNum) ?? null;

  // Rolling-week model: each workout day carries its own `workout_date`
  // (set at generation time). We still keep a per-week "Monday of week"
  // anchor for the week strip UI, derived from `weeks.start_date`.
  const weekStartMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof startOfWeekMon>>();
    weeks.forEach((w) => {
      const base = w.start_date ? parseDbDate(w.start_date) : today;
      map.set(w.id, startOfWeekMon(base));
    });
    return map;
  }, [weeks, today]);

  const dateToDay = useMemo(() => {
    const map = new Map<string, (typeof days)[number]>();
    weeks.forEach((w) => {
      const weekStart = w.start_date ? parseDbDate(w.start_date) : null;
      const wDays = days.filter((d) => d.week_id === w.id).sort((a, b) => a.day_index - b.day_index);
      wDays.forEach((d) => {
        // Prefer the explicit workout_date (rolling-week rows); fall back to
        // start_date + (day_index - 1) for legacy rows without workout_date.
        const dt = d.workout_date
          ? parseDbDate(d.workout_date)
          : weekStart
            ? addDays(weekStart, Math.max(0, d.day_index - 1))
            : null;
        if (!dt) return;
        map.set(dt.toDateString(), d);
      });
    });
    return map;
  }, [weeks, days]);

  // Diet preview comes from the week the selected date belongs to. We compare
  // against the actual 7-day window starting at `start_date` rather than the
  // Monday-anchored strip window.
  const selectedWeek = useMemo(() => {
    for (const w of weeks) {
      if (!w.start_date) continue;
      const start = parseDbDate(w.start_date);
      const end = addDays(start, 7);
      if (selected >= start && selected < end) return w;
    }
    return weeks.find((w) => w.status === "active") ?? weeks[0] ?? null;
  }, [weeks, selected]);

  const selectedDay = dateToDay.get(selected.toDateString()) ?? null;

  // Anchor date the week strip should be centred on: the Monday of the
  // currently-viewed week (falls back to the selected date).
  const stripAnchor = useMemo(() => {
    if (!currentViewWeek) return selected;
    const start = weekStartMap.get(currentViewWeek.id);
    return start ?? selected;
  }, [currentViewWeek, weekStartMap, selected]);

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
          {totalWeeks > 0 && viewWeekNum != null && (
            <WeekNav
              viewWeek={viewWeekNum}
              totalWeeks={totalWeeks}
              weeks={weeks}
              onChange={(n: number) => {
                setViewWeekNum(n);
                const w = weeks.find((x) => x.week_number === n);
                const start = w ? weekStartMap.get(w.id) : null;
                if (start) setSelected(start);
              }}
            />
          )}
          <WeekStrip anchor={stripAnchor} selected={selected} setSelected={setSelected} dateToDay={dateToDay} today={today} />
          <WeeklyProgressCard anchor={stripAnchor} dateToDay={dateToDay} />
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
        weekStartDate={selectedWeek?.start_date ?? null}
      />
    </div>
  );
}

function WeekNav({
  viewWeek,
  totalWeeks,
  weeks,
  onChange,
}: {
  viewWeek: number;
  totalWeeks: number;
  weeks: { week_number: number; status: string }[];
  onChange: (n: number) => void;
}) {
  const canPrev = viewWeek > 1;
  const canNext = viewWeek < totalWeeks;
  return (
    <div className="glass-card p-2.5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => canPrev && onChange(viewWeek - 1)}
          disabled={!canPrev}
          aria-label="Previous week"
          className="inline-flex items-center gap-1 text-xs font-bold text-[var(--text-secondary)] disabled:opacity-30"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Prev
        </button>
        <span className="text-xs font-extrabold text-[var(--neon-orange)]">
          Week {viewWeek} of {totalWeeks}
        </span>
        <button
          type="button"
          onClick={() => canNext && onChange(viewWeek + 1)}
          disabled={!canNext}
          aria-label="Next week"
          className="inline-flex items-center gap-1 text-xs font-bold text-[var(--text-secondary)] disabled:opacity-30"
        >
          Next <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
      {totalWeeks > 1 && (
        <div className="mt-2 flex justify-center gap-1.5">
          {weeks.map((w) => {
            const isView = w.week_number === viewWeek;
            const done = w.status === "completed";
            return (
              <button
                key={w.week_number}
                type="button"
                aria-label={`Go to week ${w.week_number}`}
                onClick={() => onChange(w.week_number)}
                className="h-2 w-2 rounded-full transition"
                style={{
                  background: isView
                    ? "var(--neon-orange)"
                    : done
                      ? "var(--neon-green)"
                      : "rgba(255,255,255,0.18)",
                  transform: isView ? "scale(1.4)" : undefined,
                  boxShadow: isView ? "0 0 8px var(--neon-orange-glow)" : undefined,
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function WeekStrip({
  /* anchor day used as the Monday-of-week origin for the strip */
  anchor,
  selected,
  setSelected,
  dateToDay,
  today,
}: {
  anchor: Date;
  selected: Date;
  setSelected: (d: Date) => void;
  dateToDay: Map<string, { id: string; completed_at: string | null }>;
  today: Date;
}) {
  const start = useMemo(() => startOfWeekMon(anchor), [anchor]);
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
  anchor,
  dateToDay,
}: {
  anchor: Date;
  dateToDay: Map<string, { id: string; completed_at: string | null }>;
}) {
  const start = useMemo(() => startOfWeekMon(anchor), [anchor]);
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
  weekStartDate,
}: {
  date: Date;
  day: { id: string; title: string; focus: string | null; exercises_json: unknown; completed_at: string | null } | null;
  weekId: string | null;
  weekStartDate: string | null;
}) {
  const getDietFn = useServerFn(getWeekDiet);
  const dietQ = useQuery({
    queryKey: ["weekDiet", weekId],
    queryFn: () => getDietFn({ data: { weekId: weekId! } }),
    enabled: !!weekId,
    retry: 1,
  });

  // Diet is a 7-entry array indexed by position within the week (Day 1..7),
  // measured from the week's own start_date. Falls back to Monday-anchored
  // index for legacy weeks with no start_date.
  const dayOffset = useMemo(() => {
    if (weekStartDate) {
      const start = parseDbDate(weekStartDate);
      const diff = Math.round((date.getTime() - start.getTime()) / 86_400_000);
      return Math.max(0, Math.min(6, diff));
    }
    return (date.getDay() + 6) % 7;
  }, [date, weekStartDate]);
  const diet = dietQ.data?.diet as { days?: { day?: string; isWorkoutDay: boolean; totalApproxCalories: number; meals: Record<string, { items: string[]; approxCalories: number }> }[] } | undefined;
  const dietForDay = diet?.days?.[dayOffset];

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
