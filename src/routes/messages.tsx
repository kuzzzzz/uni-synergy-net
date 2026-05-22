import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { MessageSquare, Send } from "lucide-react";

export const Route = createFileRoute("/messages")({
  component: () => (
    <RequireAuth>
      <AppShell>
        <Messages />
      </AppShell>
    </RequireAuth>
  ),
});

type Peer = { id: string; full_name: string; department: string | null };
type Msg = { id: string; sender_id: string; recipient_id: string | null; content: string; created_at: string };

function Messages() {
  const { user } = useAuth();
  const [peers, setPeers] = useState<Peer[]>([]);
  const [active, setActive] = useState<Peer | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("id, full_name, department").neq("id", user.id).order("full_name")
      .then(({ data }) => setPeers(data ?? []));
  }, [user]);

  useEffect(() => {
    if (!user || !active) return;
    (async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .is("group_id", null).is("project_id", null)
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${active.id}),and(sender_id.eq.${active.id},recipient_id.eq.${user.id})`)
        .order("created_at");
      setMsgs(data ?? []);
    })();

    const ch = supabase
      .channel(`dm-${user.id}-${active.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const m = payload.new as Msg;
        if (
          (m.sender_id === user.id && m.recipient_id === active.id) ||
          (m.sender_id === active.id && m.recipient_id === user.id)
        ) {
          setMsgs((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, active]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [msgs]);

  async function send() {
    if (!text.trim() || !user || !active) return;
    const content = text.trim();
    setText("");
    const { data, error } = await supabase.from("messages").insert({ sender_id: user.id, recipient_id: active.id, content }).select().single();
    if (!error && data) setMsgs((m) => (m.some((x) => x.id === data.id) ? m : [...m, data]));
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-bold flex items-center gap-2"><MessageSquare className="size-6 text-primary" /> Messages</h1>
      <div className="bg-card border border-border rounded-2xl shadow-soft grid grid-cols-12 h-[70vh] overflow-hidden">
        <aside className="col-span-4 border-r border-border overflow-y-auto">
          {peers.map((p) => (
            <button
              key={p.id}
              onClick={() => setActive(p)}
              className={`w-full text-left px-4 py-3 flex items-center gap-3 border-b border-border hover:bg-secondary/40 ${active?.id === p.id ? "bg-primary-soft" : ""}`}
            >
              <div className="size-9 rounded-full bg-gradient-brand flex items-center justify-center text-white text-sm font-semibold shrink-0">
                {p.full_name?.[0]?.toUpperCase() ?? "?"}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{p.full_name}</div>
                <div className="text-xs text-muted-foreground truncate">{p.department ?? "—"}</div>
              </div>
            </button>
          ))}
        </aside>
        <section className="col-span-8 flex flex-col">
          {!active ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Select a peer to start a chat</div>
          ) : (
            <>
              <header className="h-14 px-5 flex items-center border-b border-border">
                <div className="font-semibold">{active.full_name}</div>
              </header>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-2">
                {msgs.map((m) => {
                  const mine = m.sender_id === user?.id;
                  return (
                    <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[70%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
                        {m.content}
                        <div className={`text-[10px] mt-1 opacity-60`}>{new Date(m.created_at).toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" })}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="p-3 border-t border-border flex gap-2">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  placeholder="Type a message…"
                  className="flex-1 h-10 px-3 bg-secondary border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-ring/30"
                />
                <button onClick={send} className="h-10 px-4 bg-primary text-primary-foreground rounded-lg text-sm font-medium inline-flex items-center gap-1">
                  <Send className="size-4" /> Send
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
