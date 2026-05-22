
-- Resources (shared notes / links / documents)
CREATE TABLE IF NOT EXISTS public.resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  url text,
  resource_type text NOT NULL DEFAULT 'link', -- link | note | document
  project_id uuid,
  group_id uuid,
  tags text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "resources_read" ON public.resources FOR SELECT TO authenticated
USING (
  owner_id = auth.uid()
  OR (project_id IS NOT NULL AND public.is_project_member(project_id, auth.uid()))
  OR (group_id IS NOT NULL AND public.is_group_member(group_id, auth.uid()))
  OR (project_id IS NULL AND group_id IS NULL) -- public resources
);
CREATE POLICY "resources_insert" ON public.resources FOR INSERT TO authenticated
WITH CHECK (owner_id = auth.uid());
CREATE POLICY "resources_update_own" ON public.resources FOR UPDATE TO authenticated
USING (owner_id = auth.uid());
CREATE POLICY "resources_delete_own" ON public.resources FOR DELETE TO authenticated
USING (owner_id = auth.uid());

-- Ratings between users
CREATE TABLE IF NOT EXISTS public.ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rater_id uuid NOT NULL,
  rated_id uuid NOT NULL,
  stars smallint NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rater_id, rated_id)
);
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ratings_read" ON public.ratings FOR SELECT TO authenticated USING (true);
CREATE POLICY "ratings_insert_own" ON public.ratings FOR INSERT TO authenticated
WITH CHECK (rater_id = auth.uid() AND rater_id <> rated_id);
CREATE POLICY "ratings_update_own" ON public.ratings FOR UPDATE TO authenticated
USING (rater_id = auth.uid());
CREATE POLICY "ratings_delete_own" ON public.ratings FOR DELETE TO authenticated
USING (rater_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_ratings_rated ON public.ratings(rated_id);
CREATE INDEX IF NOT EXISTS idx_resources_proj ON public.resources(project_id);
CREATE INDEX IF NOT EXISTS idx_resources_group ON public.resources(group_id);
