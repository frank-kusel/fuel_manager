-- Add fuel consumption tracking columns
-- This enables tracking L/100km efficiency metrics for vehicles

-- Add fuel consumption to individual fuel entries (calculated field)
ALTER TABLE fuel_entries 
ADD COLUMN fuel_consumption_l_per_100km DECIMAL(5,2) NULL;

-- Add consumption tracking to vehicles table for rolling averages
ALTER TABLE vehicles 
ADD COLUMN average_consumption_l_per_100km DECIMAL(5,2) NULL,
ADD COLUMN consumption_entries_count INTEGER DEFAULT 0,
ADD COLUMN last_consumption_update TIMESTAMP NULL;

-- Create index for performance on consumption queries
CREATE INDEX idx_fuel_entries_consumption ON fuel_entries(fuel_consumption_l_per_100km) WHERE fuel_consumption_l_per_100km IS NOT NULL;
CREATE INDEX idx_vehicles_consumption ON vehicles(average_consumption_l_per_100km) WHERE average_consumption_l_per_100km IS NOT NULL;

-- Add comment explaining the consumption calculation
COMMENT ON COLUMN fuel_entries.fuel_consumption_l_per_100km IS 'Calculated fuel consumption in litres per 100km. Only populated when gauge_working=true and valid odometer readings exist.';
COMMENT ON COLUMN vehicles.average_consumption_l_per_100km IS 'Rolling average fuel consumption excluding broken gauge entries.';
COMMENT ON COLUMN vehicles.consumption_entries_count IS 'Number of valid fuel entries used in consumption average calculation.';

-- Create function to calculate fuel consumption
CREATE OR REPLACE FUNCTION calculate_fuel_consumption(
    p_litres_used DECIMAL,
    p_odometer_start INTEGER,
    p_odometer_end INTEGER,
    p_gauge_working BOOLEAN
) RETURNS DECIMAL(5,2) AS $$
BEGIN
    -- Only calculate if gauge is working and we have valid odometer readings
    IF NOT p_gauge_working OR p_odometer_start IS NULL OR p_odometer_end IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Ensure we have a positive distance
    IF p_odometer_end <= p_odometer_start OR p_litres_used <= 0 THEN
        RETURN NULL;
    END IF;
    
    -- Calculate L/100km: (litres / distance) * 100
    RETURN ROUND((p_litres_used / (p_odometer_end - p_odometer_start)) * 100, 2);
END;
$$ LANGUAGE plpgsql;

-- Create function to update vehicle average consumption
CREATE OR REPLACE FUNCTION update_vehicle_average_consumption(p_vehicle_id UUID) 
RETURNS VOID AS $$
DECLARE
    v_avg_consumption DECIMAL(5,2);
    v_entry_count INTEGER;
BEGIN
    -- Calculate average consumption from all valid entries for this vehicle
    SELECT 
        ROUND(AVG(fuel_consumption_l_per_100km), 2),
        COUNT(*)
    INTO v_avg_consumption, v_entry_count
    FROM fuel_entries 
    WHERE vehicle_id = p_vehicle_id 
      AND fuel_consumption_l_per_100km IS NOT NULL
      AND gauge_working = true;
    
    -- Update vehicle table
    UPDATE vehicles 
    SET 
        average_consumption_l_per_100km = v_avg_consumption,
        consumption_entries_count = v_entry_count,
        last_consumption_update = NOW(),
        updated_at = NOW()
    WHERE id = p_vehicle_id;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically calculate consumption on fuel entry insert/update
CREATE OR REPLACE FUNCTION trigger_calculate_fuel_consumption() 
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate consumption for the new/updated entry
    NEW.fuel_consumption_l_per_100km = calculate_fuel_consumption(
        NEW.litres_used,
        NEW.odometer_start,
        NEW.odometer_end,
        NEW.gauge_working
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that runs before insert/update
DROP TRIGGER IF EXISTS trg_calculate_fuel_consumption ON fuel_entries;
CREATE TRIGGER trg_calculate_fuel_consumption
    BEFORE INSERT OR UPDATE ON fuel_entries
    FOR EACH ROW
    EXECUTE FUNCTION trigger_calculate_fuel_consumption();

-- Create trigger to update vehicle averages after fuel entry changes
CREATE OR REPLACE FUNCTION trigger_update_vehicle_consumption_average() 
RETURNS TRIGGER AS $$
BEGIN
    -- Update average for the affected vehicle(s)
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        PERFORM update_vehicle_average_consumption(NEW.vehicle_id);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM update_vehicle_average_consumption(OLD.vehicle_id);
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that runs after insert/update/delete
DROP TRIGGER IF EXISTS trg_update_vehicle_consumption_average ON fuel_entries;
CREATE TRIGGER trg_update_vehicle_consumption_average
    AFTER INSERT OR UPDATE OR DELETE ON fuel_entries
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_vehicle_consumption_average();

-- Backfill consumption data for existing entries
UPDATE fuel_entries 
SET fuel_consumption_l_per_100km = calculate_fuel_consumption(
    litres_used,
    odometer_start, 
    odometer_end,
    gauge_working
)
WHERE fuel_consumption_l_per_100km IS NULL;

-- Update all vehicle averages
DO $$
DECLARE
    vehicle_rec RECORD;
BEGIN
    FOR vehicle_rec IN SELECT id FROM vehicles WHERE active = true
    LOOP
        PERFORM update_vehicle_average_consumption(vehicle_rec.id);
    END LOOP;
END $$;

-- Add helpful view for consumption analytics
CREATE OR REPLACE VIEW v_vehicle_consumption_stats AS
SELECT 
    v.id,
    v.code,
    v.name,
    v.type,
    v.average_consumption_l_per_100km,
    v.consumption_entries_count,
    v.last_consumption_update,
    -- Recent consumption trend (last 5 entries)
    (
        SELECT ROUND(AVG(fe.fuel_consumption_l_per_100km), 2)
        FROM fuel_entries fe 
        WHERE fe.vehicle_id = v.id 
          AND fe.fuel_consumption_l_per_100km IS NOT NULL
          AND fe.gauge_working = true
        ORDER BY fe.entry_date DESC, fe.time DESC
        LIMIT 5
    ) as recent_consumption_trend,
    -- Best consumption ever recorded
    (
        SELECT MIN(fe.fuel_consumption_l_per_100km)
        FROM fuel_entries fe 
        WHERE fe.vehicle_id = v.id 
          AND fe.fuel_consumption_l_per_100km IS NOT NULL
          AND fe.gauge_working = true
    ) as best_consumption,
    -- Worst consumption ever recorded  
    (
        SELECT MAX(fe.fuel_consumption_l_per_100km)
        FROM fuel_entries fe 
        WHERE fe.vehicle_id = v.id 
          AND fe.fuel_consumption_l_per_100km IS NOT NULL
          AND fe.gauge_working = true
    ) as worst_consumption
FROM vehicles v
WHERE v.active = true;