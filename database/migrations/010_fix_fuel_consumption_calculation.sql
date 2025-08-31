-- Fix fuel consumption calculation to use correct column name
-- The trigger was using 'litres_used' but the table has 'litres_dispensed'

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS trg_calculate_fuel_consumption ON fuel_entries;
DROP FUNCTION IF EXISTS trigger_calculate_fuel_consumption();

-- Create corrected trigger function using litres_dispensed
CREATE OR REPLACE FUNCTION trigger_calculate_fuel_consumption() 
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate consumption for the new/updated entry using litres_dispensed
    NEW.fuel_consumption_l_per_100km = calculate_fuel_consumption(
        NEW.litres_dispensed,  -- Fixed: use litres_dispensed instead of litres_used
        NEW.odometer_start,
        NEW.odometer_end,
        NEW.gauge_working
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
CREATE TRIGGER trg_calculate_fuel_consumption
    BEFORE INSERT OR UPDATE ON fuel_entries
    FOR EACH ROW
    EXECUTE FUNCTION trigger_calculate_fuel_consumption();

-- Backfill all existing fuel entries with correct consumption calculation
UPDATE fuel_entries 
SET fuel_consumption_l_per_100km = calculate_fuel_consumption(
    litres_dispensed,  -- Fixed: use litres_dispensed instead of litres_used
    odometer_start, 
    odometer_end,
    gauge_working
)
WHERE litres_dispensed IS NOT NULL AND gauge_working = true;

-- Update all vehicle averages after fixing the data
DO $$
DECLARE
    vehicle_rec RECORD;
BEGIN
    FOR vehicle_rec IN SELECT id FROM vehicles WHERE active = true
    LOOP
        PERFORM update_vehicle_average_consumption(vehicle_rec.id);
    END LOOP;
END $$;