import { J as escape_html, M as ensure_array_like, G as attr_class, K as attr, B as pop, z as push, P as stringify } from "../../../../../../chunks/index2.js";
import "@sveltejs/kit/internal";
import "../../../../../../chunks/exports.js";
import "../../../../../../chunks/utils.js";
import "../../../../../../chunks/state.svelte.js";
import { a as formatDate, f as formatNumber, C as Chart } from "../../../../../../chunks/Chart.js";
function _page($$payload, $$props) {
  push();
  let { data } = $$props;
  const {
    driver,
    performanceStats,
    recentEntries,
    vehicleUsageData,
    activityData,
    weeklyData,
    metrics
  } = data;
  const vehicleUsageChartData = () => {
    return {
      labels: vehicleUsageData.map((v) => v.name),
      datasets: [
        {
          label: "Times Used",
          data: vehicleUsageData.map((v) => v.count),
          backgroundColor: [
            "rgba(59, 130, 246, 0.5)",
            "rgba(34, 197, 94, 0.5)",
            "rgba(251, 191, 36, 0.5)",
            "rgba(239, 68, 68, 0.5)",
            "rgba(168, 85, 247, 0.5)"
          ],
          borderColor: [
            "rgb(59, 130, 246)",
            "rgb(34, 197, 94)",
            "rgb(251, 191, 36)",
            "rgb(239, 68, 68)",
            "rgb(168, 85, 247)"
          ],
          borderWidth: 1
        }
      ]
    };
  };
  const weeklyTrendChartData = () => {
    return {
      labels: weeklyData.map((w) => {
        const date = new Date(w.week);
        return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
      }),
      datasets: [
        {
          label: "Fuel Used (L)",
          data: weeklyData.map((w) => w.fuel),
          borderColor: "rgb(59, 130, 246)",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          yAxisID: "y"
        },
        {
          label: "Distance (km)",
          data: weeklyData.map((w) => w.distance),
          borderColor: "rgb(34, 197, 94)",
          backgroundColor: "rgba(34, 197, 94, 0.1)",
          yAxisID: "y1"
        }
      ]
    };
  };
  const activityFuelChartData = () => {
    const topActivities = activityData.slice(0, 6);
    return {
      labels: topActivities.map((a) => a.name),
      datasets: [
        {
          label: "Fuel Used (L)",
          data: topActivities.map((a) => a.fuel),
          backgroundColor: "rgba(251, 191, 36, 0.5)",
          borderColor: "rgb(251, 191, 36)",
          borderWidth: 1
        }
      ]
    };
  };
  function getCategoryColor(category) {
    const colors = {
      planting: "bg-green-100 text-green-800",
      harvesting: "bg-yellow-100 text-yellow-800",
      spraying: "bg-blue-100 text-blue-800",
      fertilizing: "bg-purple-100 text-purple-800",
      maintenance: "bg-gray-100 text-gray-800",
      field_prep: "bg-orange-100 text-orange-800",
      transport: "bg-indigo-100 text-indigo-800",
      monitoring: "bg-teal-100 text-teal-800",
      other: "bg-pink-100 text-pink-800"
    };
    return colors[category] || "bg-gray-100 text-gray-800";
  }
  let currentPage = 1;
  const itemsPerPage = 10;
  const totalPages = Math.ceil(recentEntries.length / itemsPerPage);
  const paginatedEntries = () => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return recentEntries.slice(start, end);
  };
  $$payload.out.push(`<div class="container mx-auto px-4 py-8 max-w-7xl"><div class="flex items-center justify-between mb-8"><div><button class="text-gray-500 hover:text-gray-700 mb-2 inline-flex items-center">← Back to Fleet</button> <h1 class="text-3xl font-bold text-gray-900">${escape_html(driver.name)} <span class="text-gray-500 text-xl ml-2">(${escape_html(driver.employee_code)})</span></h1> <div class="flex items-center gap-4 mt-2 text-gray-600">`);
  if (driver.phone) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<span>📞 ${escape_html(driver.phone)}</span>`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> `);
  if (driver.email) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<span>✉️ ${escape_html(driver.email)}</span>`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> `);
  if (driver.default_vehicle) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<span>🚛 Default: ${escape_html(driver.default_vehicle.name)}</span>`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--></div> `);
  if (driver.license_number) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="text-sm text-gray-500 mt-1">License: ${escape_html(driver.license_number)} `);
    if (driver.license_expiry) {
      $$payload.out.push("<!--[-->");
      $$payload.out.push(`(Expires: ${escape_html(formatDate(driver.license_expiry))})`);
    } else {
      $$payload.out.push("<!--[!-->");
    }
    $$payload.out.push(`<!--]--></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--></div> <button class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">Edit Driver</button></div> <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8"><div class="bg-white rounded-lg shadow p-6"><div class="text-sm text-gray-600">Entries</div> <div class="text-2xl font-bold text-gray-900">${escape_html(metrics.entriesThisMonth)}</div> <div class="text-xs text-gray-500">This month</div></div> <div class="bg-white rounded-lg shadow p-6"><div class="text-sm text-gray-600">Fuel Used</div> <div class="text-2xl font-bold text-gray-900">${escape_html(formatNumber(metrics.totalFuel))} L</div> <div class="text-xs text-gray-500">This month</div></div> <div class="bg-white rounded-lg shadow p-6"><div class="text-sm text-gray-600">Distance</div> <div class="text-2xl font-bold text-gray-900">${escape_html(formatNumber(metrics.totalDistance))} km</div> <div class="text-xs text-gray-500">This month</div></div> <div class="bg-white rounded-lg shadow p-6"><div class="text-sm text-gray-600">Avg L/100km</div> <div class="text-2xl font-bold text-gray-900">`);
  if (metrics.avgConsumption) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`${escape_html(metrics.avgConsumption.toFixed(1))}`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`-`);
  }
  $$payload.out.push(`<!--]--></div> <div class="text-xs text-gray-500">This month</div></div> <div class="bg-white rounded-lg shadow p-6"><div class="text-sm text-gray-600">Vehicles</div> <div class="text-2xl font-bold text-gray-900">${escape_html(metrics.vehiclesUsed)}</div> <div class="text-xs text-gray-500">Used this month</div></div> <div class="bg-white rounded-lg shadow p-6"><div class="text-sm text-gray-600">Activities</div> <div class="text-2xl font-bold text-gray-900">${escape_html(metrics.activitiesPerformed)}</div> <div class="text-xs text-gray-500">Types performed</div></div></div> <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8"><div class="bg-white rounded-lg shadow p-6"><h2 class="text-lg font-semibold mb-4">Vehicle Usage</h2> `);
  if (vehicleUsageData.length > 0) {
    $$payload.out.push("<!--[-->");
    Chart($$payload, {
      type: "doughnut",
      data: vehicleUsageChartData(),
      options: {},
      height: "250px"
    });
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<p class="text-gray-500 text-center py-8">No vehicle usage data</p>`);
  }
  $$payload.out.push(`<!--]--></div> <div class="bg-white rounded-lg shadow p-6 lg:col-span-2"><h2 class="text-lg font-semibold mb-4">Weekly Performance</h2> `);
  if (weeklyData.length > 0) {
    $$payload.out.push("<!--[-->");
    Chart($$payload, {
      type: "line",
      data: weeklyTrendChartData(),
      options: {},
      height: "250px"
    });
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<p class="text-gray-500 text-center py-8">No weekly data available</p>`);
  }
  $$payload.out.push(`<!--]--></div></div> <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8"><div class="bg-white rounded-lg shadow p-6"><h2 class="text-lg font-semibold mb-4">Activity Fuel Consumption</h2> `);
  if (activityData.length > 0) {
    $$payload.out.push("<!--[-->");
    Chart($$payload, {
      type: "bar",
      data: activityFuelChartData(),
      options: {},
      height: "250px"
    });
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<p class="text-gray-500 text-center py-8">No activity data available</p>`);
  }
  $$payload.out.push(`<!--]--></div> <div class="bg-white rounded-lg shadow p-6"><h2 class="text-lg font-semibold mb-4">Activity Details</h2> `);
  if (activityData.length > 0) {
    $$payload.out.push("<!--[-->");
    const each_array = ensure_array_like(activityData.slice(0, 6));
    $$payload.out.push(`<div class="space-y-3"><!--[-->`);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let activity = each_array[$$index];
      $$payload.out.push(`<div class="flex items-center justify-between p-3 border rounded-lg"><div class="flex items-center gap-3"><span class="text-2xl">${escape_html(activity.icon || "📋")}</span> <div><div class="font-medium">${escape_html(activity.name)}</div> <span${attr_class(`text-xs px-2 py-1 rounded ${getCategoryColor(activity.category)}`)}>${escape_html(activity.category)}</span></div></div> <div class="text-right"><div class="font-medium">${escape_html(activity.count)} times</div> <div class="text-sm text-gray-600">${escape_html(formatNumber(activity.fuel))} L</div></div></div>`);
    }
    $$payload.out.push(`<!--]--></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<p class="text-gray-500 text-center py-8">No activity data available</p>`);
  }
  $$payload.out.push(`<!--]--></div></div> <div class="bg-white rounded-lg shadow"><div class="px-6 py-4 border-b"><h2 class="text-lg font-semibold">Recent Fuel Entries</h2></div> `);
  if (recentEntries.length > 0) {
    $$payload.out.push("<!--[-->");
    const each_array_1 = ensure_array_like(paginatedEntries());
    $$payload.out.push(`<div class="overflow-x-auto"><table class="w-full"><thead class="bg-gray-50 border-b"><tr><th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th><th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th><th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Activity</th><th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th><th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Distance</th><th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Fuel</th><th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">L/100km</th></tr></thead><tbody class="divide-y"><!--[-->`);
    for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
      let entry = each_array_1[$$index_1];
      $$payload.out.push(`<tr class="hover:bg-gray-50"><td class="px-4 py-3 text-sm">${escape_html(formatDate(entry.entry_date))} ${escape_html(entry.time)}</td><td class="px-4 py-3 text-sm">${escape_html(entry.vehicle?.name || "Unknown")} `);
      if (entry.vehicle?.registration) {
        $$payload.out.push("<!--[-->");
        $$payload.out.push(`<span class="text-gray-500 text-xs">(${escape_html(entry.vehicle.registration)})</span>`);
      } else {
        $$payload.out.push("<!--[!-->");
      }
      $$payload.out.push(`<!--]--></td><td class="px-4 py-3 text-sm"><span class="inline-flex items-center">${escape_html(entry.activity?.icon || "📋")} <span class="ml-1">${escape_html(entry.activity?.name || "Unknown")}</span></span></td><td class="px-4 py-3 text-sm">${escape_html(entry.field?.name || entry.zone?.name || "-")}</td><td class="px-4 py-3 text-sm text-right">`);
      if (entry.odometer_end && entry.odometer_start) {
        $$payload.out.push("<!--[-->");
        $$payload.out.push(`${escape_html(entry.odometer_end - entry.odometer_start)} km`);
      } else {
        $$payload.out.push("<!--[!-->");
        $$payload.out.push(`-`);
      }
      $$payload.out.push(`<!--]--></td><td class="px-4 py-3 text-sm text-right">${escape_html(formatNumber(entry.litres_used))} L</td><td class="px-4 py-3 text-sm text-right">`);
      if (entry.fuel_consumption_l_per_100km) {
        $$payload.out.push("<!--[-->");
        $$payload.out.push(`${escape_html(entry.fuel_consumption_l_per_100km.toFixed(1))}`);
      } else {
        $$payload.out.push("<!--[!-->");
        $$payload.out.push(`-`);
      }
      $$payload.out.push(`<!--]--></td></tr>`);
    }
    $$payload.out.push(`<!--]--></tbody></table></div> `);
    if (totalPages > 1) {
      $$payload.out.push("<!--[-->");
      $$payload.out.push(`<div class="px-6 py-4 border-t flex items-center justify-between"><div class="text-sm text-gray-600">Showing ${escape_html((currentPage - 1) * itemsPerPage + 1)} to ${escape_html(Math.min(currentPage * itemsPerPage, recentEntries.length))} of ${escape_html(recentEntries.length)} entries</div> <div class="flex gap-2"><button${attr("disabled", currentPage === 1, true)}${attr_class(`px-3 py-1 rounded border ${stringify(
        "bg-gray-100 text-gray-400"
      )}`)}>Previous</button> <span class="px-3 py-1">Page ${escape_html(currentPage)} of ${escape_html(totalPages)}</span> <button${attr("disabled", currentPage === totalPages, true)}${attr_class(`px-3 py-1 rounded border ${stringify(currentPage === totalPages ? "bg-gray-100 text-gray-400" : "bg-white hover:bg-gray-50")}`)}>Next</button></div></div>`);
    } else {
      $$payload.out.push("<!--[!-->");
    }
    $$payload.out.push(`<!--]-->`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<div class="px-6 py-12 text-center text-gray-500">No fuel entries found for this driver</div>`);
  }
  $$payload.out.push(`<!--]--></div></div>`);
  pop();
}
export {
  _page as default
};
