-- Migration: Update fuel_reconciliations table to support flexible date ranges
-- This changes from month-based (YYYY-MM) to date range based (start_date, end_date)

-- Step 1: Add new columns
ALTER TABLE public.fuel_reconciliations
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS bowser_start NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS bowser_end NUMERIC(10, 2);

-- Step 2: Migrate existing data from month column to start_date/end_date
-- Convert YYYY-MM format to first and last day of that month
UPDATE public.fuel_reconciliations
SET
  start_date = (month || '-01')::DATE,
  end_date = (DATE_TRUNC('month', (month || '-01')::DATE) + INTERVAL '1 month - 1 day')::DATE
WHERE start_date IS NULL;

-- Step 3: Make start_date and end_date NOT NULL now that they have data
ALTER TABLE public.fuel_reconciliations
  ALTER COLUMN start_date SET NOT NULL,
  ALTER COLUMN end_date SET NOT NULL;

-- Step 4: Drop the unique constraint on month (optional - keep for backward compatibility)
-- Uncomment if you want to remove the month column entirely
-- ALTER TABLE public.fuel_reconciliations DROP CONSTRAINT IF EXISTS monthly_reconciliations_month_key;

-- Step 5: Create index on new date columns for better query performance
CREATE INDEX IF NOT EXISTS idx_fuel_reconciliations_dates
  ON public.fuel_reconciliations (start_date, end_date);

-- Step 6 (Optional): Remove the month column if no longer needed
-- Uncomment if you're sure you don't need backward compatibility
-- ALTER TABLE public.fuel_reconciliations DROP COLUMN IF EXISTS month;
-- DROP INDEX IF EXISTS idx_monthly_reconciliations_month;

-- Verify the migration
SELECT
  id,
  month,
  start_date,
  end_date,
  fuel_dispensed,
  fuel_received,
  status,
  created_at
FROM public.fuel_reconciliations
ORDER BY created_at DESC
LIMIT 10;
