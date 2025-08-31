// Supabase service for database operations
// Provides a centralized interface for all Supabase interactions

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { 
	Vehicle, 
	Driver, 
	FuelEntry, 
	Bowser, 
	Activity, 
	Field,
	Zone, 
	RefillRecord,
	ApiResponse 
} from '$lib/types';

class SupabaseService {
	private client: SupabaseClient | null = null;
	private isInitialized = false;

	// Initialize the Supabase client
	async init(): Promise<void> {
		if (this.isInitialized) return;

		try {
			// Load Supabase configuration
			const config = await this.loadConfig();
			
			this.client = createClient(config.url, config.key);
			this.isInitialized = true;
			
			console.log('Supabase client initialized successfully');
		} catch (error) {
			console.error('Failed to initialize Supabase client:', error);
			throw new Error('Failed to initialize database connection');
		}
	}

	// Load Supabase configuration from environment variables
	private async loadConfig(): Promise<{ url: string; key: string }> {
		// Get env variables (works in both client and server environments)
		const url = import.meta.env.VITE_SUPABASE_URL;
		const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
		
		if (!url || !key) {
			throw new Error('Missing Supabase configuration. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
		}
		
		return { url, key };
	}

	// Ensure client is initialized
	private ensureInitialized(): SupabaseClient {
		if (!this.client || !this.isInitialized) {
			throw new Error('Supabase client not initialized. Call init() first.');
		}
		return this.client;
	}

	// Get the raw Supabase client for direct queries
	getClient(): SupabaseClient {
		return this.ensureInitialized();
	}

	// Generic query wrapper with error handling
	private async query<T>(operation: () => Promise<any>): Promise<ApiResponse<T>> {
		try {
			const result = await operation();
			
			if (result.error) {
				console.error('Database query error:', result.error);
				return { data: null, error: result.error.message || 'Database operation failed' };
			}
			
			return { data: result.data, error: null, count: result.count };
		} catch (error) {
			console.error('Database operation failed:', error);
			return { 
				data: null, 
				error: error instanceof Error ? error.message : 'Unknown database error' 
			};
		}
	}

	// Vehicle operations
	async getVehicles(): Promise<ApiResponse<Vehicle[]>> {
		const client = this.ensureInitialized();
		return this.query(() => 
			client
				.from('vehicles')
				.select('*')
				.order('code')
		);
	}

	async getVehicleById(id: string): Promise<ApiResponse<Vehicle>> {
		const client = this.ensureInitialized();
		return this.query(() => 
			client
				.from('vehicles')
				.select('*')
				.eq('id', id)
				.single()
		);
	}

	async createVehicle(vehicle: Omit<Vehicle, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Vehicle>> {
		const client = this.ensureInitialized();
		return this.query(() => 
			client
				.from('vehicles')
				.insert(vehicle)
				.select()
				.single()
		);
	}

	async updateVehicle(id: string, updates: Partial<Vehicle>): Promise<ApiResponse<Vehicle>> {
		const client = this.ensureInitialized();
		return this.query(() => 
			client
				.from('vehicles')
				.update({ ...updates, updated_at: new Date().toISOString() })
				.eq('id', id)
				.select()
				.single()
		);
	}

	async updateVehicleOdometer(id: string, newOdometer: number): Promise<ApiResponse<Vehicle>> {
		const client = this.ensureInitialized();
		return this.query(() => 
			client
				.from('vehicles')
				.update({ 
					current_odometer: newOdometer, 
					updated_at: new Date().toISOString() 
				})
				.eq('id', id)
				.select()
				.single()
		);
	}

	async updateBowserReading(id: string, newReading: number, fuelEntryId?: string): Promise<ApiResponse<Bowser>> {
		const client = this.ensureInitialized();
		
		try {
			// First get the current reading for history
			const currentBowser = await client
				.from('bowsers')
				.select('current_reading')
				.eq('id', id)
				.single();
			
			const previousReading = currentBowser.data?.current_reading || null;
			
			// Update bowser reading with last_updated timestamp
			const updateResult = await client
				.from('bowsers')
				.update({ 
					current_reading: newReading, 
					last_updated: new Date().toISOString(),
					updated_at: new Date().toISOString() 
				})
				.eq('id', id)
				.select()
				.single();
			
			// Create history record (if table exists)
			try {
				await client
					.from('bowser_reading_history')
					.insert({
						bowser_id: id,
						fuel_entry_id: fuelEntryId || null,
						previous_reading: previousReading,
						new_reading: newReading,
						created_by: null
					});
			} catch (historyError) {
				// History table might not exist yet, log but don't fail the main operation
				console.warn('Could not create bowser reading history:', historyError);
			}
			
			return { data: updateResult.data, error: updateResult.error?.message };
		} catch (error) {
			return { data: null, error: error instanceof Error ? error.message : 'Failed to update bowser reading' };
		}
	}

	async deleteVehicle(id: string): Promise<ApiResponse<null>> {
		const client = this.ensureInitialized();
		return this.query(() => 
			client
				.from('vehicles')
				.update({ active: false, updated_at: new Date().toISOString() })
				.eq('id', id)
		);
	}

	// Driver operations
	async getDrivers(): Promise<ApiResponse<Driver[]>> {
		const client = this.ensureInitialized();
		return this.query(() => 
			client
				.from('drivers')
				.select(`
					*,
					default_vehicle:vehicles!drivers_default_vehicle_id_fkey (
						id,
						code,
						name,
						type,
						registration
					)
				`)
				.order('name')
		);
	}

	async createDriver(driver: Omit<Driver, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Driver>> {
		const client = this.ensureInitialized();
		return this.query(() => 
			client
				.from('drivers')
				.insert(driver)
				.select()
				.single()
		);
	}

	async updateDriver(id: string, updates: Partial<Driver>): Promise<ApiResponse<Driver>> {
		const client = this.ensureInitialized();
		return this.query(() => 
			client
				.from('drivers')
				.update({ ...updates, updated_at: new Date().toISOString() })
				.eq('id', id)
				.select()
				.single()
		);
	}

	// Fuel entry operations
	async getFuelEntries(startDate?: string, endDate?: string): Promise<ApiResponse<FuelEntry[]>> {
		const client = this.ensureInitialized();
		
		let query = client
			.from('fuel_entries')
			.select(`
				*,
				vehicles!left (code, name, registration),
				drivers!left (employee_code, name),
				activities!left (code, name),
				fields!left (code, name),
				bowsers!left (name)
			`)
			.order('entry_date', { ascending: false });

		if (startDate) {
			query = query.gte('entry_date', startDate);
		}
		if (endDate) {
			query = query.lte('entry_date', endDate);
		}

		return this.query(() => query);
	}

	async createFuelEntry(entry: Omit<FuelEntry, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<FuelEntry>> {
		const client = this.ensureInitialized();
		return this.query(() => 
			client
				.from('fuel_entries')
				.insert(entry)
				.select()
				.single()
		);
	}

	async updateFuelEntry(id: string, updates: Partial<FuelEntry>): Promise<ApiResponse<FuelEntry>> {
		const client = this.ensureInitialized();
		return this.query(() => 
			client
				.from('fuel_entries')
				.update({ ...updates, updated_at: new Date().toISOString() })
				.eq('id', id)
				.select()
				.single()
		);
	}

	// Bowser operations
	async getBowsers(): Promise<ApiResponse<Bowser[]>> {
		const client = this.ensureInitialized();
		return this.query(() => 
			client
				.from('bowsers')
				.select('*')
				.eq('active', true)
				.order('name')
		);
	}


	// Tank Management operations
	async getTankConfig(): Promise<ApiResponse<any>> {
		const client = this.ensureInitialized();
		return this.query(() => 
			client
				.from('tank_config')
				.select('*')
				.eq('tank_id', 'tank_a')
				.single()
		);
	}
	
	async getTankReadings(limit = 10): Promise<ApiResponse<any[]>> {
		const client = this.ensureInitialized();
		return this.query(() => 
			client
				.from('tank_readings')
				.select('*')
				.order('reading_date', { ascending: false })
				.order('reading_time', { ascending: false })
				.limit(limit)
		);
	}
	
	async getTankRefills(limit = 10): Promise<ApiResponse<any[]>> {
		const client = this.ensureInitialized();
		return this.query(() => 
			client
				.from('tank_refills')
				.select('*')
				.order('delivery_date', { ascending: false })
				.limit(limit)
		);
	}
	
	async addTankReading(reading: {
		reading_value: number;
		reading_date: string;
		notes?: string;
	}): Promise<ApiResponse<any>> {
		const client = this.ensureInitialized();
		
		try {
			// Add the reading
			const result = await client
				.from('tank_readings')
				.insert({
					tank_id: 'tank_a',
					...reading,
					reading_type: 'dipstick'
				})
				.select()
				.single();
			
			// Update tank config with latest dipstick reading
			if (result.data) {
				await client
					.from('tank_config')
					.update({
						last_dipstick_level: reading.reading_value,
						last_dipstick_date: reading.reading_date,
						updated_at: new Date().toISOString()
					})
					.eq('tank_id', 'tank_a');
			}
			
			return { data: result.data, error: result.error?.message };
		} catch (error) {
			return { data: null, error: error instanceof Error ? error.message : 'Failed to add tank reading' };
		}
	}
	
	async addTankRefill(refill: {
		litres_added: number;
		supplier?: string;
		delivery_date: string;
		invoice_number?: string;
		total_cost?: number;
		notes?: string;
	}): Promise<ApiResponse<any>> {
		const client = this.ensureInitialized();
		
		return this.query(() => 
			client
				.from('tank_refills')
				.insert({
					tank_id: 'tank_a',
					...refill
				})
				.select()
				.single()
		);
	}
	
	async getTankStatus(): Promise<ApiResponse<any>> {
		const client = this.ensureInitialized();
		return this.query(() => 
			client
				.from('tank_status')
				.select('*')
				.eq('tank_id', 'tank_a')
				.single()
		);
	}
	
	// Activity operations
	async getActivities(): Promise<ApiResponse<Activity[]>> {
		const client = this.ensureInitialized();
		return this.query(() => 
			client
				.from('activities')
				.select('*')
				.eq('active', true)
				.order('category, code')
		);
	}

	// Field operations
	async getFields(): Promise<ApiResponse<Field[]>> {
		const client = this.ensureInitialized();
		return this.query(() => 
			client
				.from('fields')
				.select('*')
				.eq('active', true)
				.order('code')
		);
	}

	// Zone operations
	async getZones(): Promise<ApiResponse<Zone[]>> {
		const client = this.ensureInitialized();
		return this.query(() => 
			client
				.from('zones')
				.select('*')
				.eq('active', true)
				.order('display_order')
		);
	}

	async createZone(zone: Partial<Zone>): Promise<ApiResponse<Zone>> {
		const client = this.ensureInitialized();
		return this.query(() => 
			client
				.from('zones')
				.insert(zone)
				.select()
				.single()
		);
	}

	async updateZone(id: string, updates: Partial<Zone>): Promise<ApiResponse<Zone>> {
		const client = this.ensureInitialized();
		return this.query(() => 
			client
				.from('zones')
				.update(updates)
				.eq('id', id)
				.select()
				.single()
		);
	}

	async deleteZone(id: string): Promise<ApiResponse<void>> {
		const client = this.ensureInitialized();
		return this.query(() => 
			client
				.from('zones')
				.update({ active: false })
				.eq('id', id)
		);
	}

	// Get fuel entries with location data for summary
	async getFuelEntriesWithLocation(date: string): Promise<ApiResponse<any[]>> {
		const client = this.ensureInitialized();
		return this.query(() => 
			client
				.from('fuel_entries')
				.select(`
					*,
					vehicles:vehicle_id(code, name),
					drivers:driver_id(employee_code, name),
					activities:activity_id(name),
					fields:field_id(code, name),
					zones:zone_id(code, name)
				`)
				.eq('entry_date', date)
				.order('time', { ascending: false })
		);
	}

	// Dashboard statistics
	async getDashboardStats(): Promise<ApiResponse<any>> {
		const client = this.ensureInitialized();
		
		return this.query(async () => {
			const today = new Date().toISOString().split('T')[0];
			const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
			
			// Calculate week start (Monday)
			const now = new Date();
			const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
			const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // If Sunday, go back 6 days to Monday
			const weekStart = new Date(now.getTime() - daysToSubtract * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
			
			// Get fuel entries for different periods
			const [dailyFuel, weeklyFuel, monthlyFuel, recentEntries, bowsers, vehicles, tankStatus] = await Promise.all([
				// Today's fuel usage
				client
					.from('fuel_entries')
					.select('litres_used, litres_dispensed')
					.gte('entry_date', today),
				
				// This week's fuel usage
				client
					.from('fuel_entries')
					.select('litres_used, litres_dispensed, odometer_start, odometer_end')
					.gte('entry_date', weekStart),
				
				// This month's fuel usage
				client
					.from('fuel_entries')
					.select('litres_used, litres_dispensed, odometer_start, odometer_end, vehicle_id, fuel_consumption_l_per_100km, gauge_working')
					.gte('entry_date', monthStart),
				
				// Recent fuel entries with vehicle info - using LEFT JOINs to include entries with missing relationships
				client
					.from('fuel_entries')
					.select(`
						*,
						vehicles!left(code, name, type, odometer_unit, average_consumption_l_per_100km),
						drivers!left(employee_code, name),
						activities!left(name, category),
						fields!left(name, code)
					`)
					.order('entry_date', { ascending: false })
					.order('time', { ascending: false })
					.limit(10),
				
				// Bowser levels
				client
					.from('bowsers')
					.select('name, current_reading, capacity, fuel_type')
					.eq('active', true),
				
				// Active vehicles count
				client
					.from('vehicles')
					.select('id, current_odometer')
					.eq('active', true),
				
				// Tank status for calculated level
				client
					.from('tank_config')
					.select('current_calculated_level, capacity')
					.eq('tank_id', 'tank_a')
					.single()
			]);

			// Calculate totals
			const dailyUsage = dailyFuel.data?.reduce((sum, entry) => sum + (entry.litres_dispensed || 0), 0) || 0;
			const weeklyUsage = weeklyFuel.data?.reduce((sum, entry) => sum + (entry.litres_dispensed || 0), 0) || 0;
			const monthlyUsage = monthlyFuel.data?.reduce((sum, entry) => sum + (entry.litres_dispensed || 0), 0) || 0;
			
			// Calculate distance traveled this month (only valid entries)
			const monthlyDistance = monthlyFuel.data?.reduce((sum, entry) => {
				if (entry.gauge_working && entry.odometer_start && entry.odometer_end) {
					const distance = entry.odometer_end - entry.odometer_start;
					return sum + (distance > 0 ? distance : 0);
				}
				return sum;
			}, 0) || 0;
			
			// Calculate fleet average fuel consumption (from actual consumption data)
			const consumptionEntries = monthlyFuel.data?.filter(entry => 
				entry.fuel_consumption_l_per_100km && entry.gauge_working
			) || [];
			const avgEfficiency = consumptionEntries.length > 0 
				? consumptionEntries.reduce((sum, entry) => sum + entry.fuel_consumption_l_per_100km, 0) / consumptionEntries.length
				: (monthlyDistance > 0 ? (monthlyUsage / monthlyDistance * 100) : 0);
			
			// Tank capacity and calculated level from tank_config
			const tankCapacity = tankStatus.data?.capacity || 5000;
			const calculatedTankLevel = tankStatus.data?.current_calculated_level || 0;
			
			// Calculate tank percentage
			const tankPercentage = tankCapacity > 0 ? (calculatedTankLevel / tankCapacity * 100) : 0;
			
			// Active vehicles with odometer data
			const activeVehicles = vehicles.data?.length || 0;
			const vehiclesWithOdometer = vehicles.data?.filter(v => v.current_odometer && v.current_odometer > 0).length || 0;

			// Calculate consumption statistics
			const validConsumptionEntries = consumptionEntries.length;
			const totalEntriesThisMonth = monthlyFuel.data?.length || 0;
			const consumptionDataQuality = totalEntriesThisMonth > 0 ? (validConsumptionEntries / totalEntriesThisMonth) * 100 : 0;
			
			// Find best and worst efficiency this month
			const consumptionValues = consumptionEntries.map(e => e.fuel_consumption_l_per_100km).filter(v => v > 0);
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
					
					// Tank monitoring (calculated level)
					tankLevel: Math.round(calculatedTankLevel * 100) / 100,
					tankCapacity: tankCapacity,
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
					avgDailyUsage: Math.round((monthlyUsage / 30) * 100) / 100
				},
				error: null
			};
		});
	}

	// Get vehicle performance analytics
	async getVehiclePerformance(vehicleId?: string, days: number = 30): Promise<ApiResponse<any>> {
		const client = this.ensureInitialized();
		const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
		
		return this.query(async () => {
			let query = client
				.from('fuel_entries')
				.select(`
					*,
					vehicles!left(code, name, type, fuel_type),
					activities!left(name, category)
				`)
				.gte('entry_date', startDate)
				.order('entry_date', { ascending: true });
			
			if (vehicleId) {
				query = query.eq('vehicle_id', vehicleId);
			}
			
			const entries = await query;
			
			// Group by vehicle for analytics
			const vehicleStats = {};
			entries.data?.forEach(entry => {
				const vId = entry.vehicle_id;
				if (!vehicleStats[vId]) {
					vehicleStats[vId] = {
						vehicle: entry.vehicles,
						totalFuel: 0,
						totalDistance: 0,
						entryCount: 0,
						activities: new Set(),
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
			
			// Calculate efficiency for each vehicle
			Object.values(vehicleStats).forEach(stats => {
				if (stats.totalDistance > 0) {
					stats.efficiency = Math.round((stats.totalFuel / stats.totalDistance * 100) * 100) / 100;
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
	async deleteDriver(id: string): Promise<ApiResponse<null>> {
		const client = this.ensureInitialized();
		return this.query(() => 
			client
				.from('drivers')
				.delete()
				.eq('id', id)
		);
	}

	// Bowser CRUD operations
	async createBowser(bowser: Omit<Bowser, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Bowser>> {
		const client = this.ensureInitialized();
		return this.query(() => 
			client
				.from('bowsers')
				.insert(bowser)
				.select()
				.single()
		);
	}

	async updateBowser(id: string, updates: Partial<Bowser>): Promise<ApiResponse<Bowser>> {
		const client = this.ensureInitialized();
		return this.query(() => 
			client
				.from('bowsers')
				.update({ ...updates, updated_at: new Date().toISOString() })
				.eq('id', id)
				.select()
				.single()
		);
	}

	async deleteBowser(id: string): Promise<ApiResponse<null>> {
		const client = this.ensureInitialized();
		return this.query(() => 
			client
				.from('bowsers')
				.delete()
				.eq('id', id)
		);
	}

	// Activity CRUD operations
	async createActivity(activity: Omit<Activity, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Activity>> {
		const client = this.ensureInitialized();
		return this.query(() => 
			client
				.from('activities')
				.insert(activity)
				.select()
				.single()
		);
	}

	async updateActivity(id: string, updates: Partial<Activity>): Promise<ApiResponse<Activity>> {
		const client = this.ensureInitialized();
		return this.query(() => 
			client
				.from('activities')
				.update({ ...updates, updated_at: new Date().toISOString() })
				.eq('id', id)
				.select()
				.single()
		);
	}

	async deleteActivity(id: string): Promise<ApiResponse<null>> {
		const client = this.ensureInitialized();
		return this.query(() => 
			client
				.from('activities')
				.delete()
				.eq('id', id)
		);
	}

	// Field CRUD operations
	async createField(field: Omit<Field, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Field>> {
		const client = this.ensureInitialized();
		return this.query(() => 
			client
				.from('fields')
				.insert(field)
				.select()
				.single()
		);
	}

	async updateField(id: string, updates: Partial<Field>): Promise<ApiResponse<Field>> {
		const client = this.ensureInitialized();
		return this.query(() => 
			client
				.from('fields')
				.update({ ...updates, updated_at: new Date().toISOString() })
				.eq('id', id)
				.select()
				.single()
		);
	}

	async deleteField(id: string): Promise<ApiResponse<null>> {
		const client = this.ensureInitialized();
		return this.query(() => 
			client
				.from('fields')
				.delete()
				.eq('id', id)
		);
	}

	// Get vehicle consumption statistics
	async getVehicleConsumptionStats(): Promise<ApiResponse<any[]>> {
		const client = this.ensureInitialized();
		return this.query(() => 
			client
				.from('v_vehicle_consumption_stats')
				.select('*')
				.order('average_consumption_l_per_100km', { ascending: true, nullsLast: true })
		);
	}

	// Get top fuel efficient vehicles
	async getTopEfficientVehicles(limit: number = 5): Promise<ApiResponse<any[]>> {
		const client = this.ensureInitialized();
		return this.query(() => 
			client
				.from('vehicles')
				.select('id, code, name, type, average_consumption_l_per_100km, consumption_entries_count')
				.not('average_consumption_l_per_100km', 'is', null)
				.gte('consumption_entries_count', 3) // At least 3 entries for reliable average
				.eq('active', true)
				.order('average_consumption_l_per_100km', { ascending: true })
				.limit(limit)
		);
	}

	// Connection test
	async testConnection(): Promise<boolean> {
		try {
			const client = this.ensureInitialized();
			const { error } = await client.from('vehicles').select('count', { count: 'exact', head: true });
			return !error;
		} catch (error) {
			console.error('Connection test failed:', error);
			return false;
		}
	}
}

// Export singleton instance
const supabaseService = new SupabaseService();
export default supabaseService;