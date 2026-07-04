-- ============================================================================
-- Migration 016: Fix "column reference bowser_id is ambiguous" in
--                recalculate_all_bowser_readings
-- ============================================================================
-- BUG (introduced by migration 015): the function's RETURNS TABLE declares an
-- output column named bowser_id. In plpgsql, output columns are variables in
-- scope, so the inner scan's  WHERE bowser_id = v_bowser.id  became ambiguous
-- (variable vs fuel_entries.bowser_id) and the function now errors on EVERY
-- call. This breaks reorder_fuel_entry (Log page drag + All entries arrows)
-- and any other caller.
--
-- Fix: identical function with the fuel_entries scan table-qualified.
--
-- Apply once in the Supabase SQL editor.
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

                UPDATE fuel_entries fe2
                SET
                    bowser_reading_start = v_prev_end_reading,
                    bowser_reading_end = v_prev_end_reading + fe2.litres_dispensed,
                    updated_at = NOW()
                WHERE fe2.id = v_entry.id;

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

COMMENT ON FUNCTION recalculate_all_bowser_readings IS
'Rebuilds the meter chain per bowser over ACTIVE entries only (deleted_at IS NULL), ordered by entry_date + time. Table-qualified to avoid output-column/table-column ambiguity (mig. 016).';
