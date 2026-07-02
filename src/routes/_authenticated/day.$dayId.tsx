import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getDay, logExercise, completeWorkoutDay } from "@/lib/gym.functions";
import { CheckCircle2, Circle, Loader2, ChevronDown, X, ArrowLeft, Play, Target, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/day/$dayId")({
  head: () => ({
    meta: [
      { title: "Workout — HabitifyMe" },
      { name: "description", content: "Log your sets and finish your workout." },
    ],
  }),
  component: DayPage,
});

type Exercise = {
  name: string;
  sets: number;
  reps: string;
  rest_seconds: number;
  form_cue: string;
  instructions?: string[];
  images?: string[];
  youtubeLink?: string;
  primaryMuscles?: string[];
  equipment?: string | null;
  level?: string | null;
};

function buildYouTubeSearchUrl(name: string, equipment?: string | null): string {
  const parts = ["how to do", String(name || "").trim()];
  const eq = String(equipment || "").trim().toLowerCase();
  if (eq && eq !== "body only" && eq !== "none" && eq !== "null") {
    parts.push(String(equipment).trim());
  }
  parts.push("form");
  const query = parts.filter(Boolean).join(" ");
  return "https://www.youtube.com/results?search_query=" + encodeURIComponent(query).replaceAll("+", "%20");
}

function DayPage() {
  const { dayId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const getDayFn = useServerFn(getDay);
  const logFn = useServerFn(logExercise);
  const completeFn = useServerFn(completeWorkoutDay);

  const q = useQuery({
    queryKey: ["day", dayId],
    queryFn: async () => {
      try {
        return await getDayFn({ data: { dayId } });
      } catch (error) {
        if (error instanceof Error && error.message === "Day not found") {
          return { day: null, logs: [] };
        }
        throw error;
      }
    },
  });
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  type LogInput = {
    workout_day_id: string;
    exercise_index: number;
    exercise_name: string;
    sets_completed: number;
    reps?: string;
    weight_kg: number | null;
    rpe: number | null;
    skipped: boolean;
    notes?: string;
  };
  const logMut = useMutation({
    mutationFn: (input: LogInput) => logFn({ data: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["day", dayId] }),
  });

  const completeMut = useMutation({
    mutationFn: () => completeFn({ data: { dayId } }),
    onSuccess: () => {
      // Record gap-detector check-in so we don't show the "you've been
      // away" modal next time the user opens the app.
      try {
        localStorage.setItem("gymbuddy_lastCheckin", new Date().toISOString());
        localStorage.removeItem("gymbuddy_gap_choice");
      } catch {
        /* ignore */
      }
      toast.success("Workout logged. Great work!");
      qc.invalidateQueries({ queryKey: ["currentWeek"] });
      qc.invalidateQueries({ queryKey: ["planWeeks"] });
      navigate({ to: "/home" });
    },
  });

  if (q.isLoading) {
    return (
      <div className="flex justify-center pt-16">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--neon-orange)]" />
      </div>
    );
  }
  if (q.isError || !q.data || !q.data.day) {
    return (
      <div className="space-y-4 pt-8 text-center">
        <p className="text-sm text-[var(--text-secondary)]">
          This workout is no longer available. Your plan may have been regenerated.
        </p>
        <button onClick={() => navigate({ to: "/home" })} className="glass-btn max-w-xs mx-auto">
          Back to home
        </button>
      </div>
    );
  }

  const { day, logs } = q.data;
  const exercises = (day.exercises_json as Exercise[]) ?? [];
  const logMap = new Map(logs.map((l) => [l.exercise_index, l]));
  const doneCount = logs.filter((l) => !l.skipped && l.sets_completed > 0).length;
  const pct = exercises.length ? Math.round((doneCount / exercises.length) * 100) : 0;

  return (
    <div className="space-y-4 pt-2 pb-32">
      <button
        onClick={() => navigate({ to: "/home" })}
        className="flex items-center gap-1 text-xs font-semibold text-[var(--text-secondary)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>

      <div>
        <span className="glass-pill">Day {day.day_index}</span>
        <h1 className="mt-2 text-[22px] font-extrabold tracking-tight text-[var(--text-primary)] leading-tight">
          {day.title}
        </h1>
        <div className="mt-2 inline-flex items-center gap-1.5">
          <span className="focus-pill"><Target className="h-3.5 w-3.5" /> {day.focus}</span>
        </div>
      </div>

      <div className="glass-card">
        <div className="flex items-center justify-between text-sm">
          <span className="font-bold text-[var(--text-primary)]">
            {doneCount}/{exercises.length} exercises logged
          </span>
          <span className="text-[var(--neon-orange)] font-extrabold">{pct}%</span>
        </div>
        <div className="prog-bar mt-2">
          <div className="h-full bg-[var(--neon-orange)] shadow-[0_0_12px_var(--neon-orange-glow)] transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="space-y-3">
        {exercises.map((ex, idx) => {
          const log = logMap.get(idx);
          const done = log && (log.sets_completed > 0 || log.skipped);
          const img = ex.images?.[0];
          return (
            <button
              key={idx}
              onClick={() => setActiveIdx(idx)}
              className="glass-card flex w-full p-0 overflow-hidden text-left"
            >
              {img ? (
                <img
                  src={img}
                  alt={ex.name}
                  loading="lazy"
                  className="h-24 w-24 shrink-0 object-cover bg-white/5"
                onError={(e) => {
                  const el = e.currentTarget;
                  el.onerror = null;
                  el.style.display = "none";
                }}
                />
              ) : (
                <div className="h-24 w-24 shrink-0 bg-white/5" />
              )}
              <div className="flex flex-1 items-start gap-2 px-3 py-2.5 min-w-0">
                {done ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--neon-green)]" />
                ) : (
                  <Circle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-bold text-[var(--text-primary)]">{ex.name}</p>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                    {ex.sets} × {ex.reps} · rest {ex.rest_seconds}s
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {ex.primaryMuscles?.slice(0, 2).map((m) => (
                      <span key={m} className="muscle-pill capitalize">{m}</span>
                    ))}
                    {ex.equipment && <span className="muscle-pill capitalize">{ex.equipment}</span>}
                  </div>
                  {log && log.sets_completed > 0 && (
                    <p className="mt-1.5 text-[11px] font-bold text-[var(--neon-green)]">
                      Logged: {log.sets_completed} sets{log.weight_kg ? ` @ ${log.weight_kg}kg` : ""}
                    </p>
                  )}
                  {log?.skipped && (
                    <p className="mt-1.5 text-[11px] font-bold text-[var(--neon-amber)]">Skipped</p>
                  )}
                </div>
                <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-[var(--text-muted)]" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Sticky finish button (inside shell, above bottom nav) */}
      <div className="fixed inset-x-0 bottom-20 z-10 pointer-events-none">
        <div className="mx-auto max-w-[480px] px-4 pointer-events-auto">
          <button
            onClick={() => completeMut.mutate()}
            disabled={completeMut.isPending || !!day.completed_at}
            className={`glass-btn ${day.completed_at ? "glass-btn-green" : ""}`}
            data-complete={day.completed_at ? "true" : "false"}
          >
            {day.completed_at ? (
              <><CheckCircle2 className="h-4 w-4" /> Workout complete</>
            ) : completeMut.isPending ? "Saving…" : "Finish workout"}
          </button>
        </div>
      </div>

      {activeIdx !== null && (
        <ExerciseSheet
          exercise={exercises[activeIdx]}
          existing={logMap.get(activeIdx) ?? null}
          onClose={() => setActiveIdx(null)}
          onSave={async (payload) => {
            await logMut.mutateAsync({
              workout_day_id: dayId,
              exercise_index: activeIdx,
              exercise_name: exercises[activeIdx].name,
              ...payload,
            });
            setActiveIdx(null);
          }}
        />
      )}
    </div>
  );
}

function ExerciseSheet({
  exercise,
  existing,
  onClose,
  onSave,
}: {
  exercise: Exercise;
  existing: {
    sets_completed: number;
    weight_kg: number | null;
    rpe: number | null;
    skipped: boolean;
    notes: string | null;
  } | null;
  onClose: () => void;
  onSave: (p: {
    sets_completed: number;
    reps?: string;
    weight_kg: number | null;
    rpe: number | null;
    skipped: boolean;
    notes?: string;
  }) => Promise<void>;
}) {
  const [sets, setSets] = useState(existing?.sets_completed ?? exercise.sets);
  const [weight, setWeight] = useState<string>(existing?.weight_kg?.toString() ?? "");
  const [rpe, setRpe] = useState<number>(existing?.rpe ?? 7);
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [showInstr, setShowInstr] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);

  const images = exercise.images ?? [];
  const instructions: string[] = Array.isArray(exercise.instructions)
    ? exercise.instructions
    : exercise.instructions
      ? [String(exercise.instructions)]
      : [];

  async function save(skipped: boolean) {
    setSaving(true);
    try {
      await onSave({
        sets_completed: skipped ? 0 : sets,
        weight_kg: weight ? parseFloat(weight) : null,
        rpe: skipped ? null : rpe,
        skipped,
        notes,
        reps: exercise.reps,
      });
    } finally {
      setSaving(false);
    }
  }

  function openYouTube() {
    let url = exercise.youtubeLink || buildYouTubeSearchUrl(exercise.name, exercise.equipment);
    // Normalize legacy "+" encoding to %20 (older saved exercises).
    url = url.replace(/\?search_query=.+$/, (qs) => {
      const q = qs.replace(/^\?search_query=/, "").replace(/\+/g, " ");
      return "?search_query=" + encodeURIComponent(q).replaceAll("+", "%20");
    });
    const win = window.open(url, "_blank", "noopener,noreferrer");
    if (!win && typeof window !== "undefined" && window.top) {
      window.top.location.href = url;
    }
  }

  return (
    <div className="glass-modal-overlay" onClick={onClose}>
      <div className="glass-bottom-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="glass-sheet-handle" />
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-base font-extrabold text-[var(--text-primary)] truncate">{exercise.name}</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              {exercise.sets} × {exercise.reps} · rest {exercise.rest_seconds}s
            </p>
          </div>
          <button onClick={onClose} className="glass-sheet-close" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        {images.length > 0 && (
          <div className="mb-3">
            <div className="aspect-video overflow-hidden rounded-2xl bg-white/5 border border-white/10">
              <img
                src={images[imgIdx % images.length]}
                alt={`${exercise.name} demo ${imgIdx + 1}`}
                className="h-full w-full object-contain"
                onError={(e) => {
                  const el = e.currentTarget;
                  el.onerror = null;
                  el.style.display = "none";
                }}
              />
            </div>
            {images.length > 1 && (
              <div className="mt-2 flex justify-center gap-1.5">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setImgIdx(i)}
                    className={`h-1.5 w-6 rounded-full transition ${
                      i === imgIdx ? "bg-[var(--neon-orange)]" : "bg-white/15"
                    }`}
                    aria-label={`Image ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mb-3 flex flex-wrap gap-1.5">
          {exercise.primaryMuscles?.map((m) => (
            <span key={m} className="muscle-pill capitalize">{m}</span>
          ))}
          {exercise.equipment && <span className="muscle-pill capitalize">{exercise.equipment}</span>}
          {exercise.level && <span className="muscle-pill capitalize">{exercise.level}</span>}
        </div>

        <div className="mb-3 glass-card glass-card-orange border-l-2 border-l-[var(--neon-orange)] text-xs text-[var(--text-primary)]">
          <span className="font-extrabold text-[var(--neon-orange)]">Form cue: </span>
          {exercise.form_cue}
        </div>

        <button
            type="button"
            onClick={openYouTube}
            className="glass-btn glass-btn-ghost glass-btn-sm w-full mb-3"
          >
            <Play className="h-3.5 w-3.5" /> Watch form video on YouTube
        </button>

        {instructions.length > 0 && (
          <div className="mb-4 glass-card p-0 overflow-hidden">
            <button
              onClick={() => setShowInstr((v) => !v)}
              className="flex w-full items-center justify-between px-4 py-3 text-xs font-extrabold text-[var(--text-primary)]"
            >
              <span>Instructions ({instructions.length})</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showInstr ? "rotate-180" : ""}`} />
            </button>
            {showInstr && (
              <ol className="list-decimal space-y-1.5 px-7 pb-3 text-xs text-[var(--text-secondary)] leading-relaxed">
                {instructions.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label={`Sets done: ${sets}`}>
            <input
              type="range"
              min={0}
              max={exercise.sets + 2}
              value={sets}
              onChange={(e) => setSets(+e.target.value)}
              className="w-full accent-[var(--neon-orange)]"
            />
          </Field>
          <Field label="Weight (kg)">
            <input
              type="number"
              step="0.5"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="optional"
              className="glass-input"
            />
          </Field>
        </div>

        <Field label={`Effort (RPE): ${rpe}`}>
          <input
            type="range"
            min={1}
            max={10}
            value={rpe}
            onChange={(e) => setRpe(+e.target.value)}
            className="w-full accent-[var(--neon-orange)]"
          />
        </Field>

        <Field label="Notes (optional)">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="glass-input"
          />
        </Field>

        <div className="mt-4 flex gap-2">
          <button onClick={() => save(true)} disabled={saving} className="glass-btn glass-btn-ghost flex-1">
            Skip
          </button>
          <button onClick={() => save(false)} disabled={saving} className="glass-btn flex-[2]">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mt-3 block">
      <span className="mb-1.5 block text-xs font-bold text-[var(--text-secondary)]">{label}</span>
      {children}
    </label>
  );
}
