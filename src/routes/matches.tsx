import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { toast } from "sonner";
import { ChevronDown, MessageSquare, Sparkles, UserPlus } from "lucide-react";

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
  components: {
    complementary: number;
    jaccard: number;
    cosine: number;
    availability: number;
    department: number;
  };
};

type SkillRow = {
  user_id: string;
  skill_id: string;
  level: "weak" | "medium" | "strong" | "expert";
  skills?: { name?: string } | null;
};

type InterestRow = {
  user_id: string;
  interest_id: string;
  interests?: { name?: string } | null;
};

const LEVEL_VALUE: Record<SkillRow["level"], number> = {
  weak: 1,
  medium: 2,
  strong: 3,
  expert: 4,
};

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const value of a) if (b.has(value)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function cosineSkillSimilarity(a: SkillRow[], b: SkillRow[]): number {
  const aMap = new Map(a.map((s) => [s.skill_id, LEVEL_VALUE[s.level]]));
  const bMap = new Map(b.map((s) => [s.skill_id, LEVEL_VALUE[s.level]]));
  const ids = new Set([...aMap.keys(), ...bMap.keys()]);
  if (ids.size === 0) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (const id of ids) {
    const av = aMap.get(id) ?? 0;
    const bv = bMap.get(id) ?? 0;
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function complementarySkillScore(mySkills: SkillRow[], theirSkills: SkillRow[]) {
  const myWeak = new Map(mySkills.filter((s) => s.level === "weak").map((s) => [s.skill_id, s.skills?.name ?? s.skill_id]));
  const myStrong = new Map(mySkills.filter((s) => s.level === "strong" || s.level === "expert").map((s) => [s.skill_id, s.skills?.name ?? s.skill_id]));
  const theirStrong = theirSkills.filter((s) => s.level === "strong" || s.level === "expert");
  const theirWeak = theirSkills.filter((s) => s.level === "weak");

  const theyTeach = theirStrong.filter((s) => myWeak.has(s.skill_id)).map((s) => s.skills?.name ?? s.skill_id);
  const iTeach = theirWeak.filter((s) => myStrong.has(s.skill_id)).map((s) => myStrong.get(s.skill_id) ?? s.skill_id);

  const teachCoverage = myWeak.size > 0 ? Math.min(1, theyTeach.length / myWeak.size) : 0;
  const learnCoverage = theirWeak.length > 0 ? Math.min(1, iTeach.length / theirWeak.length) : 0;
  return {
    score: Math.min(1, teachCoverage * 0.6 + learnCoverage * 0.4),
    theyTeach,
    iTeach,
  };
}

export function calculateHybridMatchScore({ complementary, jaccard, cosine, availability, department }: {
  complementary: number;
  jaccard: number;
  cosine: number;
  availability: number;
  department: number;
}): number {
  const normalized = 0.45 * complementary + 0.20 * jaccard + 0.15 * cosine + 0.10 * availability + 0.10 * department;
  return Math.round(Math.max(0, Math.min(1, normalized)) * 100);
}

function scoreTone(score: number) {
  if (score >= 80) return "text-success";
  if (score >= 60) return "text-primary";
  if (score >= 40) return "text-foreground";
  return "text-muted-foreground";
}

function ScoreBar({ label, value, weight }: { label: string; value: number; weight: string }) {
  const percent = Math.round(value * 100);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-foreground font-medium">{label}</span>
        <span className="text-muted-foreground">{percent}% <span className="opacity-60">· {weight}</span></span>
      </div>
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function Matches() {
  const { user } = useAuth();
  const [rows, setRows] = useState<MatchRow[]>([]);
  const [sent, setSent] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
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
      const allSkills = (skills ?? []) as SkillRow[];
      const allInterests = (ints ?? []) as InterestRow[];
      const mySkills = allSkills.filter((s) => s.user_id === user.id);
      const myInts = new Set(allInterests.filter((i) => i.user_id === user.id).map((i) => i.interest_id));
      const myAv = (av ?? []).filter((a) => a.user_id === user.id);

      const scored = (others ?? []).map<MatchRow>((o) => {
        const theirSkills = allSkills.filter((s) => s.user_id === o.id);
        const complementary = complementarySkillScore(mySkills, theirSkills);
        const theirInts = allInterests.filter((i) => i.user_id === o.id);
        const theirIntSet = new Set(theirInts.map((i) => i.interest_id));
        const jaccard = jaccardSimilarity(myInts, theirIntSet);
        const shared = theirInts.filter((i) => myInts.has(i.interest_id)).map((i) => i.interests?.name ?? i.interest_id);
        const cosine = cosineSkillSimilarity(mySkills, theirSkills);
        const theirAv = (av ?? []).filter((a) => a.user_id === o.id);
        let overlap = 0;
        for (const a of myAv) for (const b of theirAv) {
          if (a.day_of_week === b.day_of_week && a.start_time < b.end_time && b.start_time < a.end_time) overlap++;
        }
        const maxAvailability = Math.max(myAv.length, theirAv.length);
        const availability = maxAvailability > 0 ? Math.min(1, overlap / maxAvailability) : 0;
        const department = o.department && me?.department && o.department === me.department ? 1 : 0;
        const score = calculateHybridMatchScore({ complementary: complementary.score, jaccard, cosine, availability, department });
        return { ...o, score, theyTeach: complementary.theyTeach, iTeach: complementary.iTeach, shared, availOverlap: overlap, components: { complementary: complementary.score, jaccard, cosine, availability, department } };
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

  const toggleExpanded = (id: string) => setExpanded((current) => {
    const next = new Set(current);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const filtered = rows.filter((r) => !filter || r.full_name.toLowerCase().includes(filter.toLowerCase()) || (r.department ?? "").toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold flex items-center gap-2"><Sparkles className="size-6 text-primary" /> Smart Matches</h1>
          <p className="text-muted-foreground mt-1">Personalized matches based on skills, interests, availability, and academic context.</p>
        </div>
        <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter by name or department" className="h-10 px-3 bg-secondary border border-border rounded-lg text-sm w-72 outline-none focus:ring-2 focus:ring-ring/30" />
      </div>

      {filtered.length === 0 && <div className="text-muted-foreground text-sm">No matches yet — add skills to your profile.</div>}

      <div className="grid md:grid-cols-2 gap-5">
        {filtered.map((m) => {
          const isExpanded = expanded.has(m.id);
          return (
            <div key={m.id} className="bg-card border border-border rounded-2xl p-5 shadow-soft">
              <div className="flex items-start gap-4">
                <div className="size-14 rounded-xl bg-gradient-brand flex items-center justify-center text-white font-bold text-lg shrink-0">{m.full_name?.[0]?.toUpperCase() ?? "?"}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold truncate">{m.full_name}</h3>
                    <div className="text-right shrink-0">
                      <div className={`text-xl font-bold ${scoreTone(m.score)} leading-none`}>{m.score}%</div>
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

              <button onClick={() => toggleExpanded(m.id)} className="mt-4 w-full h-9 px-3 bg-secondary/70 hover:bg-secondary border border-border rounded-lg text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors" aria-expanded={isExpanded}>
                <Sparkles className="size-3.5" /> Why this match?
                <ChevronDown className={`size-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
              </button>

              {isExpanded && (
                <div className="mt-3 rounded-xl border border-border bg-secondary/30 p-4 space-y-3">
                  <div>
                    <div className="text-sm font-semibold">Match breakdown</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">The score combines collaboration potential with profile similarity and practical compatibility.</div>
                  </div>
                  <ScoreBar label="Complementary skills" value={m.components.complementary} weight="45% weight" />
                  <ScoreBar label="Shared interests" value={m.components.jaccard} weight="20% weight" />
                  <ScoreBar label="Skill similarity" value={m.components.cosine} weight="15% weight" />
                  <ScoreBar label="Availability" value={m.components.availability} weight="10% weight" />
                  <ScoreBar label="Department" value={m.components.department} weight="10% weight" />
                  <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Final weighted score</span>
                    <span className="font-bold">{m.score}%</span>
                  </div>
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <button onClick={() => connect(m.id)} disabled={sent.has(m.id)} className="flex-1 h-9 bg-primary text-primary-foreground rounded-lg text-sm font-medium inline-flex items-center justify-center gap-1 disabled:opacity-50"><UserPlus className="size-4" /> {sent.has(m.id) ? "Requested" : "Connect"}</button>
                <Link to="/messages" className="h-9 px-3 bg-secondary border border-border rounded-lg text-sm inline-flex items-center gap-1"><MessageSquare className="size-4" /> Message</Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Row({ label, items, color }: { label: string; items: string[]; color: string }) {
  return <div><span className={`font-semibold ${color}`}>{label}: </span><span className="text-muted-foreground">{items.join(", ")}</span></div>;
}
