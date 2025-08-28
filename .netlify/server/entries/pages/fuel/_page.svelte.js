import { P as ensure_array_like, J as escape_html, B as pop, z as push, N as attr_style, O as stringify, G as attr_class, K as attr, E as store_get, I as unsubscribe_stores, F as head } from "../../../chunks/index2.js";
import { B as Button } from "../../../chunks/Button.js";
/* empty css                                                 */
import { C as Card } from "../../../chunks/Card.js";
import { d as derived, w as writable } from "../../../chunks/index.js";
function VehicleSelection($$payload, $$props) {
  push();
  let { selectedVehicle, onVehicleSelect, errors } = $$props;
  let vehicles = [];
  (() => {
    const groups = {};
    const activeVehicles = vehicles.filter((v) => v.is_active !== false);
    const sorted = [...activeVehicles].sort((a, b) => {
      const typeA = a.type || "Other";
      const typeB = b.type || "Other";
      if (typeA < typeB) return -1;
      if (typeA > typeB) return 1;
      const nameA = a.name || "";
      const nameB = b.name || "";
      if (nameA < nameB) return -1;
      if (nameA > nameB) return 1;
      return 0;
    });
    sorted.forEach((vehicle) => {
      const type = vehicle.type || "Other";
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(vehicle);
    });
    return groups;
  })();
  function formatOdometer(reading, unit) {
    if (reading === null) return "Not set";
    return `${new Intl.NumberFormat().format(reading)} ${unit || "km"}`;
  }
  $$payload.out.push(`<div class="vehicle-selection svelte-1w2cn5"><div class="step-header svelte-1w2cn5"><h2 class="svelte-1w2cn5">Vehicle</h2></div> `);
  if (errors.length > 0) {
    $$payload.out.push("<!--[-->");
    const each_array = ensure_array_like(errors);
    $$payload.out.push(`<div class="error-messages svelte-1w2cn5"><!--[-->`);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let error = each_array[$$index];
      $$payload.out.push(`<div class="error-message svelte-1w2cn5"><span class="error-icon svelte-1w2cn5">⚠️</span> ${escape_html(error)}</div>`);
    }
    $$payload.out.push(`<!--]--></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> `);
  {
    $$payload.out.push("<!--[-->");
    const each_array_1 = ensure_array_like(Array(6));
    $$payload.out.push(`<div class="loading-state svelte-1w2cn5"><div class="vehicles-grid svelte-1w2cn5"><!--[-->`);
    for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
      each_array_1[$$index_1];
      $$payload.out.push(`<div class="vehicle-card-skeleton svelte-1w2cn5"><div class="skeleton-header svelte-1w2cn5"><div class="skeleton-icon svelte-1w2cn5"></div> <div class="skeleton-content svelte-1w2cn5"><div class="skeleton-line svelte-1w2cn5"></div> <div class="skeleton-line short svelte-1w2cn5"></div></div></div> <div class="skeleton-body svelte-1w2cn5"><div class="skeleton-line svelte-1w2cn5"></div> <div class="skeleton-line short svelte-1w2cn5"></div></div></div>`);
    }
    $$payload.out.push(`<!--]--></div></div>`);
  }
  $$payload.out.push(`<!--]--> `);
  if (selectedVehicle) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="selection-summary svelte-1w2cn5">`);
    Card($$payload, {
      class: "selected-vehicle-summary",
      children: ($$payload2) => {
        $$payload2.out.push(`<div class="summary-header svelte-1w2cn5"><span class="summary-icon svelte-1w2cn5">✓</span> <h3 class="svelte-1w2cn5">Selected Vehicle</h3></div> <div class="summary-content svelte-1w2cn5"><div class="summary-vehicle svelte-1w2cn5"><div class="summary-name svelte-1w2cn5">${escape_html(selectedVehicle.name || `${selectedVehicle.make || ""} ${selectedVehicle.model || ""}`.trim())}</div> <div class="summary-reg svelte-1w2cn5">${escape_html(selectedVehicle.registration || "")}</div></div> <div class="summary-details svelte-1w2cn5"><div class="summary-detail svelte-1w2cn5"><span class="svelte-1w2cn5">Current Odometer:</span> <strong class="svelte-1w2cn5">${escape_html(formatOdometer(selectedVehicle.current_odometer, selectedVehicle.odometer_unit))}</strong></div></div></div> <div class="summary-actions svelte-1w2cn5">`);
        Button($$payload2, {
          variant: "outline",
          size: "sm",
          onclick: () => onVehicleSelect(null),
          children: ($$payload3) => {
            $$payload3.out.push(`<!---->Change Vehicle`);
          }
        });
        $$payload2.out.push(`<!----></div>`);
      }
    });
    $$payload.out.push(`<!----></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--></div>`);
  pop();
}
function DriverSelection($$payload, $$props) {
  push();
  let { selectedDriver, onDriverSelect } = $$props;
  let drivers = [];
  drivers.filter((driver) => {
    return true;
  }).sort((a, b) => {
    const codeA = a.employee_code || "ZZZ";
    const codeB = b.employee_code || "ZZZ";
    return codeA.localeCompare(codeB);
  });
  $$payload.out.push(`<div class="driver-selection svelte-7q3g20">`);
  {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> `);
  {
    $$payload.out.push("<!--[-->");
    const each_array = ensure_array_like(Array(6));
    $$payload.out.push(`<div class="loading-state svelte-7q3g20"><div class="drivers-grid svelte-7q3g20"><!--[-->`);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      each_array[$$index];
      $$payload.out.push(`<div class="driver-card-skeleton svelte-7q3g20"><div class="skeleton-header svelte-7q3g20"><div class="skeleton-avatar svelte-7q3g20"></div> <div class="skeleton-content svelte-7q3g20"><div class="skeleton-line svelte-7q3g20"></div> <div class="skeleton-line short svelte-7q3g20"></div></div></div> <div class="skeleton-body svelte-7q3g20"><div class="skeleton-line svelte-7q3g20"></div> <div class="skeleton-line short svelte-7q3g20"></div></div></div>`);
    }
    $$payload.out.push(`<!--]--></div></div>`);
  }
  $$payload.out.push(`<!--]--> `);
  if (selectedDriver) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="selection-summary svelte-7q3g20">`);
    Card($$payload, {
      class: "selected-driver-summary",
      children: ($$payload2) => {
        $$payload2.out.push(`<div class="summary-header svelte-7q3g20"><span class="summary-icon svelte-7q3g20">✓</span> <h3 class="svelte-7q3g20">Selected Driver</h3></div> <div class="summary-content svelte-7q3g20"><div class="summary-driver svelte-7q3g20"><div class="summary-avatar svelte-7q3g20">${escape_html(selectedDriver.name.charAt(0).toUpperCase())}</div> <div class="summary-info svelte-7q3g20"><div class="summary-name svelte-7q3g20">${escape_html(selectedDriver.name)}</div> `);
        if (selectedDriver.employee_code) {
          $$payload2.out.push("<!--[-->");
          $$payload2.out.push(`<div class="summary-code svelte-7q3g20">#${escape_html(selectedDriver.employee_code)}</div>`);
        } else {
          $$payload2.out.push("<!--[!-->");
        }
        $$payload2.out.push(`<!--]--></div></div> `);
        if (selectedDriver.license_number) {
          $$payload2.out.push("<!--[-->");
          $$payload2.out.push(`<div class="summary-details svelte-7q3g20"><div class="summary-detail svelte-7q3g20"><span class="svelte-7q3g20">License:</span> <strong class="svelte-7q3g20">${escape_html(selectedDriver.license_number)}</strong></div></div>`);
        } else {
          $$payload2.out.push("<!--[!-->");
        }
        $$payload2.out.push(`<!--]--></div> <div class="summary-actions svelte-7q3g20">`);
        Button($$payload2, {
          variant: "outline",
          size: "sm",
          onclick: () => onDriverSelect(null),
          children: ($$payload3) => {
            $$payload3.out.push(`<!---->Change Driver`);
          }
        });
        $$payload2.out.push(`<!----></div>`);
      }
    });
    $$payload.out.push(`<!----></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--></div>`);
  pop();
}
function ActivitySelection($$payload, $$props) {
  push();
  let { selectedActivity, onActivitySelect } = $$props;
  let activities = [];
  let groupedActivities = (() => {
    const groups = {};
    const filtered = activities.filter((activity) => {
      return true;
    });
    const sorted = [...filtered].sort((a, b) => {
      const categoryA = a.category || "Other";
      const categoryB = b.category || "Other";
      if (categoryA < categoryB) return -1;
      if (categoryA > categoryB) return 1;
      const nameA = a.name || "";
      const nameB = b.name || "";
      if (nameA < nameB) return -1;
      if (nameA > nameB) return 1;
      return 0;
    });
    sorted.forEach((activity) => {
      const category = activity.category || "Other";
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(activity);
    });
    return groups;
  })();
  Object.values(groupedActivities).flat().length;
  function getActivityIcon(activity) {
    return activity.icon || "⚙️";
  }
  function getActivityColor(activityName) {
    const name = activityName.toLowerCase();
    if (name.includes("plowing") || name.includes("plough")) return "#8b5cf6";
    if (name.includes("seeding") || name.includes("planting")) return "#10b981";
    if (name.includes("harvesting") || name.includes("harvest")) return "#f59e0b";
    if (name.includes("spraying") || name.includes("spray")) return "#06b6d4";
    if (name.includes("cultivation") || name.includes("cultivat")) return "#84cc16";
    if (name.includes("transport") || name.includes("hauling")) return "#6b7280";
    if (name.includes("mowing") || name.includes("cutting")) return "#ef4444";
    if (name.includes("irrigation") || name.includes("watering")) return "#3b82f6";
    return "#6366f1";
  }
  $$payload.out.push(`<div class="activity-selection svelte-6el3tg">`);
  {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> `);
  {
    $$payload.out.push("<!--[-->");
    const each_array = ensure_array_like(Array(8));
    $$payload.out.push(`<div class="loading-state svelte-6el3tg"><div class="activities-grid svelte-6el3tg"><!--[-->`);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      each_array[$$index];
      $$payload.out.push(`<div class="activity-card-skeleton svelte-6el3tg"><div class="skeleton-header svelte-6el3tg"><div class="skeleton-icon svelte-6el3tg"></div> <div class="skeleton-content svelte-6el3tg"><div class="skeleton-line svelte-6el3tg"></div> <div class="skeleton-line short svelte-6el3tg"></div></div></div></div>`);
    }
    $$payload.out.push(`<!--]--></div></div>`);
  }
  $$payload.out.push(`<!--]--> `);
  if (selectedActivity) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="selection-summary svelte-6el3tg">`);
    Card($$payload, {
      class: "selected-activity-summary",
      children: ($$payload2) => {
        $$payload2.out.push(`<div class="summary-header svelte-6el3tg"><span class="summary-icon svelte-6el3tg">✓</span> <h3 class="svelte-6el3tg">Selected Activity</h3></div> <div class="summary-content svelte-6el3tg"><div class="summary-activity svelte-6el3tg"><div class="summary-activity-icon svelte-6el3tg"${attr_style(`color: ${stringify(getActivityColor(selectedActivity.name))}`)}>${escape_html(getActivityIcon(selectedActivity))}</div> <div class="summary-info svelte-6el3tg"><div class="summary-name svelte-6el3tg">${escape_html(selectedActivity.name)}</div> `);
        if (selectedActivity.name_zulu) {
          $$payload2.out.push("<!--[-->");
          $$payload2.out.push(`<div class="summary-name-zulu svelte-6el3tg">${escape_html(selectedActivity.name_zulu)}</div>`);
        } else {
          $$payload2.out.push("<!--[!-->");
        }
        $$payload2.out.push(`<!--]--> `);
        if (selectedActivity.description) {
          $$payload2.out.push("<!--[-->");
          $$payload2.out.push(`<div class="summary-description svelte-6el3tg">${escape_html(selectedActivity.description)}</div>`);
        } else {
          $$payload2.out.push("<!--[!-->");
        }
        $$payload2.out.push(`<!--]--></div></div></div> <div class="summary-actions svelte-6el3tg">`);
        Button($$payload2, {
          variant: "outline",
          size: "sm",
          onclick: () => onActivitySelect(null),
          children: ($$payload3) => {
            $$payload3.out.push(`<!---->Change Activity`);
          }
        });
        $$payload2.out.push(`<!----></div>`);
      }
    });
    $$payload.out.push(`<!----></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--></div>`);
  pop();
}
function LocationSelection($$payload, $$props) {
  push();
  let {
    selectedField,
    selectedZone,
    onLocationSelect,
    errors
  } = $$props;
  let fields = [];
  let hasSelection = selectedField !== null || selectedZone !== null;
  let groupedFields = (() => {
    const groups = {};
    const filtered = fields.filter((field) => {
      return true;
    });
    const sorted = [...filtered].sort((a, b) => {
      const cropA = a.crop_type || "Other";
      const cropB = b.crop_type || "Other";
      if (cropA < cropB) return -1;
      if (cropA > cropB) return 1;
      const nameA = a.name || "";
      const nameB = b.name || "";
      if (nameA < nameB) return -1;
      if (nameA > nameB) return 1;
      return 0;
    });
    sorted.forEach((field) => {
      const crop = field.crop_type || "Other";
      if (!groups[crop]) {
        groups[crop] = [];
      }
      groups[crop].push(field);
    });
    return groups;
  })();
  Object.values(groupedFields).flat().length;
  function getFieldIcon(cropType) {
    if (!cropType) return "🌾";
    const crop = cropType.toLowerCase();
    if (crop.includes("wheat")) return "🌾";
    if (crop.includes("corn") || crop.includes("maize")) return "🌽";
    if (crop.includes("soy")) return "🫘";
    if (crop.includes("barley")) return "🌾";
    if (crop.includes("oat")) return "🌾";
    if (crop.includes("rice")) return "🌾";
    if (crop.includes("cotton")) return "🤍";
    if (crop.includes("sunflower")) return "🌻";
    return "🌱";
  }
  function getFieldColor(cropType) {
    if (!cropType) return "#10b981";
    const crop = cropType.toLowerCase();
    if (crop.includes("wheat")) return "#f59e0b";
    if (crop.includes("corn") || crop.includes("maize")) return "#eab308";
    if (crop.includes("soy")) return "#10b981";
    if (crop.includes("barley")) return "#d97706";
    if (crop.includes("oat")) return "#92400e";
    if (crop.includes("rice")) return "#059669";
    if (crop.includes("cotton")) return "#6b7280";
    if (crop.includes("sunflower")) return "#f59e0b";
    return "#10b981";
  }
  function formatArea(area) {
    if (area === null) return "Not specified";
    return `${new Intl.NumberFormat().format(area)} ha`;
  }
  $$payload.out.push(`<div class="location-selection svelte-7ay6o6">`);
  if (errors.length > 0) {
    $$payload.out.push("<!--[-->");
    const each_array = ensure_array_like(errors);
    $$payload.out.push(`<div class="error-messages svelte-7ay6o6"><!--[-->`);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let error = each_array[$$index];
      $$payload.out.push(`<div class="error-message svelte-7ay6o6"><span class="error-icon svelte-7ay6o6">⚠️</span> ${escape_html(error)}</div>`);
    }
    $$payload.out.push(`<!--]--></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> <div class="skip-option svelte-7ay6o6"><div class="skip-message svelte-7ay6o6">⏭️ Skip Location Selection (Optional)</div></div> `);
  {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> `);
  {
    $$payload.out.push("<!--[-->");
    const each_array_1 = ensure_array_like(Array(6));
    $$payload.out.push(`<div class="loading-state svelte-7ay6o6"><div class="fields-grid svelte-7ay6o6"><!--[-->`);
    for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
      each_array_1[$$index_1];
      $$payload.out.push(`<div class="field-card-skeleton svelte-7ay6o6"><div class="skeleton-header svelte-7ay6o6"><div class="skeleton-icon svelte-7ay6o6"></div> <div class="skeleton-content svelte-7ay6o6"><div class="skeleton-line svelte-7ay6o6"></div> <div class="skeleton-line short svelte-7ay6o6"></div></div></div></div>`);
    }
    $$payload.out.push(`<!--]--></div></div>`);
  }
  $$payload.out.push(`<!--]--> `);
  if (hasSelection) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="selection-summary svelte-7ay6o6">`);
    Card($$payload, {
      class: "selected-location-summary",
      children: ($$payload2) => {
        $$payload2.out.push(`<div class="summary-header svelte-7ay6o6"><span class="summary-icon svelte-7ay6o6">✓</span> <h3 class="svelte-7ay6o6">Selected Location</h3></div> <div class="summary-content svelte-7ay6o6">`);
        if (selectedField) {
          $$payload2.out.push("<!--[-->");
          $$payload2.out.push(`<div class="summary-field svelte-7ay6o6"><div class="summary-field-icon svelte-7ay6o6"${attr_style(`color: ${stringify(getFieldColor(selectedField.crop_type))}`)}>${escape_html(getFieldIcon(selectedField.crop_type))}</div> <div class="summary-info svelte-7ay6o6"><div class="summary-name svelte-7ay6o6">Field: ${escape_html(selectedField.name)}</div> <div class="summary-details svelte-7ay6o6">${escape_html(selectedField.code)} • ${escape_html(formatArea(selectedField.area))} `);
          if (selectedField.crop_type) {
            $$payload2.out.push("<!--[-->");
            $$payload2.out.push(`• ${escape_html(selectedField.crop_type)}`);
          } else {
            $$payload2.out.push("<!--[!-->");
          }
          $$payload2.out.push(`<!--]--></div></div></div>`);
        } else {
          $$payload2.out.push("<!--[!-->");
          if (selectedZone) {
            $$payload2.out.push("<!--[-->");
            $$payload2.out.push(`<div class="summary-zone svelte-7ay6o6"><div class="summary-zone-badge svelte-7ay6o6"${attr_style(`background-color: ${stringify(selectedZone.color || "#95A5A6")}`)}>${escape_html(selectedZone.code)}</div> <div class="summary-info svelte-7ay6o6"><div class="summary-name svelte-7ay6o6">Zone: ${escape_html(selectedZone.name)}</div> `);
            if (selectedZone.description) {
              $$payload2.out.push("<!--[-->");
              $$payload2.out.push(`<div class="summary-details svelte-7ay6o6">${escape_html(selectedZone.description)}</div>`);
            } else {
              $$payload2.out.push("<!--[!-->");
            }
            $$payload2.out.push(`<!--]--></div></div>`);
          } else {
            $$payload2.out.push("<!--[!-->");
          }
          $$payload2.out.push(`<!--]-->`);
        }
        $$payload2.out.push(`<!--]--></div> <div class="summary-actions svelte-7ay6o6">`);
        Button($$payload2, {
          variant: "outline",
          size: "sm",
          onclick: () => onLocationSelect(null, null),
          children: ($$payload3) => {
            $$payload3.out.push(`<!---->Change Location`);
          }
        });
        $$payload2.out.push(`<!----></div>`);
      }
    });
    $$payload.out.push(`<!----></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--></div>`);
  pop();
}
function OdometerReading($$payload, $$props) {
  push();
  let {
    selectedVehicle,
    odometerEnd
  } = $$props;
  let currentOdo = selectedVehicle?.current_odometer?.toString() || "";
  selectedVehicle?.current_odometer || 0;
  let newOdo = odometerEnd?.toString() || "";
  let isBrokenGauge = false;
  $$payload.out.push(`<div class="odometer-reading svelte-7hfff">`);
  if (
    // Update distance when values change
    selectedVehicle
  ) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="odo-card current-odo svelte-7hfff"><div class="current-odo-header svelte-7hfff"><div class="odo-label svelte-7hfff">Current</div> <div class="current-odo-controls svelte-7hfff">`);
    {
      $$payload.out.push("<!--[!-->");
      $$payload.out.push(`<button class="odo-control-btn edit-btn svelte-7hfff" title="Manual override">✏️</button>`);
    }
    $$payload.out.push(`<!--]--></div></div> `);
    {
      $$payload.out.push("<!--[!-->");
      $$payload.out.push(`<div${attr_class("odo-value svelte-7hfff", void 0, { "editable": selectedVehicle })}>${escape_html(currentOdo || "No reading")}</div>`);
    }
    $$payload.out.push(`<!--]--> `);
    {
      $$payload.out.push("<!--[!-->");
    }
    $$payload.out.push(`<!--]--></div> `);
    {
      $$payload.out.push("<!--[-->");
      $$payload.out.push(`<div class="odo-card new-odo svelte-7hfff"><input type="number" inputmode="numeric" pattern="[0-9]*"${attr("value", newOdo)} placeholder="_" class="new-odo-input svelte-7hfff" autocomplete="off"/> <div class="odo-label svelte-7hfff">New</div></div> `);
      {
        $$payload.out.push("<!--[!-->");
      }
      $$payload.out.push(`<!--]--> <div class="gauge-toggle svelte-7hfff"><label class="checkbox svelte-7hfff"><input type="checkbox"${attr("checked", isBrokenGauge, true)} class="svelte-7hfff"/> <span>Broken Gauge</span></label></div>`);
    }
    $$payload.out.push(`<!--]-->`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<div class="no-vehicle svelte-7hfff">Select a vehicle first</div>`);
  }
  $$payload.out.push(`<!--]--></div>`);
  pop();
}
function FuelDataEntry($$payload, $$props) {
  push();
  let {
    selectedVehicle,
    selectedBowser,
    litresDispensed
  } = $$props;
  let fuelAmount = litresDispensed?.toString() || "";
  selectedBowser?.id || "";
  let selectedBowserInfo = null;
  $$payload.out.push(`<div class="fuel-data-entry svelte-a26ygd">`);
  if (
    // Update selected bowser when values change
    // Check for reading continuity
    // Allow small rounding differences
    selectedVehicle
  ) {
    $$payload.out.push("<!--[-->");
    {
      $$payload.out.push("<!--[-->");
      $$payload.out.push(`<div class="loading svelte-a26ygd">Loading fuel bowsers...</div>`);
    }
    $$payload.out.push(`<!--]--> <div class="fuel-input-container svelte-a26ygd"><input type="number" inputmode="numeric" pattern="[0-9]*"${attr("value", fuelAmount)} placeholder="Enter fuel" class="fuel-input svelte-a26ygd" autocomplete="off"/> <div class="fuel-label svelte-a26ygd">Litres dispensed</div></div> <div class="calculations svelte-a26ygd"><div class="calc-header svelte-a26ygd"><h3 class="svelte-a26ygd">Bowser Readings</h3></div> <div class="calc-item svelte-a26ygd"><span class="calc-label svelte-a26ygd">Start:</span> <div class="calc-item-right svelte-a26ygd">`);
    {
      $$payload.out.push("<!--[!-->");
      $$payload.out.push(`<span class="calc-value editable svelte-a26ygd">`);
      {
        $$payload.out.push("<!--[!-->");
        $$payload.out.push(`-`);
      }
      $$payload.out.push(`<!--]--></span>`);
    }
    $$payload.out.push(`<!--]--> `);
    {
      $$payload.out.push("<!--[!-->");
    }
    $$payload.out.push(`<!--]--></div></div> <div class="calc-item svelte-a26ygd"><span class="calc-label svelte-a26ygd">End:</span> <div class="calc-item-right svelte-a26ygd">`);
    {
      $$payload.out.push("<!--[!-->");
      $$payload.out.push(`<span${attr_class("calc-value svelte-a26ygd", void 0, { "editable": selectedBowserInfo })}>`);
      {
        $$payload.out.push("<!--[!-->");
        $$payload.out.push(`-`);
      }
      $$payload.out.push(`<!--]--></span>`);
    }
    $$payload.out.push(`<!--]--> `);
    {
      $$payload.out.push("<!--[!-->");
    }
    $$payload.out.push(`<!--]--></div></div></div> `);
    {
      $$payload.out.push("<!--[!-->");
    }
    $$payload.out.push(`<!--]-->`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<div class="no-vehicle svelte-a26ygd">Select a vehicle first</div>`);
  }
  $$payload.out.push(`<!--]--></div>`);
  pop();
}
const defaultSteps = [
  {
    id: "vehicle",
    title: "Select Vehicle",
    icon: "🚜",
    completed: false,
    valid: false,
    required: true
  },
  {
    id: "driver",
    title: "Select Driver",
    icon: "👤",
    completed: false,
    valid: false,
    required: true
  },
  {
    id: "activity",
    title: "Select Activity",
    icon: "⚙️",
    completed: false,
    valid: false,
    required: true
  },
  {
    id: "location",
    title: "Select Location",
    icon: "📍",
    completed: false,
    valid: true,
    // Optional step
    required: false
  },
  {
    id: "odometer",
    title: "Odometer Reading",
    icon: "📏",
    completed: false,
    valid: false,
    required: true
  },
  {
    id: "fuel",
    title: "Fuel Data",
    icon: "⛽",
    completed: false,
    valid: false,
    required: true
  },
  {
    id: "review",
    title: "Review & Submit",
    icon: "✅",
    completed: false,
    valid: false,
    required: true
  }
];
const initialData = {
  vehicle: null,
  driver: null,
  activity: null,
  field: null,
  zone: null,
  odometerStart: null,
  odometerEnd: null,
  gaugeWorking: true,
  bowser: null,
  bowserReadingStart: null,
  bowserReadingEnd: null,
  litresDispensed: null,
  notes: "",
  timestamp: /* @__PURE__ */ new Date()
};
const initialState = {
  currentStep: 0,
  steps: [...defaultSteps],
  data: { ...initialData },
  validationErrors: {},
  loading: "idle",
  error: null,
  isSubmitting: false,
  canProceed: false,
  canGoBack: false,
  progress: 0
};
function createFuelEntryWorkflowStore() {
  const { subscribe, set, update } = writable(initialState);
  const validateStep = (stepId, data) => {
    const errors = [];
    switch (stepId) {
      case "vehicle":
        if (!data.vehicle) errors.push("Please select a vehicle");
        break;
      case "driver":
        if (!data.driver) errors.push("Please select a driver");
        break;
      case "activity":
        if (!data.activity) errors.push("Please select an activity");
        break;
      case "location":
        break;
      case "odometer":
        if (!data.gaugeWorking) {
          break;
        }
        if (data.odometerStart === null || data.odometerEnd === null) {
          errors.push("Please enter odometer reading");
        } else if (data.odometerEnd <= data.odometerStart) {
          errors.push("New odometer reading must be higher than current reading");
        }
        break;
      case "fuel":
        if (!data.bowser) {
          errors.push("Please select a bowser");
        }
        if (data.litresDispensed === null || data.litresDispensed <= 0) {
          errors.push("Litres dispensed must be greater than zero");
        }
        break;
      case "review":
        const allStepErrors = [];
        ["vehicle", "driver", "activity", "odometer", "fuel"].forEach((step) => {
          const stepValidation = validateStep(step, data);
          allStepErrors.push(...stepValidation.errors);
        });
        errors.push(...allStepErrors);
        break;
    }
    return { valid: errors.length === 0, errors };
  };
  const updateStepValidation = () => {
    update((state) => {
      const newSteps = state.steps.map((step) => {
        const validation = validateStep(step.id, state.data);
        return {
          ...step,
          valid: validation.valid,
          completed: validation.valid
        };
      });
      const newValidationErrors = {};
      newSteps.forEach((step) => {
        const validation = validateStep(step.id, state.data);
        if (validation.errors.length > 0) {
          newValidationErrors[step.id] = validation.errors;
        }
      });
      const currentStepValid = newSteps[state.currentStep]?.valid || false;
      const isLastStep = state.currentStep === newSteps.length - 1;
      const canProceed = currentStepValid && (isLastStep || state.currentStep < newSteps.length - 1);
      const canGoBack = state.currentStep > 0;
      const progress = Math.round((state.currentStep + (currentStepValid ? 1 : 0)) / newSteps.length * 100);
      return {
        ...state,
        steps: newSteps,
        validationErrors: newValidationErrors,
        canProceed,
        canGoBack,
        progress
      };
    });
  };
  return {
    subscribe,
    // Navigation
    nextStep: () => {
      update((state) => {
        if (state.canProceed) {
          const newStep = Math.min(state.currentStep + 1, state.steps.length - 1);
          return { ...state, currentStep: newStep };
        }
        return state;
      });
      updateStepValidation();
    },
    forceNextStep: () => {
      update((state) => {
        const newStep = Math.min(state.currentStep + 1, state.steps.length - 1);
        return { ...state, currentStep: newStep };
      });
      updateStepValidation();
    },
    previousStep: () => {
      update((state) => {
        if (state.canGoBack) {
          const newStep = Math.max(state.currentStep - 1, 0);
          return { ...state, currentStep: newStep };
        }
        return state;
      });
      updateStepValidation();
    },
    goToStep: (stepIndex) => {
      update((state) => {
        if (stepIndex >= 0 && stepIndex < state.steps.length) {
          return { ...state, currentStep: stepIndex };
        }
        return state;
      });
      updateStepValidation();
    },
    // Data updates
    setVehicle: (vehicle) => {
      update((state) => ({
        ...state,
        data: { ...state.data, vehicle, odometerStart: vehicle?.current_odometer || null }
      }));
      updateStepValidation();
    },
    setDriver: (driver) => {
      update((state) => ({
        ...state,
        data: { ...state.data, driver }
      }));
      updateStepValidation();
    },
    setActivity: (activity) => {
      update((state) => ({
        ...state,
        data: { ...state.data, activity }
      }));
      updateStepValidation();
    },
    setField: (field) => {
      update((state) => ({
        ...state,
        data: { ...state.data, field, zone: null }
      }));
      updateStepValidation();
    },
    setLocation: (field, zone) => {
      update((state) => ({
        ...state,
        data: { ...state.data, field, zone }
      }));
      updateStepValidation();
    },
    setOdometerData: (start, end, gaugeWorking) => {
      update((state) => ({
        ...state,
        data: {
          ...state.data,
          odometerStart: start,
          odometerEnd: end,
          gaugeWorking
        }
      }));
      updateStepValidation();
    },
    setBowser: (bowser) => {
      update((state) => ({
        ...state,
        data: {
          ...state.data,
          bowser,
          // Pre-populate start reading with bowser's current reading
          bowserReadingStart: bowser?.current_reading || state.data.bowserReadingStart
        }
      }));
      updateStepValidation();
    },
    setFuelData: (bowser, startReading, endReading, litres) => {
      update((state) => ({
        ...state,
        data: {
          ...state.data,
          bowser,
          bowserReadingStart: startReading,
          bowserReadingEnd: endReading,
          litresDispensed: litres
        }
      }));
      updateStepValidation();
    },
    setNotes: (notes) => {
      update((state) => ({
        ...state,
        data: { ...state.data, notes }
      }));
      updateStepValidation();
    },
    // Workflow control
    setLoading: (loading) => {
      update((state) => ({ ...state, loading }));
    },
    setError: (error) => {
      update((state) => ({ ...state, error }));
    },
    // Submit workflow
    submitFuelEntry: async () => {
      update((state) => ({ ...state, isSubmitting: true, error: null }));
      try {
        const { default: supabaseService } = await import("../../../chunks/supabase.js");
        const { offlineSyncService } = await import("../../../chunks/offline-sync.js");
        await supabaseService.init();
        let currentData;
        const unsubscribe = subscribe((state) => {
          currentData = state.data;
        });
        unsubscribe();
        const finalValidation = validateStep("review", currentData);
        if (!finalValidation.valid) {
          throw new Error(`Validation failed: ${finalValidation.errors.join(", ")}`);
        }
        const litresUsed = currentData.litresDispensed || 0;
        const fuelEntryData = {
          entry_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
          time: (/* @__PURE__ */ new Date()).toTimeString().substring(0, 5),
          vehicle_id: currentData.vehicle.id,
          driver_id: currentData.driver.id,
          activity_id: currentData.activity.id,
          field_id: currentData.field?.id || null,
          zone_id: currentData.zone?.id || null,
          bowser_id: currentData.bowser.id,
          odometer_start: currentData.odometerStart || null,
          odometer_end: currentData.odometerEnd || null,
          gauge_working: currentData.gaugeWorking,
          bowser_reading_start: currentData.bowserReadingStart || null,
          bowser_reading_end: currentData.bowserReadingEnd || null,
          litres_dispensed: currentData.litresDispensed || 0,
          litres_used: litresUsed,
          cost_per_litre: null,
          // Not collected in UI yet
          total_cost: null,
          // Not calculated without cost_per_litre
          notes: currentData.notes || null
        };
        console.log("Submitting fuel entry data:", fuelEntryData);
        let result;
        let isOffline = false;
        try {
          result = await supabaseService.createFuelEntry(fuelEntryData);
          if (result.error) {
            throw new Error(result.error);
          }
        } catch (error) {
          if (!navigator.onLine || error instanceof Error && (error.message.includes("fetch") || error.message.includes("network") || error.message.includes("Failed to fetch"))) {
            console.log("Storing fuel entry offline for later sync");
            const offlineId = await offlineSyncService.storeOfflineEntry("fuel_entry", fuelEntryData);
            isOffline = true;
            result = { data: { id: offlineId }, error: null };
          } else {
            throw error;
          }
        }
        if (!isOffline && currentData.odometerEnd && currentData.gaugeWorking) {
          try {
            await supabaseService.updateVehicleOdometer(
              currentData.vehicle.id,
              currentData.odometerEnd
            );
          } catch (error) {
            console.warn("Failed to update vehicle odometer:", error);
          }
        }
        if (currentData.bowserReadingEnd !== null && currentData.bowser) {
          if (isOffline) {
            await offlineSyncService.storeOfflineEntry("bowser_reading", {
              bowser_id: currentData.bowser.id,
              new_reading: currentData.bowserReadingEnd,
              fuel_entry_id: result.data?.id
            });
          } else {
            try {
              await supabaseService.updateBowserReading(
                currentData.bowser.id,
                currentData.bowserReadingEnd,
                result.data?.id
              );
            } catch (error) {
              console.warn("Failed to update bowser reading:", error);
            }
          }
        }
        update((state) => ({
          ...state,
          isSubmitting: false,
          loading: "success",
          error: null
        }));
        return { success: true, data: result.data };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to submit fuel entry";
        update((state) => ({
          ...state,
          isSubmitting: false,
          loading: "error",
          error: errorMessage
        }));
        return { success: false, error: errorMessage };
      }
    },
    // Reset workflow
    reset: () => {
      set({ ...initialState, steps: [...defaultSteps], data: { ...initialData } });
    },
    // Manual validation trigger
    validateCurrentStep: () => {
      updateStepValidation();
    }
  };
}
const fuelEntryWorkflowStore = createFuelEntryWorkflowStore();
const currentStep = derived(fuelEntryWorkflowStore, ($store) => $store.currentStep);
const currentStepData = derived(fuelEntryWorkflowStore, ($store) => $store.steps[$store.currentStep]);
derived(fuelEntryWorkflowStore, ($store) => $store.progress);
const workflowData = derived(fuelEntryWorkflowStore, ($store) => $store.data);
const workflowErrors = derived(fuelEntryWorkflowStore, ($store) => $store.validationErrors);
const canProceedToNext = derived(fuelEntryWorkflowStore, ($store) => $store.canProceed);
const canGoBackToPrevious = derived(fuelEntryWorkflowStore, ($store) => $store.canGoBack);
const isSubmittingEntry = derived(fuelEntryWorkflowStore, ($store) => $store.isSubmitting);
function FuelEntryWorkflow($$payload, $$props) {
  push();
  var $$store_subs;
  function handlePrevious() {
    fuelEntryWorkflowStore.previousStep();
  }
  function getCurrentStepErrors() {
    const currentStepId = store_get($$store_subs ??= {}, "$currentStepData", currentStepData)?.id || "";
    return store_get($$store_subs ??= {}, "$workflowErrors", workflowErrors)[currentStepId] || [];
  }
  $$payload.out.push(`<div class="fuel-entry-workflow svelte-1lv6g9m"><div class="dashboard-header svelte-1lv6g9m"><div class="header-content svelte-1lv6g9m"><h1 class="svelte-1lv6g9m">Fuel Entry</h1></div></div> <div class="step-info svelte-1lv6g9m"><span class="step-badge svelte-1lv6g9m">Step ${escape_html(store_get($$store_subs ??= {}, "$currentStep", currentStep) + 1)} of 7</span> <span class="step-title svelte-1lv6g9m">${escape_html(store_get($$store_subs ??= {}, "$currentStepData", currentStepData)?.title || "")}</span></div> <div class="step-content svelte-1lv6g9m">`);
  if (store_get($$store_subs ??= {}, "$currentStep", currentStep) === 0) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="step-container svelte-1lv6g9m">`);
    VehicleSelection($$payload, {
      selectedVehicle: store_get($$store_subs ??= {}, "$workflowData", workflowData).vehicle,
      onVehicleSelect: (vehicle) => {
        console.log("Vehicle selected:", vehicle);
        fuelEntryWorkflowStore.setVehicle(vehicle);
      },
      errors: getCurrentStepErrors()
    });
    $$payload.out.push(`<!----></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
    if (store_get($$store_subs ??= {}, "$currentStep", currentStep) === 1) {
      $$payload.out.push("<!--[-->");
      $$payload.out.push(`<div class="step-container svelte-1lv6g9m"><div class="step-nav svelte-1lv6g9m">`);
      if (store_get($$store_subs ??= {}, "$canGoBackToPrevious", canGoBackToPrevious)) {
        $$payload.out.push("<!--[-->");
        Button($$payload, {
          variant: "outline",
          onclick: handlePrevious,
          class: "nav-button",
          children: ($$payload2) => {
            $$payload2.out.push(`<!---->← Back`);
          }
        });
      } else {
        $$payload.out.push("<!--[!-->");
      }
      $$payload.out.push(`<!--]--></div> `);
      DriverSelection($$payload, {
        selectedDriver: store_get($$store_subs ??= {}, "$workflowData", workflowData).driver,
        onDriverSelect: (driver) => {
          console.log("Driver selected:", driver);
          fuelEntryWorkflowStore.setDriver(driver);
          if (driver?.default_vehicle && !store_get($$store_subs ??= {}, "$workflowData", workflowData).vehicle) {
            console.log("Auto-selecting default vehicle:", driver.default_vehicle);
            fuelEntryWorkflowStore.setVehicle(driver.default_vehicle);
          }
        },
        errors: getCurrentStepErrors()
      });
      $$payload.out.push(`<!----></div>`);
    } else {
      $$payload.out.push("<!--[!-->");
      if (store_get($$store_subs ??= {}, "$currentStep", currentStep) === 2) {
        $$payload.out.push("<!--[-->");
        $$payload.out.push(`<div class="step-container svelte-1lv6g9m"><div class="step-nav svelte-1lv6g9m">`);
        if (store_get($$store_subs ??= {}, "$canGoBackToPrevious", canGoBackToPrevious)) {
          $$payload.out.push("<!--[-->");
          Button($$payload, {
            variant: "outline",
            onclick: handlePrevious,
            class: "nav-button",
            children: ($$payload2) => {
              $$payload2.out.push(`<!---->← Back`);
            }
          });
        } else {
          $$payload.out.push("<!--[!-->");
        }
        $$payload.out.push(`<!--]--></div> `);
        ActivitySelection($$payload, {
          selectedActivity: store_get($$store_subs ??= {}, "$workflowData", workflowData).activity,
          onActivitySelect: (activity) => {
            console.log("Activity selected:", activity);
            fuelEntryWorkflowStore.setActivity(activity);
          },
          errors: getCurrentStepErrors()
        });
        $$payload.out.push(`<!----></div>`);
      } else {
        $$payload.out.push("<!--[!-->");
        if (store_get($$store_subs ??= {}, "$currentStep", currentStep) === 3) {
          $$payload.out.push("<!--[-->");
          $$payload.out.push(`<div class="step-container svelte-1lv6g9m"><div class="step-nav svelte-1lv6g9m">`);
          if (store_get($$store_subs ??= {}, "$canGoBackToPrevious", canGoBackToPrevious)) {
            $$payload.out.push("<!--[-->");
            Button($$payload, {
              variant: "outline",
              onclick: handlePrevious,
              class: "nav-button",
              children: ($$payload2) => {
                $$payload2.out.push(`<!---->← Back`);
              }
            });
          } else {
            $$payload.out.push("<!--[!-->");
          }
          $$payload.out.push(`<!--]--></div> `);
          LocationSelection($$payload, {
            selectedField: store_get($$store_subs ??= {}, "$workflowData", workflowData).field,
            selectedZone: store_get($$store_subs ??= {}, "$workflowData", workflowData).zone,
            onLocationSelect: (field, zone) => {
              console.log("Location selected:", { field, zone });
              fuelEntryWorkflowStore.setLocation(field, zone);
            },
            errors: getCurrentStepErrors()
          });
          $$payload.out.push(`<!----></div>`);
        } else {
          $$payload.out.push("<!--[!-->");
          if (store_get($$store_subs ??= {}, "$currentStep", currentStep) === 4) {
            $$payload.out.push("<!--[-->");
            $$payload.out.push(`<div class="step-container svelte-1lv6g9m"><div class="step-nav svelte-1lv6g9m">`);
            if (store_get($$store_subs ??= {}, "$canGoBackToPrevious", canGoBackToPrevious)) {
              $$payload.out.push("<!--[-->");
              Button($$payload, {
                variant: "outline",
                onclick: handlePrevious,
                class: "nav-button",
                children: ($$payload2) => {
                  $$payload2.out.push(`<!---->← Back`);
                }
              });
            } else {
              $$payload.out.push("<!--[!-->");
            }
            $$payload.out.push(`<!--]--> <button class="continue-button svelte-1lv6g9m"${attr("disabled", !store_get($$store_subs ??= {}, "$canProceedToNext", canProceedToNext), true)}>Continue →</button></div> `);
            OdometerReading($$payload, {
              selectedVehicle: store_get($$store_subs ??= {}, "$workflowData", workflowData).vehicle,
              odometerStart: store_get($$store_subs ??= {}, "$workflowData", workflowData).odometerStart,
              odometerEnd: store_get($$store_subs ??= {}, "$workflowData", workflowData).odometerEnd,
              gaugeWorking: store_get($$store_subs ??= {}, "$workflowData", workflowData).gaugeWorking,
              errors: getCurrentStepErrors()
            });
            $$payload.out.push(`<!----></div>`);
          } else {
            $$payload.out.push("<!--[!-->");
            if (store_get($$store_subs ??= {}, "$currentStep", currentStep) === 5) {
              $$payload.out.push("<!--[-->");
              $$payload.out.push(`<div class="step-container svelte-1lv6g9m"><div class="step-nav svelte-1lv6g9m">`);
              if (store_get($$store_subs ??= {}, "$canGoBackToPrevious", canGoBackToPrevious)) {
                $$payload.out.push("<!--[-->");
                Button($$payload, {
                  variant: "outline",
                  onclick: handlePrevious,
                  class: "nav-button",
                  children: ($$payload2) => {
                    $$payload2.out.push(`<!---->← Back`);
                  }
                });
              } else {
                $$payload.out.push("<!--[!-->");
              }
              $$payload.out.push(`<!--]--> <button class="continue-button svelte-1lv6g9m"${attr("disabled", !store_get($$store_subs ??= {}, "$canProceedToNext", canProceedToNext), true)}>Continue →</button></div> `);
              FuelDataEntry($$payload, {
                selectedVehicle: store_get($$store_subs ??= {}, "$workflowData", workflowData).vehicle,
                selectedBowser: store_get($$store_subs ??= {}, "$workflowData", workflowData).bowser,
                bowserReadingStart: store_get($$store_subs ??= {}, "$workflowData", workflowData).bowserReadingStart,
                bowserReadingEnd: store_get($$store_subs ??= {}, "$workflowData", workflowData).bowserReadingEnd,
                litresDispensed: store_get($$store_subs ??= {}, "$workflowData", workflowData).litresDispensed,
                errors: getCurrentStepErrors()
              });
              $$payload.out.push(`<!----></div>`);
            } else {
              $$payload.out.push("<!--[!-->");
              if (store_get($$store_subs ??= {}, "$currentStep", currentStep) === 6) {
                $$payload.out.push("<!--[-->");
                $$payload.out.push(`<div class="step-container svelte-1lv6g9m"><div class="step-nav svelte-1lv6g9m">`);
                if (store_get($$store_subs ??= {}, "$canGoBackToPrevious", canGoBackToPrevious)) {
                  $$payload.out.push("<!--[-->");
                  Button($$payload, {
                    variant: "outline",
                    onclick: handlePrevious,
                    class: "nav-button",
                    children: ($$payload2) => {
                      $$payload2.out.push(`<!---->← Back`);
                    }
                  });
                } else {
                  $$payload.out.push("<!--[!-->");
                }
                $$payload.out.push(`<!--]--></div> <div class="review-card svelte-1lv6g9m"><div class="review-header svelte-1lv6g9m"><h3 class="svelte-1lv6g9m">Review Entry</h3> <p class="svelte-1lv6g9m">Please verify all information before submitting</p></div> <div class="review-grid svelte-1lv6g9m">`);
                if (store_get($$store_subs ??= {}, "$workflowData", workflowData).vehicle) {
                  $$payload.out.push("<!--[-->");
                  $$payload.out.push(`<div class="review-item svelte-1lv6g9m"><span class="item-label svelte-1lv6g9m">Vehicle</span> <span class="item-value svelte-1lv6g9m">${escape_html(store_get($$store_subs ??= {}, "$workflowData", workflowData).vehicle.name || `${store_get($$store_subs ??= {}, "$workflowData", workflowData).vehicle.make || ""} ${store_get($$store_subs ??= {}, "$workflowData", workflowData).vehicle.model || ""}`.trim() || "Unnamed")}</span></div>`);
                } else {
                  $$payload.out.push("<!--[!-->");
                }
                $$payload.out.push(`<!--]--> `);
                if (store_get($$store_subs ??= {}, "$workflowData", workflowData).driver) {
                  $$payload.out.push("<!--[-->");
                  $$payload.out.push(`<div class="review-item svelte-1lv6g9m"><span class="item-label svelte-1lv6g9m">Driver</span> <span class="item-value svelte-1lv6g9m">${escape_html(store_get($$store_subs ??= {}, "$workflowData", workflowData).driver.name)}</span></div>`);
                } else {
                  $$payload.out.push("<!--[!-->");
                }
                $$payload.out.push(`<!--]--> `);
                if (store_get($$store_subs ??= {}, "$workflowData", workflowData).activity) {
                  $$payload.out.push("<!--[-->");
                  $$payload.out.push(`<div class="review-item svelte-1lv6g9m"><span class="item-label svelte-1lv6g9m">Activity</span> <span class="item-value svelte-1lv6g9m">${escape_html(store_get($$store_subs ??= {}, "$workflowData", workflowData).activity.name)}</span></div>`);
                } else {
                  $$payload.out.push("<!--[!-->");
                }
                $$payload.out.push(`<!--]--> `);
                if (store_get($$store_subs ??= {}, "$workflowData", workflowData).field) {
                  $$payload.out.push("<!--[-->");
                  $$payload.out.push(`<div class="review-item svelte-1lv6g9m"><span class="item-label svelte-1lv6g9m">Field</span> <span class="item-value svelte-1lv6g9m">${escape_html(store_get($$store_subs ??= {}, "$workflowData", workflowData).field.name)}</span></div>`);
                } else {
                  $$payload.out.push("<!--[!-->");
                }
                $$payload.out.push(`<!--]--> `);
                if (store_get($$store_subs ??= {}, "$workflowData", workflowData).gaugeWorking && store_get($$store_subs ??= {}, "$workflowData", workflowData).odometerStart !== null && store_get($$store_subs ??= {}, "$workflowData", workflowData).odometerEnd !== null) {
                  $$payload.out.push("<!--[-->");
                  $$payload.out.push(`<div class="review-item odometer-group svelte-1lv6g9m"><span class="item-label svelte-1lv6g9m">Odometer</span> <div class="odometer-values svelte-1lv6g9m"><span class="odo-start svelte-1lv6g9m">${escape_html(new Intl.NumberFormat().format(store_get($$store_subs ??= {}, "$workflowData", workflowData).odometerStart))}</span> <span class="odo-arrow svelte-1lv6g9m">→</span> <span class="odo-end svelte-1lv6g9m">${escape_html(new Intl.NumberFormat().format(store_get($$store_subs ??= {}, "$workflowData", workflowData).odometerEnd))}</span></div></div>`);
                } else {
                  $$payload.out.push("<!--[!-->");
                }
                $$payload.out.push(`<!--]--> `);
                if (store_get($$store_subs ??= {}, "$workflowData", workflowData).bowser && store_get($$store_subs ??= {}, "$workflowData", workflowData).litresDispensed) {
                  $$payload.out.push("<!--[-->");
                  $$payload.out.push(`<div class="review-item fuel-highlight svelte-1lv6g9m"><span class="item-label svelte-1lv6g9m">Fuel Dispensed</span> <span class="item-value fuel-value svelte-1lv6g9m">${escape_html(new Intl.NumberFormat().format(store_get($$store_subs ??= {}, "$workflowData", workflowData).litresDispensed))}L</span></div>`);
                } else {
                  $$payload.out.push("<!--[!-->");
                }
                $$payload.out.push(`<!--]--></div></div> `);
                if (getCurrentStepErrors().length > 0) {
                  $$payload.out.push("<!--[-->");
                  const each_array = ensure_array_like(getCurrentStepErrors());
                  $$payload.out.push(`<div class="validation-errors svelte-1lv6g9m"><div class="error-card svelte-1lv6g9m"><div class="error-header svelte-1lv6g9m"><span class="error-icon svelte-1lv6g9m">⚠️</span> <h3 class="svelte-1lv6g9m">Please complete all required steps</h3></div> <div class="error-list svelte-1lv6g9m"><!--[-->`);
                  for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
                    let error = each_array[$$index];
                    $$payload.out.push(`<div class="error-item svelte-1lv6g9m">${escape_html(error)}</div>`);
                  }
                  $$payload.out.push(`<!--]--></div></div></div>`);
                } else {
                  $$payload.out.push("<!--[!-->");
                }
                $$payload.out.push(`<!--]--> <div class="submit-container svelte-1lv6g9m"><button class="submit-button svelte-1lv6g9m"${attr("disabled", !store_get($$store_subs ??= {}, "$canProceedToNext", canProceedToNext) || store_get($$store_subs ??= {}, "$isSubmittingEntry", isSubmittingEntry), true)}>`);
                if (store_get($$store_subs ??= {}, "$isSubmittingEntry", isSubmittingEntry)) {
                  $$payload.out.push("<!--[-->");
                  $$payload.out.push(`<span class="submit-loader svelte-1lv6g9m"></span> Submitting...`);
                } else {
                  $$payload.out.push("<!--[!-->");
                  $$payload.out.push(`Submit Entry`);
                }
                $$payload.out.push(`<!--]--></button></div></div>`);
              } else {
                $$payload.out.push("<!--[!-->");
              }
              $$payload.out.push(`<!--]-->`);
            }
            $$payload.out.push(`<!--]-->`);
          }
          $$payload.out.push(`<!--]-->`);
        }
        $$payload.out.push(`<!--]-->`);
      }
      $$payload.out.push(`<!--]-->`);
    }
    $$payload.out.push(`<!--]-->`);
  }
  $$payload.out.push(`<!--]--></div> <div class="keyboard-hints svelte-1lv6g9m"><small class="svelte-1lv6g9m">💡 Keyboard shortcuts: <kbd class="svelte-1lv6g9m">→</kbd> or <kbd class="svelte-1lv6g9m">Enter</kbd> to continue • <kbd class="svelte-1lv6g9m">←</kbd> to go back • <kbd class="svelte-1lv6g9m">Esc</kbd> to restart</small></div></div> `);
  {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]-->`);
  if ($$store_subs) unsubscribe_stores($$store_subs);
  pop();
}
function _page($$payload) {
  head($$payload, ($$payload2) => {
    $$payload2.title = `<title>Fuel Management - FarmTrack</title>`;
  });
  $$payload.out.push(`<div class="fuel-management-page svelte-1x5u956">`);
  FuelEntryWorkflow($$payload);
  $$payload.out.push(`<!----></div>`);
}
export {
  _page as default
};
