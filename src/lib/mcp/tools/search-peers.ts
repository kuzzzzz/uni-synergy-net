import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthed } from "./_supabase";

export default defineTool({
  name: "search_peers",
  title: "Search peers",
  description: "Search Campus Connect student profiles by name or department. Returns up to 20 matches.",
  inputSchema: {
    query: z.string().trim().min(1).describe("Name or department substring to search for."),
    limit: z.number().int().min(1).max(50).optional().describe("Max results (default 20)."),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ query, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthed();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, department, year, bio")
      .or(`full_name.ilike.%${query}%,department.ilike.%${query}%`)
      .neq("id", ctx.getUserId()!)
      .limit(limit ?? 20);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { peers: data ?? [] },
    };
  },
});
