import type { PageServerLoad } from './$types';
import supabaseService from '$lib/services/supabase';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
	const { id } = params;

	// Initialize Supabase
	await supabaseService.init();
	const supabase = supabaseService.getClient();

	// Fetch activity details
	const { data: activity, error: activityError } = await supabase
		.from('activities')
		.select('*')
		.eq('id', id)
		.single();

	if (activityError || !activity) {
		throw error(404, 'Activity not found');
	}

	// Fetch vehicle statistics for this activity (handle missing function gracefully)
	let vehicleStats = [];
	try {
		const result = await supabase
			.rpc('get_activity_vehicle_stats', { activity_id_param: id });
		vehicleStats = result.data || [];
	} catch (error) {
		console.warn('Activity vehicle stats function not available:', error);
	}

	// Fetch recent fuel entries for this activity
	const { data: recentEntries } = await supabase
		.from('fuel_entries')
		.select(`
			*,
			vehicle:vehicles(name, registration, type),
			driver:drivers(name, employee_code),
			field:fields(name),
			zone:zones(name)
		`)
		.eq('activity_id', id)
		.order('entry_date', { ascending: false })
		.order('time', { ascending: false })
		.limit(50);

	// Fetch monthly trend data
	const sixMonthsAgo = new Date();
	sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
	
	const { data: monthlyTrend } = await supabase
		.from('fuel_entries')
		.select('entry_date, litres_used, odometer_start, odometer_end, vehicle_id')
		.eq('activity_id', id)
		.gte('entry_date', sixMonthsAgo.toISOString().split('T')[0])
		.order('entry_date', { ascending: true });

	// Calculate monthly aggregates
	const monthlyData = new Map();
	monthlyTrend?.forEach(entry => {
		const monthKey = entry.entry_date.substring(0, 7); // YYYY-MM
		const current = monthlyData.get(monthKey) || { 
			fuel: 0, 
			distance: 0, 
			entries: 0,
			vehicles: new Set() 
		};
		
		current.fuel += entry.litres_used || 0;
		if (entry.odometer_end && entry.odometer_start) {
			current.distance += entry.odometer_end - entry.odometer_start;
		}
		current.entries++;
		current.vehicles.add(entry.vehicle_id);
		
		monthlyData.set(monthKey, current);
	});

	// Convert to array for charting
	const monthlyStats = Array.from(monthlyData.entries())
		.map(([month, data]) => ({
			month,
			fuel: data.fuel,
			distance: data.distance,
			entries: data.entries,
			vehicleCount: data.vehicles.size
		}))
		.sort((a, b) => a.month.localeCompare(b.month));

	// Calculate peak times (hour distribution)
	const hourDistribution = new Array(24).fill(0);
	recentEntries?.forEach(entry => {
		if (entry.time) {
			const hour = parseInt(entry.time.split(':')[0]);
			hourDistribution[hour]++;
		}
	});

	// Calculate field/zone distribution
	const locationDistribution = new Map();
	recentEntries?.forEach(entry => {
		const location = entry.field?.name || entry.zone?.name || 'Unknown';
		locationDistribution.set(location, (locationDistribution.get(location) || 0) + 1);
	});

	const topLocations = Array.from(locationDistribution.entries())
		.sort((a, b) => b[1] - a[1])
		.slice(0, 10)
		.map(([name, count]) => ({ name, count }));

	return {
		activity,
		vehicleStats,
		recentEntries: recentEntries || [],
		monthlyStats,
		hourDistribution,
		topLocations,
		metrics: {
			totalVehicles: vehicleStats?.length || 0,
			totalFuel: vehicleStats?.reduce((sum, v) => sum + (v.total_fuel || 0), 0) || 0,
			totalDistance: vehicleStats?.reduce((sum, v) => sum + (v.total_distance || 0), 0) || 0,
			totalEntries: vehicleStats?.reduce((sum, v) => sum + (v.entry_count || 0), 0) || 0
		}
	};
};