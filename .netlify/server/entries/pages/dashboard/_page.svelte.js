import { J as escape_html, B as pop, z as push, G as attr_class, M as ensure_array_like, K as attr, N as maybe_selected, F as head, E as store_get, I as unsubscribe_stores } from "../../../chunks/index2.js";
import "clsx";
/* empty css                                                 */
/* empty css                                                   */
import { B as Button } from "../../../chunks/Button.js";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { d as derived, w as writable } from "../../../chunks/index.js";
function DashboardStats($$payload, $$props) {
  push();
  let { stats, loading = false } = $$props;
  function formatNumber(num) {
    return new Intl.NumberFormat("en-ZA").format(num);
  }
  function formatDecimal(num, decimals = 1) {
    return num.toFixed(decimals);
  }
  $$payload.out.push(`<div class="dashboard-overview svelte-11dm7j6"><div class="secondary-metrics svelte-11dm7j6"><div class="metric-card compact svelte-11dm7j6"><div class="compact-header svelte-11dm7j6">Past 7 Days</div> `);
  if (loading) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="compact-skeleton svelte-11dm7j6"></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<div class="compact-value svelte-11dm7j6">${escape_html(formatDecimal(stats?.weeklyFuel || 0))}L</div> <div class="compact-subtitle svelte-11dm7j6">${escape_html(stats?.entriesThisWeek || 0)} entries</div>`);
  }
  $$payload.out.push(`<!--]--></div> <div class="metric-card compact svelte-11dm7j6"><div class="compact-header svelte-11dm7j6">This Month</div> `);
  if (loading) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="compact-skeleton svelte-11dm7j6"></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<div class="compact-value svelte-11dm7j6">${escape_html(formatDecimal(stats?.monthlyFuel || 0))}L</div> <div class="compact-subtitle svelte-11dm7j6">${escape_html(formatNumber(stats?.monthlyDistance || 0))} km</div>`);
  }
  $$payload.out.push(`<!--]--></div> <div class="metric-card compact svelte-11dm7j6"><div class="compact-header svelte-11dm7j6">Previous Month</div> `);
  if (loading) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="compact-skeleton svelte-11dm7j6"></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<div class="compact-value svelte-11dm7j6">${escape_html(formatDecimal(stats?.previousMonthFuel || 0))}L</div> <div class="compact-subtitle svelte-11dm7j6">fuel used</div>`);
  }
  $$payload.out.push(`<!--]--></div> <div class="metric-card compact svelte-11dm7j6"><div class="compact-header svelte-11dm7j6">Bowser Reading</div> `);
  if (loading) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="compact-skeleton svelte-11dm7j6"></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<div class="compact-value svelte-11dm7j6">${escape_html(formatDecimal(stats?.bowserReading || 0))}</div> <div class="compact-subtitle svelte-11dm7j6">litres</div>`);
  }
  $$payload.out.push(`<!--]--></div></div></div>`);
  pop();
}
function RecentActivity($$payload, $$props) {
  push();
  let { loading = false } = $$props;
  let allEntries = [];
  let isLoadingMore = false;
  let showMissingData = false;
  let showOutsideRange = false;
  let weeksToShow = 1;
  function groupEntriesByDate(entries) {
    const groups = {};
    if (!Array.isArray(entries)) {
      return groups;
    }
    entries.forEach((entry, index) => {
      try {
        if (!entry || !entry.entry_date) {
          console.warn("Entry missing entry_date:", entry);
          return;
        }
        const date = new Date(entry.entry_date);
        const dateKey = formatDateGroup(date);
        if (!groups[dateKey]) {
          groups[dateKey] = [];
        }
        groups[dateKey].push(entry);
      } catch (error) {
        console.error("Error processing entry", index, entry, error);
      }
    });
    return groups;
  }
  function formatDateGroup(date) {
    if (!date || isNaN(date.getTime())) {
      return "Invalid Date";
    }
    const today = /* @__PURE__ */ new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-ZA", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      });
    }
  }
  function getUsage(entry) {
    if (entry.gauge_working === false) {
      return "-";
    }
    if (entry.odometer_start && entry.odometer_end) {
      const diff = entry.odometer_end - entry.odometer_start;
      const unit = entry.vehicles?.odometer_unit || "km";
      if (unit === "hours" || unit === "hr") {
        return `${Math.round(diff * 10) / 10}hr`;
      } else {
        return `${Math.round(diff * 10) / 10}km`;
      }
    }
    return "-";
  }
  function getFuelConsumptionWithAverage(entry) {
    if (entry.fuel_consumption_l_per_100km) {
      const unit = entry.vehicles?.odometer_unit || "km";
      const currentValue = Math.round(entry.fuel_consumption_l_per_100km * 10) / 10;
      const unitSuffix = unit === "hr" ? "L/hr" : "L/100km";
      if (entry.vehicles?.average_consumption_l_per_100km) {
        const avgValue = Math.round(entry.vehicles.average_consumption_l_per_100km * 10) / 10;
        const difference = Math.abs(currentValue - avgValue);
        let colorClass = "consumption-neutral";
        if (difference > 2) {
          colorClass = "consumption-bad";
        }
        return {
          current: currentValue,
          average: avgValue,
          unit: unitSuffix,
          hasAverage: true,
          colorClass
        };
      } else {
        return {
          current: currentValue,
          unit: unitSuffix,
          hasAverage: false,
          colorClass: "consumption-neutral"
          // No color
        };
      }
    }
    return {
      current: "-",
      hasAverage: false,
      colorClass: "consumption-neutral"
    };
  }
  const filteredEntries = (() => {
    if (!Array.isArray(allEntries)) {
      return [];
    }
    const weeksAgo = /* @__PURE__ */ new Date();
    weeksAgo.setDate(weeksAgo.getDate() - weeksToShow * 7);
    let filtered = allEntries.filter((entry) => {
      if (!entry.entry_date) return false;
      const entryDate = new Date(entry.entry_date);
      return entryDate >= weeksAgo;
    });
    return filtered;
  })();
  const groupedEntries = groupEntriesByDate(filteredEntries);
  const dateGroups = Object.keys(groupedEntries);
  (() => {
    if (!Array.isArray(allEntries)) return false;
    const currentWeeksAgo = /* @__PURE__ */ new Date();
    currentWeeksAgo.setDate(currentWeeksAgo.getDate() - weeksToShow * 7);
    return allEntries.some((entry) => {
      if (!entry.entry_date) return false;
      const entryDate = new Date(entry.entry_date);
      return entryDate < currentWeeksAgo;
    });
  })();
  $$payload.out.push(`<div class="fuel-activity svelte-1odhcgl"><div class="activity-header svelte-1odhcgl"><h3 class="svelte-1odhcgl">Recent Fuel Activity</h3> <div class="filter-buttons svelte-1odhcgl"><button${attr_class("filter-btn svelte-1odhcgl", void 0, { "active": showMissingData })}>Missing Data</button> <button${attr_class("filter-btn svelte-1odhcgl", void 0, { "active": showOutsideRange })}>Outside Range</button></div></div> `);
  if (loading) {
    $$payload.out.push("<!--[-->");
    const each_array = ensure_array_like(Array(6));
    $$payload.out.push(`<div class="loading-grid svelte-1odhcgl"><!--[-->`);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      each_array[$$index];
      $$payload.out.push(`<div class="entry-skeleton svelte-1odhcgl"><div class="skeleton-header svelte-1odhcgl"></div> <div class="skeleton-content svelte-1odhcgl"><div class="skeleton-bar svelte-1odhcgl"></div> <div class="skeleton-text svelte-1odhcgl"></div></div></div>`);
    }
    $$payload.out.push(`<!--]--></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
    if (allEntries.length === 0) {
      $$payload.out.push("<!--[-->");
      $$payload.out.push(`<div class="empty-state svelte-1odhcgl"><div class="empty-visual svelte-1odhcgl"><div class="fuel-drop svelte-1odhcgl"></div></div> <h4 class="svelte-1odhcgl">No recent activity</h4> <p class="svelte-1odhcgl">Fuel entries will appear here once vehicles start logging usage</p></div>`);
    } else {
      $$payload.out.push("<!--[!-->");
      if (filteredEntries.length === 0) {
        $$payload.out.push("<!--[-->");
        $$payload.out.push(`<div class="empty-state svelte-1odhcgl"><div class="empty-visual svelte-1odhcgl"><div class="fuel-drop svelte-1odhcgl"></div></div> <h4 class="svelte-1odhcgl">No entries match filters</h4> <p class="svelte-1odhcgl">Try adjusting your filter settings or clear all filters to see entries</p> <button class="clear-filters-btn svelte-1odhcgl">Clear Filters</button></div>`);
      } else {
        $$payload.out.push("<!--[!-->");
        const each_array_1 = ensure_array_like(dateGroups);
        $$payload.out.push(`<div class="entries-container svelte-1odhcgl"><!--[-->`);
        for (let $$index_2 = 0, $$length = each_array_1.length; $$index_2 < $$length; $$index_2++) {
          let dateGroup = each_array_1[$$index_2];
          const each_array_2 = ensure_array_like(groupedEntries[dateGroup]);
          $$payload.out.push(`<div class="date-section svelte-1odhcgl"><div class="day-header svelte-1odhcgl"><h2 class="day-title svelte-1odhcgl">${escape_html(dateGroup)}</h2></div> <div class="entries-grid svelte-1odhcgl"><!--[-->`);
          for (let $$index_1 = 0, $$length2 = each_array_2.length; $$index_1 < $$length2; $$index_1++) {
            let entry = each_array_2[$$index_1];
            const consumption = getFuelConsumptionWithAverage(entry);
            const hasWarning = !entry.fields?.name || !entry.activities?.name;
            $$payload.out.push(`<div${attr_class("fuel-card svelte-1odhcgl", void 0, { "warning": hasWarning })}><div class="card-row svelte-1odhcgl"><div class="vehicle-info svelte-1odhcgl"><span class="vehicle-name svelte-1odhcgl">${escape_html(entry.vehicles?.name || "Unknown Vehicle")}</span> <span class="vehicle-code svelte-1odhcgl">(${escape_html(entry.vehicles?.code || "N/A")})</span> `);
            if (consumption.hasAverage) {
              $$payload.out.push("<!--[-->");
              $$payload.out.push(`<span class="vehicle-avg svelte-1odhcgl">${escape_html(consumption.average)}<span class="avg-unit svelte-1odhcgl">${escape_html(consumption.unit)}</span></span>`);
            } else {
              $$payload.out.push("<!--[!-->");
            }
            $$payload.out.push(`<!--]--></div> <div class="fuel-amount svelte-1odhcgl">${escape_html(Math.round((entry.litres_dispensed || 0) * 10) / 10)}<span class="unit svelte-1odhcgl">L</span></div></div> <div class="card-row svelte-1odhcgl"><div class="activity-info svelte-1odhcgl">${escape_html(entry.fields?.name || entry.fields?.code || "No field")} <span class="separator svelte-1odhcgl">•</span> ${escape_html(entry.activities?.name || "Unknown activity")} <span class="separator svelte-1odhcgl">•</span> ${escape_html(getUsage(entry))}</div> <div class="consumption-info svelte-1odhcgl"><span${attr_class(consumption.colorClass, "svelte-1odhcgl")}>${escape_html(consumption.current)}</span><span class="consumption-unit svelte-1odhcgl">${escape_html(consumption.unit)}</span></div></div></div>`);
          }
          $$payload.out.push(`<!--]--></div></div>`);
        }
        $$payload.out.push(`<!--]--> <div class="load-more-container svelte-1odhcgl"><button class="load-more-btn svelte-1odhcgl"${attr("disabled", isLoadingMore, true)}>`);
        {
          $$payload.out.push("<!--[!-->");
          $$payload.out.push(`Load More (${escape_html(weeksToShow)} week${escape_html("")})`);
        }
        $$payload.out.push(`<!--]--></button></div></div>`);
      }
      $$payload.out.push(`<!--]-->`);
    }
    $$payload.out.push(`<!--]-->`);
  }
  $$payload.out.push(`<!--]--></div>`);
  pop();
}
function TankManagement($$payload, $$props) {
  push();
  (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  $$payload.out.push(`<div class="tank-management svelte-1ecm5e6">`);
  {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="loading svelte-1ecm5e6">Loading tank data...</div>`);
  }
  $$payload.out.push(`<!--]--></div>`);
  pop();
}
function TankStatus($$payload, $$props) {
  push();
  $$payload.out.push(`<div class="tank-status svelte-1ih4wdh">`);
  {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="loading svelte-1ih4wdh"><div class="loading-content svelte-1ih4wdh"><div class="loading-header svelte-1ih4wdh"></div> <div class="loading-bar svelte-1ih4wdh"></div> <div class="loading-text svelte-1ih4wdh"></div></div></div>`);
  }
  $$payload.out.push(`<!--]--></div>`);
  pop();
}
function FuelChart($$payload, $$props) {
  push();
  let fuelData = [];
  Math.max(...fuelData.map((d) => d.total), 1);
  $$payload.out.push(`<div class="fuel-chart svelte-apkl67"><div class="chart-header svelte-apkl67"><h4 class="svelte-apkl67">Daily Fuel Usage</h4> <span class="chart-subtitle svelte-apkl67">Past 10 days</span></div> `);
  {
    $$payload.out.push("<!--[-->");
    const each_array = ensure_array_like(Array(10));
    $$payload.out.push(`<div class="chart-loading svelte-apkl67"><div class="loading-bars svelte-apkl67"><!--[-->`);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      each_array[$$index];
      $$payload.out.push(`<div class="loading-bar svelte-apkl67"></div>`);
    }
    $$payload.out.push(`<!--]--></div></div>`);
  }
  $$payload.out.push(`<!--]--></div>`);
  pop();
}
class ExportService {
  // Fetch fuel entries data for export with date range
  async getFuelEntriesForExport(startDate, endDate, supabaseService) {
    try {
      await supabaseService.init();
      const client = supabaseService.getClient();
      const result = await client.from("fuel_entries").select(`
					*,
					vehicles:vehicle_id(code, name),
					drivers:driver_id(employee_code, name),
					activities:activity_id(code, name),
					fields:field_id(code, name),
					zones:zone_id(code, name),
					bowsers:bowser_id(code, name)
				`).gte("entry_date", startDate).lte("entry_date", endDate).order("entry_date", { ascending: true }).order("time", { ascending: true });
      if (result.error) {
        return { data: null, error: result.error.message };
      }
      const exportData = result.data.filter((entry) => entry.vehicles).map((entry) => {
        let hrsKm = 0;
        if (entry.odometer_end && entry.odometer_start && entry.odometer_end > entry.odometer_start) {
          hrsKm = entry.odometer_end - entry.odometer_start;
        } else if (entry.hours_worked) {
          hrsKm = entry.hours_worked;
        } else if (entry.distance_km) {
          hrsKm = entry.distance_km;
        }
        return {
          date: this.formatDate(entry.entry_date),
          vehicle: entry.vehicles.code || "N/A",
          field: entry.fields?.code || entry.zones?.code || "N/A",
          activity: entry.activities?.code || "N/A",
          fuel: entry.litres_dispensed || 0,
          hrsKm,
          odoEnd: entry.odometer_end || 0,
          store: entry.bowsers?.code || "Tank A",
          issueNo: 0,
          // Default value as per your example
          tons: entry.tons_transported || 0,
          driver: entry.drivers?.employee_code || "N/A"
        };
      });
      return { data: exportData, error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : "Failed to fetch export data"
      };
    }
  }
  // Generate Excel file and trigger download
  async generateExcelFile(data, startDate, endDate, companyName = "KCT Farming (Pty) Ltd") {
    try {
      const workbook = XLSX.utils.book_new();
      const formattedStartDate = this.formatDate(startDate);
      const formattedEndDate = this.formatDate(endDate);
      const dateRange = `(${formattedStartDate}-${formattedEndDate})`;
      const headerData = [
        [`Vehicle Daily Capture Sheet (Estate - ${companyName}) - ${dateRange}`],
        [],
        ["Date", "Vehicle", "Activity Details", "", "Fuel Consp", "", "", "Fuel Store", "", "Other", ""],
        ["Date", "Vehicle", "Field", "Activity", "Fuel", "HrsKm", "Odo. End", "Store", "Issue No.", "Tons", "Driver"]
      ];
      const dataRows = data.map((row) => [
        row.date,
        row.vehicle,
        row.field,
        row.activity,
        row.fuel,
        row.hrsKm,
        row.odoEnd,
        row.store,
        row.issueNo,
        row.tons,
        row.driver
      ]);
      const worksheetData = [...headerData, ...dataRows];
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      worksheet["!cols"] = [
        { wch: 12 },
        // Date
        { wch: 10 },
        // Vehicle
        { wch: 10 },
        // Field
        { wch: 10 },
        // Activity
        { wch: 8 },
        // Fuel
        { wch: 8 },
        // HrsKm
        { wch: 10 },
        // Odo. End
        { wch: 10 },
        // Store
        { wch: 10 },
        // Issue No.
        { wch: 8 },
        // Tons
        { wch: 8 }
        // Driver
      ];
      worksheet["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } },
        // Main header
        { s: { r: 2, c: 2 }, e: { r: 2, c: 3 } },
        // Activity Details
        { s: { r: 2, c: 4 }, e: { r: 2, c: 6 } },
        // Fuel Consp
        { s: { r: 2, c: 7 }, e: { r: 2, c: 8 } },
        // Fuel Store
        { s: { r: 2, c: 9 }, e: { r: 2, c: 10 } }
        // Other
      ];
      XLSX.utils.book_append_sheet(workbook, worksheet, "Vehicle Daily Capture");
      const filename = `Vehicle_Daily_Capture_${startDate}_to_${endDate}.xlsx`;
      XLSX.writeFile(workbook, filename);
    } catch (error) {
      console.error("Failed to generate Excel file:", error);
      throw new Error("Failed to generate Excel file");
    }
  }
  // Helper method to format dates consistently
  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB");
  }
  // Fetch monthly vehicle summary data
  async getMonthlySummaryForExport(year, month, supabaseService) {
    try {
      await supabaseService.init();
      const client = supabaseService.getClient();
      const startDate = new Date(Date.UTC(year, month - 1, 1)).toISOString().split("T")[0];
      const endDate = new Date(Date.UTC(year, month, 0)).toISOString().split("T")[0];
      const result = await client.from("fuel_entries").select(`
					*,
					vehicles:vehicle_id(id, code, name, type, odometer_unit, registration)
				`).gte("entry_date", startDate).lte("entry_date", endDate).order("entry_date", { ascending: true }).order("time", { ascending: true });
      if (result.error) {
        return { data: null, error: result.error.message };
      }
      const vehicleSummaries = /* @__PURE__ */ new Map();
      result.data.forEach((entry) => {
        const vehicleId = entry.vehicle_id;
        const vehicle = entry.vehicles;
        if (!vehicle) return;
        const key = vehicleId;
        if (!vehicleSummaries.has(key)) {
          vehicleSummaries.set(key, {
            code: vehicle.code || "N/A",
            name: vehicle.name || "Unknown",
            type: vehicle.type || "Other",
            registration: vehicle.registration || "",
            odometerUnit: vehicle.odometer_unit || null,
            // Keep null instead of defaulting to 'km'
            totalFuel: 0,
            firstOdometer: null,
            lastOdometer: null,
            totalHours: 0,
            hasOdometerData: false,
            hasHoursData: false,
            entries: []
          });
        }
        const summary = vehicleSummaries.get(key);
        summary.entries.push(entry);
        summary.totalFuel += entry.litres_dispensed || 0;
        if (entry.odometer_start && entry.odometer_start > 0) {
          if (summary.firstOdometer === null || entry.odometer_start < summary.firstOdometer) {
            summary.firstOdometer = entry.odometer_start;
          }
          summary.hasOdometerData = true;
        }
        if (entry.odometer_end && entry.odometer_end > 0) {
          if (summary.lastOdometer === null || entry.odometer_end > summary.lastOdometer) {
            summary.lastOdometer = entry.odometer_end;
          }
          summary.hasOdometerData = true;
        }
        if (entry.hours_worked && entry.hours_worked > 0) {
          summary.totalHours += entry.hours_worked;
          summary.hasHoursData = true;
        }
      });
      const summaryData = Array.from(vehicleSummaries.values()).filter((summary) => summary.totalFuel > 0).map((summary) => {
        let distance = "";
        let consumption = "";
        let unit = "";
        if (summary.odometerUnit !== null && summary.odometerUnit !== void 0 && summary.odometerUnit.trim() !== "") {
          unit = summary.odometerUnit;
          if (summary.hasOdometerData && summary.firstOdometer !== null && summary.lastOdometer !== null) {
            const odometerDifference = summary.lastOdometer - summary.firstOdometer;
            if (odometerDifference > 0) {
              distance = Math.round(odometerDifference * 100) / 100;
              if (unit.toLowerCase() === "km") {
                consumption = Math.round(summary.totalFuel / (odometerDifference / 100) * 100) / 100;
              } else {
                consumption = Math.round(summary.totalFuel / odometerDifference * 100) / 100;
              }
            } else {
              distance = 0;
              consumption = "";
            }
          } else {
            distance = "";
            consumption = "";
          }
        }
        return {
          code: summary.code,
          name: summary.name,
          registration: summary.registration,
          category: summary.type,
          // Use type directly from supabase
          distance,
          fuel: Math.round(summary.totalFuel * 100) / 100,
          // 2 decimal places
          consumption,
          unit
        };
      }).sort((a, b) => a.code.localeCompare(b.code));
      return { data: summaryData, error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : "Failed to fetch monthly summary data"
      };
    }
  }
  // Generate monthly summary Excel file
  async generateMonthlySummaryExcel(data, year, month, companyName = "KCT Farming (Pty) Ltd") {
    try {
      const workbook = XLSX.utils.book_new();
      const monthNames = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December"
      ];
      const monthName = monthNames[month - 1];
      const headerData = [
        [`Monthly Vehicle Summary - ${companyName} - ${monthName} ${year}`],
        [],
        ["Code", "Name", "Category", "Distance", "Fuel", "Consumption", "Unit"]
      ];
      const dataRows = data.map((row) => [
        row.code,
        row.name,
        row.category,
        row.distance,
        row.fuel,
        row.consumption,
        row.unit
      ]);
      const worksheetData = [...headerData, ...dataRows];
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      worksheet["!cols"] = [
        { wch: 8 },
        // Code
        { wch: 25 },
        // Name
        { wch: 15 },
        // Category
        { wch: 10 },
        // Distance
        { wch: 10 },
        // Fuel
        { wch: 12 },
        // Consumption
        { wch: 8 }
        // Unit
      ];
      worksheet["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }
        // Main header
      ];
      XLSX.utils.book_append_sheet(workbook, worksheet, "Monthly Summary");
      const filename = `Monthly_Vehicle_Summary_${year}_${month.toString().padStart(2, "0")}.xlsx`;
      XLSX.writeFile(workbook, filename);
    } catch (error) {
      console.error("Failed to generate monthly summary Excel file:", error);
      throw new Error("Failed to generate monthly summary Excel file");
    }
  }
  // Main export method that handles the complete flow
  async exportToExcel(startDate, endDate, supabaseService, companyName) {
    try {
      const result = await this.getFuelEntriesForExport(startDate, endDate, supabaseService);
      if (result.error || !result.data) {
        return { success: false, error: result.error || "No data found" };
      }
      await this.generateExcelFile(result.data, startDate, endDate, companyName);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Export failed"
      };
    }
  }
  // Generate monthly summary PDF file
  async generateMonthlySummaryPDF(data, year, month, companyName = "KCT Farming (Pty) Ltd") {
    try {
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.width;
      const pageHeight = pdf.internal.pageSize.height;
      const monthNames = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December"
      ];
      const monthName = monthNames[month - 1];
      const totalFuel = data.reduce((sum, vehicle) => sum + vehicle.fuel, 0);
      const averageFuel = data.length > 0 ? totalFuel / data.length : 0;
      pdf.setFontSize(18);
      pdf.setFont("times", "bold");
      pdf.text("Monthly Fuel Consumption Report", pageWidth / 2, 25, { align: "center" });
      pdf.setFontSize(14);
      pdf.setFont("times", "normal");
      pdf.text(companyName, pageWidth / 2, 33, { align: "center" });
      pdf.setFontSize(12);
      pdf.setFont("times", "italic");
      pdf.text(`${monthName} ${year}`, pageWidth / 2, 40, { align: "center" });
      pdf.setFontSize(10);
      pdf.setFont("times", "bold");
      pdf.text("Summary Statistics", 15, 52);
      pdf.setFontSize(9);
      pdf.setFont("times", "normal");
      pdf.text(`Total Active Vehicles: ${data.length}`, 15, 60);
      pdf.text(`Total Fuel Consumption: ${totalFuel.toFixed(2)} Litres`, 15, 66);
      const tableStartY = 78;
      const tableData = data.map((vehicle) => [
        vehicle.code,
        vehicle.name,
        vehicle.registration || "—",
        vehicle.category,
        vehicle.distance === "" ? "—" : vehicle.distance.toString(),
        vehicle.fuel.toFixed(2),
        vehicle.consumption === "" ? "—" : vehicle.consumption.toString(),
        vehicle.unit || "—"
      ]);
      tableData.push([
        "",
        "",
        "",
        "",
        `${totalFuel.toFixed(2)}`,
        "",
        ""
      ]);
      autoTable(pdf, {
        startY: tableStartY,
        head: [["Vehicle ID", "Vehicle Name", "Registration", "Classification", "Distance", "Fuel (L)", "Efficiency*", "Unit"]],
        body: tableData,
        theme: "grid",
        styles: {
          fontSize: 10,
          cellPadding: 1,
          lineColor: [200, 200, 200],
          lineWidth: 0.1,
          font: "times",
          textColor: [0, 0, 0],
          minCellHeight: 3
        },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: "bold",
          fontSize: 10,
          halign: "center",
          minCellHeight: 4
        },
        columnStyles: {
          0: { halign: "center" },
          // Vehicle ID
          1: { halign: "left" },
          // Vehicle Name
          2: { halign: "center" },
          // Registration
          3: { halign: "center" },
          // Classification
          4: { halign: "right" },
          // Distance
          5: { halign: "right" },
          // Fuel
          6: { halign: "right" },
          // Efficiency
          7: { halign: "center" }
          // Unit
        },
        didParseCell: function(data2) {
          if (data2.row.index === tableData.length - 1) {
            data2.cell.styles.fontStyle = "bold";
            data2.cell.styles.fillColor = [240, 240, 240];
          }
        },
        // Let autoTable calculate column widths automatically for full page width
        margin: { left: 15, right: 15 },
        didDrawPage: (data2) => {
          pdf.setFontSize(8);
          pdf.setFont("times", "normal");
          const printDate = (/* @__PURE__ */ new Date()).toLocaleDateString("en-ZA", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit"
          });
          pdf.text(`Generated: ${printDate}`, 15, pageHeight - 10);
        }
      });
      const finalY = pdf.lastAutoTable.finalY + 8;
      pdf.setFontSize(8);
      pdf.setFont("times", "italic");
      pdf.text("* Efficiency calculated as L/100km or L/hr depending on the unit", 15, finalY);
      const filename = `Fuel_Analysis_Report_${year}_${month.toString().padStart(2, "0")}.pdf`;
      pdf.save(filename);
    } catch (error) {
      console.error("Failed to generate monthly summary PDF file:", error);
      throw new Error("Failed to generate monthly summary PDF file");
    }
  }
  // Monthly summary export method
  async exportMonthlySummary(year, month, supabaseService, companyName) {
    try {
      const result = await this.getMonthlySummaryForExport(year, month, supabaseService);
      if (result.error || !result.data) {
        return { success: false, error: result.error || "No data found" };
      }
      await this.generateMonthlySummaryExcel(result.data, year, month, companyName);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Monthly summary export failed"
      };
    }
  }
  // Monthly summary PDF export method
  async exportMonthlySummaryPDF(year, month, supabaseService, companyName) {
    try {
      const result = await this.getMonthlySummaryForExport(year, month, supabaseService);
      if (result.error || !result.data) {
        return { success: false, error: result.error || "No data found" };
      }
      await this.generateMonthlySummaryPDF(result.data, year, month, companyName);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Monthly summary PDF export failed"
      };
    }
  }
  // Enhanced monthly summary PDF export with reconciliation data
  async exportMonthlySummaryPDFWithReconciliation(year, month, supabaseService, companyName) {
    try {
      const vehicleResult = await this.getMonthlySummaryForExport(year, month, supabaseService);
      if (vehicleResult.error || !vehicleResult.data) {
        return { success: false, error: vehicleResult.error || "No vehicle data found" };
      }
      const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
      const monthEnd = `${year}-${String(month).padStart(2, "0")}-${new Date(year, month, 0).getDate()}`;
      let reconciliationData = {
        fuelDispensed: 0,
        bowserStart: 0,
        bowserEnd: 0,
        tankStartCalculated: 0,
        tankEndCalculated: 0,
        lastDipReading: 0,
        tankActivities: [],
        reconciled: false
      };
      try {
        const [fuelReconResult, tankStartReconResult, tankEndReconResult, dipReadingResult, tankActivitiesResult] = await Promise.all([
          // Fuel reconciliation data
          supabaseService.getDateRangeReconciliationData(monthStart, monthEnd),
          // Tank reconciliation data for month start (opening level)
          supabaseService.query(
            () => supabaseService.ensureInitialized().from("tank_reconciliations").select("*").eq("reconciliation_date", monthStart).maybeSingle()
          ),
          // Tank reconciliation data for month end (closing level)
          supabaseService.query(
            () => supabaseService.ensureInitialized().from("tank_reconciliations").select("*").eq("reconciliation_date", monthEnd).maybeSingle()
          ),
          // Actual dip reading from tank_readings table (last reading of the month)
          supabaseService.query(
            () => supabaseService.ensureInitialized().from("tank_readings").select("*").gte("reading_date", monthStart).lte("reading_date", monthEnd).order("reading_date", { ascending: false }).limit(1).maybeSingle()
          ),
          // Tank activities (refills and adjustments) for the month
          supabaseService.query(
            () => supabaseService.ensureInitialized().from("tank_refills").select("delivery_date, litres_added, invoice_number").gte("delivery_date", monthStart).lte("delivery_date", monthEnd).order("delivery_date", { ascending: true })
          )
        ]);
        if (fuelReconResult.data) {
          reconciliationData.fuelDispensed = fuelReconResult.data.fuelDispensed || 0;
          reconciliationData.bowserStart = fuelReconResult.data.bowserStart || 0;
          reconciliationData.bowserEnd = fuelReconResult.data.bowserEnd || 0;
        }
        if (tankStartReconResult.data) {
          reconciliationData.tankStartCalculated = tankStartReconResult.data.calculated_level || 0;
        }
        if (tankEndReconResult.data) {
          reconciliationData.tankEndCalculated = tankEndReconResult.data.calculated_level || 0;
        }
        if (dipReadingResult.data) {
          reconciliationData.lastDipReading = dipReadingResult.data.reading_value || 0;
        }
        if (tankActivitiesResult.data) {
          reconciliationData.tankActivities = tankActivitiesResult.data || [];
        }
      } catch (reconError) {
        console.warn("Could not fetch reconciliation data:", reconError);
      }
      await this.generateMonthlySummaryPDFWithReconciliation(
        vehicleResult.data,
        reconciliationData,
        year,
        month,
        companyName
      );
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Enhanced PDF export failed"
      };
    }
  }
  // Generate enhanced monthly summary PDF with reconciliation data (journal style)
  async generateMonthlySummaryPDFWithReconciliation(data, reconciliationData, year, month, companyName = "KCT Farming (Pty) Ltd") {
    try {
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.width;
      const pageHeight = pdf.internal.pageSize.height;
      const monthNames = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December"
      ];
      const monthName = monthNames[month - 1];
      const totalFuel = data.reduce((sum, vehicle) => sum + vehicle.fuel, 0);
      const averageFuel = data.length > 0 ? totalFuel / data.length : 0;
      pdf.setFontSize(18);
      pdf.setFont("times", "bold");
      pdf.text("Monthly Fuel Consumption Report", pageWidth / 2, 18, { align: "center" });
      pdf.setFontSize(14);
      pdf.setFont("times", "normal");
      pdf.text(companyName, pageWidth / 2, 26, { align: "center" });
      pdf.setFontSize(12);
      pdf.setFont("times", "italic");
      pdf.text(`${monthName} ${year}`, pageWidth / 2, 33, { align: "center" });
      const bowserDifference = reconciliationData.bowserEnd - reconciliationData.bowserStart;
      const fuelVariance = bowserDifference - reconciliationData.fuelDispensed;
      const labelX = 15;
      const valueX = 75;
      const detailsX = 130;
      let yPos = 45;
      const tableStartY = yPos;
      const tableData = data.map((vehicle) => [
        vehicle.code,
        vehicle.name,
        vehicle.registration || "—",
        vehicle.category,
        vehicle.distance === "" ? "—" : vehicle.distance.toString(),
        vehicle.fuel.toFixed(2),
        vehicle.consumption === "" ? "—" : vehicle.consumption.toString(),
        vehicle.unit || "—"
      ]);
      tableData.push([
        "",
        "",
        "",
        "",
        "",
        `${totalFuel.toFixed(2)}`,
        "",
        ""
      ]);
      autoTable(pdf, {
        startY: tableStartY,
        head: [["Vehicle ID", "Vehicle Name", "Registration", "Classification", "Distance", "Fuel (L)", "Efficiency*", "Unit"]],
        body: tableData,
        theme: "grid",
        styles: {
          fontSize: 10,
          cellPadding: 1,
          lineColor: [200, 200, 200],
          lineWidth: 0.1,
          font: "times",
          textColor: [0, 0, 0],
          minCellHeight: 3
        },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: "bold",
          fontSize: 10,
          halign: "center",
          minCellHeight: 4
        },
        columnStyles: {
          0: { halign: "center" },
          // Vehicle ID
          1: { halign: "left" },
          // Vehicle Name
          2: { halign: "center" },
          // Registration
          3: { halign: "center" },
          // Classification
          4: { halign: "right" },
          // Distance
          5: { halign: "right" },
          // Fuel
          6: { halign: "right" },
          // Efficiency
          7: { halign: "center" }
          // Unit
        },
        didParseCell: function(data2) {
          if (data2.row.index === tableData.length - 1) {
            data2.cell.styles.fontStyle = "bold";
            data2.cell.styles.fillColor = [245, 245, 245];
          }
        }
      });
      const tableEndY = pdf.lastAutoTable.finalY || tableStartY + 100;
      let reconciliationY = tableEndY + 15;
      pdf.setFontSize(8);
      pdf.setFont("times", "italic");
      pdf.text("* Efficiency: l/100km or l/hr", 15, tableEndY + 5);
      pdf.setFontSize(12);
      pdf.setFont("times", "bold");
      pdf.text("Fuel Reconciliation", 15, reconciliationY);
      reconciliationY += 6;
      pdf.setFontSize(10);
      pdf.setFont("times", "normal");
      pdf.text("Fuel Dispensed:", labelX, reconciliationY);
      pdf.text(`${reconciliationData.fuelDispensed.toLocaleString("en-ZA", { minimumFractionDigits: 1 })}L`, valueX, reconciliationY);
      reconciliationY += 4;
      const bowserOpeningDate = `1 ${monthName} ${year}`;
      const bowserClosingDate = `${new Date(year, month, 0).getDate()} ${monthName} ${year}`;
      pdf.text("Bowser Opening:", labelX, reconciliationY);
      pdf.text(`${reconciliationData.bowserStart.toLocaleString("en-ZA", { minimumFractionDigits: 1 })}L`, valueX, reconciliationY);
      pdf.text(`(${bowserOpeningDate})`, detailsX, reconciliationY);
      reconciliationY += 4;
      pdf.text("Bowser Closing:", labelX, reconciliationY);
      pdf.text(`${reconciliationData.bowserEnd.toLocaleString("en-ZA", { minimumFractionDigits: 1 })}L`, valueX, reconciliationY);
      pdf.text(`(${bowserClosingDate})`, detailsX, reconciliationY);
      reconciliationY += 4;
      pdf.text("Bowser Difference:", labelX, reconciliationY);
      pdf.text(`${bowserDifference.toLocaleString("en-ZA", { minimumFractionDigits: 1 })}L`, valueX, reconciliationY);
      reconciliationY += 4;
      pdf.text("Fuel Variance:", labelX, reconciliationY);
      pdf.text(`${fuelVariance.toFixed(1)}L`, valueX, reconciliationY);
      reconciliationY += 10;
      pdf.setFontSize(12);
      pdf.setFont("times", "bold");
      pdf.text("Tank Reconciliation", 15, reconciliationY);
      reconciliationY += 4;
      pdf.setFontSize(10);
      pdf.setFont("times", "normal");
      const openingDate = `1 ${monthName} ${year}`;
      pdf.text("Opening Level:", labelX, reconciliationY);
      pdf.text(`${reconciliationData.tankStartCalculated.toLocaleString("en-ZA", { minimumFractionDigits: 1 })}L`, valueX, reconciliationY);
      pdf.text(`(${openingDate})`, detailsX, reconciliationY);
      reconciliationY += 4;
      if (reconciliationData.tankActivities.length > 0) {
        let totalAdditions = 0;
        reconciliationData.tankActivities.forEach((activity) => {
          const activityDate = new Date(activity.delivery_date).toLocaleDateString("en-ZA", {
            day: "numeric",
            month: "short"
          });
          const amount = activity.litres_added || 0;
          totalAdditions += amount;
          const sign = amount >= 0 ? "+" : "";
          const invoiceText = activity.invoice_number || "Adjustment";
          pdf.text(`• ${activityDate}:`, labelX + 5, reconciliationY);
          pdf.text(`${sign}${amount.toLocaleString("en-ZA", { minimumFractionDigits: 1 })}L`, valueX, reconciliationY);
          pdf.text(`(${invoiceText})`, detailsX, reconciliationY);
          reconciliationY += 4;
        });
        pdf.setFont("times", "bold");
        pdf.text("Total Additions:", labelX, reconciliationY);
        pdf.text(`+${totalAdditions.toLocaleString("en-ZA", { minimumFractionDigits: 1 })}L`, valueX, reconciliationY);
        pdf.setFont("times", "normal");
        reconciliationY += 4;
      }
      const totalTankAdditions = reconciliationData.tankActivities.reduce((sum, activity) => sum + (activity.litres_added || 0), 0);
      const expectedLevel = reconciliationData.tankStartCalculated - reconciliationData.fuelDispensed + totalTankAdditions;
      const calculationFormula = `(${reconciliationData.tankStartCalculated.toLocaleString("en-ZA", { minimumFractionDigits: 1 })} - ${reconciliationData.fuelDispensed.toLocaleString("en-ZA", { minimumFractionDigits: 1 })} + ${totalTankAdditions.toLocaleString("en-ZA", { minimumFractionDigits: 1 })})`;
      pdf.text("Expected Level:", labelX, reconciliationY);
      pdf.text(`${expectedLevel.toLocaleString("en-ZA", { minimumFractionDigits: 1 })}L`, valueX, reconciliationY);
      pdf.text(calculationFormula, detailsX, reconciliationY);
      reconciliationY += 4;
      const lastDayOfMonth = new Date(year, month, 0).getDate();
      const actualReadingDate = `${lastDayOfMonth} ${monthName} ${year}`;
      pdf.text("Actual Reading:", labelX, reconciliationY);
      pdf.text(`${reconciliationData.lastDipReading.toLocaleString("en-ZA", { minimumFractionDigits: 1 })}L`, valueX, reconciliationY);
      pdf.text(`(${actualReadingDate})`, detailsX, reconciliationY);
      reconciliationY += 4;
      const tankVariance = expectedLevel - reconciliationData.lastDipReading;
      pdf.text("Tank Variance:", labelX, reconciliationY);
      pdf.text(`${tankVariance.toFixed(1)}L`, valueX, reconciliationY);
      let footerY = reconciliationY + 15;
      pdf.setFontSize(7);
      pdf.setFont("times", "italic");
      pdf.setTextColor(128, 128, 128);
      pdf.text(`Report generated on ${(/* @__PURE__ */ new Date()).toLocaleString()}`, 15, pageHeight - 10);
      const fileName = `Monthly_Fuel_Report_${monthName}_${year}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error("PDF generation error:", error);
      throw new Error("Failed to generate PDF report");
    }
  }
  // Helper method to format date range
  formatDateRange(monthName, year) {
    const daysInMonth = new Date(year, (/* @__PURE__ */ new Date(`${monthName} 1, ${year}`)).getMonth() + 1, 0).getDate();
    return `${monthName.slice(0, 3)} 1 - ${daysInMonth}, ${year}`;
  }
}
const exportService = new ExportService();
function DataExport($$payload, $$props) {
  push();
  const now = /* @__PURE__ */ new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  let startDate = monthStart.toISOString().split("T")[0];
  let endDate = monthEnd.toISOString().split("T")[0];
  let isExporting = false;
  let exportError = "";
  let exportSuccess = false;
  let selectedYear = now.getFullYear();
  let selectedMonth = now.getMonth() + 1;
  let isExportingMonthly = false;
  let isExportingPDF = false;
  let monthlyExportError = "";
  let monthlyExportSuccess = false;
  let pdfExportError = "";
  let pdfExportSuccess = false;
  async function handleExport() {
    console.log("Export button clicked", { startDate, endDate });
    if (!startDate || !endDate) {
      exportError = "Please select both start and end dates";
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      exportError = "Start date must be before end date";
      return;
    }
    isExporting = true;
    exportError = "";
    exportSuccess = false;
    try {
      console.log("Starting export process...");
      const { default: supabaseService } = await import("../../../chunks/supabase.js");
      console.log("Supabase service imported");
      const result = await exportService.exportToExcel(startDate, endDate, supabaseService, "KCT Farming (Pty) Ltd");
      console.log("Export result:", result);
      if (result.success) {
        exportSuccess = true;
        setTimeout(
          () => {
            exportSuccess = false;
          },
          3e3
        );
      } else {
        exportError = result.error || "Export failed";
      }
    } catch (error) {
      console.error("Export error:", error);
      exportError = error instanceof Error ? error.message : "Export failed";
    } finally {
      isExporting = false;
    }
  }
  async function handleMonthlySummaryExport() {
    console.log("Monthly summary export button clicked", { selectedYear, selectedMonth });
    isExportingMonthly = true;
    monthlyExportError = "";
    monthlyExportSuccess = false;
    try {
      console.log("Starting monthly summary export process...");
      const { default: supabaseService } = await import("../../../chunks/supabase.js");
      console.log("Supabase service imported for monthly summary");
      const result = await exportService.exportMonthlySummary(selectedYear, selectedMonth, supabaseService, "KCT Farming (Pty) Ltd");
      console.log("Monthly summary export result:", result);
      if (result.success) {
        monthlyExportSuccess = true;
        setTimeout(
          () => {
            monthlyExportSuccess = false;
          },
          3e3
        );
      } else {
        monthlyExportError = result.error || "Monthly summary export failed";
      }
    } catch (error) {
      console.error("Monthly summary export error:", error);
      monthlyExportError = error instanceof Error ? error.message : "Monthly summary export failed";
    } finally {
      isExportingMonthly = false;
    }
  }
  async function handleMonthlySummaryPDFExport() {
    console.log("Monthly PDF export button clicked", { selectedYear, selectedMonth });
    isExportingPDF = true;
    pdfExportError = "";
    pdfExportSuccess = false;
    try {
      console.log("Starting enhanced PDF export with reconciliation data...");
      const { default: supabaseService } = await import("../../../chunks/supabase.js");
      const result = await exportService.exportMonthlySummaryPDFWithReconciliation(selectedYear, selectedMonth, supabaseService, "KCT Farming (Pty) Ltd");
      console.log("Enhanced PDF export result:", result);
      if (result.success) {
        pdfExportSuccess = true;
        setTimeout(
          () => {
            pdfExportSuccess = false;
          },
          3e3
        );
      } else {
        pdfExportError = result.error || "PDF export failed";
      }
    } catch (error) {
      console.error("Enhanced PDF export error:", error);
      pdfExportError = error instanceof Error ? error.message : "PDF export failed";
    } finally {
      isExportingPDF = false;
    }
  }
  const each_array = ensure_array_like(Array(5));
  $$payload.out.push(`<div class="history-card svelte-1yx1775"><div class="history-header svelte-1yx1775"><h4 class="svelte-1yx1775">Monthly Vehicle Summary</h4></div> <div class="monthly-controls svelte-1yx1775"><div class="month-inputs svelte-1yx1775"><div class="month-field svelte-1yx1775"><label for="export-year" class="svelte-1yx1775">Year</label> <select id="export-year"${attr("disabled", isExportingMonthly, true)} class="svelte-1yx1775">`);
  $$payload.select_value = selectedYear;
  $$payload.out.push(`<!--[-->`);
  for (let i = 0, $$length = each_array.length; i < $$length; i++) {
    each_array[i];
    $$payload.out.push(`<option${attr("value", now.getFullYear() - i)}${maybe_selected($$payload, now.getFullYear() - i)}>${escape_html(now.getFullYear() - i)}</option>`);
  }
  $$payload.out.push(`<!--]-->`);
  $$payload.select_value = void 0;
  $$payload.out.push(`</select></div> <div class="month-field svelte-1yx1775"><label for="export-month" class="svelte-1yx1775">Month</label> <select id="export-month"${attr("disabled", isExportingMonthly, true)} class="svelte-1yx1775">`);
  $$payload.select_value = selectedMonth;
  $$payload.out.push(`<option${attr("value", 1)}${maybe_selected($$payload, 1)}>January</option><option${attr("value", 2)}${maybe_selected($$payload, 2)}>February</option><option${attr("value", 3)}${maybe_selected($$payload, 3)}>March</option><option${attr("value", 4)}${maybe_selected($$payload, 4)}>April</option><option${attr("value", 5)}${maybe_selected($$payload, 5)}>May</option><option${attr("value", 6)}${maybe_selected($$payload, 6)}>June</option><option${attr("value", 7)}${maybe_selected($$payload, 7)}>July</option><option${attr("value", 8)}${maybe_selected($$payload, 8)}>August</option><option${attr("value", 9)}${maybe_selected($$payload, 9)}>September</option><option${attr("value", 10)}${maybe_selected($$payload, 10)}>October</option><option${attr("value", 11)}${maybe_selected($$payload, 11)}>November</option><option${attr("value", 12)}${maybe_selected($$payload, 12)}>December</option>`);
  $$payload.select_value = void 0;
  $$payload.out.push(`</select></div></div> <div class="monthly-actions svelte-1yx1775"><div class="export-buttons-grid svelte-1yx1775">`);
  Button($$payload, {
    variant: "success",
    size: "medium",
    loading: isExportingMonthly,
    disabled: isExportingMonthly || isExportingPDF,
    onclick: handleMonthlySummaryExport,
    children: ($$payload2) => {
      if (isExportingMonthly) {
        $$payload2.out.push("<!--[-->");
        $$payload2.out.push(`Generating...`);
      } else {
        $$payload2.out.push("<!--[!-->");
        $$payload2.out.push(`Excel`);
      }
      $$payload2.out.push(`<!--]-->`);
    }
  });
  $$payload.out.push(`<!----> `);
  Button($$payload, {
    variant: "error",
    size: "medium",
    loading: isExportingPDF,
    disabled: isExportingMonthly || isExportingPDF,
    onclick: handleMonthlySummaryPDFExport,
    children: ($$payload2) => {
      if (isExportingPDF) {
        $$payload2.out.push("<!--[-->");
        $$payload2.out.push(`Generating...`);
      } else {
        $$payload2.out.push("<!--[!-->");
        $$payload2.out.push(`PDF`);
      }
      $$payload2.out.push(`<!--]-->`);
    }
  });
  $$payload.out.push(`<!----></div></div></div> `);
  if (monthlyExportError) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="export-message error svelte-1yx1775"><span class="message-icon svelte-1yx1775">⚠️</span> <span class="message-text">${escape_html(monthlyExportError)}</span></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> `);
  if (pdfExportError) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="export-message error svelte-1yx1775"><span class="message-icon svelte-1yx1775">⚠️</span> <span class="message-text">${escape_html(pdfExportError)}</span></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> `);
  if (monthlyExportSuccess) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="export-message success svelte-1yx1775"><span class="message-icon svelte-1yx1775">✅</span> <span class="message-text">Excel file downloaded successfully!</span></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> `);
  if (pdfExportSuccess) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="export-message success svelte-1yx1775"><span class="message-icon svelte-1yx1775">✅</span> <span class="message-text">PDF report generated successfully!</span></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> <div class="daily-export-section svelte-1yx1775"><h4 class="svelte-1yx1775">Daily Capture Export</h4> <div class="export-controls svelte-1yx1775"><div class="date-inputs svelte-1yx1775"><div class="date-field svelte-1yx1775"><label for="start-date" class="svelte-1yx1775">Start Date</label> <input id="start-date" type="date"${attr("value", startDate)}${attr("disabled", isExporting, true)} class="svelte-1yx1775"/></div> <div class="date-field svelte-1yx1775"><label for="end-date" class="svelte-1yx1775">End Date</label> <input id="end-date" type="date"${attr("value", endDate)}${attr("disabled", isExporting, true)} class="svelte-1yx1775"/></div></div> <div class="export-actions svelte-1yx1775">`);
  Button($$payload, {
    variant: "success",
    size: "medium",
    loading: isExporting,
    disabled: !startDate || !endDate || isExporting,
    onclick: handleExport,
    children: ($$payload2) => {
      if (isExporting) {
        $$payload2.out.push("<!--[-->");
        $$payload2.out.push(`Generating...`);
      } else {
        $$payload2.out.push("<!--[!-->");
        $$payload2.out.push(`Export Excel`);
      }
      $$payload2.out.push(`<!--]-->`);
    }
  });
  $$payload.out.push(`<!----></div></div> `);
  if (exportError) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="export-message error svelte-1yx1775"><span class="message-icon svelte-1yx1775">⚠️</span> <span class="message-text">${escape_html(exportError)}</span></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> `);
  if (exportSuccess) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="export-message success svelte-1yx1775"><span class="message-icon svelte-1yx1775">✅</span> <span class="message-text">Excel file downloaded successfully!</span></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--></div></div>`);
  pop();
}
function VehicleHistory($$payload, $$props) {
  push();
  let vehicles = [];
  (/* @__PURE__ */ new Date()).getMonth();
  (/* @__PURE__ */ new Date()).getFullYear();
  $$payload.out.push(`<div class="vehicle-history svelte-9hbx03"><div class="section-header svelte-9hbx03"><h3 class="svelte-9hbx03">Vehicle Fuel History</h3> <p class="svelte-9hbx03">View detailed fuel consumption records for individual vehicles</p></div> `);
  {
    $$payload.out.push("<!--[-->");
    const each_array = ensure_array_like(vehicles);
    $$payload.out.push(`<div class="vehicle-selector svelte-9hbx03"><h4 class="svelte-9hbx03">Select a Vehicle</h4> <div class="vehicle-grid svelte-9hbx03"><!--[-->`);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let vehicle = each_array[$$index];
      $$payload.out.push(`<button class="vehicle-card svelte-9hbx03"><div class="vehicle-code svelte-9hbx03">${escape_html(vehicle.code)}</div> <div class="vehicle-name svelte-9hbx03">${escape_html(vehicle.name)}</div></button>`);
    }
    $$payload.out.push(`<!--]--></div></div>`);
  }
  $$payload.out.push(`<!--]--></div>`);
  pop();
}
const initialState = {
  stats: null,
  vehicleSummaries: [],
  activitySummaries: [],
  dateRange: {
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1e3).toISOString().split("T")[0],
    // 30 days ago
    end: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
    // today
  },
  loading: "idle",
  error: null,
  refreshInterval: null
};
function createDashboardStore() {
  const { subscribe, set, update } = writable(initialState);
  return {
    subscribe,
    setLoading: (loading) => {
      update((state) => ({ ...state, loading }));
    },
    setError: (error) => {
      update((state) => ({ ...state, error, loading: error ? "error" : state.loading }));
    },
    setStats: (stats) => {
      update((state) => ({
        ...state,
        stats,
        loading: "success",
        error: null
      }));
    },
    setVehicleSummaries: (summaries) => {
      update((state) => ({ ...state, vehicleSummaries: summaries }));
    },
    setActivitySummaries: (summaries) => {
      update((state) => ({ ...state, activitySummaries: summaries }));
    },
    setDateRange: (start, end) => {
      update((state) => ({
        ...state,
        dateRange: { start, end }
      }));
    },
    loadDashboardData: async () => {
      update((state) => ({ ...state, loading: "loading", error: null }));
      try {
        const { default: supabaseService } = await import("../../../chunks/supabase.js");
        await supabaseService.init();
        const [statsResult, performanceResult] = await Promise.all([
          supabaseService.getDashboardStats(),
          supabaseService.getVehiclePerformance(void 0, 30)
          // All vehicles, last 30 days
        ]);
        if (statsResult.error) {
          update((state) => ({
            ...state,
            error: statsResult.error,
            loading: "error"
          }));
          return;
        }
        const vehicleSummaries2 = performanceResult.data?.vehicleStats?.map((stat) => ({
          vehicleId: stat.vehicle?.id || "",
          vehicleCode: stat.vehicle?.code || "N/A",
          vehicleName: stat.vehicle?.name || "Unknown Vehicle",
          totalFuel: stat.totalFuel,
          totalDistance: stat.totalDistance,
          averageConsumption: stat.efficiency,
          recordCount: stat.entryCount
        })) || [];
        const activitySummaries2 = [];
        const recentEntries = statsResult.data?.recentEntries || [];
        const entriesByDate = recentEntries.reduce((acc, entry) => {
          const date = entry.entry_date;
          if (!acc[date]) {
            acc[date] = { date, recordCount: 0, totalFuel: 0 };
          }
          acc[date].recordCount++;
          acc[date].totalFuel += entry.litres_dispensed || 0;
          return acc;
        }, {});
        activitySummaries2.push(...Object.values(entriesByDate));
        update((state) => ({
          ...state,
          stats: statsResult.data,
          vehicleSummaries: vehicleSummaries2,
          activitySummaries: activitySummaries2,
          loading: "success",
          error: null
        }));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to load dashboard data";
        update((state) => ({
          ...state,
          error: errorMessage,
          loading: "error"
        }));
      }
    },
    // Load vehicle-specific performance data
    loadVehiclePerformance: async (vehicleId, days = 30) => {
      try {
        const { default: supabaseService } = await import("../../../chunks/supabase.js");
        await supabaseService.init();
        const result = await supabaseService.getVehiclePerformance(vehicleId, days);
        if (result.error) {
          update((state) => ({ ...state, error: result.error }));
          return null;
        }
        return result.data;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to load vehicle performance";
        update((state) => ({ ...state, error: errorMessage }));
        return null;
      }
    },
    // Auto-refresh functionality
    startAutoRefresh: (intervalMs = 6e4) => {
      update((state) => {
        if (state.refreshInterval) {
          clearInterval(state.refreshInterval);
        }
        const interval = setInterval(() => {
          const store = derived({ subscribe }, ($state) => $state);
          store.subscribe(($state) => {
            if ($state.loading !== "loading") {
              const { loadDashboardData } = createDashboardStore();
              loadDashboardData();
            }
          })();
        }, intervalMs);
        return { ...state, refreshInterval: interval };
      });
    },
    stopAutoRefresh: () => {
      update((state) => {
        if (state.refreshInterval) {
          clearInterval(state.refreshInterval);
        }
        return { ...state, refreshInterval: null };
      });
    },
    refreshData: async () => {
      const { loadDashboardData } = createDashboardStore();
      await loadDashboardData();
    },
    reset: () => {
      update((state) => {
        if (state.refreshInterval) {
          clearInterval(state.refreshInterval);
        }
        return initialState;
      });
    }
  };
}
const dashboardStore = createDashboardStore();
const dashboardStats = derived(dashboardStore, ($store) => $store.stats);
derived(dashboardStore, ($store) => $store.vehicleSummaries);
derived(dashboardStore, ($store) => $store.activitySummaries);
const dashboardLoading = derived(dashboardStore, ($store) => $store.loading);
const dashboardError = derived(dashboardStore, ($store) => $store.error);
derived(dashboardStore, ($store) => $store.dateRange);
derived(dashboardStore, ($store) => !!$store.refreshInterval);
function _page($$payload, $$props) {
  push();
  var $$store_subs;
  async function handleRefresh() {
    await dashboardStore.loadDashboardData();
  }
  head($$payload, ($$payload2) => {
    $$payload2.title = `<title>Dashboard - FarmTrack</title>`;
    $$payload2.out.push(`<meta name="description" content="FarmTrack dashboard with fuel consumption analytics, vehicle performance metrics, and tank monitoring"/>`);
  });
  $$payload.out.push(`<div class="dashboard-page svelte-x1i5gj"><div class="dashboard-header svelte-x1i5gj"><div class="header-content svelte-x1i5gj"><h1 class="svelte-x1i5gj">Dashboard</h1></div></div> `);
  if (store_get($$store_subs ??= {}, "$dashboardError", dashboardError)) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="error-banner svelte-x1i5gj"><div class="error-content svelte-x1i5gj"><span class="error-icon svelte-x1i5gj">⚠️</span> <div class="svelte-x1i5gj"><p class="svelte-x1i5gj">Failed to load dashboard data</p> <small class="svelte-x1i5gj">${escape_html(store_get($$store_subs ??= {}, "$dashboardError", dashboardError))}</small></div> `);
    Button($$payload, {
      variant: "outline",
      size: "sm",
      onclick: handleRefresh,
      children: ($$payload2) => {
        $$payload2.out.push(`<!---->Retry`);
      }
    });
    $$payload.out.push(`<!----></div></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> `);
  DashboardStats($$payload, {
    stats: store_get($$store_subs ??= {}, "$dashboardStats", dashboardStats),
    loading: store_get($$store_subs ??= {}, "$dashboardLoading", dashboardLoading) === "loading"
  });
  $$payload.out.push(`<!----> `);
  TankStatus($$payload);
  $$payload.out.push(`<!----> `);
  FuelChart($$payload);
  $$payload.out.push(`<!----> <div class="dashboard-content svelte-x1i5gj"><div class="dashboard-section activity-section svelte-x1i5gj">`);
  RecentActivity($$payload, {
    entries: store_get($$store_subs ??= {}, "$dashboardStats", dashboardStats)?.recentEntries || [],
    loading: store_get($$store_subs ??= {}, "$dashboardLoading", dashboardLoading) === "loading"
  });
  $$payload.out.push(`<!----></div></div> `);
  TankManagement($$payload);
  $$payload.out.push(`<!----> `);
  DataExport($$payload);
  $$payload.out.push(`<!----> `);
  VehicleHistory($$payload);
  $$payload.out.push(`<!----></div>`);
  if ($$store_subs) unsubscribe_stores($$store_subs);
  pop();
}
export {
  _page as default
};
