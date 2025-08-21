-- Add default_vehicle column to drivers table
-- This allows each driver to have a preferred/default vehicle

ALTER TABLE public.drivers 
ADD COLUMN default_vehicle_id uuid NULL;

-- Add foreign key constraint to link to vehicles table
ALTER TABLE public.drivers 
ADD CONSTRAINT drivers_default_vehicle_id_fkey 
FOREIGN KEY (default_vehicle_id) REFERENCES public.vehicles (id) ON DELETE SET NULL;

-- Create index for better performance when querying default vehicles
CREATE INDEX IF NOT EXISTS idx_drivers_default_vehicle 
ON public.drivers USING btree (default_vehicle_id);

-- Add comment to explain the column
COMMENT ON COLUMN public.drivers.default_vehicle_id IS 'Default/preferred vehicle for this driver';

-- Optional: Update existing drivers with a default vehicle (example)
-- Uncomment and modify the following lines if you want to set defaults for existing drivers

-- Example: Set first available vehicle as default for drivers who don't have one
-- UPDATE public.drivers 
-- SET default_vehicle_id = (
--     SELECT id FROM public.vehicles 
--     WHERE vehicles.id IS NOT NULL 
--     LIMIT 1
-- )
-- WHERE default_vehicle_id IS NULL;

-- Example: Set specific vehicles for specific drivers (replace with actual IDs)
-- UPDATE public.drivers SET default_vehicle_id = 'vehicle-uuid-here' WHERE employee_code = '001';
-- UPDATE public.drivers SET default_vehicle_id = 'vehicle-uuid-here' WHERE employee_code = '002';