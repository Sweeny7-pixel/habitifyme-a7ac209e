import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getAllWeeks } from "@/lib/gym.functions";
import { Loader2, Award } from "lucide-react";

export const Route = createFileRoute("/_authenticated/progress")({
  head: () => ({
    meta: [
      { title: "Progress — HabitifyMe" },
      { name: "description", content: "Your weekly completion history and milestones." },
    ],
  }),
  component: ProgressPage,
});

function ProgressPage() {
  const fn = useServerFn(getAllWeeks);
  const q = useQuery({ queryKey: ["allWeeks"], queryFn: () => fn() });

  if (q.isLoading)
    return (
      <div className="flex justify-center pt-12">
        <Loader2 className="h-6 w-6 animate-spin text-[color:var(--clay-orange)]" />
      </div>
    );
  if (!q.data) return null;

  const { weeks, reviews } = q.data;
  const reviewMap = new Map(reviews.map((r) => [r.week_id, r]));
  const totalCompletion = reviews.length
    ? Math.round(reviews.reduce((s, r) => s + r.completion_pct, 0) / reviews.length)
    : 0;
  const week4Hit = reviews.find((r) =>
    weeks.find((w) => w.id === r.week_id && w.week_number === 4),
  );

  return (
    <div className="space-y-4 pt-2">
      <div>
        <h1 className="text-[22px] font-extrabold tracking-tight text-[color:var(--text-dark)] leading-tight">
          Progress
        </h1>
        <p className="mt-1 text-sm text-[color:var(--text-mid)]">Your journey, week by week.</p>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <Stat label="Weeks started" value={weeks.length.toString()} />
        <Stat label="Avg completion" value={`${totalCompletion}%`} />
        <Stat label="Reviews done" value={reviews.length.toString()} />
        <Stat label="Made Week 4" value={week4Hit ? "Yes 💪" : "—"} />
      </div>

      <section>
        <div className="sec-label mb-2 flex items-center gap-1.5">
          <Award className="h-3.5 w-3.5" /> All weeks
        </div>
        <div className="space-y-2.5">
          {weeks.length === 0 && (
            <div className="clay-card text-sm text-[color:var(--text-mid)]">
              Finish your first week to see progress here.
            </div>
          )}
          {weeks.map((w) => {
            const r = reviewMap.get(w.id);
            return (
              <div key={w.id} className="clay-card">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-extrabold text-[color:var(--text-dark)]">Week {w.week_number}</p>
                  <span
                    className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      w.status === "completed"
                        ? "bg-[color:var(--clay-green-light)] text-[color:var(--clay-green-shadow)]"
                        : "bg-[color:var(--clay-orange-light)] text-[color:var(--clay-orange-shadow)]"
                    }`}
                  >
                    {w.status}
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-[color:var(--text-mid)]">{w.plan_summary}</p>
                {r && (
                  <div className="mt-2.5">
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-bold text-[color:var(--text-mid)]">Completion</span>
                      <span className="font-extrabold text-[color:var(--clay-orange)]">{r.completion_pct}%</span>
                    </div>
                    <div className="prog-bar">
                      <div
                        className="h-full bg-[color:var(--clay-orange)]"
                        style={{ width: `${r.completion_pct}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="clay-stat">
      <div className="text-[22px] font-extrabold text-[color:var(--text-dark)] tracking-tight">{value}</div>
      <div className="sec-label mt-1">{label}</div>
    </div>
  );
}
