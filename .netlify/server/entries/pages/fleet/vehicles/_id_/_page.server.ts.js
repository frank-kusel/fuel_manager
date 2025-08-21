import supabaseService from "../../../../../chunks/supabase.js";
import { error } from "@sveltejs/kit";
const load = async ({ params }) => {
  const { id } = params;
  await supabaseService.init();
  const supabase = supabaseService.getClient();
  const { data: vehicle, error: vehicleError } = await supabase.from("vehicles").select("*").eq("id", id).single();
  if (vehicleError || !vehicle) {
    throw error(404, "Vehicle not found");
  }
  const { data: fuelEntries, error: entriesError } = await supabase.from("fuel_entries").select(`
			*,
			driver:drivers(name, employee_code),
			activity:activities(name, category, icon),
			field:fields(name),
			zone:zones(name)
		`).eq("vehicle_id", id).order("entry_date", { ascending: false }).order("time", { ascending: false }).limit(100);
  const thirtyDaysAgo = /* @__PURE__ */ new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const { data: monthlyStats } = await supabase.from("fuel_entries").select("litres_used, odometer_start, odometer_end, fuel_consumption_l_per_100km, entry_date, activity_id").eq("vehicle_id", id).gte("entry_date", thirtyDaysAgo.toISOString().split("T")[0]).order("entry_date", { ascending: true });
  let activityStats = [];
  try {
    const result = await supabase.rpc("get_vehicle_activity_stats", { vehicle_id_param: id });
    activityStats = result.data || [];
  } catch (error2) {
    console.warn("Activity stats function not available:", error2);
  }
  const totalFuel = monthlyStats?.reduce((sum, entry) => sum + (entry.litres_used || 0), 0) || 0;
  const totalDistance = monthlyStats?.reduce((sum, entry) => {
    if (entry.odometer_end && entry.odometer_start) {
      return sum + (entry.odometer_end - entry.odometer_start);
    }
    return sum;
  }, 0) || 0;
  const validConsumptionEntries = monthlyStats?.filter((e) => e.fuel_consumption_l_per_100km && e.fuel_consumption_l_per_100km > 0) || [];
  const avgConsumption = validConsumptionEntries.length > 0 ? validConsumptionEntries.reduce((sum, e) => sum + e.fuel_consumption_l_per_100km, 0) / validConsumptionEntries.length : null;
  return {
    vehicle,
    fuelEntries: fuelEntries || [],
    monthlyStats: monthlyStats || [],
    activityStats,
    metrics: {
      totalFuel,
      totalDistance,
      avgConsumption,
      entriesCount: fuelEntries?.length || 0,
      dataQuality: validConsumptionEntries.length / (monthlyStats?.length || 1) * 100
    }
  };
};
export {
  load
};
