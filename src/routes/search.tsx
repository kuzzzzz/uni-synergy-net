import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { Search, Users, FolderKanban, Sparkles, BookOpen } from "lucide-react";

export const Route = createFileRoute("/search")({
  validateSearch: (s) => z.object({ q: z.string().optional() }).parse(s),
  component: () => (
    <RequireAuth>
      <AppShell>
        <SearchPage />
      </AppShell>
    </RequireAuth>
  ),
  head: () => ({
    meta: [
      { title: "Search — Campus Connect" },
      { name: "description", content: "Search students, skills, projects and resources across Campus Connect." },
      { property: "og:title", content: "Search — Campus Connect" },
      { property: "og:description", content: "Search students, skills, projects and resources." },
      { name: "twitter:card", content: "summary" },
      { property: "og:type", content: "website" },
    ],
  }),
});

type Peer = { id: string; full_name: string; department: string | null; year: string | null };
type Project = { id: string; title: string; description: string | null; status: string };
type Skill = { id: string; name: string; category: string | null };
type Resource = { id: string; title: string; description: string | null; url: string | null };

function SearchPage() {
  const { q } = Route.useSearch();
  const navigate = useNavigate();
  const [input, setInput] = useState(q ?? "");
  const [peers, setPeers] = useState<Peer[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { setInput(q ?? ""); }, [q]);

  useEffect(() => {
    const query = (q ?? "").trim();
    if (!query) {
      setPeers([]); setProjects([]); setSkills([]); setResources([]);
      return;
    }
    setLoading(true);
    const like = `%${query.replace(/[%_]/g, (m: string) => `\\${m}`)}%`;
    Promise.all([
      supabase.from("profiles").select("id, full_name, department, year")
        .or(`full_name.ilike.${like},department.ilike.${like}`).limit(20),
      supabase.from("projects").select("id, title, description, status")
        .or(`title.ilike.${like},description.ilike.${like}`).limit(20),
      supabase.from("skills").select("id, name, category")
        .or(`name.ilike.${like},category.ilike.${like}`).limit(20),
      supabase.from("resources").select("id, title, description, url")
        .or(`title.ilike.${like},description.ilike.${like}`).limit(20),
    ]).then(([p, pr, s, r]) => {
      setPeers(p.data ?? []);
      setProjects(pr.data ?? []);
      setSkills(s.data ?? []);
      setResources(r.data ?? []);
    }).finally(() => setLoading(false));
  }, [q]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: "/search", search: { q: input.trim() || undefined } });
  };

  const empty = !loading && (q ?? "").trim() && !peers.length && !projects.length && !skills.length && !resources.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold">Search</h1>
        <p className="text-muted-foreground mt-1 text-sm">Find students, skills, projects and resources.</p>
      </div>
      <form onSubmit={submit} className="relative max-w-2xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Search courses, skills, or peers..."
          className="w-full h-11 bg-secondary rounded-full border border-border pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-ring/30"
        />
      </form>

      {loading && <p className="text-sm text-muted-foreground">Searching…</p>}
      {empty && <p className="text-sm text-muted-foreground">No results for "{q}".</p>}
      {!q && <p className="text-sm text-muted-foreground">Type a query and press Enter.</p>}

      {peers.length > 0 && (
        <Section title="People" icon={<Users className="size-4 text-primary" />}>
          {peers.map((p) => (
            <Link key={p.id} to="/matches" className="block p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-secondary/40">
              <div className="font-semibold">{p.full_name}</div>
              <div className="text-xs text-muted-foreground">{p.department ?? "—"} {p.year ? `• ${p.year}` : ""}</div>
            </Link>
          ))}
        </Section>
      )}
      {projects.length > 0 && (
        <Section title="Projects" icon={<FolderKanban className="size-4 text-primary" />}>
          {projects.map((p) => (
            <Link key={p.id} to="/projects" className="block p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-secondary/40">
              <div className="font-semibold">{p.title}</div>
              <div className="text-xs text-muted-foreground line-clamp-2">{p.description}</div>
              <div className="mt-2 inline-flex text-[10px] uppercase tracking-wider font-semibold bg-primary-soft text-primary px-2 py-0.5 rounded">{p.status}</div>
            </Link>
          ))}
        </Section>
      )}
      {skills.length > 0 && (
        <Section title="Skills" icon={<Sparkles className="size-4 text-primary" />}>
          {skills.map((s) => (
            <div key={s.id} className="p-4 rounded-xl border border-border">
              <div className="font-semibold">{s.name}</div>
              <div className="text-xs text-muted-foreground">{s.category ?? "General"}</div>
            </div>
          ))}
        </Section>
      )}
      {resources.length > 0 && (
        <Section title="Resources" icon={<BookOpen className="size-4 text-primary" />}>
          {resources.map((r) => (
            <Link key={r.id} to="/resources" className="block p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-secondary/40">
              <div className="font-semibold">{r.title}</div>
              <div className="text-xs text-muted-foreground line-clamp-2">{r.description}</div>
            </Link>
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="font-display font-semibold flex items-center gap-2">{icon} {title}</h2>
      <div className="grid sm:grid-cols-2 gap-3">{children}</div>
    </div>
  );
}
