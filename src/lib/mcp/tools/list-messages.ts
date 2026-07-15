import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthed } from "./_supabase";

export default defineTool({
  name: "list_recent_messages",
  title: "List recent messages",
  description: "List the signed-in user's most recent direct messages (sent or received).",
  inputSchema: {
    limit: z.number().int().min(1).max(100).optional().describe("Max messages (default 20)."),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthed();
    const supabase = supabaseForUser(ctx);
    const uid = ctx.getUserId()!;
    const { data, error } = await supabase
      .from("messages")
      .select("id, sender_id, recipient_id, content, created_at")
      .or(`sender_id.eq.${uid},recipient_id.eq.${uid}`)
      .not("recipient_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { messages: data ?? [] },
    };
  },
});
