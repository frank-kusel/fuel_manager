// Core TypeScript interfaces for FarmTrack platform
// Migrated and enhanced from the original fuel manager

export interface Vehicle {
	id: string;
	code: string;
	name: string;
	type: string;
	registration?: string;
	make?: string;
	model?: string;
	year?: number;
	fuel_type?: string;
	tank_capacity?: number;
	odometer_unit?: string;
	// Fuel consumption tracking
	average_consumption_l_per_100km?: number | null;
	consumption_entries_count?: number;
	last_consumption_update?: string | null;
	notes?: string;
	active: boolean;
	created_at: string;
	updated_at: string;
}

// View-based current odometer reading (from latest fuel entry)
export interface CurrentVehicleOdometer {
	vehicle_id: string;
	current_odometer: number;
	last_entry_date: string;
	last_entry_time: string;
	last_fuel_entry_id: string;
}

export type VehicleType = 'tractor' | 'bakkie' | 'truck' | 'loader' | 'harvester' | 'sprayer' | 'other';

export interface Driver {
	id: string;
	employee_code: string;
	name: string;
	phone?: string;
	email?: string;
	license_number?: string;
	license_class?: string;
	license_issue?: string;
	license_expiry?: string;
	emergency_contact_name?: string;
	emergency_contact_phone?: string;
	default_vehicle_id?: string;
	default_vehicle?: Vehicle; // Populated when joining with vehicles table
	notes?: string;
	active: boolean;
	created_at: string;
	updated_at: string;
}

export interface Activity {
	id: string;
	code: string;
	name: string;
	name_zulu?: string;
	category: ActivityCategory;
	icon?: string;
	description?: string;
	active: boolean;
	created_at: string;
	updated_at: string;
}

export type ActivityCategory = 
	| 'planting' 
	| 'harvesting' 
	| 'spraying' 
	| 'fertilizing' 
	| 'maintenance' 
	| 'other';

export interface Field {
	id: string;
	code: string;
	name: string;
	type: FieldType;
	area: number; // hectares
	location?: string;
	crop_type?: string;
	active: boolean;
	created_at: string;
	updated_at: string;
}

export type FieldType = 'arable' | 'pasture' | 'orchard' | 'greenhouse' | 'other';

export interface Zone {
	id: string;
	code: string;
	name: string;
	description?: string;
	zone_type?: 'farm_section' | 'infrastructure' | 'transport' | 'maintenance' | 'general';
	coordinates?: any; // GeoJSON coordinates
	color?: string;
	display_order?: number;
	active: boolean;
	created_at: string;
	updated_at: string;
}

export interface Bowser {
	id: string;
	code: string;
	name: string;
	registration: string;
	fuel_type: 'diesel' | 'petrol';
	capacity: number; // litres
	location?: string;
	notes?: string;
	active: boolean;
	created_at: string;
	updated_at: string;
}

// View-based current bowser reading (from latest fuel entry)
export interface CurrentBowserReading {
	bowser_id: string;
	current_reading: number;
	last_entry_date: string;
	last_entry_time: string;
	last_fuel_entry_id: string;
}

export interface FuelEntry {
	id: string;
	entry_date: string;
	time: string;
	vehicle_id: string;
	driver_id: string;
	activity_id: string;
	field_id?: string; // Legacy single field (for backward compatibility)
	zone_id?: string;
	bowser_id: string;
	
	// Multi-field support
	field_selection_mode?: 'single' | 'multiple';
	fields?: Field[]; // Populated when joining with junction table
	
	// Odometer data
	odometer_start: number | null;
	odometer_end: number | null;
	gauge_working: boolean;
	
	// Fuel data
	litres_used: number;
	litres_dispensed: number;
	bowser_reading_start: number | null;
	bowser_reading_end: number | null;
	cost_per_litre?: number;
	total_cost?: number;
	
	// Fuel consumption (calculated)
	fuel_consumption_l_per_100km?: number | null;
	
	// Status and notes
	notes?: string;
	
	// System fields
	created_at: string;
	updated_at: string;
}

// Junction table interface for fuel entry to field relationships
export interface FuelEntryField {
	id: string;
	fuel_entry_id: string;
	field_id: string;
	field?: Field; // Populated when joining with fields table
	created_at: string;
}

// Extended interface for fuel entries with location details
export interface FuelEntryWithLocation extends FuelEntry {
	// Single field info (backward compatibility)
	single_field_id?: string;
	single_field_name?: string;
	single_field_code?: string;
	single_field_crop_type?: string;
	
	// Zone info
	zone_id_info?: string;
	zone_name?: string;
	zone_code?: string;
	zone_type?: string;
	
	// Location type and display
	location_type: 'single_field' | 'zone' | 'multiple_fields' | 'unspecified';
	location_display_name: string;
	associated_fields_count: number;
}

// Form state interfaces for multi-field selection
export interface FieldSelectionState {
	mode: 'single' | 'multiple';
	selectedField: Field | null; // For single mode
	selectedFields: Field[]; // For multiple mode
	selectedZone: Zone | null;
}

export interface RefillRecord {
	id: string;
	date: string;
	bowserId: string;
	supplier: string;
	amount: number; // litres
	readingBefore: number;
	readingAfter: number;
	cost?: number;
	invoiceNumber?: string;
	notes?: string;
	created_at: string;
	updated_at: string;
}

// Dashboard and Analytics Types
export interface DashboardStats {
	// Fuel usage metrics
	dailyFuel: number;
	weeklyFuel: number;
	monthlyFuel: number;
	previousMonthFuel: number;
	
	// Distance and efficiency
	monthlyDistance: number;
	averageEfficiency: number;
	
	// Enhanced consumption metrics
	validConsumptionEntries: number;
	consumptionDataQuality: number;
	bestEfficiencyThisMonth: number | null;
	worstEfficiencyThisMonth: number | null;
	
	// Tank monitoring
	tankLevel: number;
	tankCapacity: number;
	tankPercentage: number;
	
	// Fleet status
	activeVehicles: number;
	vehiclesWithOdometer: number;
	totalBowsers: number;
	
	// Recent activity
	recentEntries: any[];
	bowserLevels: any[];
	
	// Calculated insights
	entriesThisWeek: number;
	entriesThisMonth: number;
	avgDailyUsage: number;
}

export interface VehicleSummary {
	vehicleId: string;
	vehicleCode: string;
	vehicleName: string;
	totalFuel: number;
	totalDistance: number;
	averageConsumption: number;
	recordCount: number;
}

export interface ActivitySummary {
	date: string;
	recordCount: number;
	totalFuel: number;
}

// Form and UI State Types
export interface FuelEntryStep {
	id: string;
	label: string;
	icon: string;
	component: string;
	completed: boolean;
	data?: any;
}

export interface ValidationError {
	field: string;
	message: string;
	type: 'error' | 'warning';
}

// API Response Types
export interface ApiResponse<T = any> {
	data: T | null;
	error: string | null;
	count?: number;
}

export interface SupabaseError {
	message: string;
	details?: string;
	hint?: string;
	code?: string;
}

// Offline and Sync Types
export interface OfflineEntry {
	id: string;
	type: 'fuel_entry' | 'refill' | 'vehicle' | 'driver';
	data: any;
	timestamp: string;
	synced: boolean;
}

export interface CacheEntry<T = any> {
	data: T;
	timestamp: string;
	expires: string;
}

// Export Types for Reports
export interface ExportOptions {
	format: 'pdf' | 'csv' | 'excel' | 'canepro';
	startDate: string;
	endDate: string;
	vehicles?: string[];
	activities?: string[];
	includeImages?: boolean;
}

// User and Authentication (future expansion)
export interface User {
	id: string;
	email: string;
	name: string;
	role: 'admin' | 'manager' | 'operator' | 'viewer';
	active: boolean;
	created_at: string;
	updated_at: string;
}

// Farm Management Platform Extensions (future)
export interface Farm {
	id: string;
	name: string;
	code: string;
	location: string;
	area?: number;
	owner?: string;
	manager?: string;
	active: boolean;
	created_at: string;
	updated_at: string;
}

export interface Crop {
	id: string;
	name: string;
	variety?: string;
	plantingDate?: string;
	expectedHarvest?: string;
	area?: number;
	fieldId: string;
	active: boolean;
	created_at: string;
	updated_at: string;
}

// Utility Types
export type SortDirection = 'asc' | 'desc';
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface Option {
	value: string | number;
	label: string;
}

export type Theme = 'light' | 'dark' | 'auto';