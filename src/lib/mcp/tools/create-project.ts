import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthed } from "./_supabase";

export default defineTool({
  name: "create_project",
  title: "Create project",
  description: "Create a new Campus Connect project owned by the signed-in user.",
  inputSchema: {
    title: z.string().trim().min(3).max(120),
    description: z.string().trim().max(2000).optional(),
    required_skills: z.array(z.string().trim()).max(20).optional(),
    tags: z.array(z.string().trim()).max(20).optional(),
    max_team_size: z.number().int().min(2).max(20).optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ title, description, required_skills, tags, max_team_size }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthed();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("projects")
      .insert({
        owner_id: ctx.getUserId()!,
        title,
        description: description ?? null,
        required_skills: required_skills ?? null,
        tags: tags ?? null,
        max_team_size: max_team_size ?? 5,
        status: "recruiting",
      })
      .select()
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Created project "${data.title}" (${data.id}).` }],
      structuredContent: { project: data },
    };
  },
});
