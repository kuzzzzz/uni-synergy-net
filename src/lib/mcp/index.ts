import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getMe from "./tools/get-me";
import searchPeers from "./tools/search-peers";
import listProjects from "./tools/list-projects";
import createProject from "./tools/create-project";
import listMessages from "./tools/list-messages";
import sendMessage from "./tools/send-message";
import listConnections from "./tools/list-connections";

// Direct Supabase issuer (not the .lovable.cloud proxy) — required by RFC 8414.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "campus-connect-mcp",
  title: "Campus Connect",
  version: "0.1.0",
  instructions:
    "Tools for Campus Connect — a university collaboration network. Use these to read the signed-in user's profile, search peers, list and create projects, list connections, and read or send direct messages. All tools act as the signed-in user under row-level security.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getMe, searchPeers, listProjects, createProject, listMessages, sendMessage, listConnections],
});
