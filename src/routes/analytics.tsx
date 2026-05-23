import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { BarChart3, Trophy, Users, FolderKanban, Sparkles, Award } from "lucide-react";

export const Route = createFileRoute("/analytics")({
  component: () => (
    <RequireAuth>
      <AppShell>
        <Analytics />
      </AppShell>
    </RequireAuth>
  ),
});

function Analytics() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ skills: 0, connections: 0, projects: 0, groups: 0, sessions: 0, messages: 0 });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [sk, cr, pm, gm, ses, ms] = await Promise.all([
        supabase.from("user_skills").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("connection_requests").select("id", { count: "exact", head: true }).or(`from_user.eq.${user.id},to_user.eq.${user.id}`).eq("status", "accepted"),
        supabase.from("project_members").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("group_members").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("sessions").select("id", { count: "exact", head: true }).eq("organizer_id", user.id),
        supabase.from("messages").select("id", { count: "exact", head: true }).eq("sender_id", user.id),
      ]);
      setStats({
        skills: sk.count ?? 0,
        connections: cr.count ?? 0,
        projects: pm.count ?? 0,
        groups: gm.count ?? 0,
        sessions: ses.count ?? 0,
        messages: ms.count ?? 0,
      });
    })();
  }, [user]);

  const badges = [
    { id: "starter", label: "Profile Starter", earned: stats.skills >= 1, desc: "Added first skill" },
    { id: "polyglot", label: "Polyglot", earned: stats.skills >= 5, desc: "5+ skills tracked" },
    { id: "connector", label: "Connector", earned: stats.connections >= 3, desc: "3+ connections" },
    { id: "builder", label: "Builder", earned: stats.projects >= 1, desc: "Joined a project" },
    { id: "mentor", label: "Mentor", earned: stats.messages >= 10, desc: "10+ messages sent" },
    { id: "host", label: "Session Host", earned: stats.sessions >= 1, desc: "Hosted a session" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold flex items-center gap-2"><BarChart3 className="size-6 text-primary" /> Analytics</h1>
        <p className="text-muted-foreground mt-1">Track your participation and achievements.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Stat icon={Sparkles} label="Skills tracked" value={stats.skills} />
        <Stat icon={Users} label="Connections" value={stats.connections} />
        <Stat icon={FolderKanban} label="Projects" value={stats.projects} />
        <Stat icon={Users} label="Study groups" value={stats.groups} />
        <Stat icon={Trophy} label="Sessions hosted" value={stats.sessions} />
        <Stat icon={BarChart3} label="Messages sent" value={stats.messages} />
      </div>

      <section>
        <h2 className="font-display font-semibold mb-3 flex items-center gap-2"><Award className="size-5 text-primary" /> Achievement Badges</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          {badges.map((b) => (
            <div key={b.id} className={`bg-card border rounded-2xl p-5 shadow-soft ${b.earned ? "border-primary/50" : "border-border opacity-60"}`}>
              <div className={`size-12 rounded-xl flex items-center justify-center mb-3 ${b.earned ? "bg-gradient-brand text-white shadow-glow" : "bg-secondary text-muted-foreground"}`}>
                <Trophy className="size-5" />
              </div>
              <div className="font-semibold">{b.label}</div>
              <div className="text-xs text-muted-foreground mt-1">{b.desc}</div>
              <div className={`text-[10px] uppercase tracking-wider mt-2 font-semibold ${b.earned ? "text-primary" : "text-muted-foreground"}`}>
                {b.earned ? "Earned" : "Locked"}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{label}</span>
        <Icon className="size-4 text-primary" />
      </div>
      <div className="text-3xl font-display font-bold mt-2">{value}</div>
    </div>
  );
}
