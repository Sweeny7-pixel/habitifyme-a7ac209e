import {
  createFileRoute,
  Outlet,
  redirect,
  Link,
  useRouterState,
  useNavigate,
} from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getProfile, getAllPlanWeeks } from "@/lib/gym.functions";
import {
  House,
  CalendarDays,
  Dumbbell,
  Utensils,
  User as UserIcon,
  LogOut,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedShell,
});

function AuthedShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const getProfileFn = useServerFn(getProfile);
  const getPlanFn = useServerFn(getAllPlanWeeks);

  const profileQ = useQuery({ queryKey: ["profile"], queryFn: () => getProfileFn() });
  const planQ = useQuery({ queryKey: ["planWeeks"], queryFn: () => getPlanFn() });

  const initial = (profileQ.data?.name?.trim()?.[0] ?? "G").toUpperCase();

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  }

  function openTodayWorkout() {
    const weeks = planQ.data?.weeks ?? [];
    const days = planQ.data?.days ?? [];
    if (!weeks.length) {
      navigate({ to: "/home" });
      return;
    }
    const active = weeks.find((w) => w.status === "active") ?? weeks[0];
    const activeDays = days.filter((d) => d.week_id === active.id);
    const next = activeDays.find((d) => !d.completed_at) ?? activeDays[0];
    if (next) navigate({ to: "/day/$dayId", params: { dayId: next.id } });
    else navigate({ to: "/home" });
  }

  const isActive = (prefix: string) =>
    pathname === prefix || pathname.startsWith(prefix + "/");

  return (
    <div
      className="fixed inset-0 flex items-stretch justify-center overflow-hidden sm:items-center"
      style={{ backgroundImage: "var(--bg-mesh)", backgroundColor: "var(--bg-base)" }}
    >
      <div className="glass-shell">
        {/* FROZEN HEADER */}
        <header
          className="z-50 shrink-0 border-b px-4 pb-3"
          style={{
            paddingTop: "calc(env(safe-area-inset-top) + 14px)",
            borderColor: "var(--glass-border)",
            backgroundColor: "rgba(10,12,15,0.85)",
            backdropFilter: "blur(20px) saturate(1.4)",
          }}
        >
          <div className="flex items-center justify-between">
            <Link to="/home" className="flex min-w-0 items-center gap-2.5">
              <div
                className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px] text-white"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(255,107,53,1), rgba(255,61,0,1))",
                  boxShadow:
                    "0 4px 16px rgba(255,107,53,0.45), inset 0 1px 0 rgba(255,255,255,0.18)",
                }}
              >
                <Dumbbell className="h-[18px] w-[18px]" />
              </div>
              <span
                className="truncate text-base font-extrabold tracking-tight"
                style={{ color: "var(--text-primary)" }}
              >
                HabitifyMe
              </span>
            </Link>
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={handleSignOut}
                aria-label="Sign out"
                className="grid h-8 w-8 place-items-center rounded-full border transition-colors"
                style={{
                  background: "var(--glass-2)",
                  borderColor: "var(--glass-border-bright)",
                  color: "var(--text-secondary)",
                }}
              >
                <LogOut className="h-4 w-4" />
              </button>
              <Link
                to="/profile"
                aria-label="Profile"
                className="grid h-9 w-9 place-items-center rounded-full text-sm font-extrabold text-white"
                style={{
                  background:
                    "linear-gradient(135deg, #FF6B35 0%, #A67BFF 100%)",
                  boxShadow:
                    "0 4px 16px rgba(255,107,53,0.35), inset 0 1px 0 rgba(255,255,255,0.20)",
                }}
              >
                {initial}
              </Link>
            </div>
          </div>
        </header>

        {/* INDEPENDENT SCROLL BASIN — the only overflow surface */}
        <main className="flex-1 w-full overflow-y-auto overflow-x-hidden overscroll-contain scrollbar-none px-4 py-4">
          <Outlet />
        </main>

        {/* FROZEN BOTTOM NAV */}
        <footer
          className="z-50 shrink-0 border-t pt-2"
          style={{
            paddingBottom: "calc(env(safe-area-inset-bottom) + 10px)",
            borderColor: "var(--glass-border)",
            backgroundColor: "rgba(10,12,15,0.90)",
            backdropFilter: "blur(20px) saturate(1.4)",
          }}
        >
          <nav className="flex items-stretch justify-around px-2">
            <NavBtn
              to="/home"
              active={isActive("/home")}
              icon={<House className="h-[22px] w-[22px]" />}
              label="Home"
            />
            <NavWorkoutBtn
              active={isActive("/day")}
              onClick={openTodayWorkout}
            />
            <NavBtn
              to="/diet"
              active={isActive("/diet")}
              icon={<Utensils className="h-[22px] w-[22px]" />}
              label="Nutrition"
            />
            <NavBtn
              to="/calendar"
              active={isActive("/calendar")}
              icon={<CalendarDays className="h-[22px] w-[22px]" />}
              label="Calendar"
            />
            <NavBtn
              to="/profile"
              active={isActive("/profile")}
              icon={<UserIcon className="h-[22px] w-[22px]" />}
              label="Profile"
            />
          </nav>
        </footer>
      </div>
    </div>
  );
}

function NavBtn({
  to,
  active,
  icon,
  label,
}: {
  to: "/home" | "/calendar" | "/diet" | "/profile";
  active: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      to={to}
      aria-label={label}
      className={`glass-nav-item ${active ? "glass-nav-item-active" : ""}`}
    >
      {icon}
      <span
        className="mt-1 h-[5px] w-[5px] rounded-full"
        style={{
          background: active ? "var(--neon-orange)" : "transparent",
          boxShadow: active ? "0 0 8px var(--neon-orange-glow)" : "none",
        }}
      />
    </Link>
  );
}

function NavWorkoutBtn({
  active,
  onClick,
}: {
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Today's workout"
      className={`glass-nav-item ${active ? "glass-nav-item-active" : ""}`}
    >
      <Dumbbell className="h-[22px] w-[22px]" />
      <span
        className="mt-1 h-[5px] w-[5px] rounded-full"
        style={{
          background: active ? "var(--neon-orange)" : "transparent",
          boxShadow: active ? "0 0 8px var(--neon-orange-glow)" : "none",
        }}
      />
    </button>
  );
}
