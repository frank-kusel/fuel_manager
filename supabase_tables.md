# Supabase Database Tables Documentation

## Project Information
- **Project URL**: https://szskplrwmeuahwvicyos.supabase.co
- **Generated**: 2025-01-24

## Tables Overview

### 1. **bowsers**
Stores information about fuel bowsers/tanks.

**Columns:**
- `id` (SERIAL) - Primary key
- `name` (VARCHAR(100)) - Unique name of the bowser
- `capacity` (DECIMAL(10,2)) - Tank capacity in litres
- `current_reading` (DECIMAL(10,2)) - Current reading
- `status` (VARCHAR(20)) - Status (default: 'active')
- `created_at` (TIMESTAMPTZ) - Creation timestamp
- `updated_at` (TIMESTAMPTZ) - Last update timestamp

---

### 2. **bowser_refills**
Records of bowser refilling events.

**Columns:**
- `id` (SERIAL) - Primary key
- `bowser_id` (INTEGER) - Foreign key to bowsers table
- `date` (DATE) - Date of refill
- `supplier` (VARCHAR) - Fuel supplier name
- `amount` (DECIMAL) - Amount of fuel refilled
- `reading_before` (DECIMAL) - Bowser reading before refill
- `reading_after` (DECIMAL) - Bowser reading after refill
- `cost` (DECIMAL) - Total cost of refill
- `timestamp` (TIMESTAMPTZ) - Timestamp of refill
- `created_at` (TIMESTAMPTZ) - Creation timestamp

---

### 3. **vehicles**
Information about vehicles in the fleet.

**Columns:**
- `id` (SERIAL) - Primary key
- `code` (VARCHAR) - Vehicle code
- `name` (VARCHAR) - Vehicle name
- `type` (VARCHAR) - Vehicle type
- `registration` (VARCHAR) - Registration number
- `make` (VARCHAR) - Vehicle make
- `model` (VARCHAR) - Vehicle model
- `year` (INTEGER) - Year of manufacture
- `fuel_type` (VARCHAR) - Type of fuel used
- `tank_capacity` (DECIMAL) - Tank capacity in litres
- `notes` (TEXT) - Additional notes
- `active` (BOOLEAN) - Whether vehicle is active
- `created_at` (TIMESTAMPTZ) - Creation timestamp
- `updated_at` (TIMESTAMPTZ) - Last update timestamp
- `current_odometer` (DECIMAL) - Current odometer reading
- `odometer_unit` (VARCHAR) - Unit of odometer (km/miles)
- `average_consumption_l_per_100km` (DECIMAL) - Average fuel consumption

---

### 4. **fields**
Agricultural fields or work locations.

**Columns:**
- `id` (SERIAL) - Primary key
- `code` (VARCHAR) - Field code
- `name` (VARCHAR) - Field name
- `type` (VARCHAR) - Field type
- `area` (DECIMAL) - Area size
- `location` (VARCHAR) - Location description
- `crop_type` (VARCHAR) - Type of crop
- `notes` (TEXT) - Additional notes
- `active` (BOOLEAN) - Whether field is active
- `created_at` (TIMESTAMPTZ) - Creation timestamp
- `updated_at` (TIMESTAMPTZ) - Last update timestamp

---

### 5. **drivers**
Driver information.

**Columns:**
- `id` (SERIAL) - Primary key
- `employee_code` (VARCHAR) - Employee code
- `name` (VARCHAR) - Driver name
- `license_number` (VARCHAR) - License number
- `phone` (VARCHAR) - Phone number
- `email` (VARCHAR) - Email address
- `active` (BOOLEAN) - Whether driver is active
- `created_at` (TIMESTAMPTZ) - Creation timestamp
- `updated_at` (TIMESTAMPTZ) - Last update timestamp

---

### 6. **activities**
Types of activities or work performed.

**Columns:**
- `id` (SERIAL) - Primary key
- `code` (VARCHAR) - Activity code
- `name` (VARCHAR) - Activity name
- `description` (TEXT) - Activity description
- `category` (VARCHAR) - Activity category
- `active` (BOOLEAN) - Whether activity is active
- `created_at` (TIMESTAMPTZ) - Creation timestamp
- `updated_at` (TIMESTAMPTZ) - Last update timestamp

---

### 7. **fuel_entries**
Main fuel transaction records.

**Columns:**
- `id` (SERIAL) - Primary key
- `date` (DATE) - Date of entry (renamed from `entry_date`)
- `time` (TIME) - Time of entry
- `driver_id` (INTEGER) - Foreign key to drivers
- `vehicle_id` (INTEGER) - Foreign key to vehicles
- `bowser_id` (INTEGER) - Foreign key to bowsers
- `bowser_start` (DECIMAL) - Starting bowser reading
- `bowser_end` (DECIMAL) - Ending bowser reading
- `activity_id` (INTEGER) - Foreign key to activities
- `field_id` (INTEGER) - Foreign key to fields
- `odometer_start` (DECIMAL) - Starting odometer reading
- `odometer_end` (DECIMAL) - Ending odometer reading
- `bowser_reading_start` (DECIMAL) - Bowser reading at start
- `bowser_reading_end` (DECIMAL) - Bowser reading at end
- `litres_dispensed` (DECIMAL) - Litres dispensed from bowser
- `litres_used` (DECIMAL) - Litres actually used
- `cost_per_litre` (DECIMAL) - Cost per litre
- `total_cost` (DECIMAL) - Total cost
- `notes` (TEXT) - Additional notes
- `gauge_working` (BOOLEAN) - Whether gauge is working
- `fuel_consumption_l_per_100km` (DECIMAL) - Fuel consumption rate
- `zone_id` (INTEGER) - Foreign key to zones
- `created_at` (TIMESTAMPTZ) - Creation timestamp
- `updated_at` (TIMESTAMPTZ) - Last update timestamp

---

### 8. **fuel_type_lookup**
Lookup table for fuel types.

**Columns:**
- `id` (SERIAL) - Primary key
- `fuel_type` (VARCHAR) - Fuel type name
- `description` (TEXT) - Description
- `active` (BOOLEAN) - Whether active
- `created_at` (TIMESTAMPTZ) - Creation timestamp

---

### 9. **zones**
Geographic or operational zones.

**Columns:**
- `id` (SERIAL) - Primary key
- `code` (VARCHAR) - Zone code
- `name` (VARCHAR) - Zone name
- `description` (TEXT) - Zone description
- `active` (BOOLEAN) - Whether zone is active
- `created_at` (TIMESTAMPTZ) - Creation timestamp
- `updated_at` (TIMESTAMPTZ) - Last update timestamp

---

## Views

### 1. **bowser_refill_summary**
Aggregated view of bowser refills by month.

**Columns:**
- `month` - Month of refills
- `total_refills` - Total number of refills
- `total_fuel_received` - Total fuel received
- `total_cost` - Total cost
- `avg_refill_amount` - Average refill amount

---

### 2. **fuel_entries_with_location**
View combining fuel entries with location information.

**Columns:**
All columns from `fuel_entries` table plus:
- Location-related fields from joined tables
- Calculated fields for consumption and usage

---

### 3. **fuel_entries_with_bowser**
View of fuel entries with bowser information (from migration).

**Columns:**
- All fuel_entries columns
- `bowser_name` - Name of the bowser
- `bowser_capacity` - Bowser capacity
- `fuel_dispensed_from_bowser` - Calculated fuel dispensed

---

## Indexes

- `idx_fuel_entries_bowser_id` - Index on fuel_entries.bowser_id
- `idx_fuel_entries_date_bowser` - Compound index on fuel_entries(date, bowser_id)

## Row Level Security (RLS)

- Bowsers table has RLS enabled with policy "Allow all operations"

## Triggers

- `update_bowsers_updated_at` - Updates the `updated_at` timestamp on bowsers table modifications

---

## Notes

- All tables use TIMESTAMPTZ for timestamp fields (timezone-aware)
- Most tables have `created_at` and `updated_at` timestamps
- Many tables have an `active` boolean flag for soft deletes
- Foreign key relationships are established between related tables
- The database appears to be designed for a fuel management system for agricultural or fleet operations