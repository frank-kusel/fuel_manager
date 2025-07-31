-- Supabase Database Migration for Bowser Functionality
-- Run these commands in your Supabase SQL editor

-- 1. Create bowsers table
CREATE TABLE IF NOT EXISTS bowsers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    capacity DECIMAL(10,2) NOT NULL DEFAULT 0,
    current_reading DECIMAL(10,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add bowser-related columns to fuel_entries table
ALTER TABLE fuel_entries 
ADD COLUMN IF NOT EXISTS bowser_id INTEGER REFERENCES bowsers(id),
ADD COLUMN IF NOT EXISTS bowser_start DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS bowser_end DECIMAL(10,2);

-- 3. Insert default bowser (Tank A)
INSERT INTO bowsers (name, capacity, current_reading, status) 
VALUES ('Tank A', 10000.00, 0.00, 'active')
ON CONFLICT (name) DO NOTHING;

-- 4. Create index for better performance
CREATE INDEX IF NOT EXISTS idx_fuel_entries_bowser_id ON fuel_entries(bowser_id);
CREATE INDEX IF NOT EXISTS idx_fuel_entries_date_bowser ON fuel_entries(date, bowser_id);

-- 5. Enable Row Level Security (optional but recommended)
ALTER TABLE bowsers ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies (choose ONE of the options below based on your setup)

-- OPTION A: Disable RLS entirely (simplest for development/single-user)
-- ALTER TABLE bowsers DISABLE ROW LEVEL SECURITY;

-- OPTION B: Allow all operations without authentication (for development)
CREATE POLICY "Allow all operations" ON bowsers FOR ALL USING (true);

-- OPTION C: Allow authenticated users (if you have Supabase auth set up)
-- CREATE POLICY "Allow all operations for authenticated users" ON bowsers
--     FOR ALL USING (auth.role() = 'authenticated');

-- OPTION D: Allow specific user (replace with your actual user ID)
-- CREATE POLICY "Allow operations for specific user" ON bowsers
--     FOR ALL USING (auth.uid() = 'your-user-id-here');

-- 7. Update timestamp trigger for bowsers table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_bowsers_updated_at 
    BEFORE UPDATE ON bowsers 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 8. Create a view for fuel entries with bowser information (optional)
CREATE OR REPLACE VIEW fuel_entries_with_bowser AS
SELECT 
    fe.*,
    b.name as bowser_name,
    b.capacity as bowser_capacity,
    (fe.bowser_end - fe.bowser_start) as fuel_dispensed_from_bowser
FROM fuel_entries fe
LEFT JOIN bowsers b ON fe.bowser_id = b.id;

-- Migration complete!
-- You can now use the updated fuel manager app with bowser functionality.