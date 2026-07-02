-- Migration: Add Cascade Update Function for Bowser Readings (v2 - Fixed Ordering)
-- Description: Recalculates bowser readings forward from edited entry using entry_date and time
-- Date: 2025-01-19

-- ============================================================================
-- FUNCTION: Cascade bowser reading updates (v2 - Recalculates forward)
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
    v_updated_ids UUID[] := ARRAY[]::UUID[];
    v_count INTEGER := 0;
    v_current_end_reading NUMERIC(10,2);
    v_subsequent_entry RECORD;
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

    -- Update the original entry
    UPDATE fuel_entries
    SET bowser_reading_end = p_new_bowser_reading_end,
        litres_dispensed = p_new_bowser_reading_end - bowser_reading_start,
        updated_at = NOW()
    WHERE id = p_fuel_entry_id;

    -- Start with the new end reading
    v_current_end_reading := p_new_bowser_reading_end;

    -- Loop through all subsequent entries in chronological order (by entry_date and time)
    -- and recalculate their readings based on litres_dispensed
    FOR v_subsequent_entry IN
        SELECT id, litres_dispensed
        FROM fuel_entries
        WHERE bowser_id = v_bowser_id
          AND (entry_date > v_entry_date
               OR (entry_date = v_entry_date AND time > v_entry_time))
        ORDER BY entry_date, time  -- CRITICAL: Order by entry_date and time, not created_at
    LOOP
        -- Update this entry: start becomes previous end, end becomes start + litres
        UPDATE fuel_entries
        SET
            bowser_reading_start = v_current_end_reading,
            bowser_reading_end = v_current_end_reading + v_subsequent_entry.litres_dispensed,
            updated_at = NOW()
        WHERE id = v_subsequent_entry.id;

        -- Move to next entry
        v_current_end_reading := v_current_end_reading + v_subsequent_entry.litres_dispensed;

        -- Track updated IDs
        v_updated_ids := array_append(v_updated_ids, v_subsequent_entry.id);
        v_count := v_count + 1;
    END LOOP;

    -- Return the results
    RETURN QUERY SELECT v_count, v_updated_ids;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cascade_bowser_readings IS
'Cascades changes to a fuel entry''s bowser_reading_end to all subsequent entries for the same bowser.
Uses entry_date and time for ordering (not created_at), so backfilled entries are handled correctly.
Recalculates readings forward instead of just applying a difference, fixing any discontinuities.

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

        -- Process all entries for this bowser in chronological order BY ENTRY_DATE AND TIME
        FOR v_entry IN
            SELECT id, entry_date, time,
                   bowser_reading_start, bowser_reading_end, litres_dispensed
            FROM fuel_entries
            WHERE bowser_id = v_bowser.id
            ORDER BY entry_date, time  -- Order by entry_date and time, not created_at
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
'Scans all fuel entries chronologically (by entry_date and time) and fixes any bowser reading discontinuities.
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
                ORDER BY fe.entry_date, fe.time  -- Order by entry_date and time
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
Orders entries by entry_date and time (not created_at) for accurate detection of backfilled entries.
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
