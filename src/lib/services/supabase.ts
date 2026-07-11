// Supabase service for database operations
// Provides a centralized interface for all Supabase interactions

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { 
	Vehicle, 
	Driver, 
	FuelEntry, 
	FuelEntryField,
	FuelEntryWithLocation,
	FieldSelectionState,
	Bowser, 
	Activity, 
	Field,
	Zone, 
	RefillRecord,
	MoveFuelEntryDirection,
	MoveFuelEntryResult,
	SoftDeleteFuelEntryResult,
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

	/**
	 * Latest odometer_end per vehicle, derived from fuel_entries.
	 * The live DB has no vehicles.current_odometer column (schema drift), so
	 * each vehicle's most recent entry is the source of truth for the
	 * "previous reading" shown in the fuel-entry workflow.
	 */
	private async getLatestOdometerByVehicle(): Promise<Map<string, number>> {
		const client = this.ensureInitialized();
		const map = new Map<string, number>();
		try {
			// current_vehicle_odometers is a DISTINCT ON view over active
			// fuel_entries — a few dozen tiny rows instead of scanning the
			// last 1000 entries (~350ms of payload at London latency).
			const { data } = await client
				.from('current_vehicle_odometers')
				.select('vehicle_id, current_odometer');
			for (const row of data || []) {
				if (row.vehicle_id && row.current_odometer != null) {
					map.set(row.vehicle_id, row.current_odometer);
				}
			}
		} catch {
			// Enrichment is best-effort; vehicles still load without it.
		}
		return map;
	}

	/** Latest bowser_reading_end per bowser, via the current_bowser_readings view. */
	private async getLatestReadingByBowser(): Promise<Map<string, number>> {
		const client = this.ensureInitialized();
		const map = new Map<string, number>();
		try {
			const { data } = await client
				.from('current_bowser_readings')
				.select('bowser_id, current_reading');
			for (const row of data || []) {
				if (row.bowser_id && row.current_reading != null) {
					map.set(row.bowser_id, row.current_reading);
				}
			}
		} catch {
			// Enrichment is best-effort; bowsers still load without it.
		}
		return map;
	}

	// Vehicle operations
	async getVehicles(): Promise<ApiResponse<Vehicle[]>> {
		const client = this.ensureInitialized();
		// Fetch the table and the derived-odometer view in parallel — the
		// enrichment costs no extra wall-clock time this way.
		const [result, odoMap] = await Promise.all([
			this.query<Vehicle[]>(() =>
				client
					.from('vehicles')
					.select('*')
					.order('code')
			),
			this.getLatestOdometerByVehicle()
		]);
		if (result.data) {
			result.data = result.data.map((v: Vehicle) => ({
				...v,
				current_odometer: (v as any).current_odometer ?? odoMap.get(v.id) ?? null
			}));
		}
		return result;
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

	// Get current odometer reading for a vehicle from latest fuel entry
	async getCurrentOdometer(vehicleId: string): Promise<ApiResponse<number | null>> {
		const client = this.ensureInitialized();
		return this.query(async () => {
			const result = await client
				.from('current_vehicle_odometers')
				.select('current_odometer')
				.eq('vehicle_id', vehicleId)
				.single();

			return { data: result.data?.current_odometer ?? null, error: result.error };
		});
	}

	// Get current bowser reading from latest fuel entry
	async getCurrentBowserReading(bowserId: string): Promise<ApiResponse<number | null>> {
		const client = this.ensureInitialized();
		return this.query(async () => {
			const result = await client
				.from('current_bowser_readings')
				.select('current_reading')
				.eq('bowser_id', bowserId)
				.single();

			return { data: result.data?.current_reading ?? null, error: result.error };
		});
	}

	// Cascade bowser reading changes to subsequent entries
	async cascadeBowserReadings(
		fuelEntryId: string,
		newBowserReadingEnd: number
	): Promise<ApiResponse<{ updated_count: number; entries_updated: string[] }>> {
		const client = this.ensureInitialized();
		return this.query(async () => {
			const result = await client.rpc('cascade_bowser_readings', {
				p_fuel_entry_id: fuelEntryId,
				p_new_bowser_reading_end: newBowserReadingEnd
			});

			if (result.error) {
				return { data: null, error: result.error };
			}

			// Extract the first row result (function returns TABLE)
			const data = result.data?.[0] || { updated_count: 0, entries_updated: [] };
			return { data, error: null };
		});
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
				vehicles!left (code, name, registration, odometer_unit),
				drivers!left (employee_code, name),
				activities!left (code, name),
				fields!left (code, name),
				zones!left (code, name),
				bowsers!left (name)
			`)
			.is('deleted_at', null)
			.order('entry_date', { ascending: false })
			.order('time', { ascending: false });

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
				.is('deleted_at', null)
				.select()
				.single()
		);
	}

	async softDeleteFuelEntry(id: string): Promise<ApiResponse<SoftDeleteFuelEntryResult>> {
		const client = this.ensureInitialized();
		return this.query(async () => {
			const result = await client.rpc('void_fuel_entry', {
				p_entry_id: id
			});

			return {
				data: result.data?.[0] ?? null,
				error: result.error
			};
		});
	}

	/**
	 * Move an entry to an arbitrary 1-based CHRONOLOGICAL position within its
	 * day (drag-and-drop reorder). The RPC positionally reassigns the day's
	 * existing time values and rebuilds all affected bowser meter chains.
	 */
	async reorderFuelEntry(
		id: string,
		position: number
	): Promise<ApiResponse<{
		moved: boolean;
		reason?: string;
		new_time?: string;
		times_adjusted?: number;
		bowsers_recalculated?: number;
	}>> {
		const client = this.ensureInitialized();
		return this.query(async () => {
			const result = await client.rpc('reorder_fuel_entry', {
				p_entry_id: id,
				p_position: position
			});

			return {
				data: result.data ?? null,
				error: result.error
			};
		});
	}

	// Multi-field fuel entry operations
	async createFuelEntryWithFields(
		entry: Omit<FuelEntry, 'id' | 'created_at' | 'updated_at'>, 
		fieldIds: string[] = []
	): Promise<ApiResponse<FuelEntry>> {
		const client = this.ensureInitialized();
		
		try {
			// Start transaction
			const { data: fuelEntry, error: entryError } = await client
				.from('fuel_entries')
				.insert({
					...entry,
					field_selection_mode: fieldIds.length > 1 ? 'multiple' : 'single'
				})
				.select()
				.single();

			if (entryError) {
				return { data: null, error: entryError.message };
			}

			// If multiple fields, create junction table entries
			if (fieldIds.length > 0 && entry.field_selection_mode === 'multiple') {
				const junctionEntries = fieldIds.map(fieldId => ({
					fuel_entry_id: fuelEntry.id,
					field_id: fieldId
				}));

				const { error: junctionError } = await client
					.from('fuel_entry_fields')
					.insert(junctionEntries);

				if (junctionError) {
					// Rollback by deleting the fuel entry
					await client.from('fuel_entries').delete().eq('id', fuelEntry.id);
					return { data: null, error: junctionError.message };
				}
			}

			return { data: fuelEntry, error: null };
		} catch (error) {
			return { 
				data: null, 
				error: error instanceof Error ? error.message : 'Failed to create fuel entry with fields' 
			};
		}
	}

	async updateFuelEntryFields(entryId: string, fieldIds: string[]): Promise<ApiResponse<boolean>> {
		const client = this.ensureInitialized();
		
		try {
			// Delete existing field associations
			await client
				.from('fuel_entry_fields')
				.delete()
				.eq('fuel_entry_id', entryId);

			// Insert new field associations if provided
			if (fieldIds.length > 0) {
				const junctionEntries = fieldIds.map(fieldId => ({
					fuel_entry_id: entryId,
					field_id: fieldId
				}));

				const { error: insertError } = await client
					.from('fuel_entry_fields')
					.insert(junctionEntries);

				if (insertError) {
					return { data: null, error: insertError.message };
				}

				// Update the field selection mode on the fuel entry
				await client
					.from('fuel_entries')
					.update({ 
						field_selection_mode: fieldIds.length > 1 ? 'multiple' : 'single',
						updated_at: new Date().toISOString()
					})
					.eq('id', entryId);
			}

			return { data: true, error: null };
		} catch (error) {
			return { 
				data: null, 
				error: error instanceof Error ? error.message : 'Failed to update fuel entry fields' 
			};
		}
	}

	// Bowser operations
	async getBowsers(): Promise<ApiResponse<Bowser[]>> {
		const client = this.ensureInitialized();
		const [result, readingMap] = await Promise.all([
			this.query<Bowser[]>(() =>
				client
					.from('bowsers')
					.select('*')
					.eq('active', true)
					.order('name')
			),
			this.getLatestReadingByBowser()
		]);
		if (result.data) {
			result.data = result.data.map((b: Bowser) => ({
				...b,
				current_reading: (b as any).current_reading ?? readingMap.get(b.id) ?? null
			}));
		}
		return result;
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

	// Get detailed fuel records for a specific vehicle (for reports)
	async getDetailedVehicleFuelRecords(vehicleId: string): Promise<ApiResponse<any[]>> {
		const client = this.ensureInitialized();
		return this.query(() =>
			client
				.from('fuel_entries')
				.select(`
					id,
					entry_date,
					time,
					litres_dispensed,
					odometer_start,
					odometer_end,
					gauge_working,
					bowser_reading_start,
					bowser_reading_end,
					activities!left (code, name),
					fields!left (code, name),
					vehicles!left (odometer_unit)
				`)
				.eq('vehicle_id', vehicleId)
				.is('deleted_at', null)
				.order('entry_date', { ascending: false })
				.order('time', { ascending: false })
		);
	}

	// Reconciliation operations

	// variance and variance_percentage are GENERATED columns in the live table
	// (calculated − measured, % relative to the measured dip) — never insert them.
	// `accepted` can be passed in when the sign-off judgement is based on a
	// different figure than calculated−measured (the leak check at dip date).
	private tankReconciliationFields(data: {
		reconciliationDate: string;
		calculatedLevel: number;
		measuredLevel: number;
		accepted?: boolean;
		notes?: string;
	}) {
		const variance = data.calculatedLevel - data.measuredLevel;
		const variancePct = data.measuredLevel !== 0 ? (variance / data.measuredLevel) * 100 : 0;
		return {
			tank_id: 'tank_a',
			reconciliation_date: data.reconciliationDate,
			calculated_level: data.calculatedLevel,
			measured_level: data.measuredLevel,
			accepted: data.accepted ?? Math.abs(variancePct) <= 5,
			notes: data.notes
		};
	}

	async createTankReconciliation(data: {
		reconciliationDate: string;
		calculatedLevel: number;
		measuredLevel: number;
		accepted?: boolean;
		notes?: string;
	}): Promise<ApiResponse<any>> {
		const client = this.ensureInitialized();
		return this.query(() =>
			client
				.from('tank_reconciliations')
				.insert(this.tankReconciliationFields(data))
				.select()
				.single()
		);
	}

	async updateTankReconciliation(
		id: string,
		data: {
			reconciliationDate: string;
			calculatedLevel: number;
			measuredLevel: number;
			accepted?: boolean;
			notes?: string;
		}
	): Promise<ApiResponse<any>> {
		const client = this.ensureInitialized();
		return this.query(() =>
			client
				.from('tank_reconciliations')
				.update(this.tankReconciliationFields(data))
				.eq('id', id)
				.select()
				.single()
		);
	}

	// Flexible date range reconciliation methods for new Tools section
	async getDateRangeReconciliationData(startDate: string, endDate: string): Promise<ApiResponse<{
		fuelDispensed: number;
		bowserStart: number;
		bowserEnd: number;
	}>> {
		const client = this.ensureInitialized();
		
		try {
			// Get total fuel dispensed for the date range
			const fuelResult = await client
				.from('fuel_entries')
				.select('litres_dispensed')
				.is('deleted_at', null)
				.gte('entry_date', startDate)
				.lte('entry_date', endDate);
				
			const fuelDispensed = fuelResult.data?.reduce((sum, entry) => sum + (entry.litres_dispensed || 0), 0) || 0;
			
			// Get bowser readings for the date range
			let bowserStart = 0;
			let bowserEnd = 0;
			
			try {
				// Opening reading: Get the last bowser_reading_end from BEFORE the start date
				// This gives us the bowser level at the end of the previous period
				const bowserStartResult = await client
					.from('fuel_entries')
					.select('bowser_reading_end, entry_date, time')
					.is('deleted_at', null)
					.lt('entry_date', startDate)
					.not('bowser_reading_end', 'is', null)
					.order('entry_date', { ascending: false })
					.order('time', { ascending: false })
					.limit(1);

				// Closing reading: Get the last bowser_reading_end from the range
				const bowserEndResult = await client
					.from('fuel_entries')
					.select('bowser_reading_end, entry_date, time')
					.is('deleted_at', null)
					.gte('entry_date', startDate)
					.lte('entry_date', endDate)
					.not('bowser_reading_end', 'is', null)
					.order('entry_date', { ascending: false })
					.order('time', { ascending: false })
					.limit(1);

				bowserStart = parseFloat(bowserStartResult.data?.[0]?.bowser_reading_end) || 0;
				bowserEnd = parseFloat(bowserEndResult.data?.[0]?.bowser_reading_end) || 0;
				
			} catch (bowserError) {
				console.warn('Could not fetch bowser readings:', bowserError);
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
				error: error instanceof Error ? error.message : 'Failed to get date range reconciliation data'
			};
		}
	}

	/**
	 * Everything the Month-end close screen needs for one month, as a RUNNING
	 * TALLY: opening = previous month's carried-forward close balance, then
	 * the month's movements, with the month's last dip as the leak check —
	 * NOT the reference (a dip taken near month end would trivially agree
	 * with a dip-anchored book). Movements are split at the dip date so the
	 * leak check compares like with like, and the month-end balance carries
	 * the post-dip movements forward. Deliberately does NOT read tank_status
	 * (its snapshot row is broken) or fuel_reconciliations (superseded).
	 */
	async getMonthCloseData(monthStart: string, monthEnd: string): Promise<ApiResponse<{
		closingDip: { reading_value: number; reading_date: string } | null;
		opening: { value: number; source: 'close' | 'dip'; date: string } | null;
		deliveriesToDip: number;
		dispensedToDip: number;
		deliveriesAfterDip: number;
		dispensedAfterDip: number;
		bowserStart: number;
		bowserEnd: number;
		monthDispensed: number;
		existingClose: any | null;
	}>> {
		const client = this.ensureInitialized();

		try {
			const [y, m] = monthStart.split('-').map(Number);
			const prevEndDate = new Date(y, m - 1, 0); // last day of previous month
			const prevEnd = `${prevEndDate.getFullYear()}-${String(prevEndDate.getMonth() + 1).padStart(2, '0')}-${String(prevEndDate.getDate()).padStart(2, '0')}`;

			const [closingRes, existingRes, prevCloseRes, refillsRes, dispensedRes, meterRes] =
				await Promise.all([
					client
						.from('tank_readings')
						.select('reading_value, reading_date')
						.eq('reading_type', 'dipstick')
						.gte('reading_date', monthStart)
						.lte('reading_date', monthEnd)
						.order('reading_date', { ascending: false })
						.limit(1),
					client
						.from('tank_reconciliations')
						.select('*')
						.eq('reconciliation_date', monthEnd)
						.order('created_at', { ascending: false })
						.limit(1),
					client
						.from('tank_reconciliations')
						.select('calculated_level, reconciliation_date')
						.eq('reconciliation_date', prevEnd)
						.order('created_at', { ascending: false })
						.limit(1),
					client
						.from('tank_refills')
						.select('litres_added, delivery_date')
						.gte('delivery_date', monthStart)
						.lte('delivery_date', monthEnd),
					client
						.from('fuel_entries')
						.select('litres_dispensed, entry_date')
						.is('deleted_at', null)
						.gte('entry_date', monthStart)
						.lte('entry_date', monthEnd),
					this.getDateRangeReconciliationData(monthStart, monthEnd)
				]);
			const firstError =
				closingRes.error || existingRes.error || prevCloseRes.error || refillsRes.error || dispensedRes.error;
			if (firstError) throw new Error(firstError.message);

			const closingDip = closingRes.data?.[0] || null;

			// Opening balance: carried forward from the previous close; before
			// the chain existed, fall back to the last dip before month start.
			let opening: { value: number; source: 'close' | 'dip'; date: string } | null = null;
			const prevClose = prevCloseRes.data?.[0] || null;
			if (prevClose) {
				opening = { value: prevClose.calculated_level || 0, source: 'close', date: prevEnd };
			} else {
				const fallbackRes = await client
					.from('tank_readings')
					.select('reading_value, reading_date')
					.eq('reading_type', 'dipstick')
					.lt('reading_date', monthStart)
					.order('reading_date', { ascending: false })
					.limit(1);
				if (fallbackRes.error) throw new Error(fallbackRes.error.message);
				const dip = fallbackRes.data?.[0];
				if (dip) opening = { value: dip.reading_value || 0, source: 'dip', date: dip.reading_date };
			}

			// Split the month's movements at the dip date (dip day inclusive)
			const splitDate = closingDip?.reading_date ?? monthEnd;
			let deliveriesToDip = 0;
			let dispensedToDip = 0;
			let deliveriesAfterDip = 0;
			let dispensedAfterDip = 0;
			for (const r of refillsRes.data || []) {
				if (r.delivery_date <= splitDate) deliveriesToDip += r.litres_added || 0;
				else deliveriesAfterDip += r.litres_added || 0;
			}
			for (const e of dispensedRes.data || []) {
				if (e.entry_date <= splitDate) dispensedToDip += e.litres_dispensed || 0;
				else dispensedAfterDip += e.litres_dispensed || 0;
			}

			return {
				data: {
					closingDip,
					opening,
					deliveriesToDip,
					dispensedToDip,
					deliveriesAfterDip,
					dispensedAfterDip,
					bowserStart: meterRes.data?.bowserStart ?? 0,
					bowserEnd: meterRes.data?.bowserEnd ?? 0,
					monthDispensed: meterRes.data?.fuelDispensed ?? 0,
					existingClose: existingRes.data?.[0] || null
				},
				error: null
			};
		} catch (error) {
			return {
				data: null,
				error: error instanceof Error ? error.message : 'Failed to load month close data'
			};
		}
	}

	// Month-end close history (tank_reconciliations only — legacy
	// fuel_reconciliations rows stay in the DB but are no longer shown).
	async getTankCloseHistory(limit: number = 24): Promise<ApiResponse<any[]>> {
		const client = this.ensureInitialized();
		return this.query(() =>
			client
				.from('tank_reconciliations')
				.select('*')
				.order('reconciliation_date', { ascending: false })
				.limit(limit)
		);
	}

}

// Export singleton instance
const supabaseService = new SupabaseService();
export default supabaseService;
