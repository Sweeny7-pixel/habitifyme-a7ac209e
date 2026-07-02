import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { resetUserPlan } from "@/lib/gym.functions";
import { recordCheckin, saveGapChoice } from "@/lib/gap-detector";

export function GapChoiceModal({
  daysMissed,
  onClose,
}: {
  daysMissed: number;
  onClose: () => void;
}) {
  const resetFn = useServerFn(resetUserPlan);
  const qc = useQueryClient();
  const router = useRouter();
  const [busy, setBusy] = useState<"reset" | "resume" | null>(null);

  async function handleReset() {
    setBusy("reset");
    try {
      await resetFn();
      saveGapChoice("reset");
      recordCheckin();
      await qc.invalidateQueries({ queryKey: ["planWeeks"] });
      await qc.invalidateQueries({ queryKey: ["currentWeek"] });
      router.invalidate();
      toast.success("Plan reset — starting fresh from Week 1");
      onClose();
    } catch (err) {
      toast.error((err as Error).message || "Couldn't reset plan");
      setBusy(null);
    }
  }

  function handleResume() {
    saveGapChoice("resume");
    recordCheckin();
    toast.success("Welcome back — let's keep going");
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }}
      role="dialog"
      aria-modal="true"
    >
      <div className="glass-card w-full max-w-[480px] m-3 p-5 space-y-4">
        <div>
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--neon-orange)]">
            It's been a while
          </div>
          <h2 className="mt-1 text-lg font-extrabold text-[var(--text-primary)]">
            You've been away {daysMissed} days
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Want to start over with a fresh Week&nbsp;1, or pick up where you left off?
          </p>
        </div>
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleReset}
            disabled={!!busy}
            className="glass-btn w-full"
          >
            {busy === "reset" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Start fresh from Week 1
          </button>
          <button
            type="button"
            onClick={handleResume}
            disabled={!!busy}
            className="glass-btn glass-btn-ghost w-full"
          >
            Pick up where I left off
          </button>
        </div>
      </div>
    </div>
  );
}