# Hybrid Migration Guide

## 📋 Migration Overview

This guide will help you migrate your existing Supabase database to the new UUID-based schema while preserving your vehicle, driver, activity, and bowser data.

## ✅ Data Backup Status
- ✅ **vehicles**: 25 records exported
- ✅ **drivers**: 10 records exported  
- ✅ **activities**: 10 records exported
- ✅ **bowsers**: 1 record exported

## 🚀 Migration Steps

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase project: https://szskplrwmeuahwvicyos.supabase.co
2. Navigate to the SQL Editor in the dashboard
3. Create a new query

### Step 2: Execute the Migration
Copy and paste the contents of `database/migrations/003_hybrid_migration.sql` into the SQL Editor and run it.

**⚠️ Important**: This will:
- Drop all existing tables (data is backed up)
- Create new tables with proper UUID schema
- Insert your transformed data with new UUIDs
- Set up proper indexes, triggers, and RLS policies

### Step 3: Verify Migration Success

After running the migration, execute these queries to verify:

```sql
-- Check that all tables exist with proper structure
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('vehicles', 'drivers', 'activities', 'bowsers', 'fields', 'fuel_entries')
ORDER BY table_name, ordinal_position;

-- Verify data counts
SELECT 'vehicles' as table_name, COUNT(*) as count FROM vehicles
UNION ALL
SELECT 'drivers', COUNT(*) FROM drivers
UNION ALL  
SELECT 'activities', COUNT(*) FROM activities
UNION ALL
SELECT 'bowsers', COUNT(*) FROM bowsers
UNION ALL
SELECT 'fields', COUNT(*) FROM fields;

-- Check that UUIDs are properly generated
SELECT 'vehicles' as table_name, id FROM vehicles LIMIT 1
UNION ALL
SELECT 'drivers', id FROM drivers LIMIT 1;
```

## 📊 Expected Results After Migration

| Table | Old Count | New Count | Status |
|-------|-----------|-----------|--------|
| vehicles | 25 | 25 | ✅ Migrated |
| drivers | 10 | 10 | ✅ Migrated |  
| activities | 10 | 10 | ✅ Migrated |
| bowsers | 1 | 1 | ✅ Migrated |
| fields | 0 | 4 | ✅ Sample data added |
| fuel_entries | ? | 0 | ✅ Ready for new entries |

## 🔄 Schema Changes Summary

### Key Improvements:
1. **UUID Primary Keys**: All tables now use UUID instead of integer IDs
2. **Foreign Key Relationships**: Proper references between tables
3. **Enhanced Vehicle Schema**: Added make, model, year, fuel_type, tank_capacity
4. **Enhanced Driver Schema**: Added phone, email, emergency contacts, license details
5. **Activity Categories**: Standardized categories with constraints
6. **Field Management**: New table for field/location tracking
7. **Timestamps**: Proper created_at/updated_at with auto-update triggers
8. **RLS Security**: Row-level security policies enabled

### Data Transformations:
- **Vehicle Types**: Mapped old types to standard categories
- **Activity Categories**: Mapped to standardized categories
- **Driver Codes**: Preserved as employee_code field
- **Missing Fields**: Added with sensible defaults

## 🔍 Post-Migration Validation

After migration, your SvelteKit app should be able to:
1. ✅ Connect to the database
2. ✅ Load vehicles, drivers, activities, and bowsers
3. ✅ Create new fuel entries with proper relationships
4. ✅ Perform all CRUD operations

## 🚨 Rollback Plan

If migration fails or issues are found:
1. The original data is backed up in `database/backup_*.json` files
2. You can restore using the original schema
3. Contact support for assistance

## 📞 Next Steps

After successful migration:
1. Test the SvelteKit frontend connectivity
2. Verify all components work with new schema
3. Begin Phase 3: Dashboard & Analytics migration
4. Add any missing vehicle/driver details manually through the UI

---

**Ready to proceed with the migration? Copy the SQL from `003_hybrid_migration.sql` into your Supabase SQL Editor and execute it!**