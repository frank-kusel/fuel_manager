-- Add discrepancy tracking columns to fuel_entries table
-- Run this in your Supabase SQL editor

ALTER TABLE fuel_entries 
ADD COLUMN IF NOT EXISTS has_discrepancy BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS discrepancy_amount DECIMAL(10,3) DEFAULT 0;

-- Create index for faster querying of discrepancies
CREATE INDEX IF NOT EXISTS idx_fuel_entries_discrepancy ON fuel_entries(has_discrepancy, date);

-- Update existing records to have no discrepancy
UPDATE fuel_entries 
SET has_discrepancy = FALSE, discrepancy_amount = 0 
WHERE has_discrepancy IS NULL;

-- Optional: Create a view for records with discrepancies for easy monitoring
CREATE OR REPLACE VIEW fuel_discrepancies AS
SELECT 
    fe.*,
    v.name as vehicle_name,
    v.code as vehicle_code,
    d.name as driver_name,
    b.name as bowser_name
FROM fuel_entries fe
LEFT JOIN vehicles v ON fe.vehicle_id = v.id
LEFT JOIN drivers d ON fe.driver_id = d.id
LEFT JOIN bowsers b ON fe.bowser_id = b.id
WHERE fe.has_discrepancy = TRUE
ORDER BY fe.date DESC;