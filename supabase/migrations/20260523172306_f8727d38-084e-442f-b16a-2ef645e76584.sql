CREATE OR REPLACE FUNCTION public.tg_ratings_lock_target()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.rated_id IS DISTINCT FROM OLD.rated_id THEN
    RAISE EXCEPTION 'rated_id is immutable';
  END IF;
  IF NEW.rater_id IS DISTINCT FROM OLD.rater_id THEN
    RAISE EXCEPTION 'rater_id is immutable';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ratings_lock_target ON public.ratings;
CREATE TRIGGER ratings_lock_target
  BEFORE UPDATE ON public.ratings
  FOR EACH ROW EXECUTE FUNCTION public.tg_ratings_lock_target();

DROP POLICY IF EXISTS ratings_update_own ON public.ratings;
CREATE POLICY ratings_update_own ON public.ratings
  FOR UPDATE TO authenticated
  USING (rater_id = auth.uid())
  WITH CHECK (rater_id = auth.uid());