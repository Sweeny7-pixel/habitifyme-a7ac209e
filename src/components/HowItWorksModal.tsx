import { useEffect, useState } from "react";
import {
  X,
  ChevronDown,
  Sparkles,
  Target,
  CheckCircle2,
  Circle,
  Utensils,
  Dumbbell,
} from "lucide-react";

type TabKey = "prd" | "journeys" | "wireframes" | "decisions";
type Emotion = "green" | "amber" | "red";
type Accent = "orange" | "green" | "blue" | "amber" | "purple" | "red";

const ACCENT_VAR: Record<Accent, string> = {
  orange: "var(--neon-orange)",
  green: "var(--neon-green)",
  blue: "var(--neon-blue)",
  amber: "var(--neon-amber)",
  purple: "var(--neon-purple)",
  red: "#FF6B6B",
};

const EMOTION_COLOR: Record<Emotion, string> = {
  green: "var(--neon-green)",
  amber: "var(--neon-amber)",
  red: "#FF6B6B",
};

export function HowItWorksModal({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<TabKey>("prd");

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const tabs: { key: TabKey; label: string }[] = [
    { key: "prd", label: "PRD" },
    { key: "journeys", label: "User Journeys" },
    { key: "wireframes", label: "Wireframes" },
    { key: "decisions", label: "Design Decisions" },
  ];

  return (
    <div
      className="glass-modal-overlay"
      style={{ alignItems: "center" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative mx-4 my-4 flex w-full flex-col overflow-hidden md:mx-10 md:my-10"
        style={{
          maxWidth: 900,
          maxHeight: "calc(100dvh - 32px)",
          borderRadius: 28,
          background: "var(--bg-base, #0A0C0F)",
          border: "1px solid var(--glass-border)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.55)",
        }}
      >
        <div
          className="overflow-y-auto"
          style={{ maxHeight: "calc(100dvh - 32px)" }}
        >
          {/* Sticky header + tabs */}
          <div
            className="sticky top-0 z-10 flex flex-col gap-3 px-5 pt-5 pb-3"
            style={{
              background: "rgba(10,12,15,0.85)",
              backdropFilter: "blur(20px)",
              borderBottom: "1px solid var(--glass-border)",
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2
                  className="tracking-tight"
                  style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)" }}
                >
                  How HabitifyMe Works
                </h2>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  Journey maps, key screens, and the decisions behind them
                </p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                className="glass-sheet-close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {tabs.map((t) => {
                const active = activeTab === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setActiveTab(t.key)}
                    className="whitespace-nowrap"
                    style={{
                      padding: "8px 14px",
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 700,
                      border: active
                        ? "1px solid rgba(255,107,53,0.40)"
                        : "1px solid var(--glass-border)",
                      background: active
                        ? "rgba(255,107,53,0.15)"
                        : "var(--glass-2)",
                      color: active ? "var(--neon-orange)" : "var(--text-secondary)",
                      boxShadow: active ? "0 0 16px rgba(255,107,53,0.20)" : "none",
                    }}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="px-5 py-6">
            {activeTab === "prd" && <PrdTab />}
            {activeTab === "journeys" && <JourneysTab />}
            {activeTab === "wireframes" && <WireframesTab />}
            {activeTab === "decisions" && <DecisionsTab />}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────  TAB 1: PRD  ───────────────────────── */

function PrdTab() {
  return (
    <div className="flex flex-col gap-3">
      <PrdSection letter="A" title="The Problem" accent="orange" defaultOpen>
        <p
          className="italic"
          style={{
            fontSize: 15,
            color: "var(--text-primary)",
            borderLeft: "3px solid var(--neon-orange)",
            paddingLeft: 12,
            marginBottom: 14,
          }}
        >
          "An AI fitness coach that tells busy Indians exactly what workout and
          meals to follow each week — and adapts when life gets in the way."
        </p>

        <PrdBlock label="User">
          Young working professionals (22–35) in Indian cities who have joined a
          gym at least once before and quit or restarted multiple times.
          Currently depend on YouTube, friends, trainers, or generic apps for
          guidance.
        </PrdBlock>
        <PrdBlock label="Problem">
          Young working professionals need to stay consistent with gym workouts
          and nutrition, but currently lack personalized guidance, struggle with
          busy schedules, and don't know exactly what to do in the gym. This
          causes them to quit, restart, and fail to build long-term fitness
          habits.
        </PrdBlock>
        <PrdBlock label="Solution">
          Adaptive weekly workout and Indian diet plans that are simple,
          personalized, and adjust to real-world behaviour — missed workouts,
          actual progress, injuries, and allergies — instead of static plans
          that reset to zero.
        </PrdBlock>

        <PrdBlock label="Why existing apps don't solve it">
          <BulletList
            items={[
              "Too complicated, require excessive tracking/logging",
              "Plans feel foreign, don't match Indian eating habits",
              "Plans don't adapt when users skip workouts or struggle",
              "Important features often sit behind paywalls",
            ]}
          />
        </PrdBlock>

        <SubCard accent="amber" title="Research Insights">
          <BulletList
            items={[
              'The "foreign food" problem kills diet adherence faster than workout difficulty — 11 of 13 interviewed users eat roti/dal/curd, not whey shakes',
              "Gap detection (resume vs. reset) is the core retention mechanic, not a nice-to-have — users explicitly quit apps whose plans don't react to skipped days",
              "Form anxiety is silent and universal — 9 of 13 admitted copying others at the gym while unsure if they were doing it right; demo video links are the affordable substitute for a personal trainer",
            ]}
          />
        </SubCard>

        <SubCard accent="blue" title="Persona · Arjun, 26 — The Restart King">
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>
            Bengaluru · IT professional · ₹900/month gym · restarted 3+ times
          </p>
          <PrdBlock label="Archetype">High intent, low consistency</PrdBlock>
          <PrdBlock label="Goal">
            Build muscle and visible strength gains — knows what he wants, has
            no structured path to get there
          </PrdBlock>
          <PrdBlock label="Current behaviour">
            Watches YouTube before going, copies others in the gym, quits after
            3–4 weeks when work piles up
          </PrdBlock>
          <PrdBlock label="Frustrations">
            <BulletList
              items={[
                "Doesn't know if he's pushing hard enough or overdoing it",
                "Apps lock good features behind paywalls",
                "Plan never adjusts when he misses a week",
              ]}
            />
          </PrdBlock>
          <p
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
              marginTop: 10,
              fontStyle: "italic",
              lineHeight: 1.5,
            }}
          >
            "I love to get more strength, and that hooks me to stick at the gym.
            This is my primary reason." — Parth, Bengaluru (3+ restarts, 1+ year
            total), one of 13 users interviewed to build this persona
          </p>
        </SubCard>

        <SubCard accent="green" title="Success Metric">
          <p style={{ fontSize: 13, color: "var(--text-primary)", marginBottom: 8 }}>
            <strong>Primary metric — 4-week gym adherence rate:</strong> % of
            users who complete at least 3 workouts per week for 4 consecutive
            weeks.
          </p>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>
            A user counts as "Week 4 complete" when they:
          </p>
          <BulletList
            items={[
              "Complete at least 3 gym sessions per week for 4 consecutive weeks",
              "Follow their recommended workout plan at least 80% of the time",
              "Log weekly progress/check-ins",
              "Remain active in the program for the full 28 days without dropping out",
            ]}
          />
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 10 }}>
            Behavior that must change: users should stop deciding daily what
            workout or diet to follow, and instead consistently follow their
            personalized weekly plan.
          </p>
        </SubCard>
      </PrdSection>

      <PrdSection letter="B" title="V1 — Shipped" accent="green">
        <FeatureItem
          address="I don't know what workout I should be doing — I just want a plan made for me."
          name="Onboarding profile capture"
          bullets={[
            "10-field profile: name, age, gender, height, weight, goal, days/week (2–6), equipment, injuries, experience",
            "days_per_week slider; equipment locked to 3 presets (full gym / dumbbells / bodyweight)",
            "Auto-redirects to /home after first save; form never appears again",
          ]}
        />
        <FeatureItem
          address="I want to see actual exercises with pictures — not just names."
          name="Real exercise catalog with images"
          bullets={[
            "Fetches free-exercise-db once; cached at module level",
            "filterCatalog runs mapEquipmentToAllowed + mapLevel + parseInjuredMuscles before LLM sees anything",
            "Prompt slice: PER_MUSCLE_CAP=6, hard cap 120 exercises",
            "Day screen: first image as thumbnail; full carousel + collapsible instructions in ExerciseSheet",
          ]}
        />
        <FeatureItem
          address="I open the app at the gym and need to know exactly what to do today."
          name="Home dashboard"
          bullets={[
            "Week 1–4 horizontal switcher with per-week completion count",
            "Progress bar from completed_at on workout_days",
            "Training-day list: CheckCircle2 / Circle state, focus label, exercise count",
            "Diet target card (kcal + protein) from diet_json",
          ]}
        />
        <FeatureItem
          address="I need to log my sets one-handed between reps."
          name="Workout day logging"
          bullets={[
            "Full-width exercise cards with catalog thumbnail",
            "ExerciseSheet bottom drawer: sets, weight (kg), RPE 1–10, notes, Skip/Save",
            "logExercise upserts on (workout_day_id, exercise_index) — safe to retry",
            'Sticky "Finish workout" → completeWorkoutDay stamps completed_at',
          ]}
        />
        <FeatureItem
          address="I finished the week — was it too easy? Too hard? What now?"
          name="Weekly review and adaptive next week"
          bullets={[
            "submitWeekReview: energy (1–5), soreness (1–5), difficulty_pref, notes",
            "Adaptation: <60% → simplify; ≥80% + wants-harder → progress; otherwise small step",
            '"Week done — submit review" banner surfaces when doneDays === totalDays',
          ]}
        />
        <FeatureItem
          address="I want food I can actually eat — not chicken and broccoli."
          name="India-friendly diet card"
          bullets={[
            "LLM instructed: dal, roti, paneer, eggs, rice, chicken, curd",
            "Protein target: 1.4–2.0 g/kg bodyweight",
            "3 sample meals per day; calorie + protein displayed on home",
          ]}
        />
      </PrdSection>

      <PrdSection letter="C" title="V2 — Extended" accent="blue">
        <BulletList
          items={[
            "Claymorphism design system (warm beige, clay-orange, offset shadows) — later evolved into the current dark glassmorphism direction",
            "Prompt-driven custom plan — free-text 10–500 char; no-fabrication rule",
            "375px mobile shell, 5-tab bottom nav (Home/Calendar/Workout/Diet/Profile)",
            "Calendar combined day view — workout + diet + progress stacked per date",
            "7-day India-friendly diet with week tabs + day tabs + meal cards",
            "Allergy-aware substitution — allergies column on profiles; prompt hard-excludes allergens",
            "Profile dashboard — hero card, 2-col stat grid, allergy tag manager, weekly progress bars",
          ]}
        />
        <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 10 }}>
          Push notifications are not part of V2 — they were introduced later
          and are documented under V3 below, where their rollout is only
          partially complete.
        </p>
      </PrdSection>

      <PrdSection letter="D" title="V3 — Partial & Shipped" accent="amber">
        <p className="sec-label" style={{ marginBottom: 8 }}>
          Deferred / partial
        </p>
        <BulletList
          items={[
            "Strict no-fabrication guarantee only covers the 4-week + prompt-driven generation paths — the legacy single-week path still falls back to a raw AI-invented exercise name with no image when no catalog match is found",
            "Achievement push notifications only fire from submitWeekReview — the plan called for them on completeWorkoutDay too, so day-of-completion badges (First Week, 4-Week Streak, 80%+ Avg) don't fire until the Sunday review",
            "Structured serious-injury escalation is prompt-only — nothing in the UI parses diet.notes for a doctor-referral flag or shows a distinct warning banner",
          ]}
        />

        <SubCard accent="green" title="Shipped in V3 — responsive shell fix">
          <BulletList
            items={[
              "Expanded max-width from 375px to 480px on the auth page, modal cards, and the sticky workout bar so they match the wider layout boundary",
              "Replaced 100vh with 100dvh on the auth and error pages to stop mobile browser URL-bar expand/collapse from shifting the layout",
              "Preserved the existing bottom nav and card utilities untouched — they already scaled cleanly and respected phone notches",
              "Verified no component adds a rogue min-width, so everything still scales cleanly down to 320px without horizontal overflow",
            ]}
          />
        </SubCard>
      </PrdSection>

      <PrdSection letter="E" title="Deferred to V4" accent="purple">
        <BulletList
          items={[
            "Per-user timezone for push scheduling (cron currently fans out to all push_subscriptions at fixed UTC offsets aligned to IST)",
            "Social / streak sharing surfaces — no share sheet, OG image, or leaderboard",
            "User-uploaded exercise videos — every exercise still opens a YouTube search link, no upload UI or storage bucket",
            "Load-based progression from exercise_logs — weight_kg history is stored but not fed back into the next-week adaptation prompt",
            'In-session exercise substitution — ExerciseSheet supports log/skip only, no "swap for a safer alternative" action',
            "Rest-day-aware push logic — daily reminder cron doesn't check whether the user has a workout scheduled or already completed it",
            "Full PWA manifest + install prompt — push service worker exists, but manifest.webmanifest and install-prompt logic were not shipped",
          ]}
        />
      </PrdSection>

      <PrdSection letter="F" title="Out of Scope (V1 + V2 + V3)" accent="red">
        <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 10 }}>
          These boundaries aren't explicitly enumerated in the PRD — they're
          inferred exclusions standard for this product category, listed here
          to make the scope boundary explicit.
        </p>
        <BulletList
          items={[
            "Real-time wearable / Apple Watch / Google Fit sync",
            "Live AI chat / messaging the coach",
            "Social following, friend graph, or group challenges",
            "Video coaching or live streaming",
            "Payment / subscription tier gating",
            "Custom exercise creation by the user",
            "Macro tracking / calorie logging per meal actually eaten",
          ]}
        />
      </PrdSection>
    </div>
  );
}

function PrdSection({
  letter,
  title,
  accent,
  defaultOpen = false,
  children,
}: {
  letter: string;
  title: string;
  accent: Accent;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const color = ACCENT_VAR[accent];
  return (
    <div
      className="glass-card"
      style={{ borderLeft: `3px solid ${color}`, padding: 0, overflow: "hidden" }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 text-left"
        style={{ padding: "14px 16px", background: "transparent" }}
      >
        <span
          className="grid place-items-center"
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: `color-mix(in oklab, ${color} 15%, transparent)`,
            color,
            fontSize: 12,
            fontWeight: 800,
            flexShrink: 0,
          }}
        >
          {letter}
        </span>
        <span
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: "var(--text-primary)",
            flex: 1,
          }}
        >
          {title}
        </span>
        <ChevronDown
          className="h-4 w-4"
          style={{
            color: "var(--text-muted)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform .2s",
          }}
        />
      </button>
      {open && <div style={{ padding: "4px 16px 18px" }}>{children}</div>}
    </div>
  );
}

function PrdBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div className="sec-label" style={{ marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.55 }}>
        {children}
      </div>
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
      {items.map((s, i) => (
        <li
          key={i}
          style={{
            fontSize: 13,
            color: "var(--text-secondary)",
            lineHeight: 1.55,
            listStyle: "disc",
          }}
        >
          {s}
        </li>
      ))}
    </ul>
  );
}

function SubCard({
  title,
  accent,
  children,
}: {
  title: string;
  accent: Accent;
  children: React.ReactNode;
}) {
  const color = ACCENT_VAR[accent];
  return (
    <div
      style={{
        marginTop: 12,
        padding: 14,
        borderRadius: 14,
        background: "var(--glass-1)",
        border: "1px solid var(--glass-border)",
        borderLeft: `3px solid ${color}`,
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 800,
          color,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: 8,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function FeatureItem({
  address,
  name,
  bullets,
}: {
  address: string;
  name: string;
  bullets: string[];
}) {
  return (
    <div style={{ marginTop: 14 }}>
      <p
        className="italic"
        style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}
      >
        To Address: "{address}"
      </p>
      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
        {name}
      </div>
      <BulletList items={bullets} />
    </div>
  );
}

/* ─────────────────────────  TAB 2: JOURNEYS  ───────────────────────── */

type Step = {
  n: number;
  title: string;
  action: string;
  emotion: Emotion;
  emotionLabel: string;
  note: string;
};

function JourneysTab() {
  const journeys: {
    title: string;
    persona: string;
    arc: string;
    steps: Step[];
  }[] = [
    {
      title: "Journey 1 — First-time onboarding → Week 1 Day 1 workout",
      persona: "Arjun, new user, Day 0",
      arc: "Curious → Hopeful → Confident → Energised",
      steps: [
        { n: 1, title: "Lands on /auth", action: "Signs up with email", emotion: "amber", emotionLabel: "Curious", note: "Haven't tried an AI coach before" },
        { n: 2, title: "Onboarding form", action: "Fills 10 fields — name, goal, equipment, injuries", emotion: "amber", emotionLabel: "Neutral", note: "Slider for days/week feels easy" },
        { n: 3, title: "AI generates Week 1", action: "Waits ~10s on generating screen", emotion: "amber", emotionLabel: "Hopeful", note: "Please be better than YouTube" },
        { n: 4, title: "Home dashboard", action: "Sees Week 1, 4 training days, diet target", emotion: "green", emotionLabel: "Confident", note: "This looks like MY plan" },
        { n: 5, title: "Opens Day 1", action: "Sees exercises with images, sets, reps, form cues", emotion: "green", emotionLabel: "Energised", note: "I know exactly what to do" },
        { n: 6, title: "Logs first exercise", action: "Tap card → sheet → sets + weight → Save", emotion: "green", emotionLabel: "Positive", note: "Logged in under 10 seconds" },
        { n: 7, title: "Finishes workout", action: 'Taps "Finish workout" sticky bar', emotion: "green", emotionLabel: "Accomplished", note: "Progress bar moved — I can see it" },
      ],
    },
    {
      title: "Journey 2 — End of Week 1 → Adaptive Week 2 generation",
      persona: "Arjun, completed Week 1 (3 of 4 days done)",
      arc: "Tired → Reflective → Surprised → Motivated",
      steps: [
        { n: 1, title: "Home shows banner", action: '"Week done — submit review →" appears', emotion: "amber", emotionLabel: "Tired", note: "Week 1 is actually done" },
        { n: 2, title: "Opens review", action: "Rates energy 3/5, soreness 4/5, difficulty same", emotion: "amber", emotionLabel: "Reflective", note: "Honest check-in feels fair" },
        { n: 3, title: "Review submitted", action: "Week 1 → completed; Week 2 unlocks", emotion: "amber", emotionLabel: "Neutral", note: "What will Week 2 look like?" },
        { n: 4, title: "AI adapts Week 2", action: "generateWeekPlan injects review; adjusts volume", emotion: "green", emotionLabel: "Surprised", note: "It actually remembered my soreness" },
        { n: 5, title: "Home updates", action: "Week 2 active; progress bar resets", emotion: "green", emotionLabel: "Motivated", note: "4 more days. Let's go." },
      ],
    },
    {
      title: "Journey 3 — Diet concern → Allergy update → Safe meal plan",
      persona: "Arjun, Week 2, discovers peanut allergy risk",
      arc: "Worried → Takes action → Relieved → Trust built",
      steps: [
        { n: 1, title: "Checks /diet tab", action: "Sees peanut chutney in Tuesday snack", emotion: "red", emotionLabel: "Worried", note: "I'm allergic to peanuts" },
        { n: 2, title: "Opens /profile", action: "Scrolls to Food allergies section", emotion: "amber", emotionLabel: "Determined", note: "At least I can fix this myself" },
        { n: 3, title: "Adds allergy tag", action: 'Types "peanuts" → + → chip appears', emotion: "amber", emotionLabel: "Neutral", note: "Saved. Diet will regenerate on refresh." },
        { n: 4, title: "Returns to /diet", action: "Pulls to refresh; new diet loads", emotion: "amber", emotionLabel: "Anxious", note: "Please don't have peanuts…" },
        { n: 5, title: "Peanuts removed", action: "Snack now: roasted chana + curd", emotion: "green", emotionLabel: "Relieved", note: "It noticed AND told me what it swapped" },
        { n: 6, title: "Builds trust", action: "Continues following the plan confidently", emotion: "green", emotionLabel: "Trusting", note: "This app actually has my back" },
      ],
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {journeys.map((j) => (
        <div key={j.title} className="glass-card">
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
            {j.title}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
            {j.persona}
          </div>
          <div
            style={{
              fontSize: 11,
              color: "var(--neon-orange)",
              marginTop: 4,
              fontWeight: 700,
            }}
          >
            {j.arc}
          </div>

          <div className="mt-4 flex items-stretch gap-2 overflow-x-auto no-scrollbar pb-2">
            {j.steps.map((s, i) => (
              <div key={s.n} className="flex items-stretch gap-2">
                <StepCard step={s} />
                {i < j.steps.length - 1 && (
                  <div
                    className="flex items-center"
                    style={{ color: "var(--text-muted)", fontSize: 18 }}
                  >
                    →
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function StepCard({ step }: { step: Step }) {
  return (
    <div
      className="flex flex-col"
      style={{
        width: 160,
        minWidth: 160,
        padding: 12,
        borderRadius: 14,
        background: "var(--glass-2)",
        border: "1px solid var(--glass-border)",
      }}
    >
      <span
        style={{
          alignSelf: "flex-start",
          fontSize: 10,
          fontWeight: 800,
          padding: "2px 8px",
          borderRadius: 999,
          background: "rgba(255,107,53,0.15)",
          color: "var(--neon-orange)",
        }}
      >
        STEP {step.n}
      </span>
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: "var(--text-primary)",
          marginTop: 8,
        }}
      >
        {step.title}
      </div>
      <div
        style={{
          fontSize: 11,
          color: "var(--text-secondary)",
          marginTop: 4,
          lineHeight: 1.4,
          flex: 1,
        }}
      >
        {step.action}
      </div>
      <div
        style={{
          fontSize: 10,
          color: "var(--text-muted)",
          marginTop: 6,
          fontStyle: "italic",
          lineHeight: 1.4,
        }}
      >
        "{step.note}"
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            background: EMOTION_COLOR[step.emotion],
            boxShadow: `0 0 8px ${EMOTION_COLOR[step.emotion]}`,
          }}
        />
        <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700 }}>
          {step.emotionLabel}
        </span>
      </div>
    </div>
  );
}

/* ─────────────────────────  TAB 3: WIREFRAMES  ───────────────────────── */

function WireframesTab() {
  return (
    <div className="flex flex-col gap-8 md:flex-row md:flex-wrap md:justify-center">
      <WireframeCard
        title="Home Screen"
        route="/home"
        legend={[
          "Greeting + week context gives instant orientation",
          "Stat cards drive daily motivation",
          "Week switcher lets user check any block without losing context",
          "Progress bar is the single most-checked number in the session",
          "Training day list is the primary navigation into the gym",
          "Diet card surfaces nutrition without leaving home",
        ]}
      >
        <HomeWireframe />
      </WireframeCard>

      <WireframeCard
        title="Calendar Screen"
        route="/calendar"
        legend={[
          "Week strip shows the full 7-day picture at a glance",
          "Color coding: green=done, orange=today, ghost=upcoming, muted=rest",
          "Day detail stacks workout + diet + progress — no tab switching",
          '"Open workout" CTA removes friction for gym-floor use',
          "Kcal shown per meal so users can plan eating around training",
        ]}
      >
        <CalendarWireframe />
      </WireframeCard>

      <WireframeCard
        title="Diet Screen"
        route="/diet"
        legend={[
          "Calorie ring gives instant % progress toward daily target",
          "Macro breakdown (protein/carbs/fat) in one glance",
          "Allergy exclusion chip confirms the plan is safe for this user",
          "Week + day tabs let users plan meals 7 days ahead",
          "Expandable meal cards reduce visual clutter while keeping detail",
          "Protein banner ensures the most important macro is never missed",
        ]}
      >
        <DietWireframe />
      </WireframeCard>
    </div>
  );
}

function WireframeCard({
  title,
  route,
  legend,
  children,
}: {
  title: string;
  route: string;
  legend: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="text-center">
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
          {title}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{route}</div>
      </div>
      <div
        className="relative"
        style={{
          width: 280,
          height: 560,
          borderRadius: 32,
          border: "1px solid rgba(255,255,255,0.10)",
          overflow: "hidden",
          background: "var(--bg-base, #0A0C0F)",
          boxShadow: "0 20px 40px rgba(0,0,0,0.40)",
        }}
      >
        {children}
      </div>
      <ol style={{ maxWidth: 280, margin: 0, padding: 0, listStyle: "none" }}>
        {legend.map((l, i) => (
          <li
            key={i}
            style={{
              fontSize: 11,
              color: "var(--text-secondary)",
              display: "flex",
              gap: 8,
              alignItems: "flex-start",
              marginTop: 4,
              lineHeight: 1.4,
            }}
          >
            <Callout n={i + 1} inline />
            <span>{l}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Callout({
  n,
  x,
  y,
  inline = false,
}: {
  n: number;
  x?: number;
  y?: number;
  inline?: boolean;
}) {
  const style: React.CSSProperties = inline
    ? { position: "relative" }
    : { position: "absolute", left: x, top: y, zIndex: 5 };
  return (
    <span
      style={{
        ...style,
        width: 18,
        height: 18,
        borderRadius: 999,
        background: "var(--neon-orange)",
        color: "#fff",
        fontSize: 10,
        fontWeight: 800,
        display: "inline-grid",
        placeItems: "center",
        flexShrink: 0,
        boxShadow: "0 0 8px rgba(255,107,53,0.60)",
      }}
    >
      {n}
    </span>
  );
}

function HomeWireframe() {
  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden"
      style={{ padding: "14px 12px 60px" }}
    >
      <Callout n={1} x={12} y={40} />
      <Callout n={2} x={12} y={100} />
      <Callout n={3} x={12} y={200} />
      <Callout n={4} x={12} y={252} />
      <Callout n={5} x={12} y={330} />
      <Callout n={6} x={12} y={450} />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div
            className="grid place-items-center"
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              background: "var(--neon-orange)",
              color: "#fff",
            }}
          >
            <Dumbbell className="h-3 w-3" />
          </div>
          <span style={{ fontSize: 11, fontWeight: 800, color: "var(--text-primary)" }}>
            HabitifyMe
          </span>
        </div>
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: 999,
            background: "var(--glass-2)",
            border: "1px solid var(--glass-border)",
          }}
        />
      </div>

      <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)" }}>
          Hey Arjun 👋
        </div>
        <span className="glass-pill mt-1">Week 2 · July</span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <MiniStat value="4" label="Workouts done" color="var(--neon-green)" />
        <MiniStat value="2,140" label="Kcal burned" color="var(--neon-amber)" />
      </div>

      <span className="focus-pill mt-3 self-start">
        <Target className="h-3 w-3" />
        <span style={{ fontSize: 10 }}>Beginner full-body · 4d/wk</span>
      </span>

      <div className="mt-3 flex gap-1">
        {[
          { w: "W1", state: "done" },
          { w: "W2", state: "active" },
          { w: "W3", state: "" },
          { w: "W4", state: "" },
        ].map((x) => (
          <div
            key={x.w}
            style={{
              flex: 1,
              padding: "5px 0",
              borderRadius: 8,
              textAlign: "center",
              fontSize: 10,
              fontWeight: 700,
              background:
                x.state === "active"
                  ? "rgba(255,107,53,0.15)"
                  : x.state === "done"
                  ? "rgba(0,229,160,0.10)"
                  : "var(--glass-2)",
              border: "1px solid",
              borderColor:
                x.state === "active"
                  ? "rgba(255,107,53,0.40)"
                  : x.state === "done"
                  ? "rgba(0,229,160,0.30)"
                  : "var(--glass-border)",
              color:
                x.state === "active"
                  ? "var(--neon-orange)"
                  : x.state === "done"
                  ? "var(--neon-green)"
                  : "var(--text-muted)",
            }}
          >
            {x.w}
          </div>
        ))}
      </div>

      <div className="mt-3" style={{ padding: 10, borderRadius: 12, background: "var(--glass-2)", border: "1px solid var(--glass-border)" }}>
        <div className="flex items-center justify-between" style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 6 }}>
          <span>Progress · Week 2</span>
          <span style={{ color: "var(--neon-orange)", fontWeight: 700 }}>50%</span>
        </div>
        <div className="prog-bar">
          <div style={{ width: "50%", height: "100%", background: "var(--neon-orange)", borderRadius: 999 }} />
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-1.5">
        {[
          { d: "Upper A — Push", n: 5, done: true },
          { d: "Upper B — Pull", n: 5, done: true },
          { d: "Lower A — Legs", n: 5, done: false },
          { d: "Full Body — Core", n: 5, done: false },
        ].map((r) => (
          <div key={r.d} className="flex items-center gap-2" style={{ padding: "6px 8px", borderRadius: 10, background: "var(--glass-1)" }}>
            {r.done ? (
              <CheckCircle2 className="h-3.5 w-3.5" style={{ color: "var(--neon-green)" }} />
            ) : (
              <Circle className="h-3.5 w-3.5" style={{ color: "var(--text-muted)" }} />
            )}
            <span style={{ fontSize: 11, color: "var(--text-primary)", flex: 1 }}>{r.d}</span>
            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{r.n} ex</span>
          </div>
        ))}
      </div>

      <div className="mt-3" style={{ padding: 10, borderRadius: 12, background: "rgba(255,184,48,0.08)", border: "1px solid rgba(255,184,48,0.25)" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--neon-amber)" }}>
          2,400 kcal · 130g protein
        </div>
        <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
          View 7-day diet plan →
        </div>
      </div>

      <BottomNavStub active="home" />
    </div>
  );
}

function CalendarWireframe() {
  const days = [
    { d: "Mon", n: 9, s: "done" },
    { d: "Tue", n: 10, s: "done" },
    { d: "Wed", n: 11, s: "active" },
    { d: "Thu", n: 12, s: "" },
    { d: "Fri", n: 13, s: "" },
    { d: "Sat", n: 14, s: "rest" },
    { d: "Sun", n: 15, s: "rest" },
  ];
  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden" style={{ padding: "14px 12px 60px" }}>
      <Callout n={1} x={12} y={60} />
      <Callout n={2} x={12} y={100} />
      <Callout n={3} x={12} y={180} />
      <Callout n={4} x={12} y={280} />
      <Callout n={5} x={12} y={370} />

      <div className="sec-label">Calendar</div>
      <div className="mt-2 flex gap-1.5">
        <span
          style={{
            padding: "4px 10px",
            borderRadius: 999,
            fontSize: 10,
            fontWeight: 700,
            background: "rgba(255,107,53,0.15)",
            color: "var(--neon-orange)",
            border: "1px solid rgba(255,107,53,0.40)",
          }}
        >
          Week
        </span>
        <span className="glass-pill">Month</span>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1">
        {days.map((d) => (
          <div
            key={d.d}
            style={{
              padding: "4px 0",
              borderRadius: 8,
              textAlign: "center",
              background:
                d.s === "active"
                  ? "rgba(255,107,53,0.15)"
                  : d.s === "done"
                  ? "rgba(0,229,160,0.10)"
                  : d.s === "rest"
                  ? "transparent"
                  : "var(--glass-2)",
              border: "1px solid",
              borderColor:
                d.s === "active"
                  ? "rgba(255,107,53,0.40)"
                  : d.s === "done"
                  ? "rgba(0,229,160,0.30)"
                  : "var(--glass-border)",
              color:
                d.s === "active"
                  ? "var(--neon-orange)"
                  : d.s === "done"
                  ? "var(--neon-green)"
                  : d.s === "rest"
                  ? "var(--text-muted)"
                  : "var(--text-secondary)",
              opacity: d.s === "rest" ? 0.5 : 1,
            }}
          >
            <div style={{ fontSize: 8, fontWeight: 700 }}>{d.d}</div>
            <div style={{ fontSize: 11, fontWeight: 800 }}>{d.n}</div>
          </div>
        ))}
      </div>

      <div className="mt-3">
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            padding: "3px 8px",
            borderRadius: 999,
            background: "rgba(255,107,53,0.15)",
            color: "var(--neon-orange)",
          }}
        >
          Push Day — in progress
        </span>
      </div>

      <div className="mt-2" style={{ padding: 10, borderRadius: 12, background: "rgba(77,158,255,0.08)", border: "1px solid rgba(77,158,255,0.25)" }}>
        <span className="focus-pill" style={{ fontSize: 9, padding: "3px 8px" }}>
          Push
        </span>
        <div style={{ fontSize: 10, color: "var(--text-secondary)", marginTop: 6, lineHeight: 1.5 }}>
          Push-Up · Pike Push-Up · Tricep Dip · Diamond Push-Up
        </div>
        <div style={{ marginTop: 8, padding: "5px 8px", borderRadius: 8, background: "var(--neon-orange)", color: "#fff", fontSize: 10, fontWeight: 700, textAlign: "center" }}>
          Open workout →
        </div>
      </div>

      <div className="mt-2" style={{ padding: 8, borderRadius: 10, background: "rgba(255,184,48,0.08)", border: "1px solid rgba(255,184,48,0.25)", fontSize: 10, color: "var(--text-secondary)", lineHeight: 1.5 }}>
        <div>Breakfast · 3 eggs, 2 roti · 410 kcal</div>
        <div>Lunch · Dal, rice, paneer · 610 kcal</div>
        <div>Snack · Yogurt, nuts · 210 kcal</div>
        <div>Dinner · Chicken roti sabzi · 500 kcal</div>
      </div>

      <div className="mt-2" style={{ padding: 8, borderRadius: 10, background: "rgba(166,123,255,0.10)", border: "1px solid rgba(166,123,255,0.30)" }}>
        <div style={{ fontSize: 10, color: "var(--neon-purple)", fontWeight: 700, marginBottom: 4 }}>
          2 of 4 workouts done · 50%
        </div>
        <div className="prog-bar">
          <div style={{ width: "50%", height: "100%", background: "var(--neon-purple)", borderRadius: 999 }} />
        </div>
      </div>

      <BottomNavStub active="calendar" />
    </div>
  );
}

function DietWireframe() {
  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden" style={{ padding: "14px 12px 60px" }}>
      <Callout n={1} x={12} y={60} />
      <Callout n={2} x={140} y={90} />
      <Callout n={3} x={12} y={200} />
      <Callout n={4} x={12} y={240} />
      <Callout n={5} x={12} y={310} />
      <Callout n={6} x={12} y={450} />

      <div className="sec-label flex items-center gap-1.5">
        <Utensils className="h-3 w-3" /> Today's Diet
      </div>

      <div className="mt-2 flex items-center gap-3" style={{ padding: 10, borderRadius: 14, background: "rgba(255,184,48,0.08)", border: "1px solid rgba(255,184,48,0.25)" }}>
        <svg width="70" height="70" viewBox="0 0 70 70">
          <circle cx="35" cy="35" r="28" stroke="rgba(255,255,255,0.08)" strokeWidth="6" fill="none" />
          <circle
            cx="35"
            cy="35"
            r="28"
            stroke="var(--neon-amber)"
            strokeWidth="6"
            fill="none"
            strokeDasharray={`${(2090 / 2500) * 176} 176`}
            strokeLinecap="round"
            transform="rotate(-90 35 35)"
          />
          <text x="35" y="34" textAnchor="middle" fill="var(--text-primary)" fontSize="10" fontWeight="800">
            2090
          </text>
          <text x="35" y="45" textAnchor="middle" fill="var(--text-muted)" fontSize="7">
            /2500 kcal
          </text>
        </svg>
        <div className="flex flex-col gap-1.5" style={{ fontSize: 10 }}>
          <MacroPill color="var(--neon-green)" label="Protein" v="145g" />
          <MacroPill color="var(--neon-blue)" label="Carbs" v="220g" />
          <MacroPill color="var(--neon-amber)" label="Fat" v="68g" />
        </div>
      </div>

      <div className="mt-2 self-start allergy-tag" style={{ fontSize: 9 }}>
        ⚠ Peanuts excluded
      </div>

      <div className="mt-2 flex gap-1">
        {["W1", "W2", "W3", "W4"].map((w) => (
          <span
            key={w}
            style={{
              flex: 1,
              textAlign: "center",
              padding: "3px 0",
              fontSize: 9,
              fontWeight: 700,
              borderRadius: 6,
              background: w === "W2" ? "rgba(255,107,53,0.15)" : "var(--glass-2)",
              color: w === "W2" ? "var(--neon-orange)" : "var(--text-muted)",
              border: "1px solid",
              borderColor: w === "W2" ? "rgba(255,107,53,0.40)" : "var(--glass-border)",
            }}
          >
            {w}
          </span>
        ))}
      </div>

      <div className="mt-1.5 flex gap-1">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span
            key={i}
            style={{
              flex: 1,
              textAlign: "center",
              padding: "3px 0",
              fontSize: 9,
              fontWeight: 700,
              borderRadius: 6,
              background: i === 2 ? "rgba(255,107,53,0.15)" : "var(--glass-1)",
              color: i === 2 ? "var(--neon-orange)" : "var(--text-muted)",
            }}
          >
            {d}
          </span>
        ))}
      </div>

      <div className="mt-2 flex flex-col gap-1.5">
        {[
          { i: "🍳", n: "Breakfast", k: 410 },
          { i: "🍛", n: "Lunch", k: 610 },
          { i: "🥜", n: "Snack", k: 210 },
          { i: "🍗", n: "Dinner", k: 500 },
        ].map((m) => (
          <div
            key={m.n}
            className="flex items-center gap-2"
            style={{ padding: "6px 8px", borderRadius: 10, background: "var(--glass-2)", border: "1px solid var(--glass-border)" }}
          >
            <span>{m.i}</span>
            <span style={{ fontSize: 11, color: "var(--text-primary)", flex: 1 }}>{m.n}</span>
            <span style={{ fontSize: 10, color: "var(--neon-amber)", fontWeight: 700 }}>{m.k} kcal</span>
          </div>
        ))}
      </div>

      <div
        className="mt-2"
        style={{
          padding: 8,
          borderLeft: "3px solid var(--neon-amber)",
          background: "rgba(255,184,48,0.08)",
          borderRadius: 8,
          fontSize: 10,
          color: "var(--text-secondary)",
        }}
      >
        Target: 145g protein today. Spread across all 4 meals.
      </div>

      <BottomNavStub active="diet" />
    </div>
  );
}

function MiniStat({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className="glass-stat" style={{ padding: "10px 8px" }}>
      <div style={{ fontSize: 18, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 2 }}>{label}</div>
    </div>
  );
}

function MacroPill({ color, label, v }: { color: string; label: string; v: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span style={{ width: 6, height: 6, borderRadius: 999, background: color }} />
      <span style={{ color: "var(--text-secondary)" }}>
        {label} <strong style={{ color: "var(--text-primary)" }}>{v}</strong>
      </span>
    </div>
  );
}

function BottomNavStub({ active }: { active: "home" | "calendar" | "workout" | "diet" | "profile" }) {
  const items: { k: typeof active; label: string }[] = [
    { k: "home", label: "Home" },
    { k: "calendar", label: "Calendar" },
    { k: "workout", label: "Workout" },
    { k: "diet", label: "Diet" },
    { k: "profile", label: "Profile" },
  ];
  return (
    <div
      className="absolute left-0 right-0 flex items-center justify-around"
      style={{
        bottom: 0,
        padding: "8px 6px",
        background: "rgba(10,12,15,0.90)",
        borderTop: "1px solid var(--glass-border)",
        backdropFilter: "blur(12px)",
      }}
    >
      {items.map((it) => (
        <div key={it.k} className="flex flex-col items-center gap-0.5">
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: 999,
              background: it.k === active ? "var(--neon-orange)" : "transparent",
              boxShadow: it.k === active ? "0 0 6px var(--neon-orange)" : "none",
            }}
          />
          <span
            style={{
              fontSize: 8,
              color: it.k === active ? "var(--neon-orange)" : "var(--text-muted)",
              fontWeight: 700,
            }}
          >
            {it.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────  TAB 4: DECISIONS  ───────────────────────── */

function DecisionsTab() {
  const decisions: {
    title: string;
    options: [string, string];
    choice: string;
    rationale: string;
  }[] = [
    {
      title: '"Finish workout" button is explicit, not automatic',
      options: [
        "Auto-complete when all exercises are logged",
        'Sticky "Finish workout" button user must press',
      ],
      choice: "Option B — explicit single-action confirmation",
      rationale:
        "Users open the day screen mid-session to check the next exercise, not just to mark completion. Auto-complete would falsely advance the streak.",
    },
    {
      title: "Streak is weekly completion count, not global days",
      options: [
        "Global day streak (like Duolingo) — resets if user misses a day",
        "Weekly completion count — resets per week, never punishes a rest day",
      ],
      choice: "Option B — weekly doneDays count",
      rationale:
        "Global streaks punish rest days and cause anxiety-driven over-training. Weekly counts reward consistency without penalising the rest the plan already schedules.",
    },
    {
      title: "Pre-filtered exercise catalog, not open LLM generation",
      options: [
        "Let the LLM freely name any exercises; look them up after",
        "Pre-filter the real catalog by equipment + level + injuries; send only valid IDs",
      ],
      choice: "Option B — closed catalog slice to LLM",
      rationale:
        "Open generation produces exercises the user's gym doesn't have or that load injured muscles. Sending only valid IDs guarantees images + instructions exist.",
    },
    {
      title: "Two-level logging (per-exercise + finish-day)",
      options: [
        'Single "I\'m done" at the end of the whole day',
        "Log each exercise individually, then explicitly finish",
      ],
      choice: "Option B — per-exercise log + sticky finish bar",
      rationale:
        "Per-exercise logs let us compute honest completion percentages (skipped exercises counted separately from completed ones) for adaptive next-week generation.",
    },
    {
      title: "Diet lives per-week, not per-day from the LLM",
      options: [
        "Generate a unique diet for each workout day (7 LLM calls/week)",
        "Generate one weekly diet object; show the right day by JS date index",
      ],
      choice: "Option B — one diet_json per week, day resolved client-side",
      rationale:
        "7 LLM calls per week adds cost and latency with minimal real benefit. One weekly diet object is predictable, cacheable, and editable without regeneration.",
    },
    {
      title: "Glassmorphism over claymorphism for dark mode",
      options: [
        "Claymorphism — warm beige, clay shadows, high chroma (V2 default)",
        "Dark glassmorphism — deep bg, frosted panels, neon accent glows",
      ],
      choice: "Option B — dark glassmorphism for the current UI direction",
      rationale:
        "Gym environments have harsh overhead lighting where dark UIs reduce glare and are easier to read one-handed between sets.",
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      {decisions.map((d, i) => (
        <div key={i} className="glass-card">
          <div className="flex items-start gap-2">
            <Sparkles className="h-4 w-4" style={{ color: "var(--neon-orange)", marginTop: 2 }} />
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
              {d.title}
            </div>
          </div>
          <div style={{ marginTop: 10 }}>
            <div className="sec-label" style={{ marginBottom: 4 }}>
              Options considered
            </div>
            <BulletList items={d.options} />
          </div>
          <div style={{ marginTop: 10 }}>
            <div className="sec-label" style={{ marginBottom: 4 }}>
              Choice
            </div>
            <div style={{ fontSize: 13, color: "var(--neon-orange)", fontWeight: 700 }}>
              {d.choice}
            </div>
          </div>
          <div style={{ marginTop: 10 }}>
            <div className="sec-label" style={{ marginBottom: 4 }}>
              Rationale
            </div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.55 }}>
              {d.rationale}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
