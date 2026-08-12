-- 021: Enable RLS on zones and fuel_entry_fields
--
-- Both tables were created after 004_fix_rls_policies.sql and carry
-- auth.uid()-based policies that never matched the app: the frontend uses the
-- anon key with no session (see 004's rationale). RLS was left disabled so the
-- app would work, which trips Supabase's rls_disabled_in_public advisor.
--
-- This aligns both tables with the other 15: RLS enabled, single permissive
-- "Allow all operations for anon users" policy. This clears the advisor errors
-- and makes the schema consistent; it does NOT restrict anon access, which
-- remains the project-wide posture until authentication is implemented.

-- Drop the strict policies first, so enabling RLS never exposes a window in
-- which the tables enforce auth.uid() IS NOT NULL against an anon frontend.
DROP POLICY IF EXISTS "Zones are viewable by authenticated users" ON public.zones;
DROP POLICY IF EXISTS "Zones are editable by authenticated users" ON public.zones;
DROP POLICY IF EXISTS "Fuel entry fields are manageable by authenticated users"
  ON public.fuel_entry_fields;

ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_entry_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for anon users" ON public.zones
    FOR ALL USING (true);

CREATE POLICY "Allow all operations for anon users" ON public.fuel_entry_fields
    FOR ALL USING (true);
