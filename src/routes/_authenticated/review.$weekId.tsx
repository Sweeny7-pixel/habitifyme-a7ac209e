import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { submitWeekReview, generateWeekPlan, getWeek } from "@/lib/gym.functions";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/review/$weekId")({
  head: () => ({
    meta: [
      { title: "Week review — HabitifyMe" },
      { name: "description", content: "Reflect on the week so next week adapts to you." },
    ],
  }),
  component: ReviewPage,
});

function ReviewPage() {
  const { weekId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const submitFn = useServerFn(submitWeekReview);
  const generateFn = useServerFn(generateWeekPlan);
  const getWeekFn = useServerFn(getWeek);

  const wq = useQuery({ queryKey: ["week", weekId], queryFn: () => getWeekFn({ data: { weekId } }) });

  const [energy, setEnergy] = useState(3);
  const [soreness, setSoreness] = useState(3);
  const [pref, setPref] = useState<"easier" | "same" | "harder">("same");
  const [notes, setNotes] = useState("");
  const [generating, setGenerating] = useState(false);

  const mut = useMutation({
    mutationFn: async () => {
      await submitFn({ data: { week_id: weekId, energy, soreness, difficulty_pref: pref, notes } });
      setGenerating(true);
      const nextWeekNum = (wq.data?.week.week_number ?? 1) + 1;
      await generateFn({ data: { weekNumber: nextWeekNum } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["currentWeek"] });
      toast.success("Next week is ready!");
      navigate({ to: "/home" });
    },
    onError: (e: Error) => { toast.error(e.message); setGenerating(false); },
  });

  if (generating) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <Loader2 className="mb-4 h-8 w-8 animate-spin text-[color:var(--clay-orange)]" />
        <h2 className="text-xl font-bold">Adapting your next week…</h2>
        <p className="mt-2 text-sm text-[color:var(--text-mid)]">Building based on what you finished.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-[color:var(--clay-orange)]">Week review</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">How did the week go?</h1>
      </div>

      <SliderField label={`Energy this week: ${energy}/5`} value={energy} setValue={setEnergy} />
      <SliderField label={`Soreness: ${soreness}/5`} value={soreness} setValue={setSoreness} />

      <div>
        <p className="mb-2 text-xs font-medium text-[color:var(--text-mid)]">Next week should be…</p>
        <div className="grid grid-cols-3 gap-2">
          {(["easier", "same", "harder"] as const).map((p) => (
            <button key={p} onClick={() => setPref(p)}
              className={`rounded-xl border py-2.5 text-sm font-medium capitalize ${
                pref === p ? "border-[color:var(--clay-orange)] bg-[color:var(--clay-orange-light)] text-[color:var(--clay-orange-shadow)]" : "border-[color:var(--clay-border)] bg-white text-[color:var(--text-mid)]"
              }`}>{p}</button>
          ))}
        </div>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-[color:var(--text-mid)]">Notes (optional)</span>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
          className="w-full rounded-lg border border-[color:var(--clay-border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[color:var(--clay-orange)]" />
      </label>

      <button onClick={() => mut.mutate()} disabled={mut.isPending}
        className="w-full rounded-xl bg-[color:var(--clay-orange)] py-3 text-sm font-bold text-white hover:bg-lime-300 disabled:opacity-60">
        {mut.isPending ? "Submitting…" : "Submit & generate next week"}
      </button>
    </div>
  );
}

function SliderField({ label, value, setValue }: { label: string; value: number; setValue: (n: number) => void }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-[color:var(--text-mid)]">{label}</span>
      <input type="range" min={1} max={5} value={value}
        onChange={(e) => setValue(+e.target.value)} className="w-full accent-lime-400" />
    </label>
  );
}
