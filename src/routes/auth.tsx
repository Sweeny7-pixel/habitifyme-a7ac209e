import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dumbbell } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — GymBuddy" },
      { name: "description", content: "Sign in or create your GymBuddy account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/home" });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin + "/home" },
        });
        if (error) {
          if (/registered|exists/i.test(error.message)) {
            toast.error("That email is already registered. Please sign in.");
            setMode("signin");
            return;
          }
          throw error;
        }
        if (!data.session) {
          toast.info("Check your inbox to confirm your email, then sign in.");
          setMode("signin");
          setPassword("");
          return;
        }
        toast.success("Account created. Let's set you up.");
        navigate({ to: "/home" });
        return;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/home" });
        return;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[375px] flex-col justify-center px-5 py-10">
        <Link to="/" className="mb-8 flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-[12px] bg-[var(--neon-orange)] text-white shadow-[0_0_18px_var(--neon-orange-glow)]">
            <Dumbbell className="h-5 w-5" />
          </div>
          <span className="text-lg font-extrabold tracking-tight">GymBuddy</span>
        </Link>

        <h1 className="text-[26px] font-extrabold tracking-tight">
          {mode === "signup" ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          {mode === "signup" ? "Takes 30 seconds. No card needed." : "Sign in to your weekly plan."}
        </p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-3">
          <input
            type="email" required placeholder="Email" value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="glass-input"
          />
          <input
            type="password" required placeholder="Password (min 6 chars)" minLength={6} value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="glass-input"
          />
          <button type="submit" disabled={loading} className="glass-btn w-full">
            {loading ? "…" : mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
          className="mt-5 text-center text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          {mode === "signup" ? "Already have an account? Sign in" : "New here? Create account"}
        </button>
      </div>
    </div>
  );
}
