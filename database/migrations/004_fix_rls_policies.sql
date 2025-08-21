-- Fix RLS policies to allow anon access for development
-- This allows the frontend to work without authentication during development

-- Drop existing policies
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON vehicles;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON drivers;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON bowsers;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON activities;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON fields;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON fuel_entries;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON refill_records;

-- Create new policies that allow anon access for development
CREATE POLICY "Allow all operations for anon users" ON vehicles
    FOR ALL USING (true);

CREATE POLICY "Allow all operations for anon users" ON drivers
    FOR ALL USING (true);

CREATE POLICY "Allow all operations for anon users" ON bowsers
    FOR ALL USING (true);

CREATE POLICY "Allow all operations for anon users" ON activities
    FOR ALL USING (true);

CREATE POLICY "Allow all operations for anon users" ON fields
    FOR ALL USING (true);

CREATE POLICY "Allow all operations for anon users" ON fuel_entries
    FOR ALL USING (true);

CREATE POLICY "Allow all operations for anon users" ON refill_records
    FOR ALL USING (true);