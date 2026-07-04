import type { PageServerLoad } from './$types';
import supabaseService from '$lib/services/supabase';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
	const { id } = params;

	await supabaseService.init();
	const supabase = supabaseService.getClient();

	const [vehicleRes, entriesRes] = await Promise.all([
		supabase.from('vehicles').select('*').eq('id', id).single(),
		supabase
			.from('fuel_entries')
			.select(
				'id, entry_date, time, litres_dispensed, litres_used, odometer_start, odometer_end, gauge_working, fuel_consumption_l_per_100km, activities(name), fields(name), zones(name)'
			)
			.eq('vehicle_id', id)
			.is('deleted_at', null)
			.order('entry_date', { ascending: false })
			.order('time', { ascending: false })
			.limit(500)
	]);

	if (vehicleRes.error || !vehicleRes.data) {
		throw error(404, 'Vehicle not found');
	}
	if (entriesRes.error) {
		throw error(500, entriesRes.error.message);
	}

	const entries = entriesRes.data || [];

	// Multi-field entries have field_id = null; their fields live in the
	// junction table — resolve names for display.
	const fieldNamesByEntry: Record<string, string[]> = {};
	if (entries.length > 0) {
		const { data: junction } = await supabase
			.from('fuel_entry_fields')
			.select('fuel_entry_id, fields(name)')
			.in('fuel_entry_id', entries.map((e) => e.id));
		for (const row of junction || []) {
			const name = (row as any).fields?.name;
			if (name) (fieldNamesByEntry[row.fuel_entry_id] ??= []).push(name);
		}
	}

	return {
		vehicle: vehicleRes.data,
		entries,
		fieldNamesByEntry
	};
};
