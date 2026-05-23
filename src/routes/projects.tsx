import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { toast } from "sonner";
import { FolderKanban, Plus, Check, Circle, Users } from "lucide-react";

export const Route = createFileRoute("/projects")({
  component: () => (
    <RequireAuth>
      <AppShell>
        <Projects />
      </AppShell>
    </RequireAuth>
  ),
});

type Project = { id: string; title: string; description: string | null; status: string; owner_id: string; required_skills: string[] | null; tags: string[] | null; max_team_size: number };
type Milestone = { id: string; project_id: string; title: string; completed: boolean; due_date: string | null; order_index: number };
type Member = { project_id: string; user_id: string; role: string; full_name?: string };

function Projects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", tags: "", required_skills: "" });
  const [newMilestone, setNewMilestone] = useState("");

  async function load() {
    const { data: ps } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
    setProjects(ps ?? []);
    const ids = (ps ?? []).map((p) => p.id);
    if (ids.length) {
      const [{ data: ms }, { data: mems }] = await Promise.all([
        supabase.from("milestones").select("*").in("project_id", ids).order("order_index"),
        supabase.from("project_members").select("project_id, user_id, role, profiles!inner(full_name)").in("project_id", ids),
      ]);
      setMilestones(ms ?? []);
      setMembers((mems ?? []).map((m: any) => ({ ...m, full_name: m.profiles?.full_name })));
    }
  }
  useEffect(() => { load(); }, []);

  async function createProject() {
    if (!user || !form.title.trim()) return;
    const { data, error } = await supabase.from("projects").insert({
      owner_id: user.id,
      title: form.title,
      description: form.description,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      required_skills: form.required_skills.split(",").map((t) => t.trim()).filter(Boolean),
    }).select().single();
    if (error) return toast.error(error.message);
    await supabase.from("project_members").insert({ project_id: data.id, user_id: user.id, role: "owner" });
    toast.success("Project created");
    setShowNew(false);
    setForm({ title: "", description: "", tags: "", required_skills: "" });
    load();
  }

  async function joinProject(p: Project) {
    if (!user) return;
    const { error } = await supabase.from("project_members").insert({ project_id: p.id, user_id: user.id, role: "member" });
    if (error) return toast.error(error.message);
    toast.success("Joined");
    load();
  }

  async function addMilestone(projectId: string) {
    if (!newMilestone.trim()) return;
    const order = milestones.filter((m) => m.project_id === projectId).length;
    const { data, error } = await supabase.from("milestones").insert({ project_id: projectId, title: newMilestone, order_index: order }).select().single();
    if (error) return toast.error(error.message);
    setMilestones((m) => [...m, data]);
    setNewMilestone("");
  }

  async function toggleMilestone(m: Milestone) {
    await supabase.from("milestones").update({ completed: !m.completed }).eq("id", m.id);
    setMilestones((s) => s.map((x) => (x.id === m.id ? { ...x, completed: !x.completed } : x)));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold flex items-center gap-2"><FolderKanban className="size-6 text-primary" /> Projects</h1>
          <p className="text-muted-foreground mt-1">Form teams, set milestones, and ship work together.</p>
        </div>
        <button onClick={() => setShowNew(!showNew)} className="px-4 h-10 bg-primary text-primary-foreground rounded-lg text-sm font-medium inline-flex items-center gap-1">
          <Plus className="size-4" /> New Project
        </button>
      </div>

      {showNew && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-3 shadow-soft">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Project title" className="w-full h-10 px-3 bg-secondary border border-border rounded-lg text-sm" />
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What are you building?" rows={3} className="w-full p-3 bg-secondary border border-border rounded-lg text-sm" />
          <div className="grid sm:grid-cols-2 gap-3">
            <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="Tags (comma-separated)" className="h-10 px-3 bg-secondary border border-border rounded-lg text-sm" />
            <input value={form.required_skills} onChange={(e) => setForm({ ...form, required_skills: e.target.value })} placeholder="Required skills" className="h-10 px-3 bg-secondary border border-border rounded-lg text-sm" />
          </div>
          <div className="flex gap-2">
            <button onClick={createProject} className="px-4 h-9 bg-primary text-primary-foreground rounded-lg text-sm font-medium">Create</button>
            <button onClick={() => setShowNew(false)} className="px-4 h-9 bg-secondary border border-border rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-5">
        {projects.map((p) => {
          const mems = members.filter((m) => m.project_id === p.id);
          const ms = milestones.filter((m) => m.project_id === p.id);
          const isMember = mems.some((m) => m.user_id === user?.id);
          const done = ms.filter((m) => m.completed).length;
          const open = openId === p.id;
          return (
            <div key={p.id} className="bg-card border border-border rounded-2xl shadow-soft overflow-hidden">
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-display font-semibold text-lg">{p.title}</h3>
                  <span className="text-[10px] uppercase tracking-wider font-semibold bg-primary-soft text-primary px-2 py-0.5 rounded">{p.status}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.description}</p>
                <div className="flex flex-wrap gap-1 mt-3">
                  {(p.tags ?? []).map((t) => <span key={t} className="text-[10px] bg-secondary px-2 py-0.5 rounded-full">{t}</span>)}
                </div>
                <div className="flex items-center justify-between mt-4">
                  <div className="text-xs text-muted-foreground flex items-center gap-1"><Users className="size-3" /> {mems.length}/{p.max_team_size} • {done}/{ms.length} milestones</div>
                  <div className="flex gap-2">
                    {!isMember && mems.length < p.max_team_size && (
                      <button onClick={() => joinProject(p)} className="text-xs px-3 h-8 bg-primary text-primary-foreground rounded-lg font-medium">Join</button>
                    )}
                    <button onClick={() => setOpenId(open ? null : p.id)} className="text-xs px-3 h-8 bg-secondary border border-border rounded-lg">{open ? "Close" : "Details"}</button>
                  </div>
                </div>
              </div>
              {open && (
                <div className="border-t border-border p-5 bg-secondary/30 space-y-3">
                  <div>
                    <h4 className="text-xs uppercase font-semibold text-muted-foreground mb-2">Team</h4>
                    <div className="flex flex-wrap gap-2">
                      {mems.map((m) => (
                        <span key={m.user_id} className="text-xs bg-card border border-border px-2 py-1 rounded-full">
                          {m.full_name ?? m.user_id.slice(0, 6)} {m.role === "owner" && "★"}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs uppercase font-semibold text-muted-foreground mb-2">Milestones</h4>
                    <div className="space-y-1.5">
                      {ms.map((m) => (
                        <button key={m.id} onClick={() => isMember && toggleMilestone(m)} disabled={!isMember} className="w-full flex items-center gap-2 text-left text-sm">
                          {m.completed ? <Check className="size-4 text-success" /> : <Circle className="size-4 text-muted-foreground" />}
                          <span className={m.completed ? "line-through text-muted-foreground" : ""}>{m.title}</span>
                        </button>
                      ))}
                      {isMember && (
                        <div className="flex gap-2 pt-2">
                          <input value={newMilestone} onChange={(e) => setNewMilestone(e.target.value)} placeholder="Add milestone…" className="flex-1 h-8 px-2 bg-card border border-border rounded-lg text-sm" />
                          <button onClick={() => addMilestone(p.id)} className="h-8 px-3 bg-primary text-primary-foreground rounded-lg text-xs font-medium">Add</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
