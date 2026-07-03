## Goal
Add a full-screen "How it works" modal to the landing page that presents PRD, user journeys, wireframes, and design decisions — all in a single tabbed in-page modal (no new route, no URL change).

## Files

**New:** `src/components/HowItWorksModal.tsx`
- Signature: `export function HowItWorksModal({ onClose }: { onClose: () => void })`
- Uses existing design tokens/utilities only (`glass-card`, `glass-pill`, `glass-btn`, `glass-btn-ghost`, `glass-modal-overlay`, `glass-sheet-close`, `sec-label`, `focus-pill`, `prog-bar`, neon color vars).
- Modal shell: `glass-modal-overlay` backdrop + inner panel (inset-4 / md:inset-10, max-w 900px, rounded 28px, scrollable). Body scroll lock, Escape + backdrop click close, sticky close button (`glass-sheet-close`).
- Sticky header inside panel: title "How HabitifyMe Works" + subtitle, tab bar directly beneath (sticky top:0, blurred bg).
- 4 tabs via `useState` — no router:
  - **Tab 1 PRD**: 6 collapsible section cards (A Problem / B V1 Shipped / C V2 Extended / D V3 Partial + Shipped fix / E Deferred to V4 / F Out of Scope) with letter badge + rotating chevron. Content sub-cards: research insights, persona (Arjun) with correctly attributed Parth quote, success metric card, per-feature "To Address" italic + bullets.
  - **Tab 2 User Journeys**: 3 horizontal flex journey rows (overflow-x auto on mobile), each step is a ~140px `glass-card` with numbered pill, title, action, note, and colored emotion dot (green/amber/red). Arrow `→` between steps.
  - **Tab 3 Wireframes**: 3 phone-shaped shells (280×560, rounded 32, bg var(--bg-base)) rendering Home / Calendar / Diet using real glass utilities (not gray placeholders). Numbered orange callout bubbles + legend below each shell. Side-by-side on desktop, stacked on mobile.
  - **Tab 4 Design Decisions**: 6 decision cards — title, 2 option bullets, choice in neon-orange, 2-sentence rationale.
- Icons from `lucide-react` only. No new packages, no data fetching, no auth.

**Modified:** `src/routes/index.tsx`
- Add `import { useState } from "react"` and `import { HowItWorksModal } from "@/components/HowItWorksModal"`.
- Add `const [showHowItWorks, setShowHowItWorks] = useState(false)`.
- Replace the `<a href="#how">How it works</a>` with a `<button type="button" onClick={() => setShowHowItWorks(true)}>` using the same classes.
- Remove `id="how"` from the features `<section>`.
- Render `{showHowItWorks && <HowItWorksModal onClose={() => setShowHowItWorks(false)} />}` before the outer closing `</div>`.
- Hero, feature grid, footer unchanged.

## Non-goals
- No new route, no router changes, no URL update.
- No changes to CSS tokens, existing utilities, or backend.
- No new dependencies.
