import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { GraduationCap } from "lucide-react";

function safeNext(next: unknown): string {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export const Route = createFileRoute("/signup")({
  validateSearch: (s: Record<string, unknown>) => ({ next: safeNext(s.next) }),
  component: Signup,
});

function Signup() {
  const nav = useNavigate();
  const { next } = Route.useSearch();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin + next,
        data: { full_name: name },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Account created — welcome!");
    if (next !== "/dashboard") window.location.href = next;
    else nav({ to: "/onboarding" });
  };

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-card rounded-2xl border border-border p-8 shadow-soft">
        <Link to="/" className="flex items-center gap-2 mb-6">
          <div className="size-9 bg-gradient-brand rounded-xl flex items-center justify-center shadow-glow">
            <GraduationCap className="size-5 text-white" />
          </div>
          <span className="font-display text-lg font-bold">Campus Connect</span>
        </Link>
        <h1 className="font-display text-2xl font-bold mb-1">Create your account</h1>
        <p className="text-sm text-muted-foreground mb-6">Start matching with classmates.</p>

        <form onSubmit={submit} className="space-y-3">
          <input
            type="text" placeholder="Full name" required value={name} onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-ring/30"
          />
          <input
            type="email" placeholder="University email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-ring/30"
          />
          <input
            type="password" placeholder="Password (min 8 chars)" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-ring/30"
          />
          <button disabled={loading} className="w-full py-2.5 rounded-lg bg-gradient-brand text-white font-semibold text-sm shadow-glow disabled:opacity-60">
            {loading ? "Creating…" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" search={{ next }} className="text-primary font-semibold hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
