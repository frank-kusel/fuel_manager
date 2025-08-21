import { i as is_array, _ as get_prototype_of, $ as object_prototype, F as head, M as attr, K as escape_html, B as pop, z as push, Q as ensure_array_like } from "../../../../chunks/index2.js";
import supabaseService from "../../../../chunks/supabase.js";
import { B as Button } from "../../../../chunks/Button.js";
const empty = [];
function snapshot(value, skip_warning = false) {
  return clone(value, /* @__PURE__ */ new Map(), "", empty);
}
function clone(value, cloned, path, paths, original = null) {
  if (typeof value === "object" && value !== null) {
    var unwrapped = cloned.get(value);
    if (unwrapped !== void 0) return unwrapped;
    if (value instanceof Map) return (
      /** @type {Snapshot<T>} */
      new Map(value)
    );
    if (value instanceof Set) return (
      /** @type {Snapshot<T>} */
      new Set(value)
    );
    if (is_array(value)) {
      var copy = (
        /** @type {Snapshot<any>} */
        Array(value.length)
      );
      cloned.set(value, copy);
      if (original !== null) {
        cloned.set(original, copy);
      }
      for (var i = 0; i < value.length; i += 1) {
        var element = value[i];
        if (i in value) {
          copy[i] = clone(element, cloned, path, paths);
        }
      }
      return copy;
    }
    if (get_prototype_of(value) === object_prototype) {
      copy = {};
      cloned.set(value, copy);
      if (original !== null) {
        cloned.set(original, copy);
      }
      for (var key in value) {
        copy[key] = clone(value[key], cloned, path, paths);
      }
      return copy;
    }
    if (value instanceof Date) {
      return (
        /** @type {Snapshot<T>} */
        structuredClone(value)
      );
    }
    if (typeof /** @type {T & { toJSON?: any } } */
    value.toJSON === "function") {
      return clone(
        /** @type {T & { toJSON(): any } } */
        value.toJSON(),
        cloned,
        path,
        paths,
        // Associate the instance with the toJSON clone
        value
      );
    }
  }
  if (value instanceof EventTarget) {
    return (
      /** @type {Snapshot<T>} */
      value
    );
  }
  try {
    return (
      /** @type {Snapshot<T>} */
      structuredClone(value)
    );
  } catch (e) {
    return (
      /** @type {Snapshot<T>} */
      value
    );
  }
}
function _page($$payload, $$props) {
  push();
  let entries = [];
  let loading = true;
  let error = null;
  let selectedDate = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  let autoRefresh = true;
  let refreshInterval = null;
  async function loadEntries() {
    try {
      loading = true;
      await supabaseService.init();
      const { data, error: fetchError } = await supabaseService["client"].from("fuel_entries").select(`
					*,
					vehicles!inner(code, name),
					drivers!inner(employee_code, name),
					activities!inner(name),
					fields(code, name),
					zones(code, name)
				`).eq("entry_date", selectedDate).order("time", { ascending: false });
      if (fetchError) throw fetchError;
      entries = data || [];
      console.log("Loaded entries:", snapshot(entries));
    } catch (err) {
      error = err instanceof Error ? err.message : "Failed to load entries";
    } finally {
      loading = false;
    }
  }
  function getLocation(entry) {
    const field = entry.fields || entry.field;
    const zone = entry.zones || entry.zone;
    if (field && field.code && field.name) {
      return `${field.code} - ${field.name}`;
    }
    if (zone && zone.code && zone.name) {
      return `${zone.code} - ${zone.name}`;
    }
    return "-";
  }
  function formatOdometer(start, end, gaugeWorking) {
    if (!gaugeWorking) return "Broken";
    if (start === null || end === null) return "-";
    return `${start} → ${end}`;
  }
  function formatBowserReading(start, end) {
    if (start === null || end === null) return "-";
    return `${start} → ${end}`;
  }
  function exportToCSV() {
    const headers = [
      "Date",
      "Time",
      "Vehicle",
      "Driver",
      "Activity",
      "Location",
      "Fuel (L)",
      "Odometer",
      "Bowser"
    ];
    const rows = entries.map((entry) => [
      entry.entry_date,
      entry.time,
      `${entry.vehicles?.code || "N/A"} - ${entry.vehicles?.name || "N/A"}`,
      `${entry.drivers?.employee_code || "N/A"} - ${entry.drivers?.name || "N/A"}`,
      entry.activities?.name || "N/A",
      getLocation(entry),
      entry.litres_dispensed.toString(),
      formatOdometer(entry.odometer_start, entry.odometer_end, entry.gauge_working),
      formatBowserReading(entry.bowser_reading_start, entry.bowser_reading_end)
    ]);
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fuel-summary-${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  let groupedEntries = () => {
    const grouped = {};
    entries.forEach((entry) => {
      const vehicleKey = `${entry.vehicles?.code || "N/A"} - ${entry.vehicles?.name || "N/A"}`;
      if (!grouped[vehicleKey]) {
        grouped[vehicleKey] = [];
      }
      grouped[vehicleKey].push(entry);
    });
    return grouped;
  };
  function toggleAutoRefresh() {
    autoRefresh = !autoRefresh;
    if (autoRefresh) {
      refreshInterval = setInterval(
        () => {
          loadEntries();
        },
        15e3
      );
    } else if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
  }
  head($$payload, ($$payload2) => {
    $$payload2.title = `<title>Fuel Summary - ${escape_html(selectedDate)}</title>`;
  });
  $$payload.out.push(`<div class="fuel-summary svelte-zlsqi4"><div class="header svelte-zlsqi4"><h1 class="svelte-zlsqi4">Fuel Entry Summary</h1> <p class="subtitle svelte-zlsqi4">For manual book transcription</p></div> <div class="controls svelte-zlsqi4"><div class="date-selector svelte-zlsqi4"><label for="date" class="svelte-zlsqi4">Date:</label> <input id="date" type="date"${attr("value", selectedDate)} class="svelte-zlsqi4"/></div> <div class="action-buttons svelte-zlsqi4">`);
  Button($$payload, {
    size: "sm",
    variant: "outline",
    onclick: toggleAutoRefresh,
    children: ($$payload2) => {
      $$payload2.out.push(`<!---->${escape_html(autoRefresh ? "⏸️ Pause" : "▶️ Auto-refresh")}`);
    }
  });
  $$payload.out.push(`<!----> `);
  Button($$payload, {
    size: "sm",
    variant: "outline",
    onclick: loadEntries,
    children: ($$payload2) => {
      $$payload2.out.push(`<!---->🔄 Refresh`);
    }
  });
  $$payload.out.push(`<!----> `);
  Button($$payload, {
    size: "sm",
    variant: "outline",
    onclick: () => window.print(),
    children: ($$payload2) => {
      $$payload2.out.push(`<!---->🖨️ Print`);
    }
  });
  $$payload.out.push(`<!----> `);
  Button($$payload, {
    size: "sm",
    onclick: exportToCSV,
    children: ($$payload2) => {
      $$payload2.out.push(`<!---->📥 Export CSV`);
    }
  });
  $$payload.out.push(`<!----></div></div> `);
  if (loading) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="loading svelte-zlsqi4">Loading entries...</div>`);
  } else {
    $$payload.out.push("<!--[!-->");
    if (error) {
      $$payload.out.push("<!--[-->");
      $$payload.out.push(`<div class="error svelte-zlsqi4"><span class="error-icon svelte-zlsqi4">⚠️</span> ${escape_html(error)}</div>`);
    } else {
      $$payload.out.push("<!--[!-->");
      if (entries.length === 0) {
        $$payload.out.push("<!--[-->");
        $$payload.out.push(`<div class="empty svelte-zlsqi4"><span class="empty-icon svelte-zlsqi4">📭</span> <p>No fuel entries for ${escape_html(selectedDate)}</p></div>`);
      } else {
        $$payload.out.push("<!--[!-->");
        const each_array = ensure_array_like(entries);
        const each_array_1 = ensure_array_like(Object.entries(groupedEntries()));
        $$payload.out.push(`<div class="summary-stats svelte-zlsqi4"><div class="stat svelte-zlsqi4"><span class="stat-label svelte-zlsqi4">Total Entries:</span> <span class="stat-value svelte-zlsqi4">${escape_html(entries.length)}</span></div> <div class="stat svelte-zlsqi4"><span class="stat-label svelte-zlsqi4">Total Fuel:</span> <span class="stat-value svelte-zlsqi4">${escape_html(entries.reduce((sum, e) => sum + e.litres_dispensed, 0).toFixed(1))} L</span></div> <div class="stat svelte-zlsqi4"><span class="stat-label svelte-zlsqi4">Vehicles:</span> <span class="stat-value svelte-zlsqi4">${escape_html(Object.keys(groupedEntries()).length)}</span></div></div> <div class="table-container desktop-only svelte-zlsqi4"><table class="summary-table svelte-zlsqi4"><thead><tr><th class="svelte-zlsqi4">Time</th><th class="svelte-zlsqi4">Vehicle</th><th class="svelte-zlsqi4">Driver</th><th class="svelte-zlsqi4">Activity</th><th class="svelte-zlsqi4">Location</th><th class="svelte-zlsqi4">Fuel (L)</th><th class="svelte-zlsqi4">Odometer</th><th class="svelte-zlsqi4">Bowser</th></tr></thead><tbody class="svelte-zlsqi4"><!--[-->`);
        for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
          let entry = each_array[$$index];
          $$payload.out.push(`<tr class="svelte-zlsqi4"><td class="svelte-zlsqi4">${escape_html(entry.time)}</td><td class="vehicle-cell svelte-zlsqi4"><span class="code svelte-zlsqi4">${escape_html(entry.vehicles?.code || "N/A")}</span> <span class="name svelte-zlsqi4">${escape_html(entry.vehicles?.name || "N/A")}</span></td><td class="svelte-zlsqi4"><span class="code svelte-zlsqi4">${escape_html(entry.drivers?.employee_code || "N/A")}</span> <span class="name svelte-zlsqi4">${escape_html(entry.drivers?.name || "N/A")}</span></td><td class="svelte-zlsqi4">${escape_html(entry.activities?.name || "N/A")}</td><td class="svelte-zlsqi4">${escape_html(getLocation(entry))}</td><td class="fuel-cell svelte-zlsqi4">${escape_html(entry.litres_dispensed.toFixed(1))}</td><td class="odo-cell svelte-zlsqi4">${escape_html(formatOdometer(entry.odometer_start, entry.odometer_end, entry.gauge_working))}</td><td class="bowser-cell svelte-zlsqi4">${escape_html(formatBowserReading(entry.bowser_reading_start, entry.bowser_reading_end))}</td></tr>`);
        }
        $$payload.out.push(`<!--]--></tbody></table></div> <div class="mobile-cards mobile-only svelte-zlsqi4"><!--[-->`);
        for (let $$index_2 = 0, $$length = each_array_1.length; $$index_2 < $$length; $$index_2++) {
          let [vehicle, vehicleEntries] = each_array_1[$$index_2];
          const each_array_2 = ensure_array_like(vehicleEntries);
          $$payload.out.push(`<div class="vehicle-group svelte-zlsqi4"><h3 class="vehicle-header svelte-zlsqi4">${escape_html(vehicle)}</h3> <!--[-->`);
          for (let $$index_1 = 0, $$length2 = each_array_2.length; $$index_1 < $$length2; $$index_1++) {
            let entry = each_array_2[$$index_1];
            $$payload.out.push(`<div class="entry-card svelte-zlsqi4"><div class="entry-row svelte-zlsqi4"><span class="label svelte-zlsqi4">Time:</span> <span class="value svelte-zlsqi4">${escape_html(entry.time)}</span></div> <div class="entry-row svelte-zlsqi4"><span class="label svelte-zlsqi4">Driver:</span> <span class="value svelte-zlsqi4">${escape_html(entry.drivers?.employee_code || "N/A")} - ${escape_html(entry.drivers?.name || "N/A")}</span></div> <div class="entry-row svelte-zlsqi4"><span class="label svelte-zlsqi4">Activity:</span> <span class="value svelte-zlsqi4">${escape_html(entry.activities?.name || "N/A")}</span></div> <div class="entry-row svelte-zlsqi4"><span class="label svelte-zlsqi4">Location:</span> <span class="value svelte-zlsqi4">${escape_html(getLocation(entry))}</span></div> <div class="entry-row highlight svelte-zlsqi4"><span class="label svelte-zlsqi4">Fuel:</span> <span class="value svelte-zlsqi4">${escape_html(entry.litres_dispensed.toFixed(1))} L</span></div> <div class="entry-row svelte-zlsqi4"><span class="label svelte-zlsqi4">Odometer:</span> <span class="value svelte-zlsqi4">${escape_html(formatOdometer(entry.odometer_start, entry.odometer_end, entry.gauge_working))}</span></div> <div class="entry-row svelte-zlsqi4"><span class="label svelte-zlsqi4">Bowser:</span> <span class="value svelte-zlsqi4">${escape_html(formatBowserReading(entry.bowser_reading_start, entry.bowser_reading_end))}</span></div></div>`);
          }
          $$payload.out.push(`<!--]--></div>`);
        }
        $$payload.out.push(`<!--]--></div>`);
      }
      $$payload.out.push(`<!--]-->`);
    }
    $$payload.out.push(`<!--]-->`);
  }
  $$payload.out.push(`<!--]--></div>`);
  pop();
}
export {
  _page as default
};
