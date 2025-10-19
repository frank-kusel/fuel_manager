import { J as escape_html, G as attr_class, M as ensure_array_like, Q as clsx, K as attr, P as stringify, B as pop, z as push } from "../../../../../../chunks/index2.js";
import "@sveltejs/kit/internal";
import "../../../../../../chunks/exports.js";
import "../../../../../../chunks/utils.js";
import "../../../../../../chunks/state.svelte.js";
import { f as formatNumber, C as Chart } from "../../../../../../chunks/Chart.js";
function _page($$payload, $$props) {
  push();
  let { data } = $$props;
  const {
    activity,
    vehicleStats,
    recentEntries,
    monthlyStats,
    hourDistribution,
    topLocations,
    metrics
  } = data;
  const monthlyTrendData = () => {
    return {
      labels: monthlyStats.map((m) => {
        const [year, month] = m.month.split("-");
        return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
      }),
      datasets: [
        {
          label: "Fuel Usage (L)",
          data: monthlyStats.map((m) => m.fuel),
          borderColor: "rgb(59, 130, 246)",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          yAxisID: "y"
        },
        {
          label: "Activity Count",
          data: monthlyStats.map((m) => m.entries),
          borderColor: "rgb(34, 197, 94)",
          backgroundColor: "rgba(34, 197, 94, 0.1)",
          yAxisID: "y1"
        }
      ]
    };
  };
  const hourChartData = () => {
    const labels = Array.from({ length: 24 }, (_, i) => `${i}:00`);
    return {
      labels,
      datasets: [
        {
          label: "Activities by Hour",
          data: hourDistribution,
          backgroundColor: "rgba(168, 85, 247, 0.5)",
          borderColor: "rgb(168, 85, 247)",
          borderWidth: 1
        }
      ]
    };
  };
  const vehicleEfficiencyData = () => {
    const sorted = [...vehicleStats].sort((a, b) => (b.avg_consumption || 0) - (a.avg_consumption || 0));
    return {
      labels: sorted.slice(0, 10).map((v) => v.vehicle_name),
      datasets: [
        {
          label: "Avg Consumption (L/100km)",
          data: sorted.slice(0, 10).map((v) => v.avg_consumption || 0),
          backgroundColor: sorted.slice(0, 10).map((_, i) => i < 3 ? "rgba(239, 68, 68, 0.5)" : "rgba(59, 130, 246, 0.5)"),
          borderColor: sorted.slice(0, 10).map((_, i) => i < 3 ? "rgb(239, 68, 68)" : "rgb(59, 130, 246)"),
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
  const totalPages = Math.ceil(vehicleStats.length / itemsPerPage);
  const paginatedVehicles = () => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return vehicleStats.slice(start, end);
  };
  $$payload.out.push(`<div class="container mx-auto px-4 py-8 max-w-7xl"><div class="flex items-center justify-between mb-8"><div><button class="text-gray-500 hover:text-gray-700 mb-2 inline-flex items-center">← Back to Fleet</button> <h1 class="text-3xl font-bold text-gray-900 flex items-center gap-3"><span class="text-4xl">${escape_html(activity.icon || "📋")}</span> ${escape_html(activity.name)} `);
  if (activity.name_zulu) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<span class="text-gray-500 text-xl">(${escape_html(activity.name_zulu)})</span>`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--></h1> <div class="flex items-center gap-4 mt-2"><span${attr_class(`px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor(activity.category)}`)}>${escape_html(activity.category)}</span> <p class="text-gray-600">Code: ${escape_html(activity.code)}</p></div> `);
  if (activity.description) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<p class="text-gray-600 mt-2">${escape_html(activity.description)}</p>`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--></div> <button class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">Edit Activity</button></div> <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"><div class="bg-white rounded-lg shadow p-6"><div class="text-sm text-gray-600">Total Vehicles</div> <div class="text-2xl font-bold text-gray-900">${escape_html(metrics.totalVehicles)}</div> <div class="text-xs text-gray-500">Using this activity</div></div> <div class="bg-white rounded-lg shadow p-6"><div class="text-sm text-gray-600">Total Fuel Used</div> <div class="text-2xl font-bold text-gray-900">${escape_html(formatNumber(metrics.totalFuel))} L</div> <div class="text-xs text-gray-500">All time</div></div> <div class="bg-white rounded-lg shadow p-6"><div class="text-sm text-gray-600">Total Distance</div> <div class="text-2xl font-bold text-gray-900">${escape_html(formatNumber(metrics.totalDistance))} km</div> <div class="text-xs text-gray-500">All time</div></div> <div class="bg-white rounded-lg shadow p-6"><div class="text-sm text-gray-600">Total Entries</div> <div class="text-2xl font-bold text-gray-900">${escape_html(formatNumber(metrics.totalEntries))}</div> <div class="text-xs text-gray-500">All time</div></div></div> <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8"><div class="bg-white rounded-lg shadow p-6"><h2 class="text-lg font-semibold mb-4">Monthly Trend</h2> `);
  if (monthlyStats.length > 0) {
    $$payload.out.push("<!--[-->");
    Chart($$payload, {
      type: "line",
      data: monthlyTrendData(),
      options: {},
      height: "250px"
    });
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<p class="text-gray-500 text-center py-8">No trend data available</p>`);
  }
  $$payload.out.push(`<!--]--></div> <div class="bg-white rounded-lg shadow p-6"><h2 class="text-lg font-semibold mb-4">Peak Activity Hours</h2> `);
  Chart($$payload, {
    type: "bar",
    data: hourChartData(),
    options: {},
    height: "250px"
  });
  $$payload.out.push(`<!----></div></div> <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8"><div class="bg-white rounded-lg shadow p-6"><h2 class="text-lg font-semibold mb-4">Vehicle Efficiency Comparison</h2> `);
  if (vehicleStats.length > 0) {
    $$payload.out.push("<!--[-->");
    Chart($$payload, {
      type: "bar",
      data: vehicleEfficiencyData(),
      options: {},
      height: "250px"
    });
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<p class="text-gray-500 text-center py-8">No efficiency data available</p>`);
  }
  $$payload.out.push(`<!--]--></div> <div class="bg-white rounded-lg shadow p-6"><h2 class="text-lg font-semibold mb-4">Top Locations</h2> `);
  if (topLocations.length > 0) {
    $$payload.out.push("<!--[-->");
    const each_array = ensure_array_like(topLocations);
    $$payload.out.push(`<div class="space-y-2"><!--[-->`);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let location = each_array[$$index];
      $$payload.out.push(`<div class="flex justify-between items-center py-2 border-b"><span class="text-sm font-medium text-gray-900">${escape_html(location.name)}</span> <span class="text-sm text-gray-600">${escape_html(location.count)} activities</span></div>`);
    }
    $$payload.out.push(`<!--]--></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<p class="text-gray-500 text-center py-8">No location data available</p>`);
  }
  $$payload.out.push(`<!--]--></div></div> <div class="bg-white rounded-lg shadow mb-8"><div class="px-6 py-4 border-b"><h2 class="text-lg font-semibold">Vehicle Performance</h2></div> `);
  if (vehicleStats.length > 0) {
    $$payload.out.push("<!--[-->");
    const each_array_1 = ensure_array_like(paginatedVehicles());
    $$payload.out.push(`<div class="overflow-x-auto"><table class="w-full"><thead class="bg-gray-50 border-b"><tr><th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th><th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th><th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Entries</th><th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Fuel</th><th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg per Entry</th><th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Distance</th><th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg L/100km</th><th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th></tr></thead><tbody class="divide-y"><!--[-->`);
    for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
      let vehicle = each_array_1[$$index_1];
      $$payload.out.push(`<tr class="hover:bg-gray-50"><td class="px-4 py-3 text-sm font-medium">${escape_html(vehicle.vehicle_name)} `);
      if (vehicle.vehicle_registration) {
        $$payload.out.push("<!--[-->");
        $$payload.out.push(`<span class="text-gray-500 text-xs">(${escape_html(vehicle.vehicle_registration)})</span>`);
      } else {
        $$payload.out.push("<!--[!-->");
      }
      $$payload.out.push(`<!--]--></td><td class="px-4 py-3 text-sm">${escape_html(vehicle.vehicle_type)}</td><td class="px-4 py-3 text-sm text-right">${escape_html(vehicle.entry_count)}</td><td class="px-4 py-3 text-sm text-right">${escape_html(formatNumber(vehicle.total_fuel))} L</td><td class="px-4 py-3 text-sm text-right">${escape_html(vehicle.avg_fuel_per_entry.toFixed(1))} L</td><td class="px-4 py-3 text-sm text-right">${escape_html(formatNumber(vehicle.total_distance))} km</td><td class="px-4 py-3 text-sm text-right">`);
      if (vehicle.avg_consumption > 0) {
        $$payload.out.push("<!--[-->");
        $$payload.out.push(`<span${attr_class(clsx(vehicle.avg_consumption > 30 ? "text-red-600 font-medium" : ""))}>${escape_html(vehicle.avg_consumption.toFixed(1))}</span>`);
      } else {
        $$payload.out.push("<!--[!-->");
        $$payload.out.push(`-`);
      }
      $$payload.out.push(`<!--]--></td><td class="px-4 py-3 text-sm text-center"><a${attr("href", `/fleet/vehicles/${stringify(vehicle.vehicle_id)}`)} class="text-blue-600 hover:text-blue-800">View Details →</a></td></tr>`);
    }
    $$payload.out.push(`<!--]--></tbody></table></div> `);
    if (totalPages > 1) {
      $$payload.out.push("<!--[-->");
      $$payload.out.push(`<div class="px-6 py-4 border-t flex items-center justify-between"><div class="text-sm text-gray-600">Showing ${escape_html((currentPage - 1) * itemsPerPage + 1)} to ${escape_html(Math.min(currentPage * itemsPerPage, vehicleStats.length))} of ${escape_html(vehicleStats.length)} vehicles</div> <div class="flex gap-2"><button${attr("disabled", currentPage === 1, true)}${attr_class(`px-3 py-1 rounded border ${stringify(
        "bg-gray-100 text-gray-400"
      )}`)}>Previous</button> <span class="px-3 py-1">Page ${escape_html(currentPage)} of ${escape_html(totalPages)}</span> <button${attr("disabled", currentPage === totalPages, true)}${attr_class(`px-3 py-1 rounded border ${stringify(currentPage === totalPages ? "bg-gray-100 text-gray-400" : "bg-white hover:bg-gray-50")}`)}>Next</button></div></div>`);
    } else {
      $$payload.out.push("<!--[!-->");
    }
    $$payload.out.push(`<!--]-->`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<div class="px-6 py-12 text-center text-gray-500">No vehicle performance data available for this activity</div>`);
  }
  $$payload.out.push(`<!--]--></div></div>`);
  pop();
}
export {
  _page as default
};
