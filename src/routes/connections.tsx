import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { toast } from "sonner";
import { UserPlus, Check, X, Inbox, Send } from "lucide-react";

export const Route = createFileRoute("/connections")({
  component: () => (
    <RequireAuth>
      <AppShell>
        <Connections />
      </AppShell>
    </RequireAuth>
  ),
});

type Req = { id: string; from_user: string; to_user: string; status: string; message: string | null; created_at: string; from?: any; to?: any };

function Connections() {
  const { user } = useAuth();
  const [incoming, setIncoming] = useState<Req[]>([]);
  const [outgoing, setOutgoing] = useState<Req[]>([]);
  const [accepted, setAccepted] = useState<Req[]>([]);

  async function load() {
    if (!user) return;
    const { data: r } = await supabase
      .from("connection_requests")
      .select("*")
      .or(`from_user.eq.${user.id},to_user.eq.${user.id}`)
      .order("created_at", { ascending: false });
    const ids = Array.from(new Set((r ?? []).flatMap((x) => [x.from_user, x.to_user])));
    const { data: profs } = ids.length
      ? await supabase.from("profiles").select("id, full_name, department").in("id", ids)
      : { data: [] as any[] };
    const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
    const rows: Req[] = (r ?? []).map((x) => ({ ...x, from: map.get(x.from_user), to: map.get(x.to_user) }));
    setIncoming(rows.filter((x) => x.to_user === user.id && x.status === "pending"));
    setOutgoing(rows.filter((x) => x.from_user === user.id && x.status === "pending"));
    setAccepted(rows.filter((x) => x.status === "accepted"));
  }
  useEffect(() => { load(); }, [user]);

  async function respond(id: string, status: "accepted" | "rejected") {
    const { error } = await supabase.from("connection_requests").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(status === "accepted" ? "Connected" : "Declined");
    load();
  }


  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold flex items-center gap-2"><UserPlus className="size-6 text-primary" /> Connections</h1>
        <p className="text-muted-foreground mt-1">Manage your collaboration network.</p>
      </div>

      <Section title="Incoming requests" icon={Inbox} empty="No pending requests.">
        {incoming.map((r) => (
          <Row key={r.id} name={r.from?.full_name} dept={r.from?.department} actions={
            <>
              <button onClick={() => respond(r.id, "accepted")} className="size-8 rounded-lg bg-primary text-primary-foreground inline-flex items-center justify-center"><Check className="size-4" /></button>
              <button onClick={() => respond(r.id, "rejected")} className="size-8 rounded-lg bg-secondary border border-border inline-flex items-center justify-center"><X className="size-4" /></button>
            </>
          } />
        ))}
        {incoming.length === 0 && <Empty text="No pending requests." />}
      </Section>

      <Section title="Sent requests" icon={Send} empty="None sent.">
        {outgoing.map((r) => (
          <Row key={r.id} name={r.to?.full_name} dept={r.to?.department} actions={<span className="text-xs text-muted-foreground">Pending</span>} />
        ))}
        {outgoing.length === 0 && <Empty text="None sent." />}
      </Section>

      <Section title="Your network" icon={UserPlus} empty="No connections yet.">
        {accepted.map((r) => {
          const other = r.from_user === user?.id ? r.to : r.from;
          return <Row key={r.id} name={other?.full_name} dept={other?.department} actions={<span className="text-xs text-success font-semibold">Connected</span>} />;
        })}
        {accepted.length === 0 && <Empty text="No connections yet." />}
      </Section>
    </div>
  );
}

function Section({ title, icon: Icon, children }: any) {
  return (
    <section>
      <h2 className="font-display font-semibold mb-3 flex items-center gap-2"><Icon className="size-5 text-primary" /> {title}</h2>
      <div className="bg-card border border-border rounded-2xl divide-y divide-border shadow-soft overflow-hidden">{children}</div>
    </section>
  );
}
function Row({ name, dept, actions }: { name: string; dept: string | null; actions: any }) {
  return (
    <div className="p-4 flex items-center gap-3">
      <div className="size-10 rounded-full bg-gradient-brand flex items-center justify-center text-white text-sm font-semibold">{name?.[0]?.toUpperCase() ?? "?"}</div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{name ?? "—"}</div>
        <div className="text-xs text-muted-foreground truncate">{dept ?? "—"}</div>
      </div>
      <div className="flex items-center gap-2">{actions}</div>
    </div>
  );
}
function Empty({ text }: { text: string }) { return <div className="p-6 text-sm text-muted-foreground text-center">{text}</div>; }
