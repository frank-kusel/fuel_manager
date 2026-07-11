-- Migration: Fix ambiguous "bowser_id" reference in recalculate_all_bowser_readings
-- Date: 2026-04-11
--
-- Problem: The function's RETURNS TABLE declares an OUT column named "bowser_id",
-- which becomes a visible variable in the PL/pgSQL body. The inner loop's
-- "WHERE bowser_id = v_bowser.id" then refers ambiguously to either the
-- fuel_entries column or the OUT variable, and Postgres throws:
--   column reference "bowser_id" is ambiguous (SQLSTATE 42702)
--
-- This surfaced on the Summary page via Move/Delete actions (softDeleteFuelEntry
-- and moveFuelEntryWithinDay both call recalculate_all_bowser_readings).
--
-- Fix: alias fuel_entries as "fe" and qualify the column reference.

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

GRANT EXECUTE ON FUNCTION recalculate_all_bowser_readings TO authenticated;
