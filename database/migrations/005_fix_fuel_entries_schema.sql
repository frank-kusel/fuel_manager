-- Fix fuel_entries schema to match application expectations
-- Add the missing odometer fields and gauge_working field

-- Add new columns to fuel_entries table
ALTER TABLE fuel_entries 
ADD COLUMN IF NOT EXISTS odometer_start DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS odometer_end DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS gauge_working BOOLEAN DEFAULT true;

-- Migrate existing data from odometer_reading to odometer_start if it exists
-- (This assumes odometer_reading was the ending odometer reading)
UPDATE fuel_entries 
SET odometer_end = odometer_reading 
WHERE odometer_reading IS NOT NULL AND odometer_end IS NULL;

-- Note: We keep the original odometer_reading column for backward compatibility
-- but the application will now use odometer_start and odometer_end