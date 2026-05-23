import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { toast } from "sonner";
import { Users, Plus, LogOut } from "lucide-react";

export const Route = createFileRoute("/study-groups")({
  component: () => (
    <RequireAuth>
      <AppShell>
        <Groups />
      </AppShell>
    </RequireAuth>
  ),
});

type Group = { id: string; name: string; subject: string | null; description: string | null; owner_id: string };

function Groups() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [memberMap, setMemberMap] = useState<Record<string, number>>({});
  const [mineSet, setMineSet] = useState<Set<string>>(new Set());
  const [form, setForm] = useState({ name: "", subject: "", description: "" });
  const [show, setShow] = useState(false);

  async function load() {
    const { data: gs } = await supabase.from("study_groups").select("*").order("created_at", { ascending: false });
    setGroups(gs ?? []);
    const { data: gm } = await supabase.from("group_members").select("group_id, user_id");
    const counts: Record<string, number> = {};
    const mine = new Set<string>();
    (gm ?? []).forEach((m) => {
      counts[m.group_id] = (counts[m.group_id] ?? 0) + 1;
      if (m.user_id === user?.id) mine.add(m.group_id);
    });
    // include owners as implicit members
    (gs ?? []).forEach((g) => { if (g.owner_id === user?.id) mine.add(g.id); });
    setMemberMap(counts);
    setMineSet(mine);
  }
  useEffect(() => { if (user) load(); }, [user]);

  async function create() {
    if (!user || !form.name.trim()) return;
    const { error } = await supabase.from("study_groups").insert({ owner_id: user.id, ...form });
    if (error) return toast.error(error.message);
    toast.success("Group created");
    setForm({ name: "", subject: "", description: "" });
    setShow(false);
    load();
  }

  async function join(g: Group) {
    const { error } = await supabase.from("group_members").insert({ group_id: g.id, user_id: user!.id });
    if (error) return toast.error(error.message);
    load();
  }

  async function leave(g: Group) {
    await supabase.from("group_members").delete().eq("group_id", g.id).eq("user_id", user!.id);
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold flex items-center gap-2"><Users className="size-6 text-primary" /> Study Groups</h1>
          <p className="text-muted-foreground mt-1">Find peers studying the same subjects.</p>
        </div>
        <button onClick={() => setShow(!show)} className="px-4 h-10 bg-primary text-primary-foreground rounded-lg text-sm font-medium inline-flex items-center gap-1">
          <Plus className="size-4" /> New Group
        </button>
      </div>

      {show && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-3 shadow-soft">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Group name" className="w-full h-10 px-3 bg-secondary border border-border rounded-lg text-sm" />
          <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Subject (e.g. Algorithms)" className="w-full h-10 px-3 bg-secondary border border-border rounded-lg text-sm" />
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" rows={3} className="w-full p-3 bg-secondary border border-border rounded-lg text-sm" />
          <button onClick={create} className="px-4 h-9 bg-primary text-primary-foreground rounded-lg text-sm font-medium">Create</button>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {groups.map((g) => {
          const joined = mineSet.has(g.id);
          const isOwner = g.owner_id === user?.id;
          return (
            <div key={g.id} className="bg-card border border-border rounded-2xl p-5 shadow-soft flex flex-col">
              <h3 className="font-display font-semibold">{g.name}</h3>
              {g.subject && <div className="text-xs text-primary font-medium mt-0.5">{g.subject}</div>}
              <p className="text-sm text-muted-foreground mt-2 line-clamp-3 flex-1">{g.description}</p>
              <div className="flex items-center justify-between mt-4">
                <span className="text-xs text-muted-foreground">{memberMap[g.id] ?? 0} members</span>
                {isOwner ? (
                  <span className="text-xs text-primary font-medium">Owner</span>
                ) : joined ? (
                  <button onClick={() => leave(g)} className="text-xs px-3 h-8 bg-secondary border border-border rounded-lg inline-flex items-center gap-1">
                    <LogOut className="size-3" /> Leave
                  </button>
                ) : (
                  <button onClick={() => join(g)} className="text-xs px-3 h-8 bg-primary text-primary-foreground rounded-lg font-medium">Join</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
