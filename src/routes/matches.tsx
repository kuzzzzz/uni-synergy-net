import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { toast } from "sonner";
import { Sparkles, MessageSquare, UserPlus } from "lucide-react";

export const Route = createFileRoute("/matches")({
  component: () => (
    <RequireAuth>
      <AppShell>
        <Matches />
      </AppShell>
    </RequireAuth>
  ),
});

type MatchRow = {
  id: string;
  full_name: string;
  department: string | null;
  year: string | null;
  bio: string | null;
  score: number;
  theyTeach: string[];
  iTeach: string[];
  shared: string[];
  availOverlap: number;
};

function Matches() {
  const { user } = useAuth();
  const [rows, setRows] = useState<MatchRow[]>([]);
  const [sent, setSent] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: me } = await supabase.from("profiles").select("id, department").eq("id", user.id).maybeSingle();
      const { data: others } = await supabase.from("profiles").select("id, full_name, department, year, bio").neq("id", user.id);

      const ids = [user.id, ...(others ?? []).map((o) => o.id)];
      const [{ data: skills }, { data: ints }, { data: av }, { data: cr }] = await Promise.all([
        supabase.from("user_skills").select("user_id, skill_id, level, skills(name)").in("user_id", ids),
        supabase.from("user_interests").select("user_id, interest_id, interests(name)").in("user_id", ids),
        supabase.from("availability").select("user_id, day_of_week, start_time, end_time").in("user_id", ids),
        supabase.from("connection_requests").select("to_user").eq("from_user", user.id),
      ]);

      setSent(new Set((cr ?? []).map((r) => r.to_user)));

      const my = (skills ?? []).filter((s) => s.user_id === user.id);
      const myWeak = new Map(my.filter((s) => s.level === "weak").map((s) => [s.skill_id, (s as any).skills?.name]));
      const myStrong = new Map(my.filter((s) => s.level === "strong" || s.level === "expert").map((s) => [s.skill_id, (s as any).skills?.name]));
      const myInts = new Set((ints ?? []).filter((i) => i.user_id === user.id).map((i) => i.interest_id));
      const myAv = (av ?? []).filter((a) => a.user_id === user.id);

      const scored = (others ?? []).map<MatchRow>((o) => {
        const theirs = (skills ?? []).filter((s) => s.user_id === o.id);
        const theyTeach = theirs.filter((s) => (s.level === "strong" || s.level === "expert") && myWeak.has(s.skill_id))
          .map((s) => (s as any).skills?.name).filter(Boolean);
        const iTeach = theirs.filter((s) => s.level === "weak" && myStrong.has(s.skill_id))
          .map((s) => myStrong.get(s.skill_id)).filter(Boolean);
        const theirInts = (ints ?? []).filter((i) => i.user_id === o.id);
        const shared = theirInts.filter((i) => myInts.has(i.interest_id)).map((i) => (i as any).interests?.name).filter(Boolean);
        const theirAv = (av ?? []).filter((a) => a.user_id === o.id);
        let overlap = 0;
        for (const a of myAv) for (const b of theirAv) {
          if (a.day_of_week === b.day_of_week && a.start_time < b.end_time && b.start_time < a.end_time) overlap++;
        }
        const deptBoost = o.department && me?.department && o.department === me.department ? 15 : 0;
        const score = Math.min(99, 30 + theyTeach.length * 12 + iTeach.length * 8 + shared.length * 5 + overlap * 4 + deptBoost);
        return { ...o, score, theyTeach, iTeach, shared, availOverlap: overlap };
      });
      scored.sort((a, b) => b.score - a.score);
      setRows(scored);
    })();
  }, [user]);

  async function connect(toUser: string) {
    if (!user) return;
    const { error } = await supabase.from("connection_requests").insert({ from_user: user.id, to_user: toUser });
    if (error) return toast.error(error.message);
    setSent((s) => new Set(s).add(toUser));
    toast.success("Connection request sent");
  }

  const filtered = rows.filter((r) => !filter || r.full_name.toLowerCase().includes(filter.toLowerCase()) || (r.department ?? "").toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-2"><Sparkles className="size-6 text-primary" /> Smart Matches</h1>
          <p className="text-muted-foreground mt-1">Ranked by complementary skills, shared interests, and schedule overlap.</p>
        </div>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by name or department"
          className="h-10 px-3 bg-secondary border border-border rounded-lg text-sm w-72 outline-none focus:ring-2 focus:ring-ring/30"
        />
      </div>

      {filtered.length === 0 && <div className="text-muted-foreground text-sm">No matches yet — add skills to your profile.</div>}

      <div className="grid md:grid-cols-2 gap-5">
        {filtered.map((m) => (
          <div key={m.id} className="bg-card border border-border rounded-2xl p-5 shadow-soft">
            <div className="flex items-start gap-4">
              <div className="size-14 rounded-xl bg-gradient-brand flex items-center justify-center text-white font-bold text-lg shrink-0">
                {m.full_name?.[0]?.toUpperCase() ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold truncate">{m.full_name}</h3>
                  <div className="text-right shrink-0">
                    <div className="text-xl font-bold text-gradient-brand leading-none">{m.score}%</div>
                    <div className="text-[9px] uppercase tracking-wider text-muted-foreground">match</div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">{m.department ?? "—"} {m.year ? `• ${m.year}` : ""}</div>
                {m.bio && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{m.bio}</p>}
              </div>
            </div>
            <div className="mt-4 space-y-1.5 text-xs">
              {m.theyTeach.length > 0 && <Row label="Can help you with" items={m.theyTeach} color="text-primary" />}
              {m.iTeach.length > 0 && <Row label="You can help with" items={m.iTeach} color="text-accent" />}
              {m.shared.length > 0 && <Row label="Shared interests" items={m.shared} color="text-success" />}
              {m.availOverlap > 0 && <div className="text-muted-foreground">⏱ {m.availOverlap} overlapping availability slot{m.availOverlap > 1 ? "s" : ""}</div>}
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => connect(m.id)}
                disabled={sent.has(m.id)}
                className="flex-1 h-9 bg-primary text-primary-foreground rounded-lg text-sm font-medium inline-flex items-center justify-center gap-1 disabled:opacity-50"
              >
                <UserPlus className="size-4" /> {sent.has(m.id) ? "Requested" : "Connect"}
              </button>
              <Link to="/messages" className="h-9 px-3 bg-secondary border border-border rounded-lg text-sm inline-flex items-center gap-1">
                <MessageSquare className="size-4" /> Message
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Row({ label, items, color }: { label: string; items: string[]; color: string }) {
  return (
    <div>
      <span className={`font-semibold ${color}`}>{label}: </span>
      <span className="text-muted-foreground">{items.join(", ")}</span>
    </div>
  );
}
