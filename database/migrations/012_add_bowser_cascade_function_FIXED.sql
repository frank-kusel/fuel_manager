-- Migration: Add Cascade Update Function for Bowser Readings
-- Description: Provides a function to cascade bowser reading changes through all subsequent fuel entries
-- Date: 2025-01-19
--
-- This function ensures data integrity when fuel entries are edited by automatically
-- updating all subsequent entries for the same bowser to maintain reading continuity.

-- ============================================================================
-- FUNCTION: Cascade bowser reading updates to all subsequent entries
-- ============================================================================

CREATE OR REPLACE FUNCTION cascade_bowser_readings(
    p_fuel_entry_id UUID,
    p_new_bowser_reading_end NUMERIC(10,2)
)
RETURNS TABLE(
    updated_count INTEGER,
    entries_updated UUID[]
) AS $$
DECLARE
    v_entry_date DATE;
    v_entry_time TIME;
    v_bowser_id UUID;
    v_old_end_reading NUMERIC(10,2);
    v_difference NUMERIC(10,2);
    v_updated_ids UUID[];
    v_count INTEGER := 0;
BEGIN
    -- Get the entry details
    SELECT entry_date, time, bowser_id, bowser_reading_end
    INTO v_entry_date, v_entry_time, v_bowser_id, v_old_end_reading
    FROM fuel_entries
    WHERE id = p_fuel_entry_id;

    -- Check if entry exists
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Fuel entry not found: %', p_fuel_entry_id;
    END IF;

    -- Check if bowser_id exists
    IF v_bowser_id IS NULL THEN
        RAISE EXCEPTION 'Fuel entry has no bowser associated';
    END IF;

    -- Calculate the difference
    v_difference := p_new_bowser_reading_end - v_old_end_reading;

    -- Update the original entry
    UPDATE fuel_entries
    SET bowser_reading_end = p_new_bowser_reading_end,
        litres_dispensed = p_new_bowser_reading_end - bowser_reading_start,
        updated_at = NOW()
    WHERE id = p_fuel_entry_id;

    -- Cascade the difference to all subsequent entries for the same bowser
    -- Update both start and end readings by the same difference to maintain litres_dispensed
    WITH updated AS (
        UPDATE fuel_entries
        SET
            bowser_reading_start = bowser_reading_start + v_difference,
            bowser_reading_end = bowser_reading_end + v_difference,
            updated_at = NOW()
        WHERE bowser_id = v_bowser_id
          AND (entry_date > v_entry_date
               OR (entry_date = v_entry_date AND time > v_entry_time))
        RETURNING id
    )
    SELECT ARRAY_AGG(id), COUNT(*)::INTEGER
    INTO v_updated_ids, v_count
    FROM updated;

    -- Return the results
    RETURN QUERY SELECT v_count, COALESCE(v_updated_ids, ARRAY[]::UUID[]);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cascade_bowser_readings IS
'Cascades changes to a fuel entry''s bowser_reading_end to all subsequent entries for the same bowser.
This maintains reading continuity when historical entries are corrected.

Parameters:
  p_fuel_entry_id: The ID of the fuel entry being edited
  p_new_bowser_reading_end: The new end reading value

Returns:
  updated_count: Number of subsequent entries that were updated
  entries_updated: Array of fuel entry IDs that were updated

Example usage:
  SELECT * FROM cascade_bowser_readings(
    ''123e4567-e89b-12d3-a456-426614174000'',
    1045.5
  );';

-- ============================================================================
-- FUNCTION: Recalculate all bowser readings from scratch (for data repair)
-- ============================================================================

CREATE OR REPLACE FUNCTION recalculate_all_bowser_readings(
    p_bowser_id UUID DEFAULT NULL
)
RETURNS TABLE(
    bowser_id UUID,
    bowser_name TEXT,
    entries_processed INTEGER,
    discontinuities_found INTEGER
) AS $$
DECLARE
    v_bowser RECORD;
    v_prev_end_reading NUMERIC(10,2);
    v_entry RECORD;
    v_entries_count INTEGER;
    v_discontinuity_count INTEGER;
BEGIN
    -- Loop through each bowser (or just the specified one)
    FOR v_bowser IN
        SELECT b.id, b.name
        FROM bowsers b
        WHERE p_bowser_id IS NULL OR b.id = p_bowser_id
        ORDER BY b.name
    LOOP
        v_prev_end_reading := NULL;
        v_entries_count := 0;
        v_discontinuity_count := 0;

        -- Process all entries for this bowser in chronological order
        FOR v_entry IN
            SELECT id, entry_date, time,
                   bowser_reading_start, bowser_reading_end, litres_dispensed
            FROM fuel_entries
            WHERE bowser_id = v_bowser.id
            ORDER BY entry_date, time
        LOOP
            v_entries_count := v_entries_count + 1;

            -- Check for discontinuity (if not the first entry)
            IF v_prev_end_reading IS NOT NULL AND
               ABS(v_entry.bowser_reading_start - v_prev_end_reading) > 0.01 THEN
                v_discontinuity_count := v_discontinuity_count + 1;

                -- Fix the discontinuity by updating the start reading
                UPDATE fuel_entries
                SET
                    bowser_reading_start = v_prev_end_reading,
                    bowser_reading_end = v_prev_end_reading + litres_dispensed,
                    updated_at = NOW()
                WHERE id = v_entry.id;

                -- Update our loop variable with the corrected end reading
                v_prev_end_reading := v_prev_end_reading + v_entry.litres_dispensed;
            ELSE
                -- No discontinuity, use the existing end reading
                v_prev_end_reading := v_entry.bowser_reading_end;
            END IF;
        END LOOP;

        -- Return stats for this bowser
        RETURN QUERY SELECT
            v_bowser.id,
            v_bowser.name,
            v_entries_count,
            v_discontinuity_count;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION recalculate_all_bowser_readings IS
'Scans all fuel entries chronologically and fixes any bowser reading discontinuities.
This is useful for repairing data after manual edits in Supabase or bulk imports.

Parameters:
  p_bowser_id: Optional - Only recalculate for a specific bowser, or NULL for all bowsers

Returns:
  bowser_id: ID of the bowser processed
  bowser_name: Name of the bowser
  entries_processed: Total number of fuel entries for this bowser
  discontinuities_found: Number of discontinuities that were fixed

Example usage:
  -- Recalculate all bowsers
  SELECT * FROM recalculate_all_bowser_readings();

  -- Recalculate specific bowser
  SELECT * FROM recalculate_all_bowser_readings(''123e4567-e89b-12d3-a456-426614174000'');';

-- ============================================================================
-- FUNCTION: Find bowser reading discontinuities (diagnostic)
-- ============================================================================

CREATE OR REPLACE FUNCTION find_bowser_discontinuities(
    p_bowser_id UUID DEFAULT NULL,
    p_threshold NUMERIC(10,2) DEFAULT 0.1
)
RETURNS TABLE(
    bowser_name TEXT,
    entry_id UUID,
    entry_date DATE,
    entry_time TIME,
    expected_start NUMERIC(10,2),
    actual_start NUMERIC(10,2),
    difference NUMERIC(10,2),
    litres_dispensed NUMERIC(10,2)
) AS $$
BEGIN
    RETURN QUERY
    WITH ordered_entries AS (
        SELECT
            fe.id,
            fe.bowser_id,
            fe.entry_date,
            fe.time,
            fe.bowser_reading_start,
            fe.bowser_reading_end,
            fe.litres_dispensed,
            LAG(fe.bowser_reading_end) OVER (
                PARTITION BY fe.bowser_id
                ORDER BY fe.entry_date, fe.time
            ) as prev_end_reading
        FROM fuel_entries fe
        WHERE (p_bowser_id IS NULL OR fe.bowser_id = p_bowser_id)
          AND fe.bowser_id IS NOT NULL
    )
    SELECT
        b.name,
        oe.id,
        oe.entry_date,
        oe.time,
        oe.prev_end_reading,
        oe.bowser_reading_start,
        (oe.bowser_reading_start - oe.prev_end_reading),
        oe.litres_dispensed
    FROM ordered_entries oe
    JOIN bowsers b ON b.id = oe.bowser_id
    WHERE oe.prev_end_reading IS NOT NULL
      AND ABS(oe.bowser_reading_start - oe.prev_end_reading) > p_threshold
    ORDER BY b.name, oe.entry_date, oe.time;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION find_bowser_discontinuities IS
'Finds all bowser reading discontinuities where the start reading doesn''t match the previous end reading.
Useful for diagnosing data integrity issues before running repairs.

Parameters:
  p_bowser_id: Optional - Only check a specific bowser, or NULL for all
  p_threshold: Minimum difference to report (default 0.1L to ignore rounding)

Returns all entries where there''s a mismatch between expected and actual start readings.

Example usage:
  -- Find all discontinuities
  SELECT * FROM find_bowser_discontinuities();

  -- Find discontinuities for a specific bowser
  SELECT * FROM find_bowser_discontinuities(''123e4567-e89b-12d3-a456-426614174000'');';

-- ============================================================================
-- Grant permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION cascade_bowser_readings TO authenticated;
GRANT EXECUTE ON FUNCTION recalculate_all_bowser_readings TO authenticated;
GRANT EXECUTE ON FUNCTION find_bowser_discontinuities TO authenticated;
