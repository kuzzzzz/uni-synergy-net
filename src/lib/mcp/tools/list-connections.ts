import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser, notAuthed } from "./_supabase";

export default defineTool({
  name: "list_my_connections",
  title: "List my connections",
  description: "List the signed-in user's accepted Campus Connect peer connections.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthed();
    const supabase = supabaseForUser(ctx);
    const uid = ctx.getUserId()!;
    const { data, error } = await supabase
      .from("connection_requests")
      .select("id, from_user, to_user, status, created_at")
      .or(`from_user.eq.${uid},to_user.eq.${uid}`)
      .eq("status", "accepted");
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { connections: data ?? [] },
    };
  },
});
