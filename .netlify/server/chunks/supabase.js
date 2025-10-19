import { createClient } from "@supabase/supabase-js";
class SupabaseService {
  client = null;
  isInitialized = false;
  // Initialize the Supabase client
  async init() {
    if (this.isInitialized) return;
    try {
      const config = await this.loadConfig();
      this.client = createClient(config.url, config.key);
      this.isInitialized = true;
      console.log("Supabase client initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Supabase client:", error);
      throw new Error("Failed to initialize database connection");
    }
  }
  // Load Supabase configuration from environment variables
  async loadConfig() {
    const url = "https://szskplrwmeuahwvicyos.supabase.co";
    const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6c2twbHJ3bWV1YWh3dmljeW9zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzcwOTMxMSwiZXhwIjoyMDY5Mjg1MzExfQ.HIpUnovx2W9ZSqsfwBR0iGJJtCm3w6TU5oTMnphENdU";
    return { url, key };
  }
  // Ensure client is initialized
  ensureInitialized() {
    if (!this.client || !this.isInitialized) {
      throw new Error("Supabase client not initialized. Call init() first.");
    }
    return this.client;
  }
  // Get the raw Supabase client for direct queries
  getClient() {
    return this.ensureInitialized();
  }
  // Generic query wrapper with error handling
  async query(operation) {
    try {
      const result = await operation();
      if (result.error) {
        console.error("Database query error:", result.error);
        return { data: null, error: result.error.message || "Database operation failed" };
      }
      return { data: result.data, error: null, count: result.count };
    } catch (error) {
      console.error("Database operation failed:", error);
      return {
        data: null,
        error: error instanceof Error ? error.message : "Unknown database error"
      };
    }
  }
  // Vehicle operations
  async getVehicles() {
    const client = this.ensureInitialized();
    return this.query(
      () => client.from("vehicles").select("*").order("code")
    );
  }
  async getVehicleById(id) {
    const client = this.ensureInitialized();
    return this.query(
      () => client.from("vehicles").select("*").eq("id", id).single()
    );
  }
  async createVehicle(vehicle) {
    const client = this.ensureInitialized();
    return this.query(
      () => client.from("vehicles").insert(vehicle).select().single()
    );
  }
  async updateVehicle(id, updates) {
    const client = this.ensureInitialized();
    return this.query(
      () => client.from("vehicles").update({ ...updates, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", id).select().single()
    );
  }
  async updateVehicleOdometer(id, newOdometer) {
    const client = this.ensureInitialized();
    return this.query(
      () => client.from("vehicles").update({
        current_odometer: newOdometer,
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      }).eq("id", id).select().single()
    );
  }
  async updateBowserReading(id, newReading, fuelEntryId) {
    const client = this.ensureInitialized();
    try {
      const currentBowser = await client.from("bowsers").select("current_reading").eq("id", id).single();
      const previousReading = currentBowser.data?.current_reading || null;
      const updateResult = await client.from("bowsers").update({
        current_reading: newReading,
        last_updated: (/* @__PURE__ */ new Date()).toISOString(),
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      }).eq("id", id).select().single();
      try {
        await client.from("bowser_reading_history").insert({
          bowser_id: id,
          fuel_entry_id: fuelEntryId || null,
          previous_reading: previousReading,
          new_reading: newReading,
          created_by: null
        });
      } catch (historyError) {
        console.warn("Could not create bowser reading history:", historyError);
      }
      return { data: updateResult.data, error: updateResult.error?.message };
    } catch (error) {
      return { data: null, error: error instanceof Error ? error.message : "Failed to update bowser reading" };
    }
  }
  async deleteVehicle(id) {
    const client = this.ensureInitialized();
    return this.query(
      () => client.from("vehicles").update({ active: false, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", id)
    );
  }
  // Driver operations
  async getDrivers() {
    const client = this.ensureInitialized();
    return this.query(
      () => client.from("drivers").select(`
					*,
					default_vehicle:vehicles!drivers_default_vehicle_id_fkey (
						id,
						code,
						name,
						type,
						registration
					)
				`).order("name")
    );
  }
  async createDriver(driver) {
    const client = this.ensureInitialized();
    return this.query(
      () => client.from("drivers").insert(driver).select().single()
    );
  }
  async updateDriver(id, updates) {
    const client = this.ensureInitialized();
    return this.query(
      () => client.from("drivers").update({ ...updates, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", id).select().single()
    );
  }
  // Fuel entry operations
  async getFuelEntries(startDate, endDate) {
    const client = this.ensureInitialized();
    let query = client.from("fuel_entries").select(`
				*,
				vehicles!left (code, name, registration),
				drivers!left (employee_code, name),
				activities!left (code, name),
				fields!left (code, name),
				bowsers!left (name)
			`).order("entry_date", { ascending: false });
    if (startDate) {
      query = query.gte("entry_date", startDate);
    }
    if (endDate) {
      query = query.lte("entry_date", endDate);
    }
    return this.query(() => query);
  }
  async createFuelEntry(entry) {
    const client = this.ensureInitialized();
    return this.query(
      () => client.from("fuel_entries").insert(entry).select().single()
    );
  }
  async updateFuelEntry(id, updates) {
    const client = this.ensureInitialized();
    return this.query(
      () => client.from("fuel_entries").update({ ...updates, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", id).select().single()
    );
  }
  // Multi-field fuel entry operations
  async createFuelEntryWithFields(entry, fieldIds = []) {
    const client = this.ensureInitialized();
    try {
      const { data: fuelEntry, error: entryError } = await client.from("fuel_entries").insert({
        ...entry,
        field_selection_mode: fieldIds.length > 1 ? "multiple" : "single"
      }).select().single();
      if (entryError) {
        return { data: null, error: entryError.message };
      }
      if (fieldIds.length > 0 && entry.field_selection_mode === "multiple") {
        const junctionEntries = fieldIds.map((fieldId) => ({
          fuel_entry_id: fuelEntry.id,
          field_id: fieldId
        }));
        const { error: junctionError } = await client.from("fuel_entry_fields").insert(junctionEntries);
        if (junctionError) {
          await client.from("fuel_entries").delete().eq("id", fuelEntry.id);
          return { data: null, error: junctionError.message };
        }
      }
      return { data: fuelEntry, error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : "Failed to create fuel entry with fields"
      };
    }
  }
  async getFuelEntryFields(entryId) {
    const client = this.ensureInitialized();
    return this.query(
      () => client.from("fuel_entry_fields").select(`
					field_id,
					fields (
						id,
						code,
						name,
						type,
						area,
						location,
						crop_type,
						active,
						created_at,
						updated_at
					)
				`).eq("fuel_entry_id", entryId)
    );
  }
  async getFuelEntriesWithLocation(startDate, endDate) {
    const client = this.ensureInitialized();
    let query = client.from("fuel_entries_with_fields").select(`
				*,
				vehicles (
					code,
					name,
					type
				),
				drivers (
					employee_code,
					name
				),
				activities (
					code,
					name,
					category
				),
				bowsers (
					name,
					registration
				)
			`).order("entry_date", { ascending: false });
    if (startDate) {
      query = query.gte("entry_date", startDate);
    }
    if (endDate) {
      query = query.lte("entry_date", endDate);
    }
    return this.query(() => query);
  }
  async updateFuelEntryFields(entryId, fieldIds) {
    const client = this.ensureInitialized();
    try {
      await client.from("fuel_entry_fields").delete().eq("fuel_entry_id", entryId);
      if (fieldIds.length > 0) {
        const junctionEntries = fieldIds.map((fieldId) => ({
          fuel_entry_id: entryId,
          field_id: fieldId
        }));
        const { error: insertError } = await client.from("fuel_entry_fields").insert(junctionEntries);
        if (insertError) {
          return { data: null, error: insertError.message };
        }
        await client.from("fuel_entries").update({
          field_selection_mode: fieldIds.length > 1 ? "multiple" : "single",
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        }).eq("id", entryId);
      }
      return { data: true, error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : "Failed to update fuel entry fields"
      };
    }
  }
  async deleteFuelEntryFields(entryId) {
    const client = this.ensureInitialized();
    return this.query(
      () => client.from("fuel_entry_fields").delete().eq("fuel_entry_id", entryId)
    );
  }
  // Bowser operations
  async getBowsers() {
    const client = this.ensureInitialized();
    return this.query(
      () => client.from("bowsers").select("*").eq("active", true).order("name")
    );
  }
  // Tank Management operations
  async getTankConfig() {
    const client = this.ensureInitialized();
    return this.query(
      () => client.from("tank_config").select("*").eq("tank_id", "tank_a").single()
    );
  }
  async getTankReadings(limit = 10) {
    const client = this.ensureInitialized();
    return this.query(
      () => client.from("tank_readings").select("*").order("reading_date", { ascending: false }).order("reading_time", { ascending: false }).limit(limit)
    );
  }
  async getTankRefills(limit = 10) {
    const client = this.ensureInitialized();
    return this.query(
      () => client.from("tank_refills").select("*").order("delivery_date", { ascending: false }).limit(limit)
    );
  }
  async addTankReading(reading) {
    const client = this.ensureInitialized();
    try {
      const result = await client.from("tank_readings").insert({
        tank_id: "tank_a",
        ...reading,
        reading_type: "dipstick"
      }).select().single();
      if (result.data) {
        await client.from("tank_config").update({
          last_dipstick_level: reading.reading_value,
          last_dipstick_date: reading.reading_date,
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        }).eq("tank_id", "tank_a");
      }
      return { data: result.data, error: result.error?.message };
    } catch (error) {
      return { data: null, error: error instanceof Error ? error.message : "Failed to add tank reading" };
    }
  }
  async addTankRefill(refill) {
    const client = this.ensureInitialized();
    return this.query(
      () => client.from("tank_refills").insert({
        tank_id: "tank_a",
        ...refill
      }).select().single()
    );
  }
  async getTankStatus() {
    const client = this.ensureInitialized();
    return this.query(
      () => client.from("tank_status").select("*").eq("tank_id", "tank_a").single()
    );
  }
  // Activity operations
  async getActivities() {
    const client = this.ensureInitialized();
    return this.query(
      () => client.from("activities").select("*").eq("active", true).order("category, code")
    );
  }
  // Field operations
  async getFields() {
    const client = this.ensureInitialized();
    return this.query(
      () => client.from("fields").select("*").eq("active", true).order("code")
    );
  }
  // Zone operations
  async getZones() {
    const client = this.ensureInitialized();
    return this.query(
      () => client.from("zones").select("*").eq("active", true).order("display_order")
    );
  }
  async createZone(zone) {
    const client = this.ensureInitialized();
    return this.query(
      () => client.from("zones").insert(zone).select().single()
    );
  }
  async updateZone(id, updates) {
    const client = this.ensureInitialized();
    return this.query(
      () => client.from("zones").update(updates).eq("id", id).select().single()
    );
  }
  async deleteZone(id) {
    const client = this.ensureInitialized();
    return this.query(
      () => client.from("zones").update({ active: false }).eq("id", id)
    );
  }
  // Get fuel entries with location data for summary
  async getFuelEntriesWithLocation(date) {
    const client = this.ensureInitialized();
    return this.query(
      () => client.from("fuel_entries").select(`
					*,
					vehicles:vehicle_id(code, name),
					drivers:driver_id(employee_code, name),
					activities:activity_id(name),
					fields:field_id(code, name),
					zones:zone_id(code, name)
				`).eq("entry_date", date).order("time", { ascending: false })
    );
  }
  // Dashboard statistics
  async getDashboardStats() {
    const client = this.ensureInitialized();
    return this.query(async () => {
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const monthStart = new Date((/* @__PURE__ */ new Date()).getFullYear(), (/* @__PURE__ */ new Date()).getMonth(), 1).toISOString().split("T")[0];
      const prevMonthStart = new Date((/* @__PURE__ */ new Date()).getFullYear(), (/* @__PURE__ */ new Date()).getMonth() - 1, 1).toISOString().split("T")[0];
      const prevMonthEnd = new Date((/* @__PURE__ */ new Date()).getFullYear(), (/* @__PURE__ */ new Date()).getMonth(), 0).toISOString().split("T")[0];
      const past7DaysStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1e3).toISOString().split("T")[0];
      const [dailyFuel, weeklyFuel, monthlyFuel, previousMonthFuel, recentEntries, bowsers, vehicles, tankStatus] = await Promise.all([
        // Today's fuel usage
        client.from("fuel_entries").select("litres_used, litres_dispensed").gte("entry_date", today),
        // Past 7 days fuel usage
        client.from("fuel_entries").select("litres_used, litres_dispensed, odometer_start, odometer_end").gte("entry_date", past7DaysStart),
        // This month's fuel usage
        client.from("fuel_entries").select("litres_used, litres_dispensed, odometer_start, odometer_end, vehicle_id, fuel_consumption_l_per_100km, gauge_working").gte("entry_date", monthStart),
        // Previous month's fuel usage
        client.from("fuel_entries").select("litres_used, litres_dispensed").gte("entry_date", prevMonthStart).lte("entry_date", prevMonthEnd),
        // Recent fuel entries with vehicle info - using LEFT JOINs to include entries with missing relationships
        client.from("fuel_entries").select(`
						*,
						vehicles!left(code, name, type, odometer_unit, average_consumption_l_per_100km),
						drivers!left(employee_code, name),
						activities!left(name, category),
						fields!left(name, code)
					`).order("entry_date", { ascending: false }).order("time", { ascending: false }).limit(10),
        // Bowser levels
        client.from("bowsers").select("name, current_reading, capacity, fuel_type").eq("active", true),
        // Active vehicles count
        client.from("vehicles").select("id, current_odometer").eq("active", true),
        // Tank status for calculated level
        client.from("tank_config").select("current_calculated_level, capacity").eq("tank_id", "tank_a").single()
      ]);
      const dailyUsage = dailyFuel.data?.reduce((sum, entry) => sum + (entry.litres_dispensed || 0), 0) || 0;
      const weeklyUsage = weeklyFuel.data?.reduce((sum, entry) => sum + (entry.litres_dispensed || 0), 0) || 0;
      const monthlyUsage = monthlyFuel.data?.reduce((sum, entry) => sum + (entry.litres_dispensed || 0), 0) || 0;
      const previousMonthUsage = previousMonthFuel.data?.reduce((sum, entry) => sum + (entry.litres_dispensed || 0), 0) || 0;
      const monthlyDistance = monthlyFuel.data?.reduce((sum, entry) => {
        if (entry.gauge_working && entry.odometer_start && entry.odometer_end) {
          const distance = entry.odometer_end - entry.odometer_start;
          return sum + (distance > 0 ? distance : 0);
        }
        return sum;
      }, 0) || 0;
      const consumptionEntries = monthlyFuel.data?.filter(
        (entry) => entry.fuel_consumption_l_per_100km && entry.gauge_working
      ) || [];
      const avgEfficiency = consumptionEntries.length > 0 ? consumptionEntries.reduce((sum, entry) => sum + entry.fuel_consumption_l_per_100km, 0) / consumptionEntries.length : monthlyDistance > 0 ? monthlyUsage / monthlyDistance * 100 : 0;
      const tankCapacity = tankStatus.data?.capacity || 5e3;
      const calculatedTankLevel = tankStatus.data?.current_calculated_level || 0;
      const tankPercentage = tankCapacity > 0 ? calculatedTankLevel / tankCapacity * 100 : 0;
      const activeVehicles = vehicles.data?.length || 0;
      const vehiclesWithOdometer = vehicles.data?.filter((v) => v.current_odometer && v.current_odometer > 0).length || 0;
      const validConsumptionEntries = consumptionEntries.length;
      const totalEntriesThisMonth = monthlyFuel.data?.length || 0;
      const consumptionDataQuality = totalEntriesThisMonth > 0 ? validConsumptionEntries / totalEntriesThisMonth * 100 : 0;
      const consumptionValues = consumptionEntries.map((e) => e.fuel_consumption_l_per_100km).filter((v) => v > 0);
      const bestEfficiency = consumptionValues.length > 0 ? Math.min(...consumptionValues) : null;
      const worstEfficiency = consumptionValues.length > 0 ? Math.max(...consumptionValues) : null;
      return {
        data: {
          // Fuel usage metrics
          dailyFuel: Math.round(dailyUsage * 100) / 100,
          weeklyFuel: Math.round(weeklyUsage * 100) / 100,
          monthlyFuel: Math.round(monthlyUsage * 100) / 100,
          previousMonthFuel: Math.round(previousMonthUsage * 100) / 100,
          // Distance and efficiency
          monthlyDistance: Math.round(monthlyDistance),
          averageEfficiency: Math.round(avgEfficiency * 100) / 100,
          // Enhanced consumption metrics
          validConsumptionEntries,
          consumptionDataQuality: Math.round(consumptionDataQuality),
          bestEfficiencyThisMonth: bestEfficiency ? Math.round(bestEfficiency * 100) / 100 : null,
          worstEfficiencyThisMonth: worstEfficiency ? Math.round(worstEfficiency * 100) / 100 : null,
          // Tank monitoring (calculated level)
          tankLevel: Math.round(calculatedTankLevel * 100) / 100,
          tankCapacity,
          tankPercentage: Math.round(tankPercentage * 100) / 100,
          // Fleet status
          activeVehicles,
          vehiclesWithOdometer,
          totalBowsers: bowsers.data?.length || 0,
          // Bowser reading (Tank A - first bowser)
          bowserReading: bowsers.data?.[0]?.current_reading || 0,
          // Recent activity
          recentEntries: recentEntries.data || [],
          bowserLevels: bowsers.data || [],
          // Calculated insights
          entriesThisWeek: weeklyFuel.data?.length || 0,
          entriesThisMonth: monthlyFuel.data?.length || 0,
          avgDailyUsage: Math.round(monthlyUsage / 30 * 100) / 100
        },
        error: null
      };
    });
  }
  // Get vehicle performance analytics
  async getVehiclePerformance(vehicleId, days = 30) {
    const client = this.ensureInitialized();
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1e3).toISOString().split("T")[0];
    return this.query(async () => {
      let query = client.from("fuel_entries").select(`
					*,
					vehicles!left(code, name, type, fuel_type),
					activities!left(name, category)
				`).gte("entry_date", startDate).order("entry_date", { ascending: true });
      if (vehicleId) {
        query = query.eq("vehicle_id", vehicleId);
      }
      const entries = await query;
      const vehicleStats = {};
      entries.data?.forEach((entry) => {
        const vId = entry.vehicle_id;
        if (!vehicleStats[vId]) {
          vehicleStats[vId] = {
            vehicle: entry.vehicles,
            totalFuel: 0,
            totalDistance: 0,
            entryCount: 0,
            activities: /* @__PURE__ */ new Set(),
            efficiency: 0,
            lastEntry: null
          };
        }
        const stats = vehicleStats[vId];
        stats.totalFuel += entry.litres_used || 0;
        const distance = (entry.odometer_end || 0) - (entry.odometer_start || 0);
        if (distance > 0) {
          stats.totalDistance += distance;
        }
        stats.entryCount++;
        if (entry.activities?.name) {
          stats.activities.add(entry.activities.name);
        }
        stats.lastEntry = entry.entry_date;
      });
      Object.values(vehicleStats).forEach((stats) => {
        if (stats.totalDistance > 0) {
          stats.efficiency = Math.round(stats.totalFuel / stats.totalDistance * 100 * 100) / 100;
        }
        stats.activities = Array.from(stats.activities);
      });
      return {
        data: {
          vehicleStats: Object.values(vehicleStats),
          totalEntries: entries.data?.length || 0,
          dateRange: { start: startDate, days }
        },
        error: null
      };
    });
  }
  // Missing Driver methods
  async deleteDriver(id) {
    const client = this.ensureInitialized();
    return this.query(
      () => client.from("drivers").delete().eq("id", id)
    );
  }
  // Bowser CRUD operations
  async createBowser(bowser) {
    const client = this.ensureInitialized();
    return this.query(
      () => client.from("bowsers").insert(bowser).select().single()
    );
  }
  async updateBowser(id, updates) {
    const client = this.ensureInitialized();
    return this.query(
      () => client.from("bowsers").update({ ...updates, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", id).select().single()
    );
  }
  async deleteBowser(id) {
    const client = this.ensureInitialized();
    return this.query(
      () => client.from("bowsers").delete().eq("id", id)
    );
  }
  // Activity CRUD operations
  async createActivity(activity) {
    const client = this.ensureInitialized();
    return this.query(
      () => client.from("activities").insert(activity).select().single()
    );
  }
  async updateActivity(id, updates) {
    const client = this.ensureInitialized();
    return this.query(
      () => client.from("activities").update({ ...updates, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", id).select().single()
    );
  }
  async deleteActivity(id) {
    const client = this.ensureInitialized();
    return this.query(
      () => client.from("activities").delete().eq("id", id)
    );
  }
  // Field CRUD operations
  async createField(field) {
    const client = this.ensureInitialized();
    return this.query(
      () => client.from("fields").insert(field).select().single()
    );
  }
  async updateField(id, updates) {
    const client = this.ensureInitialized();
    return this.query(
      () => client.from("fields").update({ ...updates, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", id).select().single()
    );
  }
  async deleteField(id) {
    const client = this.ensureInitialized();
    return this.query(
      () => client.from("fields").delete().eq("id", id)
    );
  }
  // Get vehicle consumption statistics
  async getVehicleConsumptionStats() {
    const client = this.ensureInitialized();
    return this.query(
      () => client.from("v_vehicle_consumption_stats").select("*").order("average_consumption_l_per_100km", { ascending: true, nullsLast: true })
    );
  }
  // Get top fuel efficient vehicles
  async getTopEfficientVehicles(limit = 5) {
    const client = this.ensureInitialized();
    return this.query(
      () => client.from("vehicles").select("id, code, name, type, average_consumption_l_per_100km, consumption_entries_count").not("average_consumption_l_per_100km", "is", null).gte("consumption_entries_count", 3).eq("active", true).order("average_consumption_l_per_100km", { ascending: true }).limit(limit)
    );
  }
  // Get fuel records for a specific vehicle
  async getVehicleFuelRecords(vehicleId, startDate, endDate) {
    const client = this.ensureInitialized();
    return this.query(
      () => client.from("fuel_entries").select("id, entry_date, litres_dispensed, litres_used, time, vehicle_id").eq("vehicle_id", vehicleId).gte("entry_date", startDate).lte("entry_date", endDate).order("entry_date", { ascending: false }).order("time", { ascending: false })
    );
  }
  // Reconciliation operations
  async createTankReconciliation(data) {
    const client = this.ensureInitialized();
    return this.query(
      () => client.from("tank_reconciliations").insert({
        reconciliation_date: data.reconciliationDate,
        calculated_level: data.calculatedLevel,
        measured_level: data.measuredLevel,
        accepted: Math.abs((data.calculatedLevel - data.measuredLevel) / 24e3 * 100) <= 5,
        // 24000L tank capacity
        notes: data.notes
      }).select().single()
    );
  }
  // Flexible date range reconciliation methods for new Tools section
  async getDateRangeReconciliationData(startDate, endDate) {
    const client = this.ensureInitialized();
    try {
      const fuelResult = await client.from("fuel_entries").select("litres_dispensed").gte("entry_date", startDate).lte("entry_date", endDate);
      const fuelDispensed = fuelResult.data?.reduce((sum, entry) => sum + (entry.litres_dispensed || 0), 0) || 0;
      let bowserStart = 0;
      let bowserEnd = 0;
      try {
        const bowserStartResult = await client.from("fuel_entries").select("bowser_reading_start, entry_date, time").gte("entry_date", startDate).lte("entry_date", endDate).not("bowser_reading_start", "is", null).order("entry_date", { ascending: true }).order("time", { ascending: true }).limit(1);
        const bowserEndResult = await client.from("fuel_entries").select("bowser_reading_end, entry_date, time").gte("entry_date", startDate).lte("entry_date", endDate).not("bowser_reading_end", "is", null).order("entry_date", { ascending: false }).order("time", { ascending: false }).limit(1);
        bowserStart = parseFloat(bowserStartResult.data?.[0]?.bowser_reading_start) || 0;
        bowserEnd = parseFloat(bowserEndResult.data?.[0]?.bowser_reading_end) || 0;
      } catch (bowserError) {
        console.warn("Could not fetch bowser readings:", bowserError);
        bowserStart = 0;
        bowserEnd = 0;
      }
      return {
        data: {
          fuelDispensed,
          bowserStart,
          bowserEnd
        },
        error: null
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : "Failed to get date range reconciliation data"
      };
    }
  }
  async getTankReconciliationData(date) {
    const client = this.ensureInitialized();
    try {
      let tankCalculated = 0;
      try {
        const tankStatusResult = await client.from("tank_status").select("current_calculated_level").eq("tank_id", "tank_a").single();
        tankCalculated = tankStatusResult.data?.current_calculated_level || 0;
      } catch (tankError) {
        console.warn("Could not fetch tank status:", tankError);
      }
      let tankMeasured = 0;
      try {
        const tankReadingResult = await client.from("tank_readings").select("reading_value").eq("tank_id", "tank_a").lte("reading_date", date).order("reading_date", { ascending: false }).limit(1);
        tankMeasured = tankReadingResult.data?.[0]?.reading_value || 0;
      } catch (readingError) {
        console.warn("Could not fetch tank readings:", readingError);
      }
      return {
        data: {
          tankCalculated,
          tankMeasured
        },
        error: null
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : "Failed to get tank reconciliation data"
      };
    }
  }
  async createFuelReconciliation(data) {
    const client = this.ensureInitialized();
    const bowserDifference = data.bowserEnd - data.bowserStart;
    const fuelVariance = Math.abs(data.fuelDispensed - bowserDifference);
    const reconciliationStatus = fuelVariance <= 1 ? "reconciled" : "discrepancy";
    return this.query(
      () => client.from("fuel_reconciliations").insert({
        start_date: data.startDate,
        end_date: data.endDate,
        fuel_dispensed: data.fuelDispensed,
        fuel_received: bowserDifference,
        discrepancy_count: fuelVariance > 1 ? 1 : 0,
        status: reconciliationStatus,
        reconciled_date: (/* @__PURE__ */ new Date()).toISOString(),
        notes: `Bowser: ${data.bowserStart}L → ${data.bowserEnd}L (${bowserDifference}L added).`
      }).select().single()
    );
  }
  // Database management methods for new Tools section
  async getTables() {
    const client = this.ensureInitialized();
    return this.query(
      () => client.from("information_schema.tables").select("table_name, table_schema").eq("table_schema", "public").order("table_name")
    );
  }
  async getTableData(tableName, limit = 50) {
    const client = this.ensureInitialized();
    return this.query(
      () => client.from(tableName).select("*").limit(limit)
    );
  }
  async executeQuery(query) {
    const client = this.ensureInitialized();
    return this.query(async () => {
      const { data, error } = await client.rpc("execute_sql", { query_text: query });
      return { data, error };
    });
  }
  // Reconciliation history method for new Tools section
  async getReconciliationHistory(limit = 50) {
    const client = this.ensureInitialized();
    try {
      let fuelRecords = [];
      try {
        const fuelResult = await client.from("fuel_reconciliations").select("*").order("reconciled_date", { ascending: false }).limit(Math.floor(limit / 2));
        fuelRecords = (fuelResult.data || []).map((record) => ({
          ...record,
          type: "fuel",
          date: record.reconciled_date || record.created_at
        }));
      } catch (fuelError) {
        console.warn("Could not fetch fuel reconciliations:", fuelError);
      }
      let tankRecords = [];
      try {
        const tankResult = await client.from("tank_reconciliations").select("*").order("reconciliation_date", { ascending: false }).limit(Math.floor(limit / 2));
        tankRecords = (tankResult.data || []).map((record) => ({
          ...record,
          type: "tank",
          date: record.reconciliation_date,
          status: record.accepted ? "reconciled" : "discrepancy"
        }));
      } catch (tankError) {
        console.warn("Could not fetch tank reconciliations:", tankError);
      }
      const allRecords = [...fuelRecords, ...tankRecords].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, limit);
      return { data: allRecords, error: null };
    } catch (error) {
      return {
        data: [],
        error: error instanceof Error ? error.message : "Failed to get reconciliation history"
      };
    }
  }
  // Fuel entry management methods for inline editing
  async getFuelEntriesForPeriod(startDate, endDate) {
    const client = this.ensureInitialized();
    return this.query(
      () => client.from("fuel_entries").select(`
					*,
					vehicles:vehicle_id(id, code, name),
					drivers:driver_id(id, employee_code, name),
					activities:activity_id(id, name),
					fields:field_id(id, code, name),
					zones:zone_id(id, code, name)
				`).gte("entry_date", startDate).lte("entry_date", endDate).order("entry_date", { ascending: false }).order("time", { ascending: false })
    );
  }
  // Tank level management methods for tank adjustment
  async getTankDataForDate(date) {
    const client = this.ensureInitialized();
    try {
      let calculatedLevel = 0;
      try {
        const tankStatusResult = await client.from("tank_status").select("current_calculated_level").eq("tank_id", "tank_a").single();
        calculatedLevel = tankStatusResult.data?.current_calculated_level || 0;
      } catch (tankError) {
        console.warn("Could not fetch tank status:", tankError);
      }
      let measuredLevel = 0;
      try {
        const tankReadingResult = await client.from("tank_readings").select("reading_value").eq("tank_id", "tank_a").lte("reading_date", date).order("reading_date", { ascending: false }).limit(1);
        measuredLevel = tankReadingResult.data?.[0]?.reading_value || 0;
      } catch (readingError) {
        console.warn("Could not fetch tank readings:", readingError);
      }
      return {
        data: {
          calculatedLevel,
          measuredLevel,
          date
        },
        error: null
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : "Failed to get tank data"
      };
    }
  }
  async updateTankCalculatedLevel(date, newLevel, notes) {
    const client = this.ensureInitialized();
    return this.query(
      () => client.from("tank_status").update({
        current_calculated_level: newLevel,
        updated_at: (/* @__PURE__ */ new Date()).toISOString(),
        notes
      }).eq("tank_id", "tank_a")
    );
  }
  async updateTankMeasuredLevel(date, newLevel, notes) {
    const client = this.ensureInitialized();
    return this.query(
      () => client.from("tank_readings").upsert({
        tank_id: "tank_a",
        reading_date: date,
        reading_value: newLevel,
        reading_type: "manual_adjustment",
        notes,
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      }).select()
    );
  }
  async createTankAdjustmentLog(data) {
    const client = this.ensureInitialized();
    return this.query(
      () => client.from("tank_adjustment_logs").insert({
        adjustment_date: data.date,
        adjustments_made: data.adjustments,
        notes: data.notes,
        previous_calculated_level: data.previousCalculated,
        new_calculated_level: data.newCalculated,
        previous_measured_level: data.previousMeasured,
        new_measured_level: data.newMeasured,
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      }).select()
    );
  }
  // Connection test
  async testConnection() {
    try {
      const client = this.ensureInitialized();
      const { error } = await client.from("vehicles").select("count", { count: "exact", head: true });
      return !error;
    } catch (error) {
      console.error("Connection test failed:", error);
      return false;
    }
  }
}
const supabaseService = new SupabaseService();
export {
  supabaseService as default
};
