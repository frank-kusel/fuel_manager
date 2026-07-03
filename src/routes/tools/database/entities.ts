import supabaseService from '$lib/services/supabase';

/**
 * Config-driven reference-data admin. One definition per entity drives the
 * list row, search, and the generic EntityEditor form. Field lists mirror the
 * LIVE table columns (verified against the DB — migration files have drifted);
 * clutter columns (licence details, emergency contacts, year…) stay in the DB
 * but are deliberately not editable here.
 */

export interface FieldDef {
	key: string;
	label: string;
	type: 'text' | 'number' | 'select' | 'suggest' | 'color' | 'textarea';
	required?: boolean;
	/** static options for select */
	options?: { value: string; label: string }[];
	/** select options from vehicles list (driver default vehicle) */
	optionsFromVehicles?: boolean;
	placeholder?: string;
	unit?: string;
}

export interface EntityConfig {
	key: string; // query-param value
	label: string; // 'Vehicle'
	plural: string; // 'Vehicles'
	table: string;
	codeKey: string; // primary short identifier column
	orderBy: string;
	searchKeys: string[];
	secondary: (row: any) => string;
	colorDot?: (row: any) => string | null;
	historyLink?: (row: any) => string;
	fields: FieldDef[];
	create: (data: any) => Promise<{ data: any; error: string | null }>;
	update: (id: string, data: any) => Promise<{ data: any; error: string | null }>;
}

const FUEL_TYPES = [
	{ value: 'diesel', label: 'Diesel' },
	{ value: 'petrol', label: 'Petrol' }
];

export const ENTITIES: EntityConfig[] = [
	{
		key: 'vehicles',
		label: 'Vehicle',
		plural: 'Vehicles',
		table: 'vehicles',
		codeKey: 'code',
		orderBy: 'code',
		searchKeys: ['code', 'name', 'registration', 'type'],
		secondary: (r) => [r.type, r.registration].filter(Boolean).join(' · '),
		historyLink: (r) => `/tools/database/vehicles/${r.id}`,
		fields: [
			{ key: 'code', label: 'Code', type: 'text', required: true, placeholder: 'KC01' },
			{ key: 'name', label: 'Name', type: 'text', required: true, placeholder: 'MB Actros 3340' },
			{ key: 'type', label: 'Type', type: 'suggest', placeholder: 'e.g. 1 - Loaders' },
			{ key: 'registration', label: 'Registration', type: 'text' },
			{
				key: 'odometer_unit',
				label: 'Meter unit',
				type: 'select',
				options: [
					{ value: 'km', label: 'Kilometres' },
					{ value: 'hours', label: 'Hours' }
				]
			},
			{ key: 'fuel_type', label: 'Fuel', type: 'select', options: FUEL_TYPES },
			{ key: 'make', label: 'Make', type: 'text' },
			{ key: 'model', label: 'Model', type: 'text' },
			{ key: 'notes', label: 'Notes', type: 'textarea' }
		],
		create: (d) => supabaseService.createVehicle(d),
		update: (id, d) => supabaseService.updateVehicle(id, d)
	},
	{
		key: 'drivers',
		label: 'Driver',
		plural: 'Drivers',
		table: 'drivers',
		codeKey: 'employee_code',
		orderBy: 'employee_code',
		searchKeys: ['employee_code', 'name', 'phone'],
		secondary: (r) => [r.phone, r.email].filter(Boolean).join(' · '),
		historyLink: (r) => `/tools/database/drivers/${r.id}`,
		fields: [
			{ key: 'employee_code', label: 'Employee code', type: 'text', required: true },
			{ key: 'name', label: 'Name', type: 'text', required: true },
			{ key: 'phone', label: 'Phone', type: 'text' },
			{ key: 'email', label: 'Email', type: 'text' },
			{ key: 'default_vehicle_id', label: 'Default vehicle', type: 'select', optionsFromVehicles: true },
			{ key: 'notes', label: 'Notes', type: 'textarea' }
		],
		create: (d) => supabaseService.createDriver(d),
		update: (id, d) => supabaseService.updateDriver(id, d)
	},
	{
		key: 'bowsers',
		label: 'Bowser',
		plural: 'Bowsers',
		table: 'bowsers',
		codeKey: 'code',
		orderBy: 'code',
		searchKeys: ['code', 'name', 'registration'],
		secondary: (r) =>
			[r.fuel_type, r.capacity ? `${Number(r.capacity).toLocaleString('en-ZA')} L` : null]
				.filter(Boolean)
				.join(' · '),
		fields: [
			{ key: 'code', label: 'Code', type: 'text', required: true },
			{ key: 'name', label: 'Name', type: 'text', required: true },
			{ key: 'registration', label: 'Registration', type: 'text' },
			{ key: 'fuel_type', label: 'Fuel', type: 'select', options: FUEL_TYPES, required: true },
			{ key: 'capacity', label: 'Capacity', type: 'number', unit: 'L', required: true },
			{ key: 'notes', label: 'Notes', type: 'textarea' }
		],
		create: (d) => supabaseService.createBowser(d),
		update: (id, d) => supabaseService.updateBowser(id, d)
	},
	{
		key: 'activities',
		label: 'Activity',
		plural: 'Activities',
		table: 'activities',
		codeKey: 'code',
		orderBy: 'code',
		searchKeys: ['code', 'name', 'category', 'name_zulu'],
		secondary: (r) => [r.icon, r.category].filter(Boolean).join(' '),
		fields: [
			{ key: 'code', label: 'Code', type: 'text', required: true },
			{ key: 'name', label: 'Name', type: 'text', required: true },
			{ key: 'category', label: 'Category', type: 'suggest' },
			{ key: 'name_zulu', label: 'Zulu name', type: 'text' },
			{ key: 'icon', label: 'Icon (emoji)', type: 'text', placeholder: '🚜' },
			{ key: 'description', label: 'Description', type: 'textarea' }
		],
		create: (d) => supabaseService.createActivity(d),
		update: (id, d) => supabaseService.updateActivity(id, d)
	},
	{
		key: 'fields',
		label: 'Field',
		plural: 'Fields',
		table: 'fields',
		codeKey: 'code',
		orderBy: 'code',
		searchKeys: ['code', 'name', 'crop_type', 'location'],
		secondary: (r) =>
			[r.area ? `${r.area} ha` : null, r.crop_type].filter(Boolean).join(' · '),
		fields: [
			{ key: 'code', label: 'Code', type: 'text', required: true },
			{ key: 'name', label: 'Name', type: 'text', required: true },
			{ key: 'type', label: 'Type', type: 'suggest' },
			{ key: 'area', label: 'Area', type: 'number', unit: 'ha', required: true },
			{ key: 'location', label: 'Location', type: 'text' },
			{ key: 'crop_type', label: 'Crop', type: 'suggest' },
			{ key: 'notes', label: 'Notes', type: 'textarea' }
		],
		create: (d) => supabaseService.createField(d),
		update: (id, d) => supabaseService.updateField(id, d)
	},
	{
		key: 'zones',
		label: 'Zone',
		plural: 'Zones',
		table: 'zones',
		codeKey: 'code',
		orderBy: 'display_order',
		searchKeys: ['code', 'name', 'zone_type'],
		secondary: (r) => r.zone_type || '',
		colorDot: (r) => r.color || null,
		fields: [
			{ key: 'code', label: 'Code', type: 'text', required: true },
			{ key: 'name', label: 'Name', type: 'text', required: true },
			{
				key: 'zone_type',
				label: 'Type',
				type: 'select',
				options: [
					{ value: 'farm_section', label: 'Farm section' },
					{ value: 'infrastructure', label: 'Infrastructure' },
					{ value: 'transport', label: 'Transport' },
					{ value: 'maintenance', label: 'Maintenance' },
					{ value: 'general', label: 'General' }
				]
			},
			{ key: 'color', label: 'Colour', type: 'color' },
			{ key: 'display_order', label: 'Display order', type: 'number' },
			{ key: 'description', label: 'Description', type: 'textarea' }
		],
		create: (d) => supabaseService.createZone(d),
		update: (id, d) => supabaseService.updateZone(id, d)
	}
];

export function entityByKey(key: string | null): EntityConfig {
	return ENTITIES.find((e) => e.key === key) ?? ENTITIES[0];
}
