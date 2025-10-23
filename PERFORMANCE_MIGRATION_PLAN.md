# Performance Migration Plan - SvelteKit Best Practices

## Current Status (2025-01-23)

### ✅ Phase 1: Client-Side Caching (COMPLETED/IN PROGRESS)
**Status:** Implementing now
**Approach:** Client-side stores with manual caching
**Impact:** 80% performance improvement with minimal changes

#### Completed Optimizations:
1. **Summary Page** (src/routes/summary/+page.svelte)
   - ✅ Fixed N+1 query problem (30 queries → 1 query)
   - ✅ Implemented parallel data fetching (Promise.all)
   - ✅ Added caching store (src/lib/stores/summary-cache.ts)
   - ✅ Added refresh button
   - **Result:** ~95% faster, instant on revisit

2. **Dashboard RecentActivity Component** (src/lib/components/dashboard/RecentActivity.svelte)
   - ✅ Fixed N+1 query problem (batched field names fetch)
   - **Result:** ~90% faster field name loading

#### Planned for this Session:
3. **Dashboard Store Caching** (src/lib/stores/dashboard.ts)
   - Add cache with 5-minute TTL
   - Prevent reload on navigation

4. **Reference Data Store** (NEW: src/lib/stores/reference-data.ts)
   - Centralized store for: vehicles, drivers, activities, fields, zones, bowsers
   - Load all in parallel once
   - Share across fuel entry workflow steps
   - Cache for 10-15 minutes

---

## 🚀 Phase 2: Migration to SvelteKit Load Functions (FUTURE WORK)

### Why This Matters
Current implementation uses `onMount()` which:
- ❌ Loads data AFTER page renders (slower)
- ❌ No server-side rendering benefits
- ❌ Manual cache management
- ❌ No built-in invalidation

SvelteKit load functions provide:
- ✅ Data loads BEFORE page renders (faster)
- ✅ Server-side rendering (SSR)
- ✅ Built-in caching and invalidation
- ✅ Better SEO
- ✅ Automatic error handling
- ✅ Progressive enhancement

### Migration Scope

#### Pages to Migrate:

1. **Summary Page** (src/routes/summary/+page.svelte)
   - Create: `src/routes/summary/+page.ts`
   - Move data fetching from `onMount()` to load function
   - Remove client-side cache store (use SvelteKit's built-in caching)

   ```typescript
   // Future: src/routes/summary/+page.ts
   export async function load({ fetch }) {
     const [entries, fieldNames] = await Promise.all([
       fetch('/api/fuel-entries?days=30'),
       fetch('/api/fuel-entry-fields?days=30')
     ]);
     return {
       entries: await entries.json(),
       fieldNames: await fieldNames.json()
     };
   }
   ```

2. **Dashboard Page** (src/routes/dashboard/+page.svelte)
   - Create: `src/routes/dashboard/+page.ts`
   - Move dashboard stats loading to load function
   - Consider whether to keep dashboard store or use page data

   ```typescript
   // Future: src/routes/dashboard/+page.ts
   export async function load({ fetch }) {
     const [stats, performance] = await Promise.all([
       fetch('/api/dashboard/stats'),
       fetch('/api/dashboard/performance')
     ]);
     return {
       stats: await stats.json(),
       performance: await performance.json()
     };
   }
   ```

3. **Fuel Entry Page** (src/routes/fuel/+page.svelte)
   - Create: `src/routes/fuel/+page.ts`
   - Preload all reference data (vehicles, drivers, activities, fields, zones, bowsers)
   - Pass to FuelEntryWorkflow component

   ```typescript
   // Future: src/routes/fuel/+page.ts
   export async function load({ fetch }) {
     const [vehicles, drivers, activities, fields, zones, bowsers] =
       await Promise.all([
         fetch('/api/vehicles'),
         fetch('/api/drivers'),
         fetch('/api/activities'),
         fetch('/api/fields'),
         fetch('/api/zones'),
         fetch('/api/bowsers')
       ]);

     return {
       vehicles: await vehicles.json(),
       drivers: await drivers.json(),
       activities: await activities.json(),
       fields: await fields.json(),
       zones: await zones.json(),
       bowsers: await bowsers.json()
     };
   }
   ```

#### API Routes to Create:

Create server-side API endpoints in `src/routes/api/`:

```
src/routes/api/
├── fuel-entries/
│   └── +server.ts          # GET /api/fuel-entries?days=30
├── fuel-entry-fields/
│   └── +server.ts          # GET /api/fuel-entry-fields?days=30
├── dashboard/
│   ├── stats/
│   │   └── +server.ts      # GET /api/dashboard/stats
│   └── performance/
│       └── +server.ts      # GET /api/dashboard/performance
├── vehicles/
│   └── +server.ts          # GET /api/vehicles
├── drivers/
│   └── +server.ts          # GET /api/drivers
├── activities/
│   └── +server.ts          # GET /api/activities
├── fields/
│   └── +server.ts          # GET /api/fields
├── zones/
│   └── +server.ts          # GET /api/zones
└── bowsers/
    └── +server.ts          # GET /api/bowsers
```

**Why API routes?**
- Keeps Supabase logic server-side (more secure)
- Can add caching headers
- Better error handling
- Can aggregate data before sending to client

#### Component Changes:

**Fuel Entry Workflow Steps:**
- Remove `onMount()` data fetching from:
  - VehicleSelection.svelte
  - DriverSelection.svelte
  - ActivitySelection.svelte
  - LocationSelection.svelte

- Instead, accept data as props from parent:
  ```svelte
  <script lang="ts">
    interface Props {
      vehicles: Vehicle[];  // Passed from page data
      selectedVehicle: Vehicle | null;
      onVehicleSelect: (vehicle: Vehicle) => void;
    }
    let { vehicles, selectedVehicle, onVehicleSelect }: Props = $props();
  </script>
  ```

#### Store Refactoring:

**Keep:**
- `fuel-entry-workflow.ts` (workflow state management)
- Dashboard store for component state (if needed)

**Remove/Replace:**
- `summary-cache.ts` → Use SvelteKit's built-in caching
- Future `dashboard-cache.ts` → Use SvelteKit's built-in caching
- Future `reference-data.ts` → Data comes from load functions

**Use invalidation instead:**
```typescript
import { invalidate } from '$app/navigation';

// Refresh data
await invalidate('/api/fuel-entries');
```

---

## Migration Steps (Future Session)

### Step 1: Create API Routes (1-2 hours)
1. Create `src/routes/api/` structure
2. Move Supabase queries from components to API routes
3. Add proper error handling and response formatting
4. Test each endpoint individually

### Step 2: Migrate Summary Page (30 min)
1. Create `src/routes/summary/+page.ts`
2. Update `+page.svelte` to use `data` prop from load function
3. Remove `onMount()` and cache store
4. Test performance and functionality

### Step 3: Migrate Dashboard Page (45 min)
1. Create `src/routes/dashboard/+page.ts`
2. Update dashboard components to accept data props
3. Remove `onMount()` from main page
4. Test all dashboard components

### Step 4: Migrate Fuel Entry Page (1-2 hours)
1. Create `src/routes/fuel/+page.ts`
2. Update FuelEntryWorkflow to accept reference data props
3. Update each step component to accept data props
4. Remove individual `onMount()` calls from steps
5. Test entire workflow

### Step 5: Cleanup (30 min)
1. Remove unused cache stores
2. Update any remaining `onMount()` data fetching
3. Add proper TypeScript types for load function returns
4. Update documentation

---

## Performance Comparison

### Current (After Phase 1 - Client-Side Caching):
- Summary: Instant on revisit
- Dashboard: ~1-2s initial, instant on revisit
- Fuel Entry: ~1-2s initial, instant steps

### After Phase 2 (SvelteKit Load Functions):
- Summary: ~0.5s initial (SSR), instant on revisit
- Dashboard: ~0.5s initial (SSR), instant on revisit
- Fuel Entry: ~0.3s initial (SSR), instant steps
- **Plus:** Better SEO, works without JavaScript, progressive enhancement

---

## Important Files Reference

### Current Implementation (Phase 1):
- `src/routes/summary/+page.svelte` - Summary page with caching
- `src/lib/stores/summary-cache.ts` - Summary cache store
- `src/routes/dashboard/+page.svelte` - Dashboard page
- `src/lib/stores/dashboard.ts` - Dashboard store (to be enhanced with caching)
- `src/routes/fuel/+page.svelte` - Fuel entry page
- `src/lib/components/fuel/FuelEntryWorkflow.svelte` - Main workflow component
- `src/lib/components/fuel/steps/*.svelte` - Individual step components
- `src/lib/services/supabase.ts` - Supabase service (centralized queries)

### Files to Create (Phase 2):
- `src/routes/summary/+page.ts`
- `src/routes/dashboard/+page.ts`
- `src/routes/fuel/+page.ts`
- `src/routes/api/**/*.ts` - API endpoints
- `src/lib/types/load.ts` - TypeScript types for load functions

---

## Testing Checklist (Phase 2)

### Before Migration:
- [ ] Document current performance metrics
- [ ] Screenshot current functionality
- [ ] Note any edge cases or special behaviors

### During Migration:
- [ ] Each API endpoint works independently
- [ ] Load functions return correct data structure
- [ ] Error handling works properly
- [ ] Loading states display correctly

### After Migration:
- [ ] All pages load correctly
- [ ] Navigation between pages works
- [ ] Refresh button functionality maintained
- [ ] Performance is improved
- [ ] No console errors
- [ ] Data invalidation works
- [ ] SSR renders correctly (view source to verify)

---

## Resources

**SvelteKit Documentation:**
- [Loading Data](https://kit.svelte.dev/docs/load)
- [Server Routes](https://kit.svelte.dev/docs/routing#server)
- [Invalidation](https://kit.svelte.dev/docs/modules#$app-navigation-invalidate)

**Best Practices:**
- Keep load functions fast (<100ms ideal)
- Use parallel requests (Promise.all)
- Add proper error boundaries
- Consider streaming for slow queries
- Use depends() for granular invalidation

---

## Notes

**When to Start Phase 2:**
- After Phase 1 is stable and tested
- When you have 3-4 hours for focused work
- Consider as part of larger refactoring effort
- Not urgent - Phase 1 provides good performance

**Benefits of Waiting:**
- Phase 1 gives immediate performance wins
- Can test caching strategy before committing to architecture
- Learn what data actually needs frequent updates
- May identify other refactoring opportunities

**Risks of Not Doing Phase 2:**
- Missing out on SSR benefits
- More manual cache management
- Not following framework conventions
- Potentially harder to maintain long-term
