# FarmTrack Database Setup

This directory contains the database migration files for the FarmTrack SvelteKit application.

## Setup Instructions

### 1. Access Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to the **SQL Editor** tab
3. Create a new query

### 2. Run Migrations in Order

Execute these SQL files in the following order:

#### Step 1: Create Schema
Copy and paste the contents of `001_initial_schema.sql` into the SQL editor and run it.

This will create:
- All tables (vehicles, drivers, bowsers, activities, fields, fuel_entries, refill_records)
- Indexes for performance
- Triggers for automatic `updated_at` timestamps
- Row Level Security policies
- Foreign key constraints

#### Step 2: Add Sample Data (Optional)
Copy and paste the contents of `002_sample_data.sql` into the SQL editor and run it.

This will populate:
- 5 sample vehicles
- 5 sample drivers  
- 4 sample bowsers
- 12 sample activities
- 8 sample fields
- 3 sample fuel entries
- 2 sample refill records

### 3. Verify Setup

After running the migrations, verify the setup by running these queries:

```sql
-- Check table creation
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('vehicles', 'drivers', 'bowsers', 'activities', 'fields', 'fuel_entries', 'refill_records');

-- Check sample data counts
SELECT 
    (SELECT COUNT(*) FROM vehicles) as vehicles_count,
    (SELECT COUNT(*) FROM drivers) as drivers_count,
    (SELECT COUNT(*) FROM bowsers) as bowsers_count,
    (SELECT COUNT(*) FROM activities) as activities_count,
    (SELECT COUNT(*) FROM fields) as fields_count,
    (SELECT COUNT(*) FROM fuel_entries) as fuel_entries_count,
    (SELECT COUNT(*) FROM refill_records) as refill_records_count;
```

### 4. Configure Application

The application is already configured with your Supabase credentials. Once the database is set up, the application should work without further configuration changes.

## Schema Overview

### Core Entities

1. **vehicles** - Farm equipment and machinery
2. **drivers** - Personnel authorized to operate equipment
3. **bowsers** - Fuel storage and dispensing units
4. **activities** - Types of farm operations
5. **fields** - Farm land areas and plots

### Transaction Tables

1. **fuel_entries** - Individual fuel usage records
2. **refill_records** - Bowser refueling history

### Key Features

- **UUID Primary Keys** - All tables use UUID for better scalability
- **Automatic Timestamps** - `created_at` and `updated_at` managed automatically
- **Data Integrity** - Foreign key constraints and check constraints
- **Performance** - Appropriate indexes on commonly queried columns
- **Security** - Row Level Security enabled (currently allows all authenticated users)

## Troubleshooting

### Common Issues

1. **"relation already exists" errors**: Safe to ignore - the `IF NOT EXISTS` clauses handle this
2. **Permission errors**: Make sure you're running as a database admin in Supabase
3. **Foreign key violations**: Run schema migration before sample data

### Resetting Data

To clear all data and start fresh:

```sql
-- Clear all data (preserves structure)
TRUNCATE TABLE fuel_entries, refill_records, vehicles, drivers, bowsers, activities, fields RESTART IDENTITY CASCADE;
```

To completely reset the schema:

```sql
-- Drop all tables (DANGER: This removes everything)
DROP TABLE IF EXISTS fuel_entries, refill_records, vehicles, drivers, bowsers, activities, fields CASCADE;
```

## Next Steps

After setting up the database:

1. Test the application by navigating to `/fleet`
2. Try creating, editing, and deleting entities
3. Verify offline functionality works
4. Check that data syncs properly when coming back online

## Support

If you encounter issues:

1. Check the Supabase dashboard logs
2. Verify your RLS policies are correct
3. Ensure your Supabase project has the correct API keys
4. Check browser console for any client-side errors