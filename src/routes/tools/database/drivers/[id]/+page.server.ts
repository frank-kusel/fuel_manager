import type { PageServerLoad } from './$types';
import supabaseService from '$lib/services/supabase';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
	const { id } = params;

	await supabaseService.init();
	const supabase = supabaseService.getClient();

	const [driverRes, entriesRes] = await Promise.all([
		supabase
			.from('drivers')
			.select('*, default_vehicle:vehicles!drivers_default_vehicle_id_fkey(code, name)')
			.eq('id', id)
			.single(),
		supabase
			.from('fuel_entries')
			.select(
				'id, entry_date, time, litres_dispensed, vehicles(code, name), activities(name), fields(name)'
			)
			.eq('driver_id', id)
			.is('deleted_at', null)
			.order('entry_date', { ascending: false })
			.order('time', { ascending: false })
			.limit(500)
	]);

	if (driverRes.error || !driverRes.data) {
		throw error(404, 'Driver not found');
	}
	if (entriesRes.error) {
		throw error(500, entriesRes.error.message);
	}

	return {
		driver: driverRes.data,
		entries: entriesRes.data || []
	};
};
