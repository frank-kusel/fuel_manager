-- ============================================================================
-- Migration 015: Exclude soft-deleted entries from bowser chain calculations
-- ============================================================================
-- BUG: cascade_bowser_readings (mig. 012) and recalculate_all_bowser_readings
-- (mig. 012) iterate fuel_entries WITHOUT filtering deleted_at, so a
-- soft-deleted entry's litres remained counted in the meter chain — deleting
-- an entry did not actually remove its fuel from the chain. (The
-- current_bowser_readings view from mig. 011/013 already filters correctly,
-- which made the inconsistency easy to miss.)
--
-- This migration recreates both functions identically except that every
-- fuel_entries scan now requires deleted_at IS NULL.
--
-- Apply once in the Supabase SQL editor. Optionally run afterwards to repair
-- any chains that were rebuilt while a deleted entry was still counted:
--   SELECT * FROM recalculate_all_bowser_readings();
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
    SELECT entry_date, time, bowser_id, bowser_reading_end
    INTO v_entry_date, v_entry_time, v_bowser_id, v_old_end_reading
    FROM fuel_entries
    WHERE id = p_fuel_entry_id
      AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Active fuel entry not found: %', p_fuel_entry_id;
    END IF;

    IF v_bowser_id IS NULL THEN
        RAISE EXCEPTION 'Fuel entry has no bowser associated';
    END IF;

    UPDATE fuel_entries
    SET bowser_reading_end = p_new_bowser_reading_end,
        litres_dispensed = p_new_bowser_reading_end - bowser_reading_start,
        updated_at = NOW()
    WHERE id = p_fuel_entry_id;

    v_current_end_reading := p_new_bowser_reading_end;

    FOR v_subsequent_entry IN
        SELECT id, litres_dispensed
        FROM fuel_entries
        WHERE bowser_id = v_bowser_id
          AND deleted_at IS NULL
          AND (entry_date > v_entry_date
               OR (entry_date = v_entry_date AND time > v_entry_time))
        ORDER BY entry_date, time
    LOOP
        UPDATE fuel_entries
        SET
            bowser_reading_start = v_current_end_reading,
            bowser_reading_end = v_current_end_reading + v_subsequent_entry.litres_dispensed,
            updated_at = NOW()
        WHERE id = v_subsequent_entry.id;

        v_current_end_reading := v_current_end_reading + v_subsequent_entry.litres_dispensed;
        v_updated_ids := array_append(v_updated_ids, v_subsequent_entry.id);
        v_count := v_count + 1;
    END LOOP;

    RETURN QUERY SELECT v_count, v_updated_ids;
END;
$$ LANGUAGE plpgsql;

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
    FOR v_bowser IN
        SELECT b.id, b.name
        FROM bowsers b
        WHERE p_bowser_id IS NULL OR b.id = p_bowser_id
        ORDER BY b.name
    LOOP
        v_prev_end_reading := NULL;
        v_entries_count := 0;
        v_discontinuity_count := 0;

        FOR v_entry IN
            SELECT id, entry_date, time,
                   bowser_reading_start, bowser_reading_end, litres_dispensed
            FROM fuel_entries
            WHERE bowser_id = v_bowser.id
              AND deleted_at IS NULL
            ORDER BY entry_date, time
        LOOP
            v_entries_count := v_entries_count + 1;

            IF v_prev_end_reading IS NOT NULL AND
               ABS(v_entry.bowser_reading_start - v_prev_end_reading) > 0.01 THEN
                v_discontinuity_count := v_discontinuity_count + 1;

                UPDATE fuel_entries
                SET
                    bowser_reading_start = v_prev_end_reading,
                    bowser_reading_end = v_prev_end_reading + litres_dispensed,
                    updated_at = NOW()
                WHERE id = v_entry.id;

                v_prev_end_reading := v_prev_end_reading + v_entry.litres_dispensed;
            ELSE
                v_prev_end_reading := v_entry.bowser_reading_end;
            END IF;
        END LOOP;

        RETURN QUERY SELECT
            v_bowser.id,
            v_bowser.name,
            v_entries_count,
            v_discontinuity_count;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cascade_bowser_readings IS
'Cascades a fuel entry''s new bowser_reading_end to all subsequent ACTIVE entries (deleted_at IS NULL) for the same bowser, ordered by entry_date + time.';

COMMENT ON FUNCTION recalculate_all_bowser_readings IS
'Rebuilds the meter chain per bowser over ACTIVE entries only (deleted_at IS NULL), ordered by entry_date + time. Soft-deleted entries no longer contribute to the chain.';
