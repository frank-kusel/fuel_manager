-- Analytics functions for vehicle, activity, and driver performance views

-- Function to get vehicle activity statistics
CREATE OR REPLACE FUNCTION get_vehicle_activity_stats(vehicle_id_param UUID)
RETURNS TABLE (
    activity_id UUID,
    activity_name VARCHAR,
    activity_category VARCHAR,
    activity_icon VARCHAR,
    entry_count BIGINT,
    total_fuel DECIMAL,
    avg_fuel_per_entry DECIMAL,
    total_distance DECIMAL,
    avg_consumption DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id as activity_id,
        a.name as activity_name,
        a.category as activity_category,
        a.icon as activity_icon,
        COUNT(fe.id) as entry_count,
        COALESCE(SUM(fe.litres_used), 0) as total_fuel,
        COALESCE(AVG(fe.litres_used), 0) as avg_fuel_per_entry,
        COALESCE(SUM(
            CASE 
                WHEN fe.odometer_end IS NOT NULL AND fe.odometer_start IS NOT NULL 
                THEN fe.odometer_end - fe.odometer_start 
                ELSE 0 
            END
        ), 0) as total_distance,
        COALESCE(AVG(
            CASE 
                WHEN fe.fuel_consumption_l_per_100km IS NOT NULL AND fe.fuel_consumption_l_per_100km > 0 
                THEN fe.fuel_consumption_l_per_100km 
                ELSE NULL 
            END
        ), 0) as avg_consumption
    FROM fuel_entries fe
    JOIN activities a ON fe.activity_id = a.id
    WHERE fe.vehicle_id = vehicle_id_param
    GROUP BY a.id, a.name, a.category, a.icon
    ORDER BY total_fuel DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get activity vehicle statistics
CREATE OR REPLACE FUNCTION get_activity_vehicle_stats(activity_id_param UUID)
RETURNS TABLE (
    vehicle_id UUID,
    vehicle_name VARCHAR,
    vehicle_type VARCHAR,
    vehicle_registration VARCHAR,
    entry_count BIGINT,
    total_fuel DECIMAL,
    avg_fuel_per_entry DECIMAL,
    total_distance DECIMAL,
    avg_consumption DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.id as vehicle_id,
        v.name as vehicle_name,
        v.type as vehicle_type,
        v.registration as vehicle_registration,
        COUNT(fe.id) as entry_count,
        COALESCE(SUM(fe.litres_used), 0) as total_fuel,
        COALESCE(AVG(fe.litres_used), 0) as avg_fuel_per_entry,
        COALESCE(SUM(
            CASE 
                WHEN fe.odometer_end IS NOT NULL AND fe.odometer_start IS NOT NULL 
                THEN fe.odometer_end - fe.odometer_start 
                ELSE 0 
            END
        ), 0) as total_distance,
        COALESCE(AVG(
            CASE 
                WHEN fe.fuel_consumption_l_per_100km IS NOT NULL AND fe.fuel_consumption_l_per_100km > 0 
                THEN fe.fuel_consumption_l_per_100km 
                ELSE NULL 
            END
        ), 0) as avg_consumption
    FROM fuel_entries fe
    JOIN vehicles v ON fe.vehicle_id = v.id
    WHERE fe.activity_id = activity_id_param
    GROUP BY v.id, v.name, v.type, v.registration
    ORDER BY total_fuel DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get driver performance statistics
CREATE OR REPLACE FUNCTION get_driver_performance_stats(driver_id_param UUID)
RETURNS TABLE (
    vehicle_id UUID,
    vehicle_name VARCHAR,
    activity_id UUID,
    activity_name VARCHAR,
    entry_count BIGINT,
    total_fuel DECIMAL,
    total_distance DECIMAL,
    avg_consumption DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.id as vehicle_id,
        v.name as vehicle_name,
        a.id as activity_id,
        a.name as activity_name,
        COUNT(fe.id) as entry_count,
        COALESCE(SUM(fe.litres_used), 0) as total_fuel,
        COALESCE(SUM(
            CASE 
                WHEN fe.odometer_end IS NOT NULL AND fe.odometer_start IS NOT NULL 
                THEN fe.odometer_end - fe.odometer_start 
                ELSE 0 
            END
        ), 0) as total_distance,
        COALESCE(AVG(
            CASE 
                WHEN fe.fuel_consumption_l_per_100km IS NOT NULL AND fe.fuel_consumption_l_per_100km > 0 
                THEN fe.fuel_consumption_l_per_100km 
                ELSE NULL 
            END
        ), 0) as avg_consumption
    FROM fuel_entries fe
    JOIN vehicles v ON fe.vehicle_id = v.id
    JOIN activities a ON fe.activity_id = a.id
    WHERE fe.driver_id = driver_id_param
    GROUP BY v.id, v.name, a.id, a.name
    ORDER BY total_fuel DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get monthly consumption trends
CREATE OR REPLACE FUNCTION get_monthly_consumption_trend(vehicle_id_param UUID DEFAULT NULL, months_back INT DEFAULT 6)
RETURNS TABLE (
    month_date DATE,
    total_fuel DECIMAL,
    total_distance DECIMAL,
    avg_consumption DECIMAL,
    entry_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        DATE_TRUNC('month', fe.entry_date::timestamp)::DATE as month_date,
        COALESCE(SUM(fe.litres_used), 0) as total_fuel,
        COALESCE(SUM(
            CASE 
                WHEN fe.odometer_end IS NOT NULL AND fe.odometer_start IS NOT NULL 
                THEN fe.odometer_end - fe.odometer_start 
                ELSE 0 
            END
        ), 0) as total_distance,
        COALESCE(AVG(
            CASE 
                WHEN fe.fuel_consumption_l_per_100km IS NOT NULL AND fe.fuel_consumption_l_per_100km > 0 
                THEN fe.fuel_consumption_l_per_100km 
                ELSE NULL 
            END
        ), 0) as avg_consumption,
        COUNT(fe.id) as entry_count
    FROM fuel_entries fe
    WHERE 
        fe.entry_date >= CURRENT_DATE - INTERVAL '1 month' * months_back
        AND (vehicle_id_param IS NULL OR fe.vehicle_id = vehicle_id_param)
    GROUP BY DATE_TRUNC('month', fe.entry_date::timestamp)
    ORDER BY month_date DESC;
END;
$$ LANGUAGE plpgsql;