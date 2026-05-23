import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

const Body = z.object({ school_id: z.string().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/) });

// Generic response — same body for both "found" and "not found" to prevent
// enumeration of which school IDs have registered accounts.
const GENERIC_OK = {
  message:
    "If a matching account exists, a login link has been sent to your campus email.",
};

export const Route = createFileRoute("/api/public/school-id-login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Bad request" }, { status: 400 });
        }
        const parsed = Body.safeParse(body);
        if (!parsed.success) {
          // Still respond generically to avoid distinguishing invalid input
          // from missing accounts during enumeration attempts.
          return Response.json(GENERIC_OK, { status: 200 });
        }

        // Look up the email linked to this school_id (private table — admin only)
        const { data: priv } = await supabaseAdmin
          .from("profiles_private")
          .select("id, email")
          .eq("school_id", parsed.data.school_id)
          .maybeSingle();

        if (priv?.email) {
          // Send a magic link via Supabase's built-in email delivery.
          // We never return the link to the caller — only the user's inbox
          // receives it.
          await supabaseAdmin.auth.signInWithOtp({
            email: priv.email,
            options: {
              emailRedirectTo: new URL(request.url).origin + "/dashboard",
              shouldCreateUser: false,
            },
          });
        }

        // Always return the same generic response.
        return Response.json(GENERIC_OK, { status: 200 });
      },
    },
  },
});
