-- Monthly diesel claim reporting
-- Persists activity eligibility and monthly telematics adjustments used by exports.

ALTER TABLE activities
ADD COLUMN IF NOT EXISTS diesel_claim_eligible BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS diesel_claim_reviewed_at TIMESTAMPTZ;

ALTER TABLE vehicles
ADD COLUMN IF NOT EXISTS diesel_claim_method TEXT NOT NULL DEFAULT 'activity_only';

ALTER TABLE vehicles
DROP CONSTRAINT IF EXISTS vehicles_diesel_claim_method_check;

ALTER TABLE vehicles
ADD CONSTRAINT vehicles_diesel_claim_method_check
CHECK (diesel_claim_method IN ('activity_only', 'monthly_classifier'));

UPDATE vehicles
SET diesel_claim_method = 'monthly_classifier'
WHERE code = 'KC06';

CREATE TABLE IF NOT EXISTS vehicle_monthly_claim_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    claim_month DATE NOT NULL,
    classifier_measured_litres NUMERIC(12, 2) NOT NULL,
    classifier_claimable_litres NUMERIC(12, 2) NOT NULL,
    claimable_percentage NUMERIC(9, 6) GENERATED ALWAYS AS (
        classifier_claimable_litres / classifier_measured_litres * 100
    ) STORED,
    source_reference TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT vehicle_monthly_claim_adjustments_month_start_check
        CHECK (claim_month = date_trunc('month', claim_month::timestamp)::date),
    CONSTRAINT vehicle_monthly_claim_adjustments_measured_positive_check
        CHECK (classifier_measured_litres > 0),
    CONSTRAINT vehicle_monthly_claim_adjustments_claimable_range_check
        CHECK (
            classifier_claimable_litres >= 0
            AND classifier_claimable_litres <= classifier_measured_litres
        ),
    CONSTRAINT vehicle_monthly_claim_adjustments_vehicle_month_key
        UNIQUE (vehicle_id, claim_month)
);

CREATE INDEX IF NOT EXISTS idx_vehicle_monthly_claim_adjustments_month
ON vehicle_monthly_claim_adjustments(claim_month, vehicle_id);

DROP TRIGGER IF EXISTS update_vehicle_monthly_claim_adjustments_updated_at
ON vehicle_monthly_claim_adjustments;

CREATE TRIGGER update_vehicle_monthly_claim_adjustments_updated_at
    BEFORE UPDATE ON vehicle_monthly_claim_adjustments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE vehicle_monthly_claim_adjustments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations for claim adjustments"
ON vehicle_monthly_claim_adjustments;

CREATE POLICY "Allow all operations for claim adjustments"
ON vehicle_monthly_claim_adjustments
FOR ALL
USING (true)
WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE
ON vehicle_monthly_claim_adjustments TO authenticated, anon;

GRANT SELECT, UPDATE (diesel_claim_eligible, diesel_claim_reviewed_at)
ON activities TO authenticated, anon;

GRANT SELECT (diesel_claim_method)
ON vehicles TO authenticated, anon;

COMMENT ON COLUMN activities.diesel_claim_eligible IS
'Whether fuel entries assigned to this activity are eligible before vehicle-specific adjustments.';

COMMENT ON COLUMN vehicles.diesel_claim_method IS
'Claim calculation method: activity eligibility only, or activity eligibility reduced by a monthly classifier result.';

COMMENT ON TABLE vehicle_monthly_claim_adjustments IS
'Monthly telematics classifier totals used to reduce activity-eligible litres for configured vehicles.';
