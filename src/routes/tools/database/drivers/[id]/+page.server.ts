import type { PageServerLoad } from './$types';
import supabaseService from '$lib/services/supabase';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
	const { id } = params;

	// Initialize Supabase
	await supabaseService.init();
	const supabase = supabaseService.getClient();

	// Fetch driver details
	const { data: driver, error: driverError } = await supabase
		.from('drivers')
		.select(`
			*,
			default_vehicle:vehicles(name, registration, type)
		`)
		.eq('id', id)
		.single();

	if (driverError || !driver) {
		throw error(404, 'Driver not found');
	}

	// Fetch performance statistics (handle missing function gracefully)
	let performanceStats = [];
	try {
		const result = await supabase
			.rpc('get_driver_performance_stats', { driver_id_param: id });
		performanceStats = result.data || [];
	} catch (error) {
		console.warn('Driver performance stats function not available:', error);
	}

	// Fetch recent fuel entries
	const { data: recentEntries } = await supabase
		.from('fuel_entries')
		.select(`
			*,
			vehicle:vehicles(name, registration, type),
			activity:activities(name, category, icon),
			field:fields(name),
			zone:zones(name)
		`)
		.eq('driver_id', id)
		.order('entry_date', { ascending: false })
		.order('time', { ascending: false })
		.limit(100);

	// Calculate monthly statistics
	const thirtyDaysAgo = new Date();
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
	
	const { data: monthlyData } = await supabase
		.from('fuel_entries')
		.select('entry_date, litres_used, odometer_start, odometer_end, vehicle_id, activity_id, fuel_consumption_l_per_100km')
		.eq('driver_id', id)
		.gte('entry_date', thirtyDaysAgo.toISOString().split('T')[0]);

	// Group by vehicle
	const vehicleUsage = new Map();
	const activityBreakdown = new Map();
	let totalFuel = 0;
	let totalDistance = 0;
	let validConsumptionCount = 0;
	let totalConsumption = 0;

	monthlyData?.forEach(entry => {
		// Vehicle usage
		const vehicleCount = vehicleUsage.get(entry.vehicle_id) || 0;
		vehicleUsage.set(entry.vehicle_id, vehicleCount + 1);

		// Activity breakdown
		const activityData = activityBreakdown.get(entry.activity_id) || { count: 0, fuel: 0 };
		activityData.count++;
		activityData.fuel += entry.litres_used || 0;
		activityBreakdown.set(entry.activity_id, activityData);

		// Totals
		totalFuel += entry.litres_used || 0;
		if (entry.odometer_end && entry.odometer_start) {
			totalDistance += entry.odometer_end - entry.odometer_start;
		}
		if (entry.fuel_consumption_l_per_100km && entry.fuel_consumption_l_per_100km > 0) {
			validConsumptionCount++;
			totalConsumption += entry.fuel_consumption_l_per_100km;
		}
	});

	// Get vehicle names for usage chart
	const vehicleIds = Array.from(vehicleUsage.keys());
	const { data: vehicles } = await supabase
		.from('vehicles')
		.select('id, name')
		.in('id', vehicleIds.length > 0 ? vehicleIds : ['']);

	const vehicleUsageData = vehicles?.map(v => ({
		name: v.name,
		count: vehicleUsage.get(v.id) || 0
	})).sort((a, b) => b.count - a.count) || [];

	// Get activity details for breakdown
	const activityIds = Array.from(activityBreakdown.keys());
	const { data: activities } = await supabase
		.from('activities')
		.select('id, name, icon, category')
		.in('id', activityIds.length > 0 ? activityIds : ['']);

	const activityData = activities?.map(a => ({
		name: a.name,
		icon: a.icon,
		category: a.category,
		...activityBreakdown.get(a.id)
	})).sort((a, b) => b.fuel - a.fuel) || [];

	// Calculate weekly trend
	const weeklyTrend = new Map();
	recentEntries?.forEach(entry => {
		const date = new Date(entry.entry_date);
		const weekStart = new Date(date);
		weekStart.setDate(date.getDate() - date.getDay());
		const weekKey = weekStart.toISOString().split('T')[0];
		
		const weekData = weeklyTrend.get(weekKey) || { entries: 0, fuel: 0, distance: 0 };
		weekData.entries++;
		weekData.fuel += entry.litres_used || 0;
		if (entry.odometer_end && entry.odometer_start) {
			weekData.distance += entry.odometer_end - entry.odometer_start;
		}
		weeklyTrend.set(weekKey, weekData);
	});

	const weeklyData = Array.from(weeklyTrend.entries())
		.map(([week, data]) => ({ week, ...data }))
		.sort((a, b) => b.week.localeCompare(a.week))
		.slice(0, 8)
		.reverse();

	return {
		driver,
		performanceStats,
		recentEntries: recentEntries || [],
		vehicleUsageData,
		activityData,
		weeklyData,
		metrics: {
			totalFuel,
			totalDistance,
			avgConsumption: validConsumptionCount > 0 ? totalConsumption / validConsumptionCount : null,
			entriesThisMonth: monthlyData?.length || 0,
			vehiclesUsed: vehicleUsage.size,
			activitiesPerformed: activityBreakdown.size
		}
	};
};