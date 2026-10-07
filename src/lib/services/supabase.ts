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
	VehicleMonthlyClaimAdjustment,
	VehicleMonthlyClaimAdjustmentInput,
	AppSettingsPatch,
	AppSettingsRow,
	ApiResponse
} from '$lib/types';
import { isoDayBefore, todayIso } from '$lib/utils/dates';
import {
	BURN_WINDOW_DAYS,
	buildMonthLedger,
	resolveAnchor,
	type CloseRow,
	type DipRow,
	type DispenseRow,
	type MonthCloseData,
	type RefillRow,
	type TankActivity,
	type TankAnchor,
	type TankBalanceInputs
} from '$lib/utils/tank-balance';

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
			throw new Error(
				'Missing Supabase configuration. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.'
			);
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
			this.query<Vehicle[]>(() => client.from('vehicles').select('*').order('code')),
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

	async createVehicle(
		vehicle: Omit<Vehicle, 'id' | 'created_at' | 'updated_at'>
	): Promise<ApiResponse<Vehicle>> {
		const client = this.ensureInitialized();
		return this.query(() => client.from('vehicles').insert(vehicle).select().single());
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
				.select(
					`
					*,
					default_vehicle:vehicles!drivers_default_vehicle_id_fkey (
						id,
						code,
						name,
						type,
						registration
					)
				`
				)
				.order('name')
		);
	}

	async createDriver(
		driver: Omit<Driver, 'id' | 'created_at' | 'updated_at'>
	): Promise<ApiResponse<Driver>> {
		const client = this.ensureInitialized();
		return this.query(() => client.from('drivers').insert(driver).select().single());
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
		// Wide ranges (a financial year) run past PostgREST's 1000-row cap, which
		// would silently truncate the tail — page until a short page comes back
		// or MAX_ROWS is reached. `truncated` tells the caller the tail was cut.
		const PAGE = 1000;
		const MAX_ROWS = 5000;
		const rows: FuelEntry[] = [];
		let truncated = false;

		for (let from = 0; from < MAX_ROWS; from += PAGE) {
			let query = client
				.from('fuel_entries')
				.select(
					`
					*,
					vehicles!left (code, name, registration, odometer_unit),
					drivers!left (employee_code, name),
					activities!left (code, name),
					fields!left (code, name),
					zones!left (code, name),
					bowsers!left (name),
					fuel_entry_fields (field_id)
				`
				)
				.is('deleted_at', null)
				.order('entry_date', { ascending: false })
				.order('time', { ascending: false })
				.order('id', { ascending: false }) // stable tiebreak across pages
				.range(from, Math.min(from + PAGE, MAX_ROWS) - 1);

			if (startDate) {
				query = query.gte('entry_date', startDate);
			}
			if (endDate) {
				query = query.lte('entry_date', endDate);
			}

			const page = await this.query<FuelEntry[]>(() => query);
			if (page.error) return page;

			const data = page.data || [];
			rows.push(...data);
			if (data.length < PAGE) break;
			if (rows.length >= MAX_ROWS) truncated = true;
		}

		return { data: rows, error: null, truncated };
	}

	async createFuelEntry(
		entry: Omit<FuelEntry, 'id' | 'created_at' | 'updated_at'>
	): Promise<ApiResponse<FuelEntry>> {
		const client = this.ensureInitialized();
		return this.query(() => client.from('fuel_entries').insert(entry).select().single());
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
	): Promise<
		ApiResponse<{
			moved: boolean;
			reason?: string;
			new_time?: string;
			times_adjusted?: number;
			bowsers_recalculated?: number;
		}>
	> {
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
				const junctionEntries = fieldIds.map((fieldId) => ({
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
			await client.from('fuel_entry_fields').delete().eq('fuel_entry_id', entryId);

			// Insert new field associations if provided
			if (fieldIds.length > 0) {
				const junctionEntries = fieldIds.map((fieldId) => ({
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
				client.from('bowsers').select('*').eq('active', true).order('name')
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
		notes?: string | null;
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

			return { data: result.data, error: result.error?.message };
		} catch (error) {
			return {
				data: null,
				error: error instanceof Error ? error.message : 'Failed to add tank reading'
			};
		}
	}

	async addTankRefill(refill: {
		litres_added: number;
		supplier?: string | null;
		delivery_date: string;
		invoice_number?: string | null;
		total_cost?: number | null;
		notes?: string | null;
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
			client.from('activities').select('*').eq('active', true).order('category, code')
		);
	}

	async saveActivityClaimEligibility(
		updates: Array<{ id: string; diesel_claim_eligible: boolean }>
	): Promise<ApiResponse<Activity[]>> {
		const client = this.ensureInitialized();
		try {
			const reviewedAt = new Date().toISOString();
			const results = await Promise.all(
				updates.map((activity) =>
					client
						.from('activities')
						.update({
							diesel_claim_eligible: activity.diesel_claim_eligible,
							diesel_claim_reviewed_at: reviewedAt
						})
						.eq('id', activity.id)
						.select()
						.single()
				)
			);
			const failed = results.find((result) => result.error);
			if (failed?.error) return { data: null, error: failed.error.message };
			return { data: results.map((result) => result.data as Activity), error: null };
		} catch (error) {
			return {
				data: null,
				error: error instanceof Error ? error.message : 'Failed to save activity eligibility'
			};
		}
	}

	async getVehicleMonthlyClaimAdjustments(
		startMonth?: string,
		endMonth?: string
	): Promise<ApiResponse<VehicleMonthlyClaimAdjustment[]>> {
		const client = this.ensureInitialized();
		try {
			let query = client
				.from('vehicle_monthly_claim_adjustments')
				.select('*')
				.order('claim_month', { ascending: true });
			if (startMonth) query = query.gte('claim_month', startMonth);
			if (endMonth) query = query.lte('claim_month', endMonth);
			const { data, error } = await query;
			return {
				data: (data || []) as VehicleMonthlyClaimAdjustment[],
				error: error?.message ?? null
			};
		} catch (error) {
			return {
				data: null,
				error: error instanceof Error ? error.message : 'Failed to load claim adjustments'
			};
		}
	}

	async getVehicleMonthlyClaimAdjustment(
		vehicleId: string,
		claimMonth: string
	): Promise<ApiResponse<VehicleMonthlyClaimAdjustment | null>> {
		const client = this.ensureInitialized();
		try {
			const { data, error } = await client
				.from('vehicle_monthly_claim_adjustments')
				.select('*')
				.eq('vehicle_id', vehicleId)
				.eq('claim_month', claimMonth)
				.maybeSingle();
			return { data: data as VehicleMonthlyClaimAdjustment | null, error: error?.message ?? null };
		} catch (error) {
			return {
				data: null,
				error: error instanceof Error ? error.message : 'Failed to load claim adjustment'
			};
		}
	}

	async upsertVehicleMonthlyClaimAdjustment(
		adjustment: VehicleMonthlyClaimAdjustmentInput
	): Promise<ApiResponse<VehicleMonthlyClaimAdjustment>> {
		const client = this.ensureInitialized();
		try {
			const { data, error } = await client
				.from('vehicle_monthly_claim_adjustments')
				.upsert(adjustment, { onConflict: 'vehicle_id,claim_month' })
				.select()
				.single();
			return { data: data as VehicleMonthlyClaimAdjustment | null, error: error?.message ?? null };
		} catch (error) {
			return {
				data: null,
				error: error instanceof Error ? error.message : 'Failed to save claim adjustment'
			};
		}
	}

	// Field operations
	async getFields(): Promise<ApiResponse<Field[]>> {
		const client = this.ensureInitialized();
		return this.query(() => client.from('fields').select('*').eq('active', true).order('code'));
	}

	// Zone operations
	async getZones(): Promise<ApiResponse<Zone[]>> {
		const client = this.ensureInitialized();
		return this.query(() =>
			client.from('zones').select('*').eq('active', true).order('display_order')
		);
	}

	async createZone(zone: Partial<Zone>): Promise<ApiResponse<Zone>> {
		const client = this.ensureInitialized();
		return this.query(() => client.from('zones').insert(zone).select().single());
	}

	async updateZone(id: string, updates: Partial<Zone>): Promise<ApiResponse<Zone>> {
		const client = this.ensureInitialized();
		return this.query(() => client.from('zones').update(updates).eq('id', id).select().single());
	}

	// Bowser CRUD operations
	async createBowser(
		bowser: Omit<Bowser, 'id' | 'created_at' | 'updated_at'>
	): Promise<ApiResponse<Bowser>> {
		const client = this.ensureInitialized();
		return this.query(() => client.from('bowsers').insert(bowser).select().single());
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
	async createActivity(
		activity: Omit<Activity, 'id' | 'created_at' | 'updated_at'>
	): Promise<ApiResponse<Activity>> {
		const client = this.ensureInitialized();
		return this.query(() => client.from('activities').insert(activity).select().single());
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
	async createField(
		field: Omit<Field, 'id' | 'created_at' | 'updated_at'>
	): Promise<ApiResponse<Field>> {
		const client = this.ensureInitialized();
		return this.query(() => client.from('fields').insert(field).select().single());
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
				.select(
					`
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
				`
				)
				.eq('vehicle_id', vehicleId)
				.is('deleted_at', null)
				.order('entry_date', { ascending: false })
				.order('time', { ascending: false })
		);
	}

	// Reconciliation operations

	// variance and variance_percentage are GENERATED columns in the live table
	// (calculated − measured, % relative to the measured dip) — never insert them.
	//
	// Those generated columns are NOT the leak check: calculated_level carries
	// post-dip movements forward, so they equal "leak + movements after the dip".
	// book_at_dip / dip_date (migration 020) record the real numerator, and
	// `accepted` is judged on that. See database/migrations/020_close_leak_columns.sql.
	private tankReconciliationFields(data: {
		reconciliationDate: string;
		calculatedLevel: number;
		measuredLevel: number;
		bookAtDip?: number;
		dipDate?: string;
		isRebaseline?: boolean;
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
			book_at_dip: data.bookAtDip ?? null,
			dip_date: data.dipDate ?? null,
			is_rebaseline: data.isRebaseline ?? false,
			accepted: data.accepted ?? Math.abs(variancePct) <= 5,
			notes: data.notes
		};
	}

	/**
	 * Migration 020 adds book_at_dip / dip_date / is_rebaseline. Until it is
	 * applied, PostgREST rejects the whole statement with 42703. Rather than
	 * break closing a month on an un-migrated database, drop the new columns and
	 * retry — the close still records everything it did before.
	 */
	/**
	 * The shared app settings row. `missing: true` means migration 022 has not
	 * been applied yet; callers fall back to this browser's saved values so the
	 * app keeps working until it is.
	 */
	async getAppSettings(): Promise<ApiResponse<AppSettingsRow> & { missing?: boolean }> {
		const client = this.ensureInitialized();
		const { data, error } = await client.from('app_settings').select('*').eq('id', true).maybeSingle();
		if (error) {
			if (this.isMissingTableError(error)) return { data: null, error: null, missing: true };
			return { data: null, error: error.message };
		}
		return { data: (data as AppSettingsRow) ?? null, error: null };
	}

	async updateAppSettings(
		patch: AppSettingsPatch
	): Promise<ApiResponse<AppSettingsRow> & { missing?: boolean }> {
		const client = this.ensureInitialized();
		const { data, error } = await client
			.from('app_settings')
			.upsert({ id: true, ...patch })
			.select()
			.single();
		if (error) {
			if (this.isMissingTableError(error)) return { data: null, error: null, missing: true };
			return { data: null, error: error.message };
		}
		return { data: data as AppSettingsRow, error: null };
	}

	private isMissingTableError(error: { code?: string; message?: string }): boolean {
		return (
			error.code === 'PGRST205' ||
			error.code === '42P01' ||
			/could not find the table|relation .* does not exist/i.test(error.message ?? '')
		);
	}

	private isMissingColumnError(error: string | null): boolean {
		return !!error && (error.includes('42703') || /column .* does not exist/i.test(error));
	}

	private withoutMigration020<T extends Record<string, unknown>>(fields: T) {
		const { book_at_dip, dip_date, is_rebaseline, ...rest } = fields as Record<string, unknown>;
		void book_at_dip;
		void dip_date;
		void is_rebaseline;
		return rest;
	}

	async createTankReconciliation(data: {
		reconciliationDate: string;
		calculatedLevel: number;
		measuredLevel: number;
		bookAtDip?: number;
		dipDate?: string;
		isRebaseline?: boolean;
		accepted?: boolean;
		notes?: string;
	}): Promise<ApiResponse<any>> {
		const client = this.ensureInitialized();
		const fields = this.tankReconciliationFields(data);
		const result = await this.query<any>(() =>
			client.from('tank_reconciliations').insert(fields).select().single()
		);
		if (!this.isMissingColumnError(result.error)) return result;

		console.warn('tank_reconciliations is missing migration 020 columns — closing without them');
		return this.query(
			async () =>
				await client
					.from('tank_reconciliations')
					.insert(this.withoutMigration020(fields))
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
			bookAtDip?: number;
			dipDate?: string;
			isRebaseline?: boolean;
			accepted?: boolean;
			notes?: string;
		}
	): Promise<ApiResponse<any>> {
		const client = this.ensureInitialized();
		const fields = this.tankReconciliationFields(data);
		const result = await this.query<any>(() =>
			client.from('tank_reconciliations').update(fields).eq('id', id).select().single()
		);
		if (!this.isMissingColumnError(result.error)) return result;

		console.warn('tank_reconciliations is missing migration 020 columns — updating without them');
		return this.query(
			async () =>
				await client
					.from('tank_reconciliations')
					.update(this.withoutMigration020(fields))
					.eq('id', id)
					.select()
					.single()
		);
	}

	// Flexible date range reconciliation methods for new Tools section
	async getDateRangeReconciliationData(
		startDate: string,
		endDate: string
	): Promise<
		ApiResponse<{
			fuelDispensed: number;
			bowserStart: number;
			bowserEnd: number;
		}>
	> {
		const client = this.ensureInitialized();

		try {
			// One round trip instead of three sequential ones (~350ms each).
			const [fuelResult, bowserStartResult, bowserEndResult] = await Promise.all([
				// Total fuel dispensed for the date range
				client
					.from('fuel_entries')
					.select('litres_dispensed')
					.is('deleted_at', null)
					.gte('entry_date', startDate)
					.lte('entry_date', endDate),
				// Opening reading: last bowser_reading_end from BEFORE the start
				// date, i.e. the bowser level at the end of the previous period
				client
					.from('fuel_entries')
					.select('bowser_reading_end, entry_date, time')
					.is('deleted_at', null)
					.lt('entry_date', startDate)
					.not('bowser_reading_end', 'is', null)
					.order('entry_date', { ascending: false })
					.order('time', { ascending: false })
					.limit(1),
				// Closing reading: last bowser_reading_end within the range
				client
					.from('fuel_entries')
					.select('bowser_reading_end, entry_date, time')
					.is('deleted_at', null)
					.gte('entry_date', startDate)
					.lte('entry_date', endDate)
					.not('bowser_reading_end', 'is', null)
					.order('entry_date', { ascending: false })
					.order('time', { ascending: false })
					.limit(1)
			]);

			const fuelDispensed =
				fuelResult.data?.reduce((sum, entry) => sum + (entry.litres_dispensed || 0), 0) || 0;
			const bowserStart = parseFloat(bowserStartResult.data?.[0]?.bowser_reading_end) || 0;
			const bowserEnd = parseFloat(bowserEndResult.data?.[0]?.bowser_reading_end) || 0;

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
				error:
					error instanceof Error ? error.message : 'Failed to get date range reconciliation data'
			};
		}
	}

	/**
	 * The shared inputs for the live tank balance: the anchor (latest close, or
	 * the latest dip when nothing has ever been closed) plus every movement
	 * after it. The arithmetic lives in $lib/utils/tank-balance so the Tank
	 * page, the dashboard, the close and the PDF all agree.
	 *
	 * Note there is deliberately no `deleted_at` filter on tank_refills or
	 * tank_readings: neither table has that column (only fuel_entries does), and
	 * PostgREST 400s on a filter naming a column that does not exist.
	 */
	async getTankBalanceInputs(asOf: string = todayIso()): Promise<ApiResponse<TankBalanceInputs>> {
		const client = this.ensureInitialized();

		try {
			const [closeRes, dipRes] = await Promise.all([
				client
					.from('tank_reconciliations')
					.select('*')
					.lte('reconciliation_date', asOf)
					.order('reconciliation_date', { ascending: false })
					.order('created_at', { ascending: false })
					.limit(1),
				client
					.from('tank_readings')
					.select('reading_value, reading_date')
					.eq('reading_type', 'dipstick')
					.lte('reading_date', asOf)
					.order('reading_date', { ascending: false })
					.order('created_at', { ascending: false })
					.limit(1)
			]);
			if (closeRes.error) throw new Error(closeRes.error.message);
			if (dipRes.error) throw new Error(dipRes.error.message);

			const latestClose = (closeRes.data?.[0] as CloseRow) ?? null;
			const latestDip = (dipRes.data?.[0] as DipRow) ?? null;
			const anchor = resolveAnchor({ latestClose, latestDip });

			if (!anchor) {
				return {
					data: { anchor: null, latestClose, latestDip, refills: [], dispenses: [], burnDispenses: [] },
					error: null
				};
			}

			const burnStartDate = new Date(`${asOf}T12:00:00`);
			burnStartDate.setDate(burnStartDate.getDate() - BURN_WINDOW_DAYS);
			const burnStart = burnStartDate.toLocaleDateString('en-CA');

			const [refillsRes, dispensedRes, burnRes] = await Promise.all([
				client
					.from('tank_refills')
					.select('litres_added, delivery_date')
					.gt('delivery_date', anchor.date)
					.lte('delivery_date', asOf),
				client
					.from('fuel_entries')
					.select('litres_dispensed, entry_date')
					.is('deleted_at', null)
					.gt('entry_date', anchor.date)
					.lte('entry_date', asOf),
				client
					.from('fuel_entries')
					.select('litres_dispensed, entry_date')
					.is('deleted_at', null)
					.gte('entry_date', burnStart)
					.lte('entry_date', asOf)
			]);
			const firstError = refillsRes.error || dispensedRes.error || burnRes.error;
			if (firstError) throw new Error(firstError.message);

			return {
				data: {
					anchor,
					latestClose,
					latestDip,
					refills: (refillsRes.data || []) as RefillRow[],
					dispenses: (dispensedRes.data || []) as DispenseRow[],
					burnDispenses: (burnRes.data || []) as DispenseRow[]
				},
				error: null
			};
		} catch (error) {
			return {
				data: null,
				error: error instanceof Error ? error.message : 'Failed to load tank balance inputs'
			};
		}
	}

	/**
	 * Dips and deliveries merged into one newest-first list — the Tank page's
	 * recent activity. `limit` rows of each are fetched, then the merge is cut
	 * to `limit`, so neither kind can crowd the other out of the window.
	 */
	async getRecentTankActivity(limit = 8): Promise<ApiResponse<TankActivity[]>> {
		const client = this.ensureInitialized();
		try {
			const [dips, deliveries] = await Promise.all([
				client
					.from('tank_readings')
					.select('reading_value, reading_date')
					.eq('reading_type', 'dipstick')
					.order('reading_date', { ascending: false })
					.limit(limit),
				client
					.from('tank_refills')
					.select('litres_added, delivery_date, supplier, invoice_number')
					.order('delivery_date', { ascending: false })
					.limit(limit)
			]);
			const firstError = dips.error || deliveries.error;
			if (firstError) throw new Error(firstError.message);

			const activity: TankActivity[] = [
				...(dips.data || []).map((d) => ({
					kind: 'dip' as const,
					date: d.reading_date,
					litres: Number(d.reading_value || 0),
					supplier: null,
					invoice: null
				})),
				...(deliveries.data || []).map((r) => ({
					kind: 'delivery' as const,
					date: r.delivery_date,
					litres: Number(r.litres_added || 0),
					supplier: r.supplier?.trim() || null,
					invoice: r.invoice_number || null
				}))
			];
			activity.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
			return { data: activity.slice(0, limit), error: null };
		} catch (error) {
			return {
				data: null,
				error: error instanceof Error ? error.message : 'Failed to load tank activity'
			};
		}
	}

	/**
	 * Everything the Month-end close screen needs for one month, as a RUNNING
	 * TALLY: opening = the most recent close on or before the previous month end,
	 * then every movement after it, with the month's last dip as the leak check —
	 * NOT the reference (a dip taken near month end would trivially agree with a
	 * dip-anchored book).
	 *
	 * The opening is matched with `lte`, not `eq`, and movements are counted from
	 * the anchor's own date rather than the month start. Both halves matter
	 * together: with `eq` a skipped month silently broke the chain, and without
	 * the matching window a recovered chain would double-count the gap month.
	 *
	 * Deliberately does NOT read tank_status (its snapshot row is broken) or
	 * fuel_reconciliations (superseded).
	 */
	async getMonthCloseData(
		monthStart: string,
		monthEnd: string,
		toleranceL?: number
	): Promise<ApiResponse<MonthCloseData>> {
		const client = this.ensureInitialized();

		try {
			// Opens from the day before the period: the previous month end for a
			// whole month, and still correct for a custom period (the claim PDF).
			const prevEnd = isoDayBefore(monthStart);

			const [closingRes, existingRes, prevCloseRes, meterRes] = await Promise.all([
				client
					.from('tank_readings')
					.select('reading_value, reading_date')
					.eq('reading_type', 'dipstick')
					.gte('reading_date', monthStart)
					.lte('reading_date', monthEnd)
					.order('reading_date', { ascending: false })
					.order('created_at', { ascending: false })
					.limit(1),
				client
					.from('tank_reconciliations')
					.select('*')
					.eq('reconciliation_date', monthEnd)
					.order('created_at', { ascending: false })
					.limit(1),
				client
					.from('tank_reconciliations')
					.select('*')
					.lte('reconciliation_date', prevEnd)
					.order('reconciliation_date', { ascending: false })
					.order('created_at', { ascending: false })
					.limit(1),
				this.getDateRangeReconciliationData(monthStart, monthEnd)
			]);
			const firstError = closingRes.error || existingRes.error || prevCloseRes.error;
			if (firstError) throw new Error(firstError.message);

			const closingDip = (closingRes.data?.[0] as DipRow) ?? null;
			const prevClose = (prevCloseRes.data?.[0] as CloseRow) ?? null;

			// Before the close chain existed, fall back to the last dip before the
			// month started so the very first close still has something to open from.
			let fallbackDip: DipRow | null = null;
			if (!prevClose) {
				const fallbackRes = await client
					.from('tank_readings')
					.select('reading_value, reading_date')
					.eq('reading_type', 'dipstick')
					.lt('reading_date', monthStart)
					.order('reading_date', { ascending: false })
					.order('created_at', { ascending: false })
					.limit(1);
				if (fallbackRes.error) throw new Error(fallbackRes.error.message);
				fallbackDip = (fallbackRes.data?.[0] as DipRow) ?? null;
			}

			const anchor = resolveAnchor({ latestClose: prevClose, latestDip: fallbackDip });
			const existingClose = existingRes.data?.[0] ?? null;

			if (!anchor) {
				return {
					data: {
						ledger: null,
						closingDip,
						anchor: null,
						bowserStart: meterRes.data?.bowserStart ?? 0,
						bowserEnd: meterRes.data?.bowserEnd ?? 0,
						monthDispensed: meterRes.data?.fuelDispensed ?? 0,
						existingClose
					},
					error: null
				};
			}

			// Windowed from the anchor, not the month start — see the note above.
			const [refillsRes, dispensedRes] = await Promise.all([
				client
					.from('tank_refills')
					.select('litres_added, delivery_date')
					.gt('delivery_date', anchor.date)
					.lte('delivery_date', monthEnd),
				client
					.from('fuel_entries')
					.select('litres_dispensed, entry_date')
					.is('deleted_at', null)
					.gt('entry_date', anchor.date)
					.lte('entry_date', monthEnd)
			]);
			if (refillsRes.error) throw new Error(refillsRes.error.message);
			if (dispensedRes.error) throw new Error(dispensedRes.error.message);

			const ledger = buildMonthLedger({
				anchor,
				closingDip,
				refills: (refillsRes.data || []) as RefillRow[],
				dispenses: (dispensedRes.data || []) as DispenseRow[],
				monthEnd,
				toleranceL
			});

			return {
				data: {
					ledger,
					closingDip,
					anchor,
					bowserStart: meterRes.data?.bowserStart ?? 0,
					bowserEnd: meterRes.data?.bowserEnd ?? 0,
					monthDispensed: meterRes.data?.fuelDispensed ?? 0,
					existingClose
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
