-- ============================================================================
-- Migration 022: Shared app settings (rebate rate, DRS number, dip tolerance)
-- ============================================================================
-- Why: these three lived in each browser's localStorage, yet they decide
-- shared, stored facts. The dip tolerance bands every book-vs-dip gap and is
-- written into tank_reconciliations.accepted when a month is closed; the DRS
-- registration number gates the month-end readiness check. Two devices with
-- different values meant the same close could be "accepted" on one and over
-- tolerance on the other, and a phone always reported "no DRS number".
--
-- One row, enforced by a boolean primary key that can only be true.
--
-- migrated_from_browser_at: the app copies a browser's old localStorage values
-- into this row once, on first load after this migration, and stamps this
-- column so a second browser does not overwrite them.
--
-- Tank capacity is deliberately NOT here: it already lives on bowsers.capacity.
--
-- RLS posture matches 021: enabled, one permissive anon policy, until the app
-- has authentication.
--
-- Apply once in the Supabase SQL editor. The app falls back to localStorage
-- until it is applied.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.app_settings (
    id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),
    diesel_rebate_rate_cents NUMERIC(8,2) NOT NULL DEFAULT 303.8
        CHECK (diesel_rebate_rate_cents >= 0),
    drs_registration_no TEXT,
    dip_tolerance_litres NUMERIC(8,1) NOT NULL DEFAULT 200
        CHECK (dip_tolerance_litres > 0),
    migrated_from_browser_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.app_settings IS
  'Single-row app settings shared by every device: diesel refund rate, DRS registration number, dipstick tolerance (mig. 022).';
COMMENT ON COLUMN public.app_settings.dip_tolerance_litres IS
  'Dipstick resolution. Book-vs-dip gaps are never flagged below this; also decides tank_reconciliations.accepted at close.';

INSERT INTO public.app_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

DROP TRIGGER IF EXISTS update_app_settings_updated_at ON public.app_settings;
CREATE TRIGGER update_app_settings_updated_at
    BEFORE UPDATE ON public.app_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations for anon users" ON public.app_settings;
CREATE POLICY "Allow all operations for anon users" ON public.app_settings
    FOR ALL USING (true);
