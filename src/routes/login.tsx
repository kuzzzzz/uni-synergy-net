import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { GraduationCap, Mail, Lock, IdCard } from "lucide-react";

function safeNext(next: unknown): string {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>) => ({ next: safeNext(s.next) }),
  component: Login,
});

function Login() {
  const nav = useNavigate();
  const { next } = Route.useSearch();
  const [mode, setMode] = useState<"email" | "school">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [loading, setLoading] = useState(false);

  const onEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    window.location.href = next;
  };

  const onGoogle = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + next });
    if (r.error) toast.error("Google sign-in failed");
    else if (!r.redirected) window.location.href = next;
  };

  const onSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/public/school-id-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ school_id: schoolId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      toast.success(data.message ?? "If a matching account exists, a login link has been sent to your campus email.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "School ID login failed");
    } finally {
      setLoading(false);
    }
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
        <h1 className="font-display text-2xl font-bold mb-1">Welcome back</h1>
        <p className="text-sm text-muted-foreground mb-6">Sign in to continue collaborating.</p>

        <div className="flex bg-secondary rounded-lg p-1 mb-5 text-sm">
          <button
            className={`flex-1 py-1.5 rounded-md font-medium transition-colors ${mode === "email" ? "bg-card shadow-soft" : "text-muted-foreground"}`}
            onClick={() => setMode("email")}
          >
            Email
          </button>
          <button
            className={`flex-1 py-1.5 rounded-md font-medium transition-colors ${mode === "school" ? "bg-card shadow-soft" : "text-muted-foreground"}`}
            onClick={() => setMode("school")}
          >
            School ID
          </button>
        </div>

        {mode === "email" ? (
          <form onSubmit={onEmail} className="space-y-3">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="email"
                placeholder="you@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-ring/30"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-ring/30"
              />
            </div>
            <button
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-gradient-brand text-white font-semibold text-sm shadow-glow disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        ) : (
          <form onSubmit={onSchool} className="space-y-3">
            <div className="relative">
              <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="School ID (e.g. STU-8829)"
                value={schoolId}
                onChange={(e) => setSchoolId(e.target.value)}
                required
                className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-ring/30"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Your University SSO will verify your ID and issue a one-time login link.
            </p>
            <button
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-gradient-brand text-white font-semibold text-sm shadow-glow disabled:opacity-60"
            >
              {loading ? "Verifying…" : "Continue with School ID"}
            </button>
          </form>
        )}

        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex-1 h-px bg-border" /> or <div className="flex-1 h-px bg-border" />
        </div>

        <button
          onClick={onGoogle}
          className="w-full py-2.5 rounded-lg border border-border bg-background hover:bg-secondary font-semibold text-sm"
        >
          Continue with Google
        </button>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          New here?{" "}
          <Link to="/signup" className="text-primary font-semibold hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
