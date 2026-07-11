-- ============================================================================
-- Migration 018: Recalculate bowser chains from a given date instead of the
--                beginning of time
-- ============================================================================
-- Why: recalculate_all_bowser_readings (mig. 012/016/017) rescans a bowser's
-- entire active history on every call. reorder_fuel_entry invokes it per
-- bowser on every drag-reorder, so the cost of a reorder grows linearly with
-- total history — after a few years each reorder rescans tens of thousands of
-- rows inside one transaction.
--
-- Fix: an optional p_from_date. When provided, the chain is seeded from the
-- last active entry BEFORE that date and only entries >= p_from_date are
-- scanned/repaired. A reorder within one day can never change the chain
-- before that day, so reorder_fuel_entry now passes its day.
--
-- The old single-argument function is dropped (a second overload would make
-- single-argument calls ambiguous). Calling with p_from_date NULL preserves
-- the old full-history behaviour.
--
-- Apply once in the Supabase SQL editor (replaces 017's version).
-- ============================================================================

DROP FUNCTION IF EXISTS recalculate_all_bowser_readings(UUID);

CREATE OR REPLACE FUNCTION recalculate_all_bowser_readings(
    p_bowser_id UUID DEFAULT NULL,
    p_from_date DATE DEFAULT NULL
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
        v_entries_count := 0;
        v_discontinuity_count := 0;

        -- Seed the chain: last active reading before the window, if any.
        v_prev_end_reading := NULL;
        IF p_from_date IS NOT NULL THEN
            SELECT fe.bowser_reading_end INTO v_prev_end_reading
            FROM fuel_entries fe
            WHERE fe.bowser_id = v_bowser.id
              AND fe.deleted_at IS NULL
              AND fe.entry_date < p_from_date
            ORDER BY fe.entry_date DESC, fe.time DESC
            LIMIT 1;
        END IF;

        FOR v_entry IN
            SELECT fe.id, fe.entry_date, fe.time,
                   fe.bowser_reading_start, fe.bowser_reading_end, fe.litres_dispensed
            FROM fuel_entries fe
            WHERE fe.bowser_id = v_bowser.id
              AND fe.deleted_at IS NULL
              AND (p_from_date IS NULL OR fe.entry_date >= p_from_date)
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
            v_bowser.name::TEXT,
            v_entries_count,
            v_discontinuity_count;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION recalculate_all_bowser_readings IS
'Rebuilds the meter chain per bowser over ACTIVE entries (deleted_at IS NULL), ordered by entry_date + time. With p_from_date, seeds from the last entry before that date and repairs only entries >= p_from_date (mig. 018).';

-- reorder_fuel_entry: identical to mig. 014 except the chain rebuild is now
-- scoped to the reordered day.
CREATE OR REPLACE FUNCTION reorder_fuel_entry(
    p_entry_id UUID,
    p_position INTEGER
)
RETURNS JSONB AS $$
DECLARE
    v_entry_date DATE;
    v_ids UUID[];
    v_times TIME[];
    v_count INTEGER;
    v_old_pos INTEGER;
    v_new_pos INTEGER;
    v_prev TIME;
    v_assign TIME;
    v_times_changed INTEGER := 0;
    v_new_time TIME;
    v_bowser_ids UUID[];
    v_bowser UUID;
    i INTEGER;
BEGIN
    SELECT entry_date INTO v_entry_date
    FROM fuel_entries
    WHERE id = p_entry_id
      AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Active fuel entry not found: %', p_entry_id;
    END IF;

    SELECT array_agg(id ORDER BY time, created_at, id),
           array_agg(time ORDER BY time, created_at, id)
    INTO v_ids, v_times
    FROM (
        SELECT id, time, created_at
        FROM fuel_entries
        WHERE entry_date = v_entry_date
          AND deleted_at IS NULL
        FOR UPDATE
    ) day_entries;

    v_count := COALESCE(array_length(v_ids, 1), 0);
    IF v_count < 2 THEN
        RETURN jsonb_build_object('moved', false, 'reason', 'nothing to reorder');
    END IF;

    v_old_pos := array_position(v_ids, p_entry_id);
    v_new_pos := GREATEST(1, LEAST(p_position, v_count));

    IF v_old_pos = v_new_pos THEN
        RETURN jsonb_build_object('moved', false, 'reason', 'already in position');
    END IF;

    v_ids := v_ids[1:v_old_pos-1] || v_ids[v_old_pos+1:v_count];
    v_ids := v_ids[1:v_new_pos-1] || ARRAY[p_entry_id] || v_ids[v_new_pos:v_count-1];

    v_prev := NULL;
    FOR i IN 1..v_count LOOP
        v_assign := v_times[i];
        IF v_prev IS NOT NULL AND v_assign <= v_prev THEN
            v_assign := LEAST(v_prev + INTERVAL '1 second', TIME '23:59:59')::TIME;
        END IF;

        UPDATE fuel_entries
        SET time = v_assign,
            updated_at = NOW()
        WHERE id = v_ids[i]
          AND time IS DISTINCT FROM v_assign;

        IF FOUND THEN
            v_times_changed := v_times_changed + 1;
        END IF;

        IF v_ids[i] = p_entry_id THEN
            v_new_time := v_assign;
        END IF;

        v_prev := v_assign;
    END LOOP;

    -- Rebuild the meter chain for every bowser used that day, starting at
    -- that day — a same-day reorder cannot change the chain before it.
    SELECT array_agg(DISTINCT fe.bowser_id) INTO v_bowser_ids
    FROM fuel_entries fe
    WHERE fe.entry_date = v_entry_date
      AND fe.deleted_at IS NULL
      AND fe.bowser_id IS NOT NULL;

    IF v_bowser_ids IS NOT NULL THEN
        FOREACH v_bowser IN ARRAY v_bowser_ids LOOP
            PERFORM * FROM recalculate_all_bowser_readings(v_bowser, v_entry_date);
        END LOOP;
    END IF;

    RETURN jsonb_build_object(
        'moved', true,
        'entry_id', p_entry_id,
        'from_position', v_old_pos,
        'to_position', v_new_pos,
        'new_time', v_new_time,
        'times_adjusted', v_times_changed,
        'bowsers_recalculated', COALESCE(array_length(v_bowser_ids, 1), 0)
    );
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION recalculate_all_bowser_readings(UUID, DATE) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION reorder_fuel_entry(UUID, INTEGER) TO authenticated, anon;

COMMENT ON FUNCTION reorder_fuel_entry IS
'Moves an active fuel entry to a 1-based chronological position within its day by positionally reassigning the day''s existing time values, then rebuilds affected bowser meter chains from that day forward only (mig. 018).';
