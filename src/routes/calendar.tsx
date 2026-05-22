import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { toast } from "sonner";
import { Calendar as CalIcon, Plus, MapPin, Clock } from "lucide-react";

export const Route = createFileRoute("/calendar")({
  component: () => (
    <RequireAuth>
      <AppShell>
        <CalendarPage />
      </AppShell>
    </RequireAuth>
  ),
});

type Sess = { id: string; title: string; description: string | null; scheduled_at: string; duration_min: number; location: string | null; organizer_id: string };

function CalendarPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Sess[]>([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", scheduled_at: "", duration_min: 60, location: "" });

  async function load() {
    const { data } = await supabase.from("sessions").select("*").gte("scheduled_at", new Date(Date.now() - 7*86400000).toISOString()).order("scheduled_at");
    setSessions(data ?? []);
  }
  useEffect(() => { load(); }, []);

  async function create() {
    if (!user || !form.title || !form.scheduled_at) return;
    const { error } = await supabase.from("sessions").insert({ ...form, organizer_id: user.id, scheduled_at: new Date(form.scheduled_at).toISOString() });
    if (error) return toast.error(error.message);
    toast.success("Session scheduled");
    setShow(false);
    setForm({ title: "", description: "", scheduled_at: "", duration_min: 60, location: "" });
    load();
  }

  const grouped = sessions.reduce<Record<string, Sess[]>>((acc, s) => {
    const k = new Date(s.scheduled_at).toDateString();
    (acc[k] ||= []).push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-2"><CalIcon className="size-6 text-primary" /> Calendar</h1>
          <p className="text-muted-foreground mt-1">Schedule study sessions and project syncs.</p>
        </div>
        <button onClick={() => setShow(!show)} className="px-4 h-10 bg-primary text-primary-foreground rounded-lg text-sm font-medium inline-flex items-center gap-1">
          <Plus className="size-4" /> New Session
        </button>
      </div>

      {show && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-3 shadow-soft">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Session title" className="w-full h-10 px-3 bg-secondary border border-border rounded-lg text-sm" />
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" rows={2} className="w-full p-3 bg-secondary border border-border rounded-lg text-sm" />
          <div className="grid sm:grid-cols-3 gap-3">
            <input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} className="h-10 px-3 bg-secondary border border-border rounded-lg text-sm" />
            <input type="number" value={form.duration_min} onChange={(e) => setForm({ ...form, duration_min: +e.target.value })} placeholder="Duration (min)" className="h-10 px-3 bg-secondary border border-border rounded-lg text-sm" />
            <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Location or link" className="h-10 px-3 bg-secondary border border-border rounded-lg text-sm" />
          </div>
          <button onClick={create} className="px-4 h-9 bg-primary text-primary-foreground rounded-lg text-sm font-medium">Schedule</button>
        </div>
      )}

      <div className="space-y-6">
        {Object.keys(grouped).length === 0 && <div className="text-muted-foreground text-sm">No sessions yet.</div>}
        {Object.entries(grouped).map(([day, list]) => (
          <div key={day}>
            <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-2">{day}</h3>
            <div className="space-y-2">
              {list.map((s) => {
                const d = new Date(s.scheduled_at);
                return (
                  <div key={s.id} className="bg-card border border-border rounded-xl p-4 shadow-soft flex items-center gap-4">
                    <div className="size-14 rounded-xl bg-primary-soft text-primary flex flex-col items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold uppercase">{d.toLocaleString("en", { month: "short" })}</span>
                      <span className="text-xl font-bold leading-none">{d.getDate()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold">{s.title}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-3 mt-1">
                        <span className="inline-flex items-center gap-1"><Clock className="size-3" /> {d.toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" })} • {s.duration_min}m</span>
                        {s.location && <span className="inline-flex items-center gap-1"><MapPin className="size-3" /> {s.location}</span>}
                      </div>
                      {s.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.description}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
