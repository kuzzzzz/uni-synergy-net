import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthed } from "./_supabase";

export default defineTool({
  name: "send_direct_message",
  title: "Send direct message",
  description: "Send a direct message from the signed-in user to another Campus Connect user.",
  inputSchema: {
    recipient_id: z.string().uuid().describe("Recipient's user id (uuid)."),
    content: z.string().trim().min(1).max(4000),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ recipient_id, content }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthed();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("messages")
      .insert({ sender_id: ctx.getUserId()!, recipient_id, content })
      .select()
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Message sent to ${recipient_id}.` }],
      structuredContent: { message: data },
    };
  },
});
