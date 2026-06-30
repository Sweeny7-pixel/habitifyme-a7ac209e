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
    <div className="min-h-screen bg-[#0b0d12] text-white">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-lime-400 text-black">
            <Dumbbell className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight">HabitifyMe</span>
        </div>
        <Link to="/auth" className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/15">
          Sign in
        </Link>
      </header>

      <section className="mx-auto max-w-5xl px-5 pb-12 pt-8 md:pt-16">
        <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-lime-400/30 bg-lime-400/10 px-3 py-1 text-xs font-medium text-lime-300">
          <Sparkles className="h-3 w-3" /> Built for budget gym beginners
        </p>
        <h1 className="text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl">
          Walk into the gym <br className="hidden md:block" />
          <span className="text-lime-400">with a plan.</span>
        </h1>
        <p className="mt-5 max-w-xl text-base text-white/70 md:text-lg">
          You paid for the gym. You don't have to pay a trainer too. HabitifyMe gives you a weekly plan, video demos, and one-tap check-ins — and adapts next week to what you actually finished.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link to="/auth" className="rounded-full bg-lime-400 px-6 py-3 text-sm font-bold text-black hover:bg-lime-300">
            Start free
          </Link>
          <a href="#how" className="rounded-full border border-white/15 px-6 py-3 text-sm font-medium hover:bg-white/5">
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
            <div key={f.title} className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="mb-3 grid h-10 w-10 place-items-center rounded-lg bg-lime-400/15 text-lime-300">
                {f.icon}
              </div>
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-white/65">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/10 py-6 text-center text-xs text-white/40">
        HabitifyMe — built for the first 4 weeks that matter most.
      </footer>
    </div>
  );
}
