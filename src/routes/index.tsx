import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { GraduationCap, Sparkles, Users, MessageSquare, BarChart3, ArrowRight, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "Campus Connect — Find your study partners" },
      {
        name: "description",
        content:
          "Smart matching, project teams, real-time study groups, and a campus knowledge graph for university students.",
      },
    ],
  }),
});

function Landing() {
  const { user, loading } = useAuth();
  if (!loading && user) return <Navigate to="/dashboard" />;

  return (
    <div className="min-h-screen bg-canvas">
      <header className="px-8 py-5 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="size-9 bg-gradient-brand rounded-xl flex items-center justify-center shadow-glow">
            <GraduationCap className="size-5 text-white" />
          </div>
          <span className="font-display text-xl font-bold tracking-tight">Campus Connect</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Sign in
          </Link>
          <Link
            to="/signup"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold shadow-soft hover:shadow-glow transition-shadow"
          >
            Get started <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 pt-16 pb-24">
        <section className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-soft text-primary text-xs font-semibold mb-6">
            <Sparkles className="size-3.5" /> Master's-level student network
          </div>
          <h1 className="font-display text-5xl md:text-6xl font-bold tracking-tight text-balance">
            Find the right minds <br />
            to <span className="text-gradient-brand">study, build, and grow with</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground text-pretty">
            Campus Connect matches you with peers by complementary skills, shared interests, and overlapping
            availability — so every collaboration starts on solid ground.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              to="/signup"
              className="rounded-lg bg-gradient-brand text-white px-5 py-3 text-sm font-semibold shadow-glow hover:opacity-95"
            >
              Create your profile
            </Link>
            <Link
              to="/login"
              className="rounded-lg bg-card border border-border px-5 py-3 text-sm font-semibold hover:bg-secondary"
            >
              Sign in with School ID
            </Link>
          </div>
        </section>

        <section className="mt-24 grid md:grid-cols-3 gap-6">
          {[
            {
              icon: Sparkles,
              title: "Smart Matching",
              body: "Algorithm pairs students whose strengths fill each other's weak subjects, with availability overlap built-in.",
            },
            {
              icon: Users,
              title: "Project Teams & Study Groups",
              body: "Spin up a research project, recruit teammates by required skills, and run sessions with shared notes.",
            },
            {
              icon: MessageSquare,
              title: "Real-time Collaboration",
              body: "Direct messages, group chats, and notifications keep momentum going between meetings.",
            },
            {
              icon: BarChart3,
              title: "Network Analytics",
              body: "See how your collaboration network grows over time, with engagement metrics and graph visualizations.",
            },
            {
              icon: ShieldCheck,
              title: "School ID SSO",
              body: "Authenticate using your university-issued ID via the dedicated SSO API endpoint.",
            },
            {
              icon: GraduationCap,
              title: "Built for Masters Programs",
              body: "Department-aware matching, milestone tracking, and resource sharing for serious academic work.",
            },
          ].map((f) => (
            <div key={f.title} className="bg-card rounded-2xl border border-border p-6 shadow-soft">
              <div className="size-10 rounded-lg bg-primary-soft text-primary flex items-center justify-center mb-4">
                <f.icon className="size-5" />
              </div>
              <h3 className="font-semibold text-lg mb-1">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        Campus Connect — A Master's capstone project.
      </footer>
    </div>
  );
}
