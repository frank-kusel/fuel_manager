import { J as escape_html, P as ensure_array_like, G as attr_class, O as stringify, K as attr, B as pop, z as push } from "../../../../../chunks/index2.js";
import "@sveltejs/kit/internal";
import "../../../../../chunks/exports.js";
import "../../../../../chunks/utils.js";
import "../../../../../chunks/state.svelte.js";
import { f as formatNumber, C as Chart, a as formatDate } from "../../../../../chunks/Chart.js";
function _page($$payload, $$props) {
  push();
  let { data } = $$props;
  const { vehicle, fuelEntries, monthlyStats, metrics } = data;
  const consumptionChartData = () => {
    const chartData = monthlyStats.filter((entry) => entry.fuel_consumption_l_per_100km && entry.fuel_consumption_l_per_100km > 0).map((entry) => ({
      date: entry.entry_date,
      value: entry.fuel_consumption_l_per_100km
    }));
    return {
      labels: chartData.map((d) => formatDate(d.date, "short")),
      datasets: [
        {
          label: "Fuel Consumption (L/100km)",
          data: chartData.map((d) => d.value),
          borderColor: "rgb(59, 130, 246)",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          tension: 0.1
        }
      ]
    };
  };
  const dailyUsageChartData = () => {
    const dailyTotals = /* @__PURE__ */ new Map();
    monthlyStats.forEach((entry) => {
      const date = entry.entry_date;
      const current = dailyTotals.get(date) || 0;
      dailyTotals.set(date, current + (entry.litres_used || 0));
    });
    const sortedDates = Array.from(dailyTotals.keys()).sort();
    return {
      labels: sortedDates.map((d) => formatDate(d, "short")),
      datasets: [
        {
          label: "Daily Fuel Usage (L)",
          data: sortedDates.map((d) => dailyTotals.get(d)),
          backgroundColor: "rgba(34, 197, 94, 0.5)",
          borderColor: "rgb(34, 197, 94)",
          borderWidth: 1
        }
      ]
    };
  };
  const activityBreakdown = () => {
    const breakdown = /* @__PURE__ */ new Map();
    fuelEntries.forEach((entry) => {
      if (entry.activity) {
        const key = entry.activity.name;
        const current = breakdown.get(key) || {
          count: 0,
          fuel: 0,
          icon: entry.activity.icon,
          category: entry.activity.category
        };
        current.count++;
        current.fuel += entry.litres_used || 0;
        breakdown.set(key, current);
      }
    });
    return Array.from(breakdown.entries()).map(([name, data2]) => ({ name, ...data2 })).sort((a, b) => b.fuel - a.fuel);
  };
  let currentPage = 1;
  const itemsPerPage = 10;
  const totalPages = Math.ceil(fuelEntries.length / itemsPerPage);
  const paginatedEntries = () => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return fuelEntries.slice(start, end);
  };
  function getCategoryColor(category) {
    const colors = {
      planting: "bg-green-100 text-green-800",
      harvesting: "bg-yellow-100 text-yellow-800",
      spraying: "bg-blue-100 text-blue-800",
      fertilizing: "bg-purple-100 text-purple-800",
      maintenance: "bg-gray-100 text-gray-800",
      other: "bg-orange-100 text-orange-800"
    };
    return colors[category] || "bg-gray-100 text-gray-800";
  }
  const maintenanceAlerts = () => {
    const currentOdometer = vehicle.current_odometer || 0;
    const alerts = [];
    const intervals = {
      "Oil Change": { interval: 1e4, urgency: "warning" },
      "Air Filter": { interval: 15e3, urgency: "info" },
      "Hydraulic Service": { interval: 25e3, urgency: "warning" },
      "Major Service": { interval: 5e4, urgency: "critical" }
    };
    Object.entries(intervals).forEach(([service, config]) => {
      const nextService = Math.ceil(currentOdometer / config.interval) * config.interval;
      const kmRemaining = nextService - currentOdometer;
      if (kmRemaining <= 2e3) {
        alerts.push({
          service,
          nextService,
          kmRemaining,
          urgency: kmRemaining <= 500 ? "critical" : config.urgency
        });
      }
    });
    return alerts.sort((a, b) => a.kmRemaining - b.kmRemaining);
  };
  function getAlertColor(urgency) {
    const colors = {
      critical: "bg-red-50 border-red-200 text-red-800",
      warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
      info: "bg-blue-50 border-blue-200 text-blue-800"
    };
    return colors[urgency] || colors.info;
  }
  $$payload.out.push(`<div class="container mx-auto px-4 py-8 max-w-7xl"><div class="flex items-center justify-between mb-8"><div><button class="text-gray-500 hover:text-gray-700 mb-2 inline-flex items-center">← Back to Fleet</button> <h1 class="text-3xl font-bold text-gray-900">${escape_html(vehicle.name)} `);
  if (vehicle.registration) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<span class="text-gray-500 text-xl ml-2">(${escape_html(vehicle.registration)})</span>`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--></h1> <p class="text-gray-600 mt-1">${escape_html(vehicle.type)} • Code: ${escape_html(vehicle.code)} `);
  if (vehicle.make || vehicle.model) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`• ${escape_html(vehicle.make)} ${escape_html(vehicle.model)}`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--></p></div> <button class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">Edit Vehicle</button></div> <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8"><div class="bg-white rounded-lg shadow p-6"><div class="text-sm text-gray-600">Current Odometer</div> <div class="text-2xl font-bold text-gray-900">${escape_html(formatNumber(vehicle.current_odometer || 0))} ${escape_html(vehicle.odometer_unit || "km")}</div></div> <div class="bg-white rounded-lg shadow p-6"><div class="text-sm text-gray-600">Avg Consumption</div> <div class="text-2xl font-bold text-gray-900">`);
  if (vehicle.average_consumption_l_per_100km) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`${escape_html(vehicle.average_consumption_l_per_100km.toFixed(1))} L/100km`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`No data`);
  }
  $$payload.out.push(`<!--]--></div></div> <div class="bg-white rounded-lg shadow p-6"><div class="text-sm text-gray-600">Monthly Fuel</div> <div class="text-2xl font-bold text-gray-900">${escape_html(formatNumber(metrics.totalFuel))} L</div></div> <div class="bg-white rounded-lg shadow p-6"><div class="text-sm text-gray-600">Monthly Distance</div> <div class="text-2xl font-bold text-gray-900">${escape_html(formatNumber(metrics.totalDistance))} km</div></div> <div class="bg-white rounded-lg shadow p-6"><div class="text-sm text-gray-600">Data Quality</div> <div class="text-2xl font-bold text-gray-900">${escape_html(metrics.dataQuality.toFixed(0))}%</div> <div class="text-xs text-gray-500">Valid readings</div></div></div> `);
  if (maintenanceAlerts().length > 0) {
    $$payload.out.push("<!--[-->");
    const each_array = ensure_array_like(maintenanceAlerts());
    $$payload.out.push(`<div class="bg-white rounded-lg shadow p-6 mb-8"><h2 class="text-lg font-semibold mb-4 flex items-center"><span class="text-2xl mr-2">🔧</span> Maintenance Alerts</h2> <div class="grid gap-3"><!--[-->`);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let alert = each_array[$$index];
      $$payload.out.push(`<div${attr_class(`border rounded-lg p-4 ${stringify(getAlertColor(alert.urgency))}`)}><div class="flex items-center justify-between"><div><div class="font-medium">${escape_html(alert.service)}</div> <div class="text-sm opacity-75">Next service: ${escape_html(formatNumber(alert.nextService))} ${escape_html(vehicle.odometer_unit || "km")}</div></div> <div class="text-right"><div class="font-bold">${escape_html(alert.kmRemaining)} ${escape_html(vehicle.odometer_unit || "km")}</div> <div class="text-xs opacity-75">remaining</div></div></div></div>`);
    }
    $$payload.out.push(`<!--]--></div></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8"><div class="bg-white rounded-lg shadow p-6"><h2 class="text-lg font-semibold mb-4">Fuel Consumption Trend</h2> `);
  if (consumptionChartData().labels.length > 0) {
    $$payload.out.push("<!--[-->");
    Chart($$payload, {
      type: "line",
      data: consumptionChartData(),
      options: {},
      height: "250px"
    });
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<p class="text-gray-500 text-center py-8">No consumption data available</p>`);
  }
  $$payload.out.push(`<!--]--></div> <div class="bg-white rounded-lg shadow p-6"><h2 class="text-lg font-semibold mb-4">Daily Fuel Usage</h2> `);
  if (dailyUsageChartData().labels.length > 0) {
    $$payload.out.push("<!--[-->");
    Chart($$payload, {
      type: "bar",
      data: dailyUsageChartData(),
      options: {},
      height: "250px"
    });
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<p class="text-gray-500 text-center py-8">No usage data available</p>`);
  }
  $$payload.out.push(`<!--]--></div></div> <div class="bg-white rounded-lg shadow p-6 mb-8"><h2 class="text-lg font-semibold mb-4">Activity Breakdown</h2> `);
  if (activityBreakdown().length > 0) {
    $$payload.out.push("<!--[-->");
    const each_array_1 = ensure_array_like(activityBreakdown().slice(0, 6));
    $$payload.out.push(`<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"><!--[-->`);
    for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
      let activity = each_array_1[$$index_1];
      $$payload.out.push(`<div class="border rounded-lg p-4"><div class="flex items-center justify-between mb-2"><span class="text-2xl">${escape_html(activity.icon || "📋")}</span> <span${attr_class(`px-2 py-1 rounded text-xs font-medium ${getCategoryColor(activity.category)}`)}>${escape_html(activity.category)}</span></div> <div class="font-medium text-gray-900">${escape_html(activity.name)}</div> <div class="text-sm text-gray-600 mt-1">${escape_html(activity.count)} entries • ${escape_html(formatNumber(activity.fuel))} L</div> <div class="text-xs text-gray-500 mt-1">Avg: ${escape_html((activity.fuel / activity.count).toFixed(1))} L/entry</div></div>`);
    }
    $$payload.out.push(`<!--]--></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<p class="text-gray-500 text-center py-4">No activity data available</p>`);
  }
  $$payload.out.push(`<!--]--></div> <div class="bg-white rounded-lg shadow"><div class="px-6 py-4 border-b"><h2 class="text-lg font-semibold">Recent Fuel Entries</h2></div> `);
  if (fuelEntries.length > 0) {
    $$payload.out.push("<!--[-->");
    const each_array_2 = ensure_array_like(paginatedEntries());
    $$payload.out.push(`<div class="overflow-x-auto"><table class="w-full"><thead class="bg-gray-50 border-b"><tr><th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th><th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Driver</th><th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Activity</th><th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th><th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Distance</th><th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Fuel</th><th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">L/100km</th></tr></thead><tbody class="divide-y"><!--[-->`);
    for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
      let entry = each_array_2[$$index_2];
      $$payload.out.push(`<tr class="hover:bg-gray-50"><td class="px-4 py-3 text-sm">${escape_html(formatDate(entry.entry_date))} ${escape_html(entry.time)}</td><td class="px-4 py-3 text-sm">${escape_html(entry.driver?.name || "Unknown")}</td><td class="px-4 py-3 text-sm"><span class="inline-flex items-center">${escape_html(entry.activity?.icon || "📋")} <span class="ml-1">${escape_html(entry.activity?.name || "Unknown")}</span></span></td><td class="px-4 py-3 text-sm">${escape_html(entry.field?.name || entry.zone?.name || "-")}</td><td class="px-4 py-3 text-sm text-right">`);
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
      $$payload.out.push(`<div class="px-6 py-4 border-t flex items-center justify-between"><div class="text-sm text-gray-600">Showing ${escape_html((currentPage - 1) * itemsPerPage + 1)} to ${escape_html(Math.min(currentPage * itemsPerPage, fuelEntries.length))} of ${escape_html(fuelEntries.length)} entries</div> <div class="flex gap-2"><button${attr("disabled", currentPage === 1, true)}${attr_class(`px-3 py-1 rounded border ${stringify(
        "bg-gray-100 text-gray-400"
      )}`)}>Previous</button> <span class="px-3 py-1">Page ${escape_html(currentPage)} of ${escape_html(totalPages)}</span> <button${attr("disabled", currentPage === totalPages, true)}${attr_class(`px-3 py-1 rounded border ${stringify(currentPage === totalPages ? "bg-gray-100 text-gray-400" : "bg-white hover:bg-gray-50")}`)}>Next</button></div></div>`);
    } else {
      $$payload.out.push("<!--[!-->");
    }
    $$payload.out.push(`<!--]-->`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<div class="px-6 py-12 text-center text-gray-500">No fuel entries found for this vehicle</div>`);
  }
  $$payload.out.push(`<!--]--></div></div>`);
  pop();
}
export {
  _page as default
};
