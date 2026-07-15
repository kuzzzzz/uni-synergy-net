import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser, notAuthed } from "./_supabase";

export default defineTool({
  name: "list_my_projects",
  title: "List my projects",
  description: "List projects the signed-in user owns or is a member of.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthed();
    const supabase = supabaseForUser(ctx);
    const uid = ctx.getUserId()!;
    const { data: memberships } = await supabase
      .from("project_members")
      .select("project_id")
      .eq("user_id", uid);
    const memberIds = (memberships ?? []).map((m) => m.project_id);
    const { data, error } = await supabase
      .from("projects")
      .select("id, title, description, status, required_skills, tags, owner_id, max_team_size, created_at")
      .or(`owner_id.eq.${uid}${memberIds.length ? `,id.in.(${memberIds.join(",")})` : ""}`)
      .order("created_at", { ascending: false });
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { projects: data ?? [] },
    };
  },
});
