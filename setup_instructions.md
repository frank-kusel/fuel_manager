# Database Setup Instructions

## Setup Activities and Fields Tables

To set up the new activities and fields tables in your Supabase database:

### Method 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to the "SQL Editor" section
3. Create a new query
4. Copy and paste the contents of `setup_activities_table.sql`
5. Click "Run" to execute
6. Repeat for `setup_fields_table.sql`

### Method 2: Using Supabase CLI

```bash
# If you have Supabase CLI installed
supabase db reset
# Or apply migrations individually
supabase db push
```

### What these scripts create:

**Activities Table:**
- All 21 activities with Zulu translations
- Organized by categories (Field & Orchard Prep, Inputs & Application, etc.)
- Includes icons for each activity
- Row Level Security enabled

**Fields Table:**
- Cane fields: C100, C101, C102
- Pine fields: K100, K101, K102  
- Avocado fields: A001, A002
- General field: KCT
- Legacy fields for backward compatibility
- Area measurements in hectares
- Row Level Security enabled

### After running the scripts:

1. Refresh your application
2. The field selection step will now populate from the database
3. Activities and Fields management will be available in the Database tab
4. All data will be cached for 5 minutes for better performance

### Troubleshooting:

- If tables already exist, the scripts use `ON CONFLICT` to update existing records
- Check the browser console for any database connection errors
- Ensure your Supabase config is correctly loaded from `config.local.js`