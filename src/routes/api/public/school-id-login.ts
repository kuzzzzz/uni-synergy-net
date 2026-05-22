import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

const Body = z.object({ school_id: z.string().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/) });

export const Route = createFileRoute("/api/public/school-id-login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try { body = await request.json(); } catch { return Response.json({ error: "Bad JSON" }, { status: 400 }); }
        const parsed = Body.safeParse(body);
        if (!parsed.success) return Response.json({ error: "Invalid school_id" }, { status: 400 });

        const { data: profile, error } = await supabaseAdmin
          .from("profiles")
          .select("id, email")
          .eq("school_id", parsed.data.school_id)
          .maybeSingle();

        if (error) return Response.json({ error: error.message }, { status: 500 });
        if (!profile?.email) {
          return Response.json(
            { error: "No account linked to this School ID. Please sign up first." },
            { status: 404 },
          );
        }

        // Generate a magic link for the user
        const { data, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
          type: "magiclink",
          email: profile.email,
          options: { redirectTo: new URL(request.url).origin + "/dashboard" },
        });
        if (linkErr) return Response.json({ error: linkErr.message }, { status: 500 });

        return Response.json({ action_link: data.properties?.action_link });
      },
    },
  },
});
