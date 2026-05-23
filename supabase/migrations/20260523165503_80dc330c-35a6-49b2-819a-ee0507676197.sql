
-- 1. Move email & school_id into private table
CREATE TABLE IF NOT EXISTS public.profiles_private (
  id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  email text,
  school_id text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles_private ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_private_select_own" ON public.profiles_private
  FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles_private_update_own" ON public.profiles_private
  FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- migrate existing data
INSERT INTO public.profiles_private (id, email, school_id)
SELECT id, email, school_id FROM public.profiles
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.profiles DROP COLUMN IF EXISTS email;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS school_id;

-- 2. Update handle_new_user trigger to use private table, ignore client school_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1))
  );
  INSERT INTO public.profiles_private (id, email)
  VALUES (NEW.id, NEW.email);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student');
  RETURN NEW;
END;
$$;

-- Ensure the trigger exists on auth.users (may already be set up)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Connection requests: restrict UPDATE to recipient only
DROP POLICY IF EXISTS cr_update_recipient ON public.connection_requests;
CREATE POLICY cr_update_recipient ON public.connection_requests
  FOR UPDATE TO authenticated
  USING (to_user = auth.uid())
  WITH CHECK (to_user = auth.uid());

-- 4. Interests & skills: admin-only inserts
DROP POLICY IF EXISTS interests_insert_auth ON public.interests;
CREATE POLICY interests_insert_admin ON public.interests
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS skills_insert_auth ON public.skills;
CREATE POLICY skills_insert_admin ON public.skills
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. Milestones: members-only read
DROP POLICY IF EXISTS ms_read ON public.milestones;
CREATE POLICY ms_read ON public.milestones
  FOR SELECT TO authenticated
  USING (public.is_project_member(project_id, auth.uid()));

-- 6. Sessions: members-only read
DROP POLICY IF EXISTS sessions_read ON public.sessions;
CREATE POLICY sessions_read ON public.sessions
  FOR SELECT TO authenticated
  USING (
    organizer_id = auth.uid()
    OR (group_id IS NOT NULL AND public.is_group_member(group_id, auth.uid()))
    OR (project_id IS NOT NULL AND public.is_project_member(project_id, auth.uid()))
  );

-- 7. Resources URL safety
ALTER TABLE public.resources
  DROP CONSTRAINT IF EXISTS resources_url_safe;
ALTER TABLE public.resources
  ADD CONSTRAINT resources_url_safe
  CHECK (url IS NULL OR url ~* '^https?://');

-- 8. Fix search_path on tg_set_updated_at
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- 9. Revoke execute on security-definer helpers from public callers
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_project_member(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_group_member(uuid, uuid) FROM PUBLIC, anon, authenticated;
