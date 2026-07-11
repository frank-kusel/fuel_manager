-- Migration: Exclude soft-deleted fuel_entries from bowser reading recalculation
-- Date: 2026-05-02
--
-- Problem: After migration 013 introduced soft-delete (deleted_at) for fuel_entries,
-- the chronological reading-continuity functions defined in 012 / re-defined in 014
-- were never updated to filter out deleted rows. They iterate fuel_entries in
-- entry_date/time order without an "AND deleted_at IS NULL" clause.
--
-- Symptom: When a fuel attendant voids today's entry on the Summary page,
-- void_fuel_entry() calls recalculate_all_bowser_readings(). Because the recalc
-- still "sees" the just-deleted row, no discontinuity is detected on the entry
-- that follows it, so the next entry's bowser_reading_start is left pointing at
-- the deleted entry's bowser_reading_end. The new-entry workflow then surfaces
-- that stale value as the pre-populated "start" reading.
--
-- Fix: re-define the three offending functions with the soft-delete filter:
--   - recalculate_all_bowser_readings  (preserves the alias fix from 014)
--   - cascade_bowser_readings          (subsequent-entry loop on edit)
--   - find_bowser_discontinuities      (diagnostic CTE)
--
-- After applying, any pre-existing stale chain will self-heal the next time
-- recalculate runs against the affected bowser (i.e. on the next void/move),
-- or can be repaired immediately by calling
--   SELECT * FROM recalculate_all_bowser_readings();

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
            SELECT fe.id, fe.entry_date, fe.time,
                   fe.bowser_reading_start, fe.bowser_reading_end, fe.litres_dispensed
            FROM fuel_entries fe
            WHERE fe.bowser_id = v_bowser.id
              AND fe.deleted_at IS NULL
            ORDER BY fe.entry_date, fe.time
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
            v_bowser.name::TEXT,
            v_entries_count,
            v_discontinuity_count;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

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
          AND fe.deleted_at IS NULL
    )
    SELECT
        b.name::TEXT,
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

GRANT EXECUTE ON FUNCTION recalculate_all_bowser_readings(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION cascade_bowser_readings(UUID, NUMERIC) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION find_bowser_discontinuities(UUID, NUMERIC) TO authenticated, anon;
