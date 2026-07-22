import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { toast } from "sonner";
import { Plus, X, Save, LogOut } from "lucide-react";

export const Route = createFileRoute("/profile")({
  component: () => (
    <RequireAuth>
      <AppShell>
        <Profile />
      </AppShell>
    </RequireAuth>
  ),
});

const LEVELS = ["weak", "medium", "strong", "expert"] as const;
type Level = (typeof LEVELS)[number];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Skill = { id: string; name: string };
type UserSkill = { id: string; skill_id: string; level: Level; can_teach: boolean; name?: string };
type Interest = { id: string; name: string };
type Avail = { id?: string; day_of_week: number; start_time: string; end_time: string };

function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    department: "",
    year: "",
    bio: "",
    goals: "",
    learning_preference: "",
  });
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [mySkills, setMySkills] = useState<UserSkill[]>([]);
  const [newSkill, setNewSkill] = useState("");
  const [newSkillLevel, setNewSkillLevel] = useState<Level>("medium");
  const [allInterests, setAllInterests] = useState<Interest[]>([]);
  const [myInterests, setMyInterests] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState("");
  const [avail, setAvail] = useState<Avail[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: p }, { data: sk }, { data: usk }, { data: ints }, { data: uin }, { data: av }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("skills").select("*").order("name"),
        supabase.from("user_skills").select("id, skill_id, level, can_teach, skills(name)").eq("user_id", user.id),
        supabase.from("interests").select("*").order("name"),
        supabase.from("user_interests").select("interest_id").eq("user_id", user.id),
        supabase.from("availability").select("*").eq("user_id", user.id),
      ]);
      if (p) setForm({
        full_name: p.full_name ?? "",
        department: p.department ?? "",
        year: p.year ?? "",
        bio: p.bio ?? "",
        goals: p.goals ?? "",
        learning_preference: p.learning_preference ?? "",
      });
      setAllSkills(sk ?? []);
      setMySkills((usk ?? []).map((r: any) => ({ ...r, name: r.skills?.name })));
      setAllInterests(ints ?? []);
      setMyInterests((uin ?? []).map((r) => r.interest_id));
      setAvail((av ?? []).map((r: any) => ({ id: r.id, day_of_week: r.day_of_week, start_time: r.start_time, end_time: r.end_time })));
      setLoading(false);
    })();
  }, [user]);

  async function saveProfile() {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update(form).eq("id", user.id);
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Profile saved");
  }

  async function addSkill() {
    if (!user || !newSkill.trim()) return;
    const name = newSkill.trim();
    let skill = allSkills.find((s) => s.name.toLowerCase() === name.toLowerCase());
    if (!skill) {
      const { data, error } = await supabase.from("skills").insert({ name }).select().single();
      if (error) return toast.error(error.message);
      skill = data;
      setAllSkills((s) => [...s, data]);
    }
    if (mySkills.some((s) => s.skill_id === skill!.id)) return toast.info("Already added");
    const { data, error } = await supabase
      .from("user_skills")
      .insert({ user_id: user.id, skill_id: skill.id, level: newSkillLevel, can_teach: newSkillLevel === "strong" || newSkillLevel === "expert" })
      .select("id, skill_id, level, can_teach")
      .single();
    if (error) return toast.error(error.message);
    setMySkills((s) => [...s, { ...data, name: skill!.name }]);
    setNewSkill("");
  }

  async function removeSkill(id: string) {
    await supabase.from("user_skills").delete().eq("id", id);
    setMySkills((s) => s.filter((x) => x.id !== id));
  }

  async function updateSkillLevel(id: string, level: Level) {
    await supabase.from("user_skills").update({ level, can_teach: level === "strong" || level === "expert" }).eq("id", id);
    setMySkills((s) => s.map((x) => (x.id === id ? { ...x, level, can_teach: level === "strong" || level === "expert" } : x)));
  }

  async function toggleInterest(id: string) {
    if (!user) return;
    if (myInterests.includes(id)) {
      await supabase.from("user_interests").delete().eq("user_id", user.id).eq("interest_id", id);
      setMyInterests((s) => s.filter((x) => x !== id));
    } else {
      await supabase.from("user_interests").insert({ user_id: user.id, interest_id: id });
      setMyInterests((s) => [...s, id]);
    }
  }

  async function addInterest() {
    if (!newInterest.trim()) return;
    const { data, error } = await supabase.from("interests").insert({ name: newInterest.trim() }).select().single();
    if (error) return toast.error(error.message);
    setAllInterests((s) => [...s, data]);
    setNewInterest("");
    await toggleInterest(data.id);
  }

  async function addAvail(day: number) {
    if (!user) return;
    const { data, error } = await supabase
      .from("availability")
      .insert({ user_id: user.id, day_of_week: day, start_time: "09:00", end_time: "11:00" })
      .select()
      .single();
    if (error) return toast.error(error.message);
    setAvail((a) => [...a, data]);
  }

  async function updateAvail(id: string, patch: Partial<Avail>) {
    await supabase.from("availability").update(patch).eq("id", id);
    setAvail((a) => a.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }

  async function removeAvail(id: string) {
    await supabase.from("availability").delete().eq("id", id);
    setAvail((a) => a.filter((x) => x.id !== id));
  }

  if (loading) return <div className="text-muted-foreground">Loading profile…</div>;

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold">Your Profile</h1>
        <p className="text-muted-foreground mt-1">Fill out details to power smart matches.</p>
      </div>

      <section className="bg-card border border-border rounded-2xl p-6 shadow-soft space-y-4">
        <h2 className="font-display font-semibold">Basic information</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Full name" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} />
          <Input label="Department" value={form.department} onChange={(v) => setForm({ ...form, department: v })} placeholder="Computer Science" />
          <Input label="Year" value={form.year} onChange={(v) => setForm({ ...form, year: v })} placeholder="Master's 1" />
          <Input label="Learning preference" value={form.learning_preference} onChange={(v) => setForm({ ...form, learning_preference: v })} placeholder="Visual, collaborative" />
        </div>
        <Textarea label="Bio" value={form.bio} onChange={(v) => setForm({ ...form, bio: v })} />
        <Textarea label="Academic goals" value={form.goals} onChange={(v) => setForm({ ...form, goals: v })} placeholder="Defend my thesis on…" />
        <button onClick={saveProfile} disabled={saving} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm inline-flex items-center gap-2 disabled:opacity-50">
          <Save className="size-4" /> {saving ? "Saving…" : "Save profile"}
        </button>
      </section>

      <section className="bg-card border border-border rounded-2xl p-6 shadow-soft space-y-4">
        <h2 className="font-display font-semibold">Skills & subjects</h2>
        <p className="text-xs text-muted-foreground">Mark each one — weak skills get matched with peers strong in them.</p>
        <div className="flex flex-wrap gap-2">
          {mySkills.map((s) => (
            <div key={s.id} className="flex items-center gap-2 bg-secondary rounded-full pl-3 pr-1 py-1">
              <span className="text-sm font-medium">{s.name}</span>
              <select
                value={s.level}
                onChange={(e) => updateSkillLevel(s.id, e.target.value as Level)}
                className="bg-card border border-border rounded-full text-xs px-2 py-0.5"
              >
                {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
              <button onClick={() => removeSkill(s.id)} className="p-1 hover:text-destructive"><X className="size-3" /></button>
            </div>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          <input
            list="skill-list"
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            placeholder="Add a skill (e.g. Linear Algebra)"
            className="flex-1 min-w-60 h-9 px-3 bg-secondary rounded-lg text-sm border border-border outline-none focus:ring-2 focus:ring-ring/30"
          />
          <datalist id="skill-list">
            {allSkills.map((s) => <option key={s.id} value={s.name} />)}
          </datalist>
          <select value={newSkillLevel} onChange={(e) => setNewSkillLevel(e.target.value as Level)} className="h-9 px-3 bg-secondary rounded-lg text-sm border border-border">
            {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <button onClick={addSkill} className="h-9 px-4 bg-primary text-primary-foreground rounded-lg text-sm font-medium inline-flex items-center gap-1">
            <Plus className="size-4" /> Add
          </button>
        </div>
      </section>

      <section className="bg-card border border-border rounded-2xl p-6 shadow-soft space-y-4">
        <h2 className="font-display font-semibold">Interests</h2>
        <div className="flex flex-wrap gap-2">
          {allInterests.map((i) => {
            const active = myInterests.includes(i.id);
            return (
              <button
                key={i.id}
                onClick={() => toggleInterest(i.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${active ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary"}`}
              >
                {i.name}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2">
          <input
            value={newInterest}
            onChange={(e) => setNewInterest(e.target.value)}
            placeholder="Add new interest"
            className="flex-1 h-9 px-3 bg-secondary rounded-lg text-sm border border-border outline-none focus:ring-2 focus:ring-ring/30"
          />
          <button onClick={addInterest} className="h-9 px-4 bg-secondary border border-border rounded-lg text-sm font-medium">Add</button>
        </div>
      </section>

      <section className="bg-card border border-border rounded-2xl p-6 shadow-soft space-y-4">
        <h2 className="font-display font-semibold">Weekly availability</h2>
        <p className="text-xs text-muted-foreground">Block out times you're free for study sessions.</p>
        <div className="space-y-3">
          {DAYS.map((d, i) => {
            const dayRows = avail.filter((a) => a.day_of_week === i);
            return (
              <div key={i} className="flex items-start gap-3">
                <div className="w-12 pt-2 text-xs font-semibold text-muted-foreground uppercase">{d}</div>
                <div className="flex-1 flex flex-wrap gap-2">
                  {dayRows.map((a) => (
                    <div key={a.id} className="flex items-center gap-1 bg-primary-soft text-primary rounded-lg px-2 py-1">
                      <input type="time" value={a.start_time.slice(0,5)} onChange={(e) => updateAvail(a.id!, { start_time: e.target.value })} className="bg-transparent text-xs outline-none" />
                      <span>–</span>
                      <input type="time" value={a.end_time.slice(0,5)} onChange={(e) => updateAvail(a.id!, { end_time: e.target.value })} className="bg-transparent text-xs outline-none" />
                      <button onClick={() => removeAvail(a.id!)} className="ml-1 hover:text-destructive"><X className="size-3" /></button>
                    </div>
                  ))}
                  <button onClick={() => addAvail(i)} className="text-xs px-2 py-1 border border-dashed border-border rounded-lg text-muted-foreground hover:bg-secondary inline-flex items-center gap-1">
                    <Plus className="size-3" /> Slot
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Input({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-1 w-full h-10 px-3 bg-secondary border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-ring/30" />
    </label>
  );
}
function Textarea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3} className="mt-1 w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-ring/30" />
    </label>
  );
}
