-- Summary correction actions
-- Adds soft-delete support plus safe same-day reordering for fuel entries.

ALTER TABLE fuel_entries
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_fuel_entries_active_date_time
ON fuel_entries(entry_date, time DESC)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_fuel_entries_active_bowser_date_time
ON fuel_entries(bowser_id, entry_date, time)
WHERE deleted_at IS NULL;

DROP VIEW IF EXISTS fuel_entries_with_fields;

CREATE VIEW fuel_entries_with_fields AS
SELECT 
    fe.*,
    f_single.id as single_field_id,
    f_single.name as single_field_name,
    f_single.code as single_field_code,
    f_single.crop_type as single_field_crop_type,
    z.id as zone_id_info,
    z.name as zone_name,
    z.code as zone_code,
    z.zone_type,
    CASE 
        WHEN fe.field_id IS NOT NULL THEN 'single_field'
        WHEN fe.zone_id IS NOT NULL THEN 'zone'
        WHEN EXISTS(SELECT 1 FROM fuel_entry_fields fef WHERE fef.fuel_entry_id = fe.id) THEN 'multiple_fields'
        ELSE 'unspecified'
    END as location_type,
    COALESCE(f_single.name, z.name, 'Multiple Fields') as location_display_name,
    COALESCE(field_counts.field_count, 0) as associated_fields_count
FROM fuel_entries fe
LEFT JOIN fields f_single ON fe.field_id = f_single.id
LEFT JOIN zones z ON fe.zone_id = z.id
LEFT JOIN (
    SELECT fuel_entry_id, COUNT(*) as field_count
    FROM fuel_entry_fields
    GROUP BY fuel_entry_id
) field_counts ON fe.id = field_counts.fuel_entry_id
WHERE fe.deleted_at IS NULL;

CREATE OR REPLACE FUNCTION get_fuel_entry_fields(entry_id UUID)
RETURNS TABLE(
    field_id UUID,
    field_name VARCHAR,
    field_code VARCHAR,
    crop_type VARCHAR,
    area DECIMAL,
    location VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        f.id,
        f.name,
        f.code,
        f.crop_type,
        f.area,
        f.location
    FROM fuel_entries fe
    JOIN fields f ON fe.field_id = f.id
    WHERE fe.id = entry_id
      AND fe.deleted_at IS NULL
      AND fe.field_id IS NOT NULL

    UNION ALL

    SELECT 
        f.id,
        f.name,
        f.code,
        f.crop_type,
        f.area,
        f.location
    FROM fuel_entries fe
    JOIN fuel_entry_fields fef ON fef.fuel_entry_id = fe.id
    JOIN fields f ON fef.field_id = f.id
    WHERE fe.id = entry_id
      AND fe.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql;

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
  AND deleted_at IS NULL
ORDER BY bowser_id, entry_date DESC, time DESC;

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
  AND deleted_at IS NULL
ORDER BY vehicle_id, entry_date DESC, time DESC;

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
      AND fe.deleted_at IS NULL
    GROUP BY a.id, a.name, a.category, a.icon
    ORDER BY total_fuel DESC;
END;
$$ LANGUAGE plpgsql;

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
      AND fe.deleted_at IS NULL
    GROUP BY v.id, v.name, v.type, v.registration
    ORDER BY total_fuel DESC;
END;
$$ LANGUAGE plpgsql;

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
      AND fe.deleted_at IS NULL
    GROUP BY v.id, v.name, a.id, a.name
    ORDER BY total_fuel DESC;
END;
$$ LANGUAGE plpgsql;

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
    WHERE fe.entry_date >= CURRENT_DATE - INTERVAL '1 month' * months_back
      AND fe.deleted_at IS NULL
      AND (vehicle_id_param IS NULL OR fe.vehicle_id = vehicle_id_param)
    GROUP BY DATE_TRUNC('month', fe.entry_date::timestamp)
    ORDER BY month_date DESC;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION normalize_fuel_entry_times_for_day(p_entry_date DATE)
RETURNS INTEGER AS $$
DECLARE
    v_updated_count INTEGER := 0;
BEGIN
    WITH ordered_entries AS (
        SELECT
            id,
            (TIME '00:00:00' + ((ROW_NUMBER() OVER (
                ORDER BY time, created_at, id
            ) - 1) * INTERVAL '1 second'))::TIME AS normalized_time
        FROM fuel_entries
        WHERE entry_date = p_entry_date
          AND deleted_at IS NULL
    ),
    updated AS (
        UPDATE fuel_entries fe
        SET time = oe.normalized_time,
            updated_at = NOW()
        FROM ordered_entries oe
        WHERE fe.id = oe.id
          AND fe.time IS DISTINCT FROM oe.normalized_time
        RETURNING fe.id
    )
    SELECT COUNT(*) INTO v_updated_count
    FROM updated;

    RETURN COALESCE(v_updated_count, 0);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION void_fuel_entry(p_entry_id UUID)
RETURNS TABLE(
    voided_entry_id UUID,
    affected_bowser_ids UUID[],
    entries_processed INTEGER,
    discontinuities_fixed INTEGER
) AS $$
DECLARE
    v_bowser_id UUID;
    v_entries_processed INTEGER := 0;
    v_discontinuities_fixed INTEGER := 0;
    v_recalc RECORD;
BEGIN
    SELECT bowser_id
    INTO v_bowser_id
    FROM fuel_entries
    WHERE id = p_entry_id
      AND deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Active fuel entry not found: %', p_entry_id;
    END IF;

    UPDATE fuel_entries
    SET deleted_at = NOW(),
        deleted_reason = 'summary_delete',
        updated_at = NOW()
    WHERE id = p_entry_id;

    IF v_bowser_id IS NOT NULL THEN
        SELECT *
        INTO v_recalc
        FROM recalculate_all_bowser_readings(v_bowser_id)
        LIMIT 1;

        v_entries_processed := COALESCE(v_recalc.entries_processed, 0);
        v_discontinuities_fixed := COALESCE(v_recalc.discontinuities_found, 0);
    END IF;

    RETURN QUERY
    SELECT
        p_entry_id,
        CASE
            WHEN v_bowser_id IS NULL THEN ARRAY[]::UUID[]
            ELSE ARRAY[v_bowser_id]
        END,
        v_entries_processed,
        v_discontinuities_fixed;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION move_fuel_entry_within_day(
    p_entry_id UUID,
    p_direction TEXT
)
RETURNS TABLE(
    moved_entry_id UUID,
    swapped_entry_id UUID,
    moved_entry_time TIME,
    swapped_entry_time TIME,
    recalculated_bowser_ids UUID[]
) AS $$
DECLARE
    v_entry_date DATE;
    v_entry_time TIME;
    v_entry_bowser_id UUID;
    v_target_id UUID;
    v_target_time TIME;
    v_target_bowser_id UUID;
    v_has_duplicate_times BOOLEAN;
    v_recalculated_bowsers UUID[] := ARRAY[]::UUID[];
BEGIN
    IF p_direction NOT IN ('up', 'down') THEN
        RAISE EXCEPTION 'Unsupported direction: %', p_direction;
    END IF;

    SELECT entry_date, time, bowser_id
    INTO v_entry_date, v_entry_time, v_entry_bowser_id
    FROM fuel_entries
    WHERE id = p_entry_id
      AND deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Active fuel entry not found: %', p_entry_id;
    END IF;

    SELECT COUNT(*) <> COUNT(DISTINCT time)
    INTO v_has_duplicate_times
    FROM fuel_entries
    WHERE entry_date = v_entry_date
      AND deleted_at IS NULL;

    IF v_has_duplicate_times THEN
        PERFORM normalize_fuel_entry_times_for_day(v_entry_date);

        SELECT time, bowser_id
        INTO v_entry_time, v_entry_bowser_id
        FROM fuel_entries
        WHERE id = p_entry_id
          AND deleted_at IS NULL;
    END IF;

    IF p_direction = 'up' THEN
        SELECT id, time, bowser_id
        INTO v_target_id, v_target_time, v_target_bowser_id
        FROM fuel_entries
        WHERE entry_date = v_entry_date
          AND deleted_at IS NULL
          AND time > v_entry_time
        ORDER BY time ASC
        LIMIT 1;
    ELSE
        SELECT id, time, bowser_id
        INTO v_target_id, v_target_time, v_target_bowser_id
        FROM fuel_entries
        WHERE entry_date = v_entry_date
          AND deleted_at IS NULL
          AND time < v_entry_time
        ORDER BY time DESC
        LIMIT 1;
    END IF;

    IF NOT FOUND THEN
        PERFORM normalize_fuel_entry_times_for_day(v_entry_date);

        SELECT time, bowser_id
        INTO v_entry_time, v_entry_bowser_id
        FROM fuel_entries
        WHERE id = p_entry_id
          AND deleted_at IS NULL;

        IF p_direction = 'up' THEN
            SELECT id, time, bowser_id
            INTO v_target_id, v_target_time, v_target_bowser_id
            FROM fuel_entries
            WHERE entry_date = v_entry_date
              AND deleted_at IS NULL
              AND time > v_entry_time
            ORDER BY time ASC
            LIMIT 1;
        ELSE
            SELECT id, time, bowser_id
            INTO v_target_id, v_target_time, v_target_bowser_id
            FROM fuel_entries
            WHERE entry_date = v_entry_date
              AND deleted_at IS NULL
              AND time < v_entry_time
            ORDER BY time DESC
            LIMIT 1;
        END IF;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Entry is already at the % of the day list', p_direction;
        END IF;
    END IF;

    UPDATE fuel_entries
    SET time = CASE
            WHEN id = p_entry_id THEN v_target_time
            WHEN id = v_target_id THEN v_entry_time
            ELSE time
        END,
        updated_at = NOW()
    WHERE id IN (p_entry_id, v_target_id);

    IF v_entry_bowser_id IS NOT NULL THEN
        PERFORM * FROM recalculate_all_bowser_readings(v_entry_bowser_id);
        v_recalculated_bowsers := array_append(v_recalculated_bowsers, v_entry_bowser_id);
    END IF;

    IF v_target_bowser_id IS NOT NULL
       AND v_target_bowser_id IS DISTINCT FROM v_entry_bowser_id THEN
        PERFORM * FROM recalculate_all_bowser_readings(v_target_bowser_id);
        v_recalculated_bowsers := array_append(v_recalculated_bowsers, v_target_bowser_id);
    END IF;

    RETURN QUERY
    SELECT
        p_entry_id,
        v_target_id,
        v_target_time,
        v_entry_time,
        COALESCE(v_recalculated_bowsers, ARRAY[]::UUID[]);
END;
$$ LANGUAGE plpgsql;

GRANT SELECT ON fuel_entries_with_fields TO authenticated, anon;
GRANT SELECT ON current_bowser_readings TO authenticated, anon;
GRANT SELECT ON current_vehicle_odometers TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_fuel_entry_fields(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION recalculate_all_bowser_readings(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION void_fuel_entry(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION move_fuel_entry_within_day(UUID, TEXT) TO authenticated, anon;
