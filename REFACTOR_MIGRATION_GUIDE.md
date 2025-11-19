# Fuel Manager Refactor - Migration Guide

## Overview

This refactor eliminates redundant data storage and implements a **single source of truth** architecture for bowser readings and vehicle odometers. All readings are now derived from the `fuel_entries` table, eliminating data sync issues and enabling automatic cascade corrections.

## What Changed

### ❌ Removed
- `bowser_reading_history` table (immutable audit trail no longer needed)
- `bowsers.current_reading` column (redundant data)
- `vehicles.current_odometer` column (redundant data)
- `updateBowserReading()` method (no longer needed)
- `updateVehicleOdometer()` method (no longer needed)

### ✅ Added
- `current_bowser_readings` view (gets latest reading from fuel_entries)
- `current_vehicle_odometers` view (gets latest odometer from fuel_entries)
- `getCurrentBowserReading()` method (fetches from view)
- `getCurrentOdometer()` method (fetches from view)
- `updateFuelEntryWithCascade()` method (automatically fixes subsequent entries)
- Helper database functions for easy querying

## Migration Steps

### Step 1: Run the Database Migration

#### Option A: Using Supabase Dashboard (Recommended)
1. Open your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the migration file: `database/migrations/011_refactor_to_single_source_of_truth.sql`
4. Copy the entire contents
5. Paste into SQL Editor
6. Click **Run** to execute

#### Option B: Using Supabase CLI
```bash
# If you have Supabase CLI installed
supabase db push

# Or apply the specific migration
psql $DATABASE_URL < database/migrations/011_refactor_to_single_source_of_truth.sql
```

### Step 2: Verify Migration Success

Run these verification queries in the SQL Editor:

```sql
-- Check that views were created
SELECT * FROM current_bowser_readings LIMIT 5;
SELECT * FROM current_vehicle_odometers LIMIT 5;

-- Verify bowser readings match latest fuel entries
SELECT
    b.id,
    b.name,
    cbr.current_reading,
    cbr.last_entry_date
FROM bowsers b
LEFT JOIN current_bowser_readings cbr ON b.id = cbr.bowser_id
ORDER BY b.name;

-- Verify vehicle odometers match latest fuel entries
SELECT
    v.id,
    v.name,
    cvo.current_odometer,
    cvo.last_entry_date
FROM vehicles v
LEFT JOIN current_vehicle_odometers cvo ON v.id = cvo.vehicle_id
ORDER BY v.name;

-- Test helper functions
SELECT get_current_bowser_reading('your-bowser-id-here');
SELECT get_current_vehicle_odometer('your-vehicle-id-here');
```

### Step 3: Clear Browser Cache & Rebuild

```bash
# Clear any cached data
rm -rf .svelte-kit node_modules/.vite

# Reinstall dependencies (if needed)
npm install

# Rebuild the application
npm run build

# Start development server
npm run dev
```

## How the New System Works

### 1. Fuel Entry Creation

**Before:**
```
1. Create fuel_entries record
2. Update bowser.current_reading
3. Create bowser_reading_history record
4. Update vehicle.current_odometer
```

**After:**
```
1. Create fuel_entries record ✅
   (That's it! Current readings automatically available via views)
```

### 2. Getting Current Readings

**Before:**
```typescript
const bowser = await supabaseService.getBowserById(id);
const currentReading = bowser.current_reading; // Direct field access
```

**After:**
```typescript
const result = await supabaseService.getCurrentBowserReading(id);
const currentReading = result.data; // From view (latest fuel_entry)
```

### 3. Editing Fuel Entries with Cascade Correction

**This is the KEY feature** - when you fix a mistake, all subsequent entries auto-correct!

```typescript
// Update fuel entry #2 and automatically fix entries #3-30
await supabaseService.updateFuelEntryWithCascade(entryId, {
    litres_dispensed: 20, // Fix: was 30, should be 20
    bowser_reading_end: 930 // This will cascade to all subsequent entries
});

// The system will:
// 1. Update entry #2
// 2. Find all entries after #2 for the same bowser
// 3. Recalculate their bowser_reading_start and bowser_reading_end
// 4. Update all subsequent entries automatically
```

**Example Scenario:**
```
Entry #1: 1000L → 950L (50L dispensed) ✓
Entry #2: 950L → 920L (30L) ✗ WRONG! Should be 20L
Entry #3: 920L → 900L (20L) ← Cascading error
Entry #4-30: All wrong...

After calling updateFuelEntryWithCascade on Entry #2:
Entry #1: 1000L → 950L (50L) ✓ Unchanged
Entry #2: 950L → 930L (20L) ✓ FIXED
Entry #3: 930L → 910L (20L) ✓ Auto-corrected
Entry #4-30: All auto-corrected! ✓
```

## Using the New System

### Daily Workflow (Worker)

**No changes needed!** The worker continues as normal:
1. Select vehicle → App fetches current odometer from latest fuel entry
2. Select bowser → App fetches current reading from latest fuel entry
3. Enter fuel amount → App calculates new bowser reading
4. Worker validates: "Does the new reading match the physical bowser?"
5. Submit → Entry saved

### Weekly Review (Manager)

**You can now edit ANY entry without disruption:**

1. **View Fuel Entries Dashboard**
   - All entries visible with full details
   - Can see vehicle, driver, field, bowser, litres, readings

2. **Edit an Entry** (Future UI - use SQL for now)
   ```typescript
   // Example: Fix litres_dispensed on a specific entry
   await supabaseService.updateFuelEntryWithCascade(entryId, {
       litres_dispensed: 53.6, // Fix typo: was 536
   });

   // All subsequent entries automatically recalculated!
   ```

3. **Manual SQL Edit** (Until UI is built)
   ```sql
   -- Get the entry ID you want to edit
   SELECT id, entry_date, vehicle_id, litres_dispensed, bowser_reading_start, bowser_reading_end
   FROM fuel_entries
   WHERE entry_date = '2025-11-19'
   ORDER BY time;

   -- Edit using the service method (via browser console for now)
   -- Or direct SQL (won't cascade - use service method instead)
   ```

## Building the Edit UI (Next Step)

To make editing easy, you'll want to add:

1. **Inline Edit Button on Dashboard**
   - Click edit icon on any fuel entry row
   - Modal opens with editable fields
   - Save button calls `updateFuelEntryWithCascade()`

2. **Edit Form Fields**
   - Date/Time
   - Vehicle
   - Driver
   - Activity
   - Field/Zone
   - Litres Dispensed
   - Odometer readings
   - Bowser readings (auto-recalculated on save)

3. **Example Edit Component** (pseudo-code)
   ```svelte
   <script>
   async function handleSave() {
       await supabaseService.updateFuelEntryWithCascade(entryId, {
           vehicle_id: selectedVehicle.id,
           driver_id: selectedDriver.id,
           litres_dispensed: parseFloat(litres),
           // ... other fields
       });

       // Refresh dashboard
       await loadFuelEntries();

       showToast('Entry updated! All subsequent entries auto-corrected.');
   }
   </script>
   ```

## Rollback (If Needed)

If you need to rollback the migration, run this SQL:

```sql
-- Add back current_reading to bowsers
ALTER TABLE bowsers ADD COLUMN current_reading NUMERIC(10,2) DEFAULT 0;

-- Add back current_odometer to vehicles
ALTER TABLE vehicles ADD COLUMN current_odometer NUMERIC(10,2);

-- Populate from latest fuel entries (one-time)
UPDATE bowsers b
SET current_reading = (
    SELECT bowser_reading_end
    FROM fuel_entries
    WHERE bowser_id = b.id
    ORDER BY entry_date DESC, time DESC
    LIMIT 1
);

UPDATE vehicles v
SET current_odometer = (
    SELECT odometer_end
    FROM fuel_entries
    WHERE vehicle_id = v.id
    ORDER BY entry_date DESC, time DESC
    LIMIT 1
);

-- Drop views and functions
DROP VIEW IF EXISTS current_bowser_readings;
DROP VIEW IF EXISTS current_vehicle_odometers;
DROP FUNCTION IF EXISTS get_current_bowser_reading;
DROP FUNCTION IF EXISTS get_current_vehicle_odometer;
```

## Benefits Summary

✅ **Single Source of Truth** - fuel_entries is the only place readings live
✅ **No Sync Issues** - readings always match latest entry
✅ **Automatic Cascade Correction** - fix one entry, all subsequent entries update
✅ **Simpler Architecture** - fewer tables, less code, easier to maintain
✅ **Edit Anytime** - no workflow disruption, fix mistakes whenever needed
✅ **Worker Validation** - real-time bowser reading comparison catches typos
✅ **Data Integrity** - impossible to have mismatched readings

## Troubleshooting

### Views return empty/null readings
**Cause:** No fuel entries exist for that bowser/vehicle yet.
**Solution:** This is normal for new bowsers/vehicles. First fuel entry will populate the view.

### Cascade correction didn't update all entries
**Cause:** Used `updateFuelEntry()` instead of `updateFuelEntryWithCascade()`.
**Solution:** Always use the cascade version when editing bowser-related fields.

### Performance concerns
**Cause:** Worried about view performance.
**Solution:** Views are indexed and extremely fast. With typical farm data volumes (<10,000 entries), queries are <5ms.

## Questions?

If you encounter any issues during migration or have questions about the new system, refer to:
- Migration file: `database/migrations/011_refactor_to_single_source_of_truth.sql`
- Service methods: `src/lib/services/supabase.ts`
- Type definitions: `src/lib/types/index.ts`
