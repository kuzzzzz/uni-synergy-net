import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { NetworkGraph, type GraphNode, type GraphEdge } from "@/components/NetworkGraph";
import { Sparkles, Users, ArrowRight, Calendar, TrendingUp } from "lucide-react";
import { calculateHybridMatchScore, complementarySkillScore, cosineSkillSimilarity, jaccardSimilarity, type MatchingSkill } from "@/lib/matching";

export const Route = createFileRoute("/dashboard")({ component: () => <RequireAuth><AppShell><Dashboard /></AppShell></RequireAuth> });

type Profile = { id: string; full_name: string; department: string | null; year: string | null };
type Project = { id: string; title: string; description: string | null; status: string; required_skills: string[] | null };
type SessionRow = { id: string; title: string; scheduled_at: string; location: string | null };

type AvailabilityRow = { user_id: string; day_of_week: number; start_time: string; end_time: string };

type InterestRow = { user_id: string; interest_id: string; interests?: { name?: string } | null };

function Dashboard() {
  const { user } = useAuth();
  const [me, setMe] = useState<Profile | null>(null);
  const [matches, setMatches] = useState<Array<Profile & { score: number; complement: string[] }>>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [graph, setGraph] = useState<{ nodes: GraphNode[]; edges: GraphEdge[] }>({ nodes: [], edges: [] });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: meRow } = await supabase.from("profiles").select("id, full_name, department, year").eq("id", user.id).maybeSingle();
      setMe(meRow);
      const { data: others } = await supabase.from("profiles").select("id, full_name, department, year").neq("id", user.id).limit(20);
      const ids = [user.id, ...(others ?? []).map((o) => o.id)];
      const [{ data: skills }, { data: interests }, { data: availability }] = await Promise.all([
        supabase.from("user_skills").select("user_id, level, can_teach, skill_id, skills(name)").in("user_id", ids),
        supabase.from("user_interests").select("user_id, interest_id, interests(name)").in("user_id", ids),
        supabase.from("availability").select("user_id, day_of_week, start_time, end_time").in("user_id", ids),
      ]);

      const allSkills = (skills ?? []) as MatchingSkill[];
      const allInterests = (interests ?? []) as InterestRow[];
      const allAvailability = (availability ?? []) as AvailabilityRow[];
      const mySkills = allSkills.filter((s) => s.user_id === user.id);
      const myInterests = new Set(allInterests.filter((i) => i.user_id === user.id).map((i) => i.interest_id));
      const myAvailability = allAvailability.filter((a) => a.user_id === user.id);

      const scored = (others ?? []).map((o) => {
        const theirSkills = allSkills.filter((s) => s.user_id === o.id);
        const complement = complementarySkillScore(mySkills, theirSkills);
        const theirInterests = new Set(allInterests.filter((i) => i.user_id === o.id).map((i) => i.interest_id));
        const jaccard = jaccardSimilarity(myInterests, theirInterests);
        const cosine = cosineSkillSimilarity(mySkills, theirSkills);
        const theirAvailability = allAvailability.filter((a) => a.user_id === o.id);
        let overlap = 0;
        for (const a of myAvailability) for (const b of theirAvailability) {
          if (a.day_of_week === b.day_of_week && a.start_time < b.end_time && b.start_time < a.end_time) overlap++;
        }
        const maxAvailability = Math.max(myAvailability.length, theirAvailability.length);
        const availabilityScore = maxAvailability ? Math.min(1, overlap / maxAvailability) : 0;
        const departmentScore = o.department && meRow?.department && o.department === meRow.department ? 1 : 0;
        const score = calculateHybridMatchScore({ complementary: complement.score, jaccard, cosine, availability: availabilityScore, department: departmentScore });
        return { ...o, score, complement: complement.theyTeach };
      });
      scored.sort((a, b) => b.score - a.score);
      setMatches(scored.slice(0, 3));

      const { data: pmRows } = await supabase.from("project_members").select("project_id").eq("user_id", user.id);
      const projectIds = (pmRows ?? []).map((r) => r.project_id);
      if (projectIds.length) {
        const { data: ps } = await supabase.from("projects").select("id, title, description, status, required_skills").in("id", projectIds);
        setProjects(ps ?? []);
      }
      const { data: ses } = await supabase.from("sessions").select("id, title, scheduled_at, location").gte("scheduled_at", new Date().toISOString()).order("scheduled_at").limit(4);
      setSessions(ses ?? []);

      const { data: conns } = await supabase.from("connection_requests").select("from_user, to_user, status").or(`from_user.eq.${user.id},to_user.eq.${user.id}`).eq("status", "accepted");
      const peerIds = new Set<string>();
      (conns ?? []).forEach((c) => peerIds.add(c.from_user === user.id ? c.to_user : c.from_user));
      const peerArr = Array.from(peerIds);
      const peerProfiles = peerArr.length ? (await supabase.from("profiles").select("id, full_name").in("id", peerArr)).data ?? [] : [];
      const nodes: GraphNode[] = [{ id: user.id, label: meRow?.full_name ?? "You" }, ...peerProfiles.map((p) => ({ id: p.id, label: p.full_name }))];
      const edges: GraphEdge[] = peerArr.map((pid) => ({ source: user.id, target: pid, weight: 1.5 }));
      const { data: myProjects } = await supabase.from("project_members").select("project_id").eq("user_id", user.id);
      if (myProjects?.length) {
        const projIds = myProjects.map((p) => p.project_id);
        const { data: allMembers } = await supabase.from("project_members").select("project_id, user_id").in("project_id", projIds);
        const seen = new Set<string>();
        (allMembers ?? []).forEach((m) => {
          if (m.user_id !== user.id && peerIds.has(m.user_id)) {
            const k = [user.id, m.user_id, m.project_id].sort().join("|");
            if (!seen.has(k)) { seen.add(k); edges.push({ source: user.id, target: m.user_id, weight: 0.6 }); }
          }
        });
      }
      setGraph({ nodes, edges });
    })();
  }, [user]);

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between flex-wrap gap-4"><div><h1 className="font-display text-2xl sm:text-3xl font-bold">Welcome back, {me?.full_name?.split(" ")[0] ?? "there"}</h1><p className="text-muted-foreground mt-1">{me?.department ?? "Set your department in your profile"} {me?.year ? `• ${me.year}` : ""}</p></div><div className="flex gap-3"><Link to="/projects" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium shadow-soft hover:shadow-glow text-sm">Create Project</Link><Link to="/study-groups" className="px-4 py-2 bg-card border border-border rounded-lg font-medium hover:bg-secondary text-sm">Find Group</Link></div></div>
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <div className="bg-card rounded-2xl border border-border shadow-soft overflow-hidden"><div className="p-5 border-b border-border flex justify-between items-center"><h2 className="font-display font-semibold flex items-center gap-2"><Sparkles className="size-4 text-primary" /> Smart Matches</h2><Link to="/matches" className="text-xs font-medium text-primary hover:underline flex items-center gap-1">View all <ArrowRight className="size-3" /></Link></div><div className="divide-y divide-border">
            {matches.length === 0 && <div className="p-6 text-sm text-muted-foreground text-center">Add skills to your profile to see personalized matches.</div>}
            {matches.map((m) => <div key={m.id} className="p-5 flex items-center gap-4"><div className="size-12 rounded-xl bg-gradient-brand flex items-center justify-center text-white font-semibold">{m.full_name?.[0]?.toUpperCase() ?? "?"}</div><div className="flex-1 min-w-0"><div className="font-semibold truncate">{m.full_name}</div><div className="text-xs text-muted-foreground">{m.department ?? "—"}</div>{m.complement.length > 0 && <div className="text-xs text-primary mt-1">Can help with: {m.complement.join(", ")}</div>}</div><div className="text-right"><div className="text-lg font-bold text-gradient-brand">{m.score}%</div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">match</div></div></div>)}
          </div></div>
          <div className="bg-card rounded-2xl border border-border shadow-soft p-5"><h2 className="font-display font-semibold mb-4 flex items-center gap-2"><Users className="size-4 text-primary" /> Active Projects</h2>{projects.length === 0 ? <p className="text-sm text-muted-foreground">No active projects yet. <Link to="/projects" className="text-primary hover:underline">Browse projects →</Link></p> : <div className="grid sm:grid-cols-2 gap-4">{projects.map((p) => <Link key={p.id} to="/projects" className="block p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-secondary/40 transition-colors"><div className="font-semibold mb-1">{p.title}</div><div className="text-xs text-muted-foreground line-clamp-2">{p.description}</div><div className="mt-3 inline-flex items-center text-[10px] uppercase tracking-wider font-semibold bg-primary-soft text-primary px-2 py-0.5 rounded">{p.status}</div></Link>)}</div>}</div>
        </div>
        <div className="col-span-12 lg:col-span-4 space-y-6"><div className="bg-foreground text-background rounded-2xl p-5 overflow-hidden relative"><div className="flex items-center justify-between mb-1"><h2 className="font-display font-semibold flex items-center gap-2"><TrendingUp className="size-4" /> Network Graph</h2><span className="text-[10px] uppercase tracking-widest opacity-60">{graph.nodes.length - 1 > 0 ? `${graph.nodes.length - 1} peers` : "solo"}</span></div><p className="text-xs opacity-70 mb-2">Your live collaboration network</p><div className="h-64 -mx-2"><NetworkGraph nodes={graph.nodes} edges={graph.edges} meId={user?.id} height={260} /></div><div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/10 text-center"><div><div className="text-lg font-bold">{matches.length}</div><div className="text-[9px] uppercase tracking-widest opacity-60">Matches</div></div><div><div className="text-lg font-bold">{graph.nodes.length - 1}</div><div className="text-[9px] uppercase tracking-widest opacity-60">Connections</div></div><div><div className="text-lg font-bold">{projects.length}</div><div className="text-[9px] uppercase tracking-widest opacity-60">Projects</div></div></div><div className="absolute inset-0 bg-gradient-to-br from-primary/15 to-transparent pointer-events-none" /></div>
          <div className="bg-card rounded-2xl border border-border shadow-soft p-6"><h2 className="font-display font-semibold mb-4 flex items-center gap-2"><Calendar className="size-4 text-primary" /> Upcoming Sessions</h2>{sessions.length === 0 ? <p className="text-sm text-muted-foreground">No upcoming sessions.</p> : <div className="space-y-4">{sessions.map((s) => { const d = new Date(s.scheduled_at); return <div key={s.id} className="flex gap-4"><div className="flex flex-col items-center justify-center size-12 bg-secondary rounded-xl shrink-0"><span className="text-[10px] font-bold text-muted-foreground">{d.toLocaleString("en", { month: "short" }).toUpperCase()}</span><span className="text-lg font-bold leading-none">{d.getDate()}</span></div><div className="min-w-0"><h4 className="text-sm font-semibold truncate">{s.title}</h4><p className="text-xs text-muted-foreground">{d.toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" })} • {s.location ?? "Online"}</p></div></div>; })}</div>}</div>
        </div>
      </div>
    </div>
  );
}
