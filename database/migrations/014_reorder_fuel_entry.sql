-- ============================================================================
-- Migration 014: Reorder a fuel entry to an arbitrary position within its day
-- ============================================================================
-- Why: the attendant back-fills entries from paper and invents times purely
-- to control the order. When two entries end up swapped, the order must be
-- correctable without destroying her plausible times.
--
-- Model: the day's existing TIME VALUES are kept as a sequence and reassigned
-- positionally after the moved entry is placed at its new position. The moved
-- entry takes the time of the slot it lands in; every other entry keeps its
-- relative order (and almost always its exact time). Duplicate/too-tight
-- times are nudged forward by one second during reassignment so the day's
-- ordering is always strict. The bowser meter chains for every bowser used
-- that day are then rebuilt via recalculate_all_bowser_readings (mig. 012).
--
-- Apply once in the Supabase SQL editor.
-- ============================================================================

CREATE OR REPLACE FUNCTION reorder_fuel_entry(
    p_entry_id UUID,
    p_position INTEGER  -- desired 1-based position in the day's CHRONOLOGICAL
                        -- (ascending-time) order of active entries
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
    -- Locate the entry's day
    SELECT entry_date INTO v_entry_date
    FROM fuel_entries
    WHERE id = p_entry_id
      AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Active fuel entry not found: %', p_entry_id;
    END IF;

    -- Lock and snapshot the day's active entries in chronological order.
    -- created_at/id are deterministic tiebreakers for duplicate times.
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

    -- Current position of the entry
    v_old_pos := array_position(v_ids, p_entry_id);
    v_new_pos := GREATEST(1, LEAST(p_position, v_count));

    IF v_old_pos = v_new_pos THEN
        RETURN jsonb_build_object('moved', false, 'reason', 'already in position');
    END IF;

    -- Reposition the id within the order (times array stays as the day's
    -- positional time sequence)
    v_ids := v_ids[1:v_old_pos-1] || v_ids[v_old_pos+1:v_count];
    v_ids := v_ids[1:v_new_pos-1] || ARRAY[p_entry_id] || v_ids[v_new_pos:v_count-1];

    -- Reassign the day's time sequence positionally, enforcing strict
    -- ascending order (nudge +1s on duplicates, capped at 23:59:59)
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

    -- Rebuild the meter chain for every bowser used that day (only the moved
    -- entry changes relative order, but recalculating all of the day's
    -- bowsers is cheap and bulletproof)
    SELECT array_agg(DISTINCT bowser_id) INTO v_bowser_ids
    FROM fuel_entries
    WHERE entry_date = v_entry_date
      AND deleted_at IS NULL
      AND bowser_id IS NOT NULL;

    IF v_bowser_ids IS NOT NULL THEN
        FOREACH v_bowser IN ARRAY v_bowser_ids LOOP
            PERFORM * FROM recalculate_all_bowser_readings(v_bowser);
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

GRANT EXECUTE ON FUNCTION reorder_fuel_entry(UUID, INTEGER) TO authenticated, anon;

COMMENT ON FUNCTION reorder_fuel_entry IS
'Moves an active fuel entry to a 1-based chronological position within its day by positionally reassigning the day''s existing time values, then rebuilds all affected bowser meter chains. Times stay plausible; order becomes exactly what the user chose.';
