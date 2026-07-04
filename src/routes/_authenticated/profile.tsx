import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { getProfile, getAllWeeks, updateAllergies } from "@/lib/gym.functions";
import { savePushSubscription, deletePushSubscription, sendTestPush } from "@/lib/push.functions";
import { getAchievements } from "@/lib/achievements";
import { getTotalXP, getLevelTitle } from "@/lib/xp";
import {
  pushSupported,
  isIosSafari,
  subscribeToPush,
  unsubscribeFromPush,
  getExistingPushSubscription,
  serializeSubscription,
} from "@/lib/push-client";
import { supabase } from "@/integrations/supabase/client";

import {
  Loader2,
  User as UserIcon,
  Activity,
  Ruler,
  Scale,
  Target,
  Award,
  CalendarDays,
  Dumbbell,
  AlertTriangle,
  X,
  Plus,
  Heart,
  LogOut,
  TrendingUp,
  Settings,
  Bell,
  BellOff,
  Send,
} from "lucide-react";

import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — HabitifyMe" },
      { name: "description", content: "Your training profile, stats, and preferences." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const getProfileFn = useServerFn(getProfile);
  const getAllWeeksFn = useServerFn(getAllWeeks);
  const updateAllergiesFn = useServerFn(updateAllergies);
  const getAchievementsFn = useServerFn(getAchievements);
  const getTotalXPFn = useServerFn(getTotalXP);

  const profileQ = useQuery({ queryKey: ["profile"], queryFn: () => getProfileFn() });
  const weeksQ = useQuery({ queryKey: ["allWeeks"], queryFn: () => getAllWeeksFn() });
  const achievementsQ = useQuery({ queryKey: ["achievements"], queryFn: () => getAchievementsFn(), staleTime: 30_000 });
  const xpQ = useQuery({ queryKey: ["totalXP"], queryFn: () => getTotalXPFn(), staleTime: 30_000 });

  const [tags, setTags] = useState<string[]>([]);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (profileQ.data?.allergies) {
      setTags(
        profileQ.data.allergies
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      );
    } else {
      setTags([]);
    }
  }, [profileQ.data?.allergies]);

  const saveAllergies = useMutation({
    mutationFn: async (next: string[]) =>
      updateAllergiesFn({ data: { allergies: next.join(", ") } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Allergies updated. Diet will regenerate on refresh.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const stats = useMemo(() => {
    const weeks = weeksQ.data?.weeks ?? [];
    const reviews = weeksQ.data?.reviews ?? [];
    const avg = reviews.length
      ? Math.round(reviews.reduce((s, r) => s + r.completion_pct, 0) / reviews.length)
      : 0;
    return {
      weeksStarted: weeks.length,
      weeksDone: weeks.filter((w) => w.status === "completed").length,
      avgCompletion: avg,
      reviewsDone: reviews.length,
      weeks,
      reviews,
    };
  }, [weeksQ.data]);

  if (profileQ.isLoading) {
    return (
      <div className="flex justify-center pt-16">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--neon-orange)]" />
      </div>
    );
  }

  const p = profileQ.data;
  if (!p) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-4">
        <UserIcon className="mb-3 h-8 w-8 text-[var(--text-muted)]" />
        <h2 className="text-lg font-extrabold text-[var(--text-primary)]">No profile yet</h2>
        <p className="mt-1 max-w-xs text-sm text-[var(--text-secondary)]">
          Set up your profile to personalize your plan.
        </p>
        <Link to="/onboarding" className="glass-btn glass-btn-sm mt-4">Start onboarding</Link>
      </div>
    );
  }

  const initial = (p.name?.trim()?.[0] ?? "G").toUpperCase();

  function addTag() {
    const v = draft.trim();
    if (!v || tags.includes(v)) {
      setDraft("");
      return;
    }
    const next = [...tags, v];
    setTags(next);
    setDraft("");
    saveAllergies.mutate(next);
  }
  function removeTag(t: string) {
    const next = tags.filter((x) => x !== t);
    setTags(next);
    saveAllergies.mutate(next);
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <div className="space-y-4 pt-2">
      {/* Hero */}
      <div className="profile-radial-glow glass-card relative overflow-hidden flex items-center gap-4">
        <div className="profile-avatar">{initial}</div>
        <div className="min-w-0 relative z-10">
          <div className="text-xl font-extrabold tracking-tight truncate text-[var(--text-primary)]">
            {p.name}
          </div>
          <div className="text-xs text-[var(--text-secondary)] mt-0.5 capitalize">
            {p.goal} · {p.experience}
          </div>
          <div className="mt-2 flex gap-1.5">
            <span className="glass-pill"><Target className="h-3 w-3" /> {p.goal}</span>
            <span className="glass-pill"><Activity className="h-3 w-3" /> {p.experience}</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2.5">
        <StatCard label="Weeks started" value={String(stats.weeksStarted)} accent="var(--neon-orange)" />
        <StatCard label="Weeks done" value={String(stats.weeksDone)} accent="var(--neon-green)" />
        <StatCard label="Avg completion" value={`${stats.avgCompletion}%`} accent="var(--neon-amber)" />
        <StatCard label="Reviews done" value={String(stats.reviewsDone)} accent="var(--neon-blue)" />
      </div>

      {/* Notifications */}
      <NotificationsSection />

      {/* XP & Level */}
      {xpQ.data && (
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div
                className="grid h-8 w-8 place-items-center rounded-xl text-sm font-extrabold"
                style={{
                  background: "rgba(166,123,255,0.15)",
                  border: "1px solid rgba(166,123,255,0.35)",
                  color: "var(--neon-purple)",
                }}
              >
                {xpQ.data.level}
              </div>
              <div>
                <div className="text-sm font-extrabold text-[var(--text-primary)]">
                  {xpQ.data.title}
                </div>
                <div className="text-[10px] text-[var(--text-muted)]">
                  {xpQ.data.totalXP.toLocaleString()} XP total
                </div>
              </div>
            </div>
            <div className="text-xs font-extrabold" style={{ color: "var(--neon-purple)" }}>
              {xpQ.data.progress}%
            </div>
          </div>
          <div className="prog-bar">
            <div
              className="h-full transition-all"
              style={{
                width: `${xpQ.data.progress}%`,
                background: "var(--neon-purple)",
                boxShadow: "0 0 10px rgba(166,123,255,0.45)",
              }}
            />
          </div>
          <div className="text-[10px] text-[var(--text-muted)] mt-1">
            {xpQ.data.currentXP} / {xpQ.data.nextLevelXP} XP to Level {xpQ.data.level + 1} — {getLevelTitle(xpQ.data.level + 1)}
          </div>
        </div>
      )}

      {/* Achievements */}
      <section>
        <div className="sec-label mb-2 flex items-center gap-1.5">
          <Award className="h-3.5 w-3.5" /> Achievements
        </div>
        {achievementsQ.isLoading ? (
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-square animate-pulse rounded-2xl bg-white/5" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {(achievementsQ.data ?? []).map((a) => (
              <div
                key={a.key}
                className={a.unlocked ? "achievement-badge-unlocked" : "achievement-badge-locked"}
                title={`${a.label}: ${a.description}`}
              >
                <div className="text-2xl leading-none">{a.icon}</div>
                <div className="mt-1 text-[9px] font-bold uppercase tracking-wider leading-tight text-center">
                  {a.label}
                </div>
              </div>
            ))}
          </div>
        )}
        {achievementsQ.data && achievementsQ.data.filter((a) => a.unlocked).length > 0 && (
          <p className="mt-2 text-[10px] text-[var(--text-muted)]">
            {achievementsQ.data.filter((a) => a.unlocked).length} / {achievementsQ.data.length} badges unlocked
          </p>
        )}
      </section>

      {/* Details */}
      <section>
        <div className="sec-label mb-2">Profile details</div>
        <div className="glass-card divide-y divide-white/5 p-0">
          <DetailRow icon={<UserIcon className="h-3.5 w-3.5" />} k="Age" v={p.age ? `${p.age}` : "—"} />
          <DetailRow icon={<Ruler className="h-3.5 w-3.5" />} k="Height" v={p.height_cm ? `${p.height_cm} cm` : "—"} />
          <DetailRow icon={<Scale className="h-3.5 w-3.5" />} k="Weight" v={p.weight_kg ? `${p.weight_kg} kg` : "—"} />
          <DetailRow icon={<Activity className="h-3.5 w-3.5" />} k="Experience" v={p.experience} />
          <DetailRow icon={<Dumbbell className="h-3.5 w-3.5" />} k="Equipment" v={p.equipment} />
          <DetailRow icon={<CalendarDays className="h-3.5 w-3.5" />} k="Days / week" v={`${p.days_per_week}`} />
          <DetailRow icon={<Target className="h-3.5 w-3.5" />} k="Goal" v={p.goal} />
          {p.injuries && (
            <DetailRow icon={<Heart className="h-3.5 w-3.5" />} k="Injuries" v={p.injuries} />
          )}
        </div>
      </section>

      {/* Allergies */}
      <section>
        <div className="sec-label mb-2 flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5" /> Food allergies
        </div>
        <div className="glass-card glass-card-red">
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Add foods we should never include in your diet. Regenerate the diet plan
            after changes.
          </p>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {tags.map((t) => (
                <span key={t} className="allergy-pill">
                  {t}
                  <button onClick={() => removeTag(t)} aria-label={`Remove ${t}`} className="text-[var(--neon-red,#ff4646)]">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2 mt-3">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder="e.g. peanuts"
              className="glass-input flex-1 rounded-full"
            />
            <button
              onClick={addTag}
              className="glass-btn glass-btn-sm rounded-full px-3"
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </div>
        </div>
      </section>

      {/* Weekly progress */}
      <section>
        <div className="sec-label mb-2 flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5" /> Weekly progress
        </div>
        <div className="glass-card space-y-2.5">
          {stats.weeks.length === 0 && (
            <p className="text-xs text-[var(--text-secondary)]">
              Complete your first week to see your progress here.
            </p>
          )}
          {stats.weeks.map((w) => {
            const r = stats.reviews.find((x) => x.week_id === w.id);
            const pct = r?.completion_pct ?? 0;
            return (
              <div key={w.id} className="flex items-center gap-3">
                <div className="w-14 shrink-0 text-[11px] font-bold text-[var(--text-secondary)]">
                  Week {w.week_number}
                </div>
                <div className="flex-1 weekly-progress-fill">
                  <div style={{ width: `${pct}%` }} />
                </div>
                <div className="w-9 text-right text-[11px] font-extrabold text-[var(--neon-orange)]">
                  {pct}%
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Actions */}
      <section className="space-y-2">
        <Link to="/progress" className="glass-btn glass-btn-ghost">
          <Award className="h-4 w-4" /> View full progress
        </Link>
        <Link to="/onboarding" className="glass-btn glass-btn-ghost">
          <Settings className="h-4 w-4" /> Edit profile
        </Link>
        <button onClick={signOut} className="glass-btn glass-btn-ghost">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </section>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="glass-card flex flex-col">
      <div
        className="text-[22px] font-extrabold tracking-tight"
        style={{ color: accent ?? "var(--text-primary)", textShadow: accent ? `0 0 12px ${accent}` : undefined }}
      >
        {value}
      </div>
      <div className="sec-label mt-1">{label}</div>
    </div>
  );
}

function DetailRow({ icon, k, v }: { icon: React.ReactNode; k: string; v: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">
        <span className="text-[var(--neon-orange)]">{icon}</span> {k}
      </div>
      <div className="text-[13px] font-extrabold text-[var(--text-primary)] capitalize">{v}</div>
    </div>
  );
}

function NotificationsSection() {
  const savePushFn = useServerFn(savePushSubscription);
  const deletePushFn = useServerFn(deletePushSubscription);
  const sendTestFn = useServerFn(sendTestPush);

  const [supported] = useState(() => pushSupported());
  const [ios] = useState(() => (typeof window !== "undefined" ? isIosSafari() : false));
  const [permission, setPermission] = useState<NotificationPermission | "unknown">(
    typeof Notification !== "undefined" ? Notification.permission : "unknown",
  );
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const s = await getExistingPushSubscription();
      if (alive) setSubscribed(!!s);
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const result = await subscribeToPush();
      if (!result.ok) {
        if (result.reason === "denied") {
          setPermission("denied");
          toast.error("Notifications blocked. Enable them in browser settings.");
        } else if (result.reason === "ios-standalone") {
          toast.error("On iOS, add HabitifyMe to your Home Screen first, then enable.");
        } else if (result.reason === "preview") {
          toast.error("Enable notifications in the published app, not the preview.");
        } else if (result.reason === "unsupported") {
          toast.error("This browser doesn't support push notifications.");
        } else {
          toast.error("Couldn't enable notifications. Try again.");
        }
        return;
      }
      await savePushFn({ data: serializeSubscription(result.subscription) });
      setSubscribed(true);
      setPermission("granted");
      toast.success("Notifications enabled.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to enable notifications.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const sub = await unsubscribeFromPush();
      if (sub) await deletePushFn({ data: { endpoint: sub.endpoint } });
      setSubscribed(false);
      toast.success("Notifications disabled.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to disable.");
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setBusy(true);
    try {
      const res = await sendTestFn();
      if (res.sent > 0) {
        toast.success(`Test sent to ${res.sent} device${res.sent === 1 ? "" : "s"}. Check your notifications.`);
      } else {
        toast.error("Test could not be delivered. Try re-enabling.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send test.");
    } finally {
      setBusy(false);
    }
  }

  const statusLabel = !supported
    ? "Unsupported"
    : permission === "denied"
      ? "Blocked in browser"
      : subscribed
        ? "Enabled"
        : "Disabled";
  const statusColor = subscribed
    ? "var(--neon-green)"
    : permission === "denied"
      ? "var(--neon-orange)"
      : "var(--text-muted)";

  return (
    <section>
      <div className="sec-label mb-2 flex items-center gap-1.5">
        <Bell className="h-3.5 w-3.5" /> Notifications
      </div>
      <div className="glass-card p-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="text-xs text-[var(--text-secondary)]">
            Daily 5am · End-of-week 9pm · Achievements
          </div>
          <span
            className="text-[10px] font-extrabold uppercase tracking-wider"
            style={{ color: statusColor }}
          >
            {statusLabel}
          </span>
        </div>

        {!supported && (
          <p className="text-[11px] text-[var(--text-muted)]">
            This browser doesn't support push notifications.
          </p>
        )}
        {supported && ios && !subscribed && (
          <p className="text-[11px] text-[var(--neon-amber)]">
            On iPhone: tap Share → Add to Home Screen, then open the installed app to enable.
          </p>
        )}
        {supported && permission === "denied" && (
          <p className="text-[11px] text-[var(--neon-orange)]">
            Blocked in browser settings. Re-enable there and refresh.
          </p>
        )}

        {supported && (
          <div className="flex flex-wrap gap-2">
            {!subscribed && permission !== "denied" && (
              <button
                onClick={enable}
                disabled={busy}
                className="glass-btn glass-btn-sm inline-flex items-center gap-1.5"
              >
                <Bell className="h-3.5 w-3.5" /> Enable notifications
              </button>
            )}
            {subscribed && (
              <>
                <button
                  onClick={sendTest}
                  disabled={busy}
                  className="glass-btn glass-btn-sm inline-flex items-center gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" /> Send test
                </button>
                <button
                  onClick={disable}
                  disabled={busy}
                  className="glass-btn glass-btn-sm inline-flex items-center gap-1.5"
                  style={{ color: "var(--text-muted)" }}
                >
                  <BellOff className="h-3.5 w-3.5" /> Disable
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

