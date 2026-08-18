-- Allow authenticated users to add a personal skill safely without requiring
-- direct INSERT permission on the shared skills catalog.
-- The function creates/reuses the catalog entry and immediately assigns it
-- to the authenticated user in one transaction.

CREATE OR REPLACE FUNCTION public.add_skill_for_current_user(
  _name TEXT,
  _level skill_level DEFAULT 'medium'
)
RETURNS public.user_skills
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_skill public.skills;
  v_user_skill public.user_skills;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF _name IS NULL OR length(trim(_name)) < 2 THEN
    RAISE EXCEPTION 'Skill name must contain at least 2 characters';
  END IF;

  SELECT * INTO v_skill
  FROM public.skills
  WHERE lower(name) = lower(trim(_name))
  LIMIT 1;

  IF v_skill.id IS NULL THEN
    INSERT INTO public.skills (name)
    VALUES (trim(_name))
    RETURNING * INTO v_skill;
  END IF;

  INSERT INTO public.user_skills (user_id, skill_id, level, can_teach)
  VALUES (
    auth.uid(),
    v_skill.id,
    _level,
    _level IN ('strong', 'expert')
  )
  ON CONFLICT (user_id, skill_id)
  DO UPDATE SET level = EXCLUDED.level, can_teach = EXCLUDED.can_teach
  RETURNING * INTO v_user_skill;

  RETURN v_user_skill;
END;
$$;

REVOKE ALL ON FUNCTION public.add_skill_for_current_user(TEXT, skill_level) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_skill_for_current_user(TEXT, skill_level) TO authenticated;

-- Keep the catalog readable. New catalog entries should go through the
-- function above so the client cannot freely modify the shared catalogue.
DROP POLICY IF EXISTS "skills_insert_auth" ON public.skills;

-- Explicitly ensure the authenticated user can manage their own skill rows.
DROP POLICY IF EXISTS "user_skills_manage" ON public.user_skills;
CREATE POLICY "user_skills_manage" ON public.user_skills FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
