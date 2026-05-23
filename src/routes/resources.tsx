import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { toast } from "sonner";
import { FileText, Plus, Link2, StickyNote, ExternalLink, Trash2 } from "lucide-react";

export const Route = createFileRoute("/resources")({
  component: () => (
    <RequireAuth>
      <AppShell>
        <Resources />
      </AppShell>
    </RequireAuth>
  ),
});

type R = { id: string; owner_id: string; title: string; description: string | null; url: string | null; resource_type: string; tags: string[] | null; created_at: string };

function Resources() {
  const { user } = useAuth();
  const [items, setItems] = useState<R[]>([]);
  const [form, setForm] = useState({ title: "", url: "", description: "", resource_type: "link", tags: "" });
  const [show, setShow] = useState(false);

  async function load() {
    const { data } = await supabase.from("resources").select("*").order("created_at", { ascending: false });
    setItems(data ?? []);
  }
  useEffect(() => { load(); }, []);

  async function create() {
    if (!user || !form.title.trim()) return;
    const url = form.url.trim();
    if (url && !/^https?:\/\//i.test(url)) {
      return toast.error("Only http:// and https:// URLs are allowed");
    }
    const { error } = await supabase.from("resources").insert({
      owner_id: user.id,
      title: form.title,
      description: form.description,
      url: url || null,
      resource_type: form.resource_type,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
    });
    if (error) return toast.error(error.message);
    toast.success("Resource shared");
    setShow(false);
    setForm({ title: "", url: "", description: "", resource_type: "link", tags: "" });
    load();
  }

  async function remove(id: string) {
    await supabase.from("resources").delete().eq("id", id);
    load();
  }

  const iconFor = (t: string) => (t === "note" ? StickyNote : t === "document" ? FileText : Link2);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-2"><FileText className="size-6 text-primary" /> Shared Resources</h1>
          <p className="text-muted-foreground mt-1">Notes, documents, and links the community has shared.</p>
        </div>
        <button onClick={() => setShow(!show)} className="px-4 h-10 bg-primary text-primary-foreground rounded-lg text-sm font-medium inline-flex items-center gap-1">
          <Plus className="size-4" /> Share Resource
        </button>
      </div>

      {show && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-3 shadow-soft">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" className="w-full h-10 px-3 bg-secondary border border-border rounded-lg text-sm" />
          <div className="grid sm:grid-cols-3 gap-3">
            <select value={form.resource_type} onChange={(e) => setForm({ ...form, resource_type: e.target.value })} className="h-10 px-3 bg-secondary border border-border rounded-lg text-sm">
              <option value="link">Link</option>
              <option value="note">Note</option>
              <option value="document">Document</option>
            </select>
            <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="URL (optional)" className="h-10 px-3 bg-secondary border border-border rounded-lg text-sm sm:col-span-2" />
          </div>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description / notes" rows={3} className="w-full p-3 bg-secondary border border-border rounded-lg text-sm" />
          <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="Tags (comma-separated)" className="w-full h-10 px-3 bg-secondary border border-border rounded-lg text-sm" />
          <button onClick={create} className="px-4 h-9 bg-primary text-primary-foreground rounded-lg text-sm font-medium">Share</button>
        </div>
      )}

      {items.length === 0 && <div className="text-muted-foreground text-sm">No resources yet — be the first to share.</div>}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {items.map((r) => {
          const Icon = iconFor(r.resource_type);
          return (
            <div key={r.id} className="bg-card border border-border rounded-2xl p-5 shadow-soft flex flex-col">
              <div className="flex items-start gap-3">
                <div className="size-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center shrink-0">
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold truncate">{r.title}</h3>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{r.resource_type}</div>
                </div>
                {r.owner_id === user?.id && (
                  <button onClick={() => remove(r.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button>
                )}
              </div>
              {r.description && <p className="text-sm text-muted-foreground mt-3 line-clamp-3 flex-1">{r.description}</p>}
              <div className="flex flex-wrap gap-1 mt-3">
                {(r.tags ?? []).map((t) => <span key={t} className="text-[10px] bg-secondary px-2 py-0.5 rounded-full">{t}</span>)}
              </div>
              {r.url && /^https?:\/\//i.test(r.url) && (
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1 text-sm text-primary font-medium hover:underline">
                  Open <ExternalLink className="size-3.5" />
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
