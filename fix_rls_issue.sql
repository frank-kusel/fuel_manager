-- Quick Fix for Bowser RLS Issue
-- Run this in your Supabase SQL editor to fix the authentication error

-- Option 1: Simplest fix - Disable RLS entirely (recommended for development)
ALTER TABLE bowsers DISABLE ROW LEVEL SECURITY;

-- Option 2: If you prefer to keep RLS enabled, create a permissive policy
-- (Uncomment the lines below and comment out the ALTER TABLE above)
-- DROP POLICY IF EXISTS "Allow all operations" ON bowsers;
-- CREATE POLICY "Allow all operations" ON bowsers FOR ALL USING (true);

-- Verify the fix by checking if you can now add bowsers in the app
-- You should also run this to make sure fuel_entries table doesn't have similar issues:
ALTER TABLE fuel_entries DISABLE ROW LEVEL SECURITY;

-- Alternative: If you want to keep RLS on fuel_entries, create a permissive policy:
-- CREATE POLICY "Allow all operations on fuel_entries" ON fuel_entries FOR ALL USING (true);