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
  Menu,
  X,
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
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name, department, avatar_url")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setProfile(data));
  }, [user]);

  // Close drawer on route change
  useEffect(() => { setMobileOpen(false); }, [path]);

  const SidebarBody = (
    <>
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
          <div className="flex items-center gap-2 min-w-0">
            <div className="size-2 bg-success rounded-full animate-pulse shrink-0" />
            <span className="text-xs font-medium truncate">
              {user?.email ?? "Account"}
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
    </>
  );

  return (
    <div className="min-h-screen bg-canvas text-foreground flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 border-r border-border bg-sidebar flex-col sticky top-0 h-screen shrink-0">
        {SidebarBody}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] bg-sidebar border-r border-border flex flex-col overflow-y-auto">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-md hover:bg-secondary text-muted-foreground"
              aria-label="Close menu"
            >
              <X className="size-5" />
            </button>
            {SidebarBody}
          </aside>
        </div>
      )}

      <main className="flex-1 min-w-0">
        <header className="h-16 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-10 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 -ml-2 rounded-md hover:bg-secondary text-muted-foreground"
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>
          <SearchBox />

          <Link to="/dashboard" className="lg:hidden flex items-center gap-2 sm:hidden">
            <div className="size-7 bg-gradient-brand rounded-lg flex items-center justify-center">
              <GraduationCap className="size-4 text-white" />
            </div>
            <span className="font-display font-bold text-sm">Campus Connect</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4 ml-auto">
            <button className="relative p-2 rounded-full hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
              <Bell className="size-4" />
            </button>
            <Link
              to="/profile"
              className="size-9 rounded-full bg-gradient-brand flex items-center justify-center text-white text-sm font-semibold shadow-soft shrink-0"
            >
              {profile?.full_name?.[0]?.toUpperCase() ?? "?"}
            </Link>
          </div>
        </header>
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
