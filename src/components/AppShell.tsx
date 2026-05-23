import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Sparkles,
  Users,
  FolderKanban,
  MessageSquare,
  Calendar,
  BarChart3,
  UserCircle2,
  LogOut,
  Bell,
  Search,
  GraduationCap,
  FileText,
  UserPlus,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/matches", label: "Smart Matches", icon: Sparkles },
  { to: "/connections", label: "Connections", icon: UserPlus },
  { to: "/study-groups", label: "Study Groups", icon: Users },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/messages", label: "Messages", icon: MessageSquare },
  { to: "/resources", label: "Resources", icon: FileText },
  { to: "/calendar", label: "Calendar", icon: Calendar },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/profile", label: "Profile", icon: UserCircle2 },
];


export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ full_name: string; department: string | null; avatar_url: string | null } | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name, department, avatar_url")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setProfile(data));
  }, [user]);

  return (
    <div className="min-h-screen bg-canvas text-foreground flex">
      <aside className="w-64 border-r border-border bg-sidebar flex flex-col sticky top-0 h-screen shrink-0">
        <div className="p-6">
          <Link to="/dashboard" className="flex items-center gap-2 mb-8">
            <div className="size-9 bg-gradient-brand rounded-xl flex items-center justify-center shadow-glow">
              <GraduationCap className="size-5 text-white" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-display text-lg font-bold tracking-tight">Campus Connect</span>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">University Network</span>
            </div>
          </Link>

          <nav className="space-y-1">
            {nav.map((item) => {
              const active = path === item.to || path.startsWith(item.to + "/");
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md font-medium text-sm transition-colors",
                    active
                      ? "bg-primary-soft text-primary"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <item.icon className="size-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto p-4 border-t border-border space-y-3">
          <div className="bg-secondary rounded-xl p-3">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Authenticated via
            </div>
            <div className="flex items-center gap-2">
              <div className="size-2 bg-success rounded-full animate-pulse" />
              <span className="text-xs font-medium truncate">
                {profile?.school_id ? `School ID (${profile.school_id})` : "Email Account"}
              </span>
            </div>
          </div>
          <button
            onClick={async () => {
              await signOut();
              navigate({ to: "/login" });
            }}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors px-1"
          >
            <LogOut className="size-3.5" /> Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <header className="h-16 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-10 px-8 flex items-center justify-between">
          <div className="relative w-96 max-w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              placeholder="Search courses, skills, or peers..."
              className="w-full h-9 bg-secondary rounded-full border border-border pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>
          <div className="flex items-center gap-4">
            <button className="relative p-2 rounded-full hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
              <Bell className="size-4" />
            </button>
            <Link
              to="/profile"
              className="size-9 rounded-full bg-gradient-brand flex items-center justify-center text-white text-sm font-semibold shadow-soft"
            >
              {profile?.full_name?.[0]?.toUpperCase() ?? "?"}
            </Link>
          </div>
        </header>
        <div className="p-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
