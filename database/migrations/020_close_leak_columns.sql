-- ============================================================================
-- Migration 020: Make a month-end close record the leak check it was signed
--                off on, and mark deliberate re-baselines
-- ============================================================================
-- Why: tank_reconciliations.variance is a GENERATED column,
-- calculated_level − measured_level. But calculated_level is the CARRIED
-- FORWARD balance (book at dip + movements after the dip), while
-- measured_level is the dip itself. Whenever a dip is taken before month end,
-- the stored variance is therefore "leak check + post-dip movements" — a
-- different quantity from the leak check the close screen actually displays
-- and judges the sign-off on. The close-history table and the "Closed on …"
-- banner have been showing that contaminated figure.
--
-- It also makes the number useless for trend analysis. Because a close carries
-- the book forward rather than resetting it to the dip, each close's leak
-- check is a running level: it already contains every earlier month's
-- unexplained difference. Reading that series is the only way to tell a real
-- slow leak from dipstick noise — and on this tank the dipstick resolves to
-- roughly 200 L, so noise is substantial and the series is the only signal.
--
-- Fix: store the leak numerator (book_at_dip) and which dip it was checked
-- against (dip_date) explicitly. The generated `variance` column stays for
-- backwards compatibility but is no longer displayed.
--
-- is_rebaseline marks the one deliberate exception to carrying the book
-- forward: an explicit, logged reset of the book to the physical count, used
-- when the accumulated gap has drifted too far to be credible. It anchors the
-- trend window — everything before a re-baseline belongs to a different book.
--
-- All three columns are nullable/defaulted and additive: existing rows stay
-- valid and fall back to the legacy `variance` column, flagged approximate in
-- the UI.
--
-- Apply once in the Supabase SQL editor.
-- ============================================================================

ALTER TABLE tank_reconciliations
  ADD COLUMN IF NOT EXISTS book_at_dip NUMERIC,
  ADD COLUMN IF NOT EXISTS dip_date DATE,
  ADD COLUMN IF NOT EXISTS is_rebaseline BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN tank_reconciliations.book_at_dip IS
  'Book balance on the dip date: opening + deliveries − dispensed up to and including dip_date. book_at_dip − measured_level is the leak check the month was signed off on. Distinct from calculated_level, which carries post-dip movements forward.';

COMMENT ON COLUMN tank_reconciliations.dip_date IS
  'The dipstick reading date that measured_level came from. Usually inside the month; not necessarily its last day.';

COMMENT ON COLUMN tank_reconciliations.is_rebaseline IS
  'True when this close deliberately reset the book to the physical count (calculated_level = measured_level + post-dip movements) instead of carrying the book forward. Anchors the cumulative-variance window.';

-- Trend queries walk back from the newest close to the last re-baseline.
CREATE INDEX IF NOT EXISTS idx_tank_reconciliations_date_desc
  ON tank_reconciliations (reconciliation_date DESC);
