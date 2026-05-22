
-- =========== ENUMS ===========
CREATE TYPE app_role AS ENUM ('student','staff','admin');
CREATE TYPE skill_level AS ENUM ('weak','medium','strong','expert');
CREATE TYPE project_status AS ENUM ('forming','active','completed','archived');
CREATE TYPE request_status AS ENUM ('pending','accepted','rejected');

-- =========== PROFILES ===========
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  school_id TEXT UNIQUE,
  department TEXT,
  year TEXT,
  bio TEXT,
  avatar_url TEXT,
  learning_preference TEXT,
  goals TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =========== ROLES ===========
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'student',
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- =========== SKILLS & INTERESTS ===========
CREATE TABLE public.skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT
);
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  level skill_level NOT NULL DEFAULT 'medium',
  can_teach BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(user_id, skill_id)
);
ALTER TABLE public.user_skills ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE
);
ALTER TABLE public.interests ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  interest_id UUID NOT NULL REFERENCES public.interests(id) ON DELETE CASCADE,
  UNIQUE(user_id, interest_id)
);
ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;

-- =========== AVAILABILITY ===========
CREATE TABLE public.availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL
);
ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;

-- =========== PROJECTS ===========
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  max_team_size INT NOT NULL DEFAULT 5,
  status project_status NOT NULL DEFAULT 'forming',
  required_skills TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  completed BOOLEAN NOT NULL DEFAULT false,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

-- helper: is project member?
CREATE OR REPLACE FUNCTION public.is_project_member(_project_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.project_members WHERE project_id = _project_id AND user_id = _user_id)
  OR EXISTS(SELECT 1 FROM public.projects WHERE id = _project_id AND owner_id = _user_id)
$$;

-- =========== STUDY GROUPS ===========
CREATE TABLE public.study_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.study_groups ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_group_member(_group_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.group_members WHERE group_id = _group_id AND user_id = _user_id)
  OR EXISTS(SELECT 1 FROM public.study_groups WHERE id = _group_id AND owner_id = _user_id)
$$;

-- =========== SESSIONS (calendar) ===========
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.study_groups(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  organizer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_min INT NOT NULL DEFAULT 60,
  location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- =========== MESSAGES ===========
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.study_groups(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (recipient_id IS NOT NULL)::int + (group_id IS NOT NULL)::int + (project_id IS NOT NULL)::int = 1
  )
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX ON public.messages (sender_id);
CREATE INDEX ON public.messages (recipient_id);
CREATE INDEX ON public.messages (group_id);
CREATE INDEX ON public.messages (project_id);

-- =========== CONNECTION REQUESTS ===========
CREATE TABLE public.connection_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status request_status NOT NULL DEFAULT 'pending',
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(from_user, to_user)
);
ALTER TABLE public.connection_requests ENABLE ROW LEVEL SECURITY;

-- =========== NOTIFICATIONS ===========
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- =========== SCHOOL-ID LOGIN TOKENS ===========
-- The university's SSO endpoint exchanges a verified school_id for a one-time token,
-- which is then redeemed for a session.
CREATE TABLE public.school_id_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  school_id TEXT NOT NULL,
  email TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '10 minutes'),
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.school_id_tokens ENABLE ROW LEVEL SECURITY;

-- =========== TRIGGERS ===========
-- updated_at trigger
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Auto-create profile + default student role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, school_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    NEW.email,
    NEW.raw_user_meta_data->>'school_id'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========== RLS POLICIES ===========

-- profiles: everyone (authenticated) can view; only self can edit
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- user_roles: viewable by self + admins
CREATE POLICY "roles_select_own" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "roles_admin_manage" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- skills / interests catalog: read for all authenticated; only admin/staff insert
CREATE POLICY "skills_read" ON public.skills FOR SELECT TO authenticated USING (true);
CREATE POLICY "skills_insert_auth" ON public.skills FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "interests_read" ON public.interests FOR SELECT TO authenticated USING (true);
CREATE POLICY "interests_insert_auth" ON public.interests FOR INSERT TO authenticated WITH CHECK (true);

-- user_skills/interests: viewable by all auth (for matching); manageable by self
CREATE POLICY "user_skills_read" ON public.user_skills FOR SELECT TO authenticated USING (true);
CREATE POLICY "user_skills_manage" ON public.user_skills FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_interests_read" ON public.user_interests FOR SELECT TO authenticated USING (true);
CREATE POLICY "user_interests_manage" ON public.user_interests FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- availability: viewable by all auth, manageable by self
CREATE POLICY "availability_read" ON public.availability FOR SELECT TO authenticated USING (true);
CREATE POLICY "availability_manage" ON public.availability FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- projects: all auth can read (discovery); only owner can update/delete
CREATE POLICY "projects_read" ON public.projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "projects_insert" ON public.projects FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "projects_update_owner" ON public.projects FOR UPDATE TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "projects_delete_owner" ON public.projects FOR DELETE TO authenticated USING (owner_id = auth.uid());

-- project_members
CREATE POLICY "pm_read" ON public.project_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "pm_insert_self_or_owner" ON public.project_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR EXISTS(SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.owner_id = auth.uid()));
CREATE POLICY "pm_delete_self_or_owner" ON public.project_members FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR EXISTS(SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.owner_id = auth.uid()));

-- milestones: visible to all auth, manageable by project members
CREATE POLICY "ms_read" ON public.milestones FOR SELECT TO authenticated USING (true);
CREATE POLICY "ms_manage" ON public.milestones FOR ALL TO authenticated
  USING (public.is_project_member(project_id, auth.uid()))
  WITH CHECK (public.is_project_member(project_id, auth.uid()));

-- study_groups: discoverable
CREATE POLICY "sg_read" ON public.study_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "sg_insert" ON public.study_groups FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "sg_update_owner" ON public.study_groups FOR UPDATE TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "sg_delete_owner" ON public.study_groups FOR DELETE TO authenticated USING (owner_id = auth.uid());

-- group_members
CREATE POLICY "gm_read" ON public.group_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "gm_join" ON public.group_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "gm_leave" ON public.group_members FOR DELETE TO authenticated USING (user_id = auth.uid());

-- sessions: visible to all auth, organizer + members can manage
CREATE POLICY "sessions_read" ON public.sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "sessions_manage" ON public.sessions FOR ALL TO authenticated
  USING (
    organizer_id = auth.uid()
    OR (group_id IS NOT NULL AND public.is_group_member(group_id, auth.uid()))
    OR (project_id IS NOT NULL AND public.is_project_member(project_id, auth.uid()))
  )
  WITH CHECK (organizer_id = auth.uid());

-- messages: read if you're sender/recipient/group member/project member
CREATE POLICY "messages_read" ON public.messages FOR SELECT TO authenticated USING (
  sender_id = auth.uid()
  OR recipient_id = auth.uid()
  OR (group_id IS NOT NULL AND public.is_group_member(group_id, auth.uid()))
  OR (project_id IS NOT NULL AND public.is_project_member(project_id, auth.uid()))
);
CREATE POLICY "messages_insert" ON public.messages FOR INSERT TO authenticated WITH CHECK (
  sender_id = auth.uid() AND (
    recipient_id IS NOT NULL
    OR (group_id IS NOT NULL AND public.is_group_member(group_id, auth.uid()))
    OR (project_id IS NOT NULL AND public.is_project_member(project_id, auth.uid()))
  )
);

-- connection_requests
CREATE POLICY "cr_read" ON public.connection_requests FOR SELECT TO authenticated
  USING (from_user = auth.uid() OR to_user = auth.uid());
CREATE POLICY "cr_insert" ON public.connection_requests FOR INSERT TO authenticated WITH CHECK (from_user = auth.uid());
CREATE POLICY "cr_update_recipient" ON public.connection_requests FOR UPDATE TO authenticated
  USING (to_user = auth.uid() OR from_user = auth.uid());

-- notifications
CREATE POLICY "notif_read_own" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notif_update_own" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- school_id_tokens: server-only (no client policies = denied by default)

-- realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- =========== SEED SKILLS & INTERESTS ===========
INSERT INTO public.skills (name, category) VALUES
  ('Python','Programming'),('JavaScript','Programming'),('TypeScript','Programming'),
  ('Java','Programming'),('C++','Programming'),('SQL','Data'),('Machine Learning','AI'),
  ('Deep Learning','AI'),('Data Visualization','Data'),('Statistics','Math'),
  ('Linear Algebra','Math'),('Calculus','Math'),('Algorithms','CS'),
  ('Systems Design','CS'),('UI/UX Design','Design'),('Figma','Design'),
  ('React','Web'),('Node.js','Web'),('Neo4j','Data'),('PostgreSQL','Data'),
  ('Research Writing','Writing'),('Public Speaking','Communication')
ON CONFLICT DO NOTHING;

INSERT INTO public.interests (name) VALUES
  ('AI Research'),('Web Development'),('Robotics'),('Quantum Computing'),
  ('Climate Tech'),('Game Dev'),('Hackathons'),('Open Source'),
  ('Entrepreneurship'),('Music'),('Philosophy'),('Mathematics'),
  ('Cybersecurity'),('Data Ethics'),('Design Systems')
ON CONFLICT DO NOTHING;
