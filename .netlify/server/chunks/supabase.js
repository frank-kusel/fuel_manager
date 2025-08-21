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
    if (typeof window !== "undefined") {
      const url = "https://szskplrwmeuahwvicyos.supabase.co";
      const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6c2twbHJ3bWV1YWh3dmljeW9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3MDkzMTEsImV4cCI6MjA2OTI4NTMxMX0.phbhjcVVF-ENJn167Pd0XxlF_VicDcJW7id5K8Vy7Mc";
      return { url, key };
    }
    throw new Error("Server-side Supabase configuration not implemented");
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
				vehicles (code, name, registration),
				drivers (employee_code, name),
				activities (code, name),
				fields (code, name),
				bowsers (name)
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
  // Bowser operations
  async getBowsers() {
    const client = this.ensureInitialized();
    return this.query(
      () => client.from("bowsers").select("*").eq("active", true).order("name")
    );
  }
  async updateBowserReading(id, reading) {
    const client = this.ensureInitialized();
    return this.query(
      () => client.from("bowsers").update({
        current_reading: reading,
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      }).eq("id", id).select().single()
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
      const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1e3).toISOString().split("T")[0];
      const [dailyFuel, weeklyFuel, monthlyFuel, recentEntries, bowsers, vehicles] = await Promise.all([
        // Today's fuel usage
        client.from("fuel_entries").select("litres_used, litres_dispensed").gte("entry_date", today),
        // This week's fuel usage
        client.from("fuel_entries").select("litres_used, litres_dispensed, odometer_start, odometer_end").gte("entry_date", weekStart),
        // This month's fuel usage
        client.from("fuel_entries").select("litres_used, litres_dispensed, odometer_start, odometer_end, vehicle_id, fuel_consumption_l_per_100km, gauge_working").gte("entry_date", monthStart),
        // Recent fuel entries with vehicle info
        client.from("fuel_entries").select(`
						*,
						vehicles(code, name, type),
						drivers(employee_code, name),
						activities(name, category)
					`).order("entry_date", { ascending: false }).order("time", { ascending: false }).limit(10),
        // Bowser levels
        client.from("bowsers").select("name, current_reading, capacity, fuel_type").eq("active", true),
        // Active vehicles count
        client.from("vehicles").select("id, current_odometer").eq("active", true)
      ]);
      const dailyUsage = dailyFuel.data?.reduce((sum, entry) => sum + (entry.litres_used || 0), 0) || 0;
      const weeklyUsage = weeklyFuel.data?.reduce((sum, entry) => sum + (entry.litres_used || 0), 0) || 0;
      const monthlyUsage = monthlyFuel.data?.reduce((sum, entry) => sum + (entry.litres_used || 0), 0) || 0;
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
      const totalTankCapacity = bowsers.data?.reduce((sum, bowser) => sum + (bowser.capacity || 0), 0) || 0;
      const totalCurrentLevel = bowsers.data?.reduce((sum, bowser) => sum + (bowser.current_reading || 0), 0) || 0;
      const tankPercentage = totalTankCapacity > 0 ? totalCurrentLevel / totalTankCapacity * 100 : 0;
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
          // Distance and efficiency
          monthlyDistance: Math.round(monthlyDistance),
          averageEfficiency: Math.round(avgEfficiency * 100) / 100,
          // Enhanced consumption metrics
          validConsumptionEntries,
          consumptionDataQuality: Math.round(consumptionDataQuality),
          bestEfficiencyThisMonth: bestEfficiency ? Math.round(bestEfficiency * 100) / 100 : null,
          worstEfficiencyThisMonth: worstEfficiency ? Math.round(worstEfficiency * 100) / 100 : null,
          // Tank monitoring
          tankLevel: Math.round(totalCurrentLevel * 100) / 100,
          tankCapacity: totalTankCapacity,
          tankPercentage: Math.round(tankPercentage * 100) / 100,
          // Fleet status
          activeVehicles,
          vehiclesWithOdometer,
          totalBowsers: bowsers.data?.length || 0,
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
					vehicles(code, name, type, fuel_type),
					activities(name, category)
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
