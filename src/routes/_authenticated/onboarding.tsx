import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { saveProfile, generateWeekPlan, getProfile } from "@/lib/gym.functions";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up your plan — HabitifyMe" },
      { name: "description", content: "A few questions so the AI builds the right plan for you." },
    ],
  }),
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();
  const save = useServerFn(saveProfile);
  const generate = useServerFn(generateWeekPlan);
  const getMe = useServerFn(getProfile);
  const [submitting, setSubmitting] = useState(false);
  const [stage, setStage] = useState<"form" | "generating">("form");

  // If user already has a profile, send them home.
  const existingQ = useQuery({ queryKey: ["profile"], queryFn: () => getMe() });
  useEffect(() => {
    if (existingQ.data) navigate({ to: "/home" });
  }, [existingQ.data, navigate]);

  const [form, setForm] = useState({
    name: "", age: 25, gender: "male",
    height_cm: 170, weight_kg: 70,
    goal: "build muscle", days_per_week: 4,
    equipment: "full gym", injuries: "",
    allergies: "",
    experience: "beginner",
  });

  function update<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm({ ...form, [k]: v });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await save({ data: form });
      // Skip regeneration if already onboarded with a week
      const existing = await getMe();
      if (!existing) throw new Error("Profile save failed");
      setStage("generating");
      await generate({ data: { weekNumber: 1 } });
      navigate({ to: "/home" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed";
      toast.error(msg);
      setStage("form");
    } finally {
      setSubmitting(false);
    }
  }

  if (stage === "generating") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <Loader2 className="mb-4 h-8 w-8 animate-spin text-[color:var(--clay-orange)]" />
        <h2 className="text-xl font-bold">Building your Week 1 plan…</h2>
        <p className="mt-2 text-sm text-[color:var(--text-mid)]">This takes about 10 seconds.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Let's set you up</h1>
      <p className="mt-1 text-sm text-[color:var(--text-mid)]">A few questions so the AI builds the right plan for you.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <Field label="Your name">
          <input required value={form.name} onChange={(e) => update("name", e.target.value)}
            className="w-full rounded-lg border border-[color:var(--clay-border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[color:var(--clay-orange)]" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Age">
            <input type="number" value={form.age} onChange={(e) => update("age", +e.target.value)}
              className="w-full rounded-lg border border-[color:var(--clay-border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[color:var(--clay-orange)]" />
          </Field>
          <Field label="Gender">
            <select value={form.gender} onChange={(e) => update("gender", e.target.value)}
              className="w-full rounded-lg border border-[color:var(--clay-border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[color:var(--clay-orange)]">
              <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
            </select>
          </Field>
          <Field label="Height (cm)">
            <input type="number" value={form.height_cm} onChange={(e) => update("height_cm", +e.target.value)}
              className="w-full rounded-lg border border-[color:var(--clay-border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[color:var(--clay-orange)]" />
          </Field>
          <Field label="Weight (kg)">
            <input type="number" step="0.5" value={form.weight_kg} onChange={(e) => update("weight_kg", +e.target.value)}
              className="w-full rounded-lg border border-[color:var(--clay-border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[color:var(--clay-orange)]" />
          </Field>
        </div>

        <Field label="Main goal">
          <select value={form.goal} onChange={(e) => update("goal", e.target.value)}
            className="w-full rounded-lg border border-[color:var(--clay-border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[color:var(--clay-orange)]">
            <option>build muscle</option>
            <option>lose fat</option>
            <option>general fitness</option>
            <option>strength</option>
          </select>
        </Field>

        <Field label={`Days per week: ${form.days_per_week}`}>
          <input type="range" min={2} max={6} value={form.days_per_week}
            onChange={(e) => update("days_per_week", +e.target.value)}
            className="w-full accent-lime-400" />
        </Field>

        <Field label="Equipment you have">
          <select value={form.equipment} onChange={(e) => update("equipment", e.target.value)}
            className="w-full rounded-lg border border-[color:var(--clay-border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[color:var(--clay-orange)]">
            <option>full gym</option>
            <option>dumbbells only</option>
            <option>bodyweight only</option>
          </select>
        </Field>

        <Field label="Experience">
          <select value={form.experience} onChange={(e) => update("experience", e.target.value)}
            className="w-full rounded-lg border border-[color:var(--clay-border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[color:var(--clay-orange)]">
            <option>beginner</option>
            <option>some experience</option>
          </select>
        </Field>

        <Field label="Any injuries or health notes? (optional)">
          <textarea value={form.injuries} onChange={(e) => update("injuries", e.target.value)} rows={2}
            placeholder="e.g. lower back issue, knee surgery 2y ago"
            className="w-full rounded-lg border border-[color:var(--clay-border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[color:var(--clay-orange)]" />
        </Field>

        <Field label="Any food allergies or foods to avoid? (optional)">
          <textarea value={form.allergies} onChange={(e) => update("allergies", e.target.value)} rows={2}
            placeholder="e.g. peanuts, shellfish, lactose, eggs"
            className="w-full rounded-lg border border-[color:var(--clay-border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[color:var(--clay-orange)]" />
        </Field>


        <button type="submit" disabled={submitting}
          className="mt-2 w-full rounded-xl bg-[color:var(--clay-orange)] py-3 text-sm font-bold text-white hover:bg-lime-300 disabled:opacity-60">
          {submitting ? "Saving…" : "Generate my Week 1 plan"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-[color:var(--text-mid)]">{label}</span>
      {children}
    </label>
  );
}
