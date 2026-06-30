import { createFileRoute, Link } from "@tanstack/react-router";
import { Dumbbell, CheckCircle2, Sparkles, PlayCircle } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HabitifyMe — Your AI gym coach in your pocket" },
      { name: "description", content: "Walk into any budget gym with a plan. AI-generated weekly workouts, demo videos, and check-ins that adapt to what you actually finish." },
      { property: "og:title", content: "HabitifyMe — Your AI gym coach in your pocket" },
      { property: "og:description", content: "Walk into any budget gym with a plan. AI-generated weekly workouts, demo videos, and check-ins that adapt to you." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-[12px] bg-[var(--neon-orange)] text-white shadow-[0_0_18px_var(--neon-orange-glow)]">
            <Dumbbell className="h-5 w-5" />
          </div>
          <span className="text-lg font-extrabold tracking-tight text-[var(--text-primary)]">HabitifyMe</span>
        </div>
        <Link to="/auth" className="glass-btn glass-btn-ghost glass-btn-sm">
          Sign in
        </Link>
      </header>

      <section className="mx-auto max-w-5xl px-5 pb-12 pt-8 md:pt-16">
        <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[rgba(255,107,53,0.30)] bg-[rgba(255,107,53,0.10)] px-3 py-1 text-xs font-medium text-[var(--neon-orange)]">
          <Sparkles className="h-3 w-3" /> Built for budget gym beginners
        </p>
        <h1 className="text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl">
          Walk into the gym <br className="hidden md:block" />
          <span className="text-[var(--neon-orange)]">with a plan.</span>
        </h1>
        <p className="mt-5 max-w-xl text-base text-[var(--text-secondary)] md:text-lg">
          You paid for the gym. You don't have to pay a trainer too. HabitifyMe gives you a weekly plan, video demos, and one-tap check-ins — and adapts next week to what you actually finished.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link to="/auth" className="glass-btn">
            Start free
          </Link>
          <a href="#how" className="glass-btn glass-btn-ghost">
            How it works
          </a>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-5xl px-5 pb-20">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { icon: <Sparkles className="h-5 w-5" />, title: "AI weekly plan", body: "Tell us your goal and gym setup. Get a beginner-safe split with sets, reps, and rest." },
            { icon: <PlayCircle className="h-5 w-5" />, title: "Demo videos", body: "Every exercise has a quick YouTube demo so you never have to guess the form." },
            { icon: <CheckCircle2 className="h-5 w-5" />, title: "Adaptive check-ins", body: "Tick off sets as you go. Next week's plan progresses, swaps, or deloads based on what you finished." },
          ].map((f) => (
            <div key={f.title} className="glass-card">
              <div className="mb-3 grid h-10 w-10 place-items-center rounded-[10px] bg-[rgba(255,107,53,0.12)] text-[var(--neon-orange)]">
                {f.icon}
              </div>
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-[var(--border)] py-6 text-center text-xs text-[var(--text-muted)]">
        HabitifyMe — built for the first 4 weeks that matter most.
      </footer>
    </div>
  );
}
