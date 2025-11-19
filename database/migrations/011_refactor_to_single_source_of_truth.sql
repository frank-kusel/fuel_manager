-- Migration: Refactor to Single Source of Truth for Readings
-- Description: Remove redundant current_reading fields and bowser_reading_history table
-- Author: System Refactor
-- Date: 2025-01-19
--
-- This migration implements a cleaner architecture where fuel_entries table
-- is the single source of truth for all bowser readings and vehicle odometers.
-- This eliminates data sync issues and simplifies cascade corrections.

-- ============================================================================
-- STEP 1: Drop bowser_reading_history table (audit trail no longer needed)
-- ============================================================================

DROP TABLE IF EXISTS bowser_reading_history CASCADE;

-- ============================================================================
-- STEP 2: Remove current_reading column from bowsers table
-- ============================================================================

-- Drop any indexes on current_reading first
DROP INDEX IF EXISTS idx_bowsers_current_reading;

-- Remove the column
ALTER TABLE bowsers
DROP COLUMN IF EXISTS current_reading CASCADE;

-- ============================================================================
-- STEP 3: Remove current_odometer column from vehicles table
-- ============================================================================

-- Drop any indexes on current_odometer first
DROP INDEX IF EXISTS idx_vehicles_current_odometer;

-- Remove the column
ALTER TABLE vehicles
DROP COLUMN IF EXISTS current_odometer CASCADE;

-- ============================================================================
-- STEP 4: Create view for current bowser readings
-- ============================================================================

CREATE OR REPLACE VIEW current_bowser_readings AS
SELECT DISTINCT ON (bowser_id)
    bowser_id,
    bowser_reading_end as current_reading,
    entry_date as last_entry_date,
    time as last_entry_time,
    id as last_fuel_entry_id
FROM fuel_entries
WHERE bowser_id IS NOT NULL
  AND bowser_reading_end IS NOT NULL
ORDER BY bowser_id, entry_date DESC, time DESC;

-- Create index on underlying table for view performance
CREATE INDEX IF NOT EXISTS idx_fuel_entries_bowser_readings
ON fuel_entries(bowser_id, entry_date DESC, time DESC)
WHERE bowser_id IS NOT NULL AND bowser_reading_end IS NOT NULL;

COMMENT ON VIEW current_bowser_readings IS
'Provides current bowser readings from the latest fuel entry for each bowser.
This is the single source of truth for bowser levels.';

-- ============================================================================
-- STEP 5: Create view for current vehicle odometers
-- ============================================================================

CREATE OR REPLACE VIEW current_vehicle_odometers AS
SELECT DISTINCT ON (vehicle_id)
    vehicle_id,
    odometer_end as current_odometer,
    entry_date as last_entry_date,
    time as last_entry_time,
    id as last_fuel_entry_id
FROM fuel_entries
WHERE vehicle_id IS NOT NULL
  AND odometer_end IS NOT NULL
ORDER BY vehicle_id, entry_date DESC, time DESC;

-- Create index on underlying table for view performance
CREATE INDEX IF NOT EXISTS idx_fuel_entries_vehicle_odometers
ON fuel_entries(vehicle_id, entry_date DESC, time DESC)
WHERE vehicle_id IS NOT NULL AND odometer_end IS NOT NULL;

COMMENT ON VIEW current_vehicle_odometers IS
'Provides current odometer readings from the latest fuel entry for each vehicle.
This is the single source of truth for vehicle odometers.';

-- ============================================================================
-- STEP 6: Create helper function to get current bowser reading
-- ============================================================================

CREATE OR REPLACE FUNCTION get_current_bowser_reading(p_bowser_id UUID)
RETURNS NUMERIC(10,2) AS $$
DECLARE
    v_current_reading NUMERIC(10,2);
BEGIN
    SELECT current_reading INTO v_current_reading
    FROM current_bowser_readings
    WHERE bowser_id = p_bowser_id;

    RETURN COALESCE(v_current_reading, 0);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_current_bowser_reading IS
'Returns the current bowser reading for a given bowser ID from the latest fuel entry.
Returns 0 if no fuel entries exist for the bowser.';

-- ============================================================================
-- STEP 7: Create helper function to get current vehicle odometer
-- ============================================================================

CREATE OR REPLACE FUNCTION get_current_vehicle_odometer(p_vehicle_id UUID)
RETURNS NUMERIC(10,2) AS $$
DECLARE
    v_current_odometer NUMERIC(10,2);
BEGIN
    SELECT current_odometer INTO v_current_odometer
    FROM current_vehicle_odometers
    WHERE vehicle_id = p_vehicle_id;

    RETURN v_current_odometer;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_current_vehicle_odometer IS
'Returns the current odometer reading for a given vehicle ID from the latest fuel entry.
Returns NULL if no fuel entries exist for the vehicle.';

-- ============================================================================
-- STEP 8: Grant appropriate permissions on views
-- ============================================================================

-- Grant read access to authenticated users
GRANT SELECT ON current_bowser_readings TO authenticated;
GRANT SELECT ON current_vehicle_odometers TO authenticated;

-- Enable RLS on views (they inherit from fuel_entries RLS)
-- Views automatically respect RLS policies of underlying tables

-- ============================================================================
-- VERIFICATION QUERIES (for testing after migration)
-- ============================================================================

-- Verify bowser readings view
-- SELECT b.id, b.name, cbr.current_reading, cbr.last_entry_date
-- FROM bowsers b
-- LEFT JOIN current_bowser_readings cbr ON b.id = cbr.bowser_id;

-- Verify vehicle odometers view
-- SELECT v.id, v.name, cvo.current_odometer, cvo.last_entry_date
-- FROM vehicles v
-- LEFT JOIN current_vehicle_odometers cvo ON v.id = cvo.vehicle_id;

-- Verify helper functions
-- SELECT get_current_bowser_reading('your-bowser-id-here');
-- SELECT get_current_vehicle_odometer('your-vehicle-id-here');

-- ============================================================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================================================

-- To rollback this migration, run:
/*
-- Add back current_reading to bowsers
ALTER TABLE bowsers ADD COLUMN current_reading NUMERIC(10,2) DEFAULT 0;

-- Add back current_odometer to vehicles
ALTER TABLE vehicles ADD COLUMN current_odometer NUMERIC(10,2);

-- Populate from latest fuel entries
UPDATE bowsers b
SET current_reading = cbr.current_reading
FROM current_bowser_readings cbr
WHERE b.id = cbr.bowser_id;

UPDATE vehicles v
SET current_odometer = cvo.current_odometer
FROM current_vehicle_odometers cvo
WHERE v.id = cvo.vehicle_id;

-- Drop views and functions
DROP VIEW IF EXISTS current_bowser_readings;
DROP VIEW IF EXISTS current_vehicle_odometers;
DROP FUNCTION IF EXISTS get_current_bowser_reading;
DROP FUNCTION IF EXISTS get_current_vehicle_odometer;

-- Recreate bowser_reading_history table (see original migration)
-- ... (original schema from migrations/add_bowser_reading_history.sql)
*/
