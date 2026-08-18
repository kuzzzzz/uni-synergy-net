-- Compatibility fix for the current profile UI, which creates a shared
-- skill catalog entry when a user types a new skill (e.g. CSC101).
-- Existing catalog skills such as Linear Algebra do not hit this INSERT path,
-- which is why the bug can appear to affect only new skill names.

DROP POLICY IF EXISTS "skills_insert_auth" ON public.skills;
CREATE POLICY "skills_insert_auth" ON public.skills
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- The user_skills policy remains self-only; users can never attach a skill
-- to another user's profile.
DROP POLICY IF EXISTS "user_skills_manage" ON public.user_skills;
CREATE POLICY "user_skills_manage" ON public.user_skills
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
