import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GraduationCap } from "lucide-react";

// Beta auth.oauth namespace — typed wrapper so we don't grep node_modules.
type AuthDetails = {
  client?: { name?: string; redirect_uris?: string[] } | null;
  scope?: string;
  redirect_url?: string;
  redirect_to?: string;
};
type OAuthApi = {
  getAuthorizationDetails(id: string): Promise<{ data: AuthDetails | null; error: { message: string } | null }>;
  approveAuthorization(id: string): Promise<{ data: AuthDetails | null; error: { message: string } | null }>;
  denyAuthorization(id: string): Promise<{ data: AuthDetails | null; error: { message: string } | null }>;
};
const oauth = () => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

function isSameOriginRelative(next: string) {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//");
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    const next = location.pathname + location.searchStr;
    if (!data.session) throw redirect({ to: "/login", search: { next } });
  },
  loader: async ({ location }) => {
    const id = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauth().getAuthorizationDetails(id);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="min-h-screen flex items-center justify-center bg-canvas px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-xl font-semibold mb-2">Authorization error</h1>
        <p className="text-sm text-muted-foreground">
          {String((error as Error)?.message ?? error)}
        </p>
      </div>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error: err } = approve
      ? await oauth().approveAuthorization(authorization_id)
      : await oauth().denyAuthorization(authorization_id);
    if (err) {
      setBusy(false);
      setError(err.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    if (isSameOriginRelative(target)) window.location.href = target;
    else window.location.href = target;
  }

  const clientName = details?.client?.name ?? "an external app";
  const scopes = (details?.scope ?? "").split(/\s+/).filter(Boolean);

  return (
    <main className="min-h-screen flex items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-md bg-card rounded-2xl border border-border p-8 shadow-soft">
        <div className="flex items-center gap-2 mb-6">
          <div className="size-9 bg-gradient-brand rounded-xl flex items-center justify-center shadow-glow">
            <GraduationCap className="size-5 text-white" />
          </div>
          <span className="font-display text-lg font-bold">Campus Connect</span>
        </div>
        <h1 className="font-display text-xl font-bold mb-1">
          Connect {clientName} to Campus Connect
        </h1>
        <p className="text-sm text-muted-foreground mb-4">
          This lets {clientName} use Campus Connect as you. It cannot bypass this app's
          permissions or backend policies.
        </p>

        {scopes.length > 0 && (
          <div className="rounded-lg border border-border bg-secondary/40 p-3 mb-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Requested access
            </div>
            <ul className="text-sm space-y-1">
              {scopes.map((s) => (
                <li key={s} className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-primary" />
                  {s === "openid" || s === "profile"
                    ? "Share your basic profile"
                    : s === "email"
                      ? "Share your email address"
                      : `Additional permission: ${s}`}
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm text-destructive mb-3">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <button
            disabled={busy}
            onClick={() => decide(true)}
            className="flex-1 py-2.5 rounded-lg bg-gradient-brand text-white font-semibold text-sm shadow-glow disabled:opacity-60"
          >
            {busy ? "Working…" : "Approve"}
          </button>
          <button
            disabled={busy}
            onClick={() => decide(false)}
            className="flex-1 py-2.5 rounded-lg border border-border bg-background font-semibold text-sm disabled:opacity-60"
          >
            Cancel connection
          </button>
        </div>
      </div>
    </main>
  );
}
