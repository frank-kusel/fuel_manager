import { Q as ensure_array_like, K as escape_html, B as pop, z as push, O as attr_style, P as stringify, M as attr, G as attr_class, E as store_get, J as unsubscribe_stores, F as head } from "../../../chunks/index2.js";
import { B as Button } from "../../../chunks/Button.js";
import { C as Card } from "../../../chunks/Card.js";
import { d as derived, w as writable } from "../../../chunks/index.js";
function VehicleSelection($$payload, $$props) {
  push();
  let { selectedVehicle, onVehicleSelect, errors } = $$props;
  function formatOdometer(reading, unit) {
    if (reading === null) return "Not set";
    return `${new Intl.NumberFormat().format(reading)} ${unit || "km"}`;
  }
  $$payload.out.push(`<div class="vehicle-selection svelte-rn66am"><div class="step-header svelte-rn66am"><h2 class="svelte-rn66am">Vehicle</h2></div> `);
  if (errors.length > 0) {
    $$payload.out.push("<!--[-->");
    const each_array = ensure_array_like(errors);
    $$payload.out.push(`<div class="error-messages svelte-rn66am"><!--[-->`);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let error = each_array[$$index];
      $$payload.out.push(`<div class="error-message svelte-rn66am"><span class="error-icon svelte-rn66am">⚠️</span> ${escape_html(error)}</div>`);
    }
    $$payload.out.push(`<!--]--></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> `);
  {
    $$payload.out.push("<!--[-->");
    const each_array_1 = ensure_array_like(Array(6));
    $$payload.out.push(`<div class="loading-state svelte-rn66am"><div class="vehicles-grid svelte-rn66am"><!--[-->`);
    for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
      each_array_1[$$index_1];
      $$payload.out.push(`<div class="vehicle-card-skeleton svelte-rn66am"><div class="skeleton-header svelte-rn66am"><div class="skeleton-icon svelte-rn66am"></div> <div class="skeleton-content svelte-rn66am"><div class="skeleton-line svelte-rn66am"></div> <div class="skeleton-line short svelte-rn66am"></div></div></div> <div class="skeleton-body svelte-rn66am"><div class="skeleton-line svelte-rn66am"></div> <div class="skeleton-line short svelte-rn66am"></div></div></div>`);
    }
    $$payload.out.push(`<!--]--></div></div>`);
  }
  $$payload.out.push(`<!--]--> `);
  if (selectedVehicle) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="selection-summary svelte-rn66am">`);
    Card($$payload, {
      class: "selected-vehicle-summary",
      children: ($$payload2) => {
        $$payload2.out.push(`<div class="summary-header svelte-rn66am"><span class="summary-icon svelte-rn66am">✓</span> <h3 class="svelte-rn66am">Selected Vehicle</h3></div> <div class="summary-content svelte-rn66am"><div class="summary-vehicle svelte-rn66am"><div class="summary-name svelte-rn66am">${escape_html(selectedVehicle.name || `${selectedVehicle.make || ""} ${selectedVehicle.model || ""}`.trim())}</div> <div class="summary-reg svelte-rn66am">${escape_html(selectedVehicle.registration || "")}</div></div> <div class="summary-details svelte-rn66am"><div class="summary-detail svelte-rn66am"><span class="svelte-rn66am">Current Odometer:</span> <strong class="svelte-rn66am">${escape_html(formatOdometer(selectedVehicle.current_odometer, selectedVehicle.odometer_unit))}</strong></div></div></div> <div class="summary-actions svelte-rn66am">`);
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
  $$payload.out.push(`<div class="driver-selection svelte-17odirl">`);
  {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> `);
  {
    $$payload.out.push("<!--[-->");
    const each_array = ensure_array_like(Array(6));
    $$payload.out.push(`<div class="loading-state svelte-17odirl"><div class="drivers-grid svelte-17odirl"><!--[-->`);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      each_array[$$index];
      $$payload.out.push(`<div class="driver-card-skeleton svelte-17odirl"><div class="skeleton-header svelte-17odirl"><div class="skeleton-avatar svelte-17odirl"></div> <div class="skeleton-content svelte-17odirl"><div class="skeleton-line svelte-17odirl"></div> <div class="skeleton-line short svelte-17odirl"></div></div></div> <div class="skeleton-body svelte-17odirl"><div class="skeleton-line svelte-17odirl"></div> <div class="skeleton-line short svelte-17odirl"></div></div></div>`);
    }
    $$payload.out.push(`<!--]--></div></div>`);
  }
  $$payload.out.push(`<!--]--> `);
  if (selectedDriver) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="selection-summary svelte-17odirl">`);
    Card($$payload, {
      class: "selected-driver-summary",
      children: ($$payload2) => {
        $$payload2.out.push(`<div class="summary-header svelte-17odirl"><span class="summary-icon svelte-17odirl">✓</span> <h3 class="svelte-17odirl">Selected Driver</h3></div> <div class="summary-content svelte-17odirl"><div class="summary-driver svelte-17odirl"><div class="summary-avatar svelte-17odirl">${escape_html(selectedDriver.name.charAt(0).toUpperCase())}</div> <div class="summary-info svelte-17odirl"><div class="summary-name svelte-17odirl">${escape_html(selectedDriver.name)}</div> `);
        if (selectedDriver.employee_code) {
          $$payload2.out.push("<!--[-->");
          $$payload2.out.push(`<div class="summary-code svelte-17odirl">#${escape_html(selectedDriver.employee_code)}</div>`);
        } else {
          $$payload2.out.push("<!--[!-->");
        }
        $$payload2.out.push(`<!--]--></div></div> `);
        if (selectedDriver.license_number) {
          $$payload2.out.push("<!--[-->");
          $$payload2.out.push(`<div class="summary-details svelte-17odirl"><div class="summary-detail svelte-17odirl"><span class="svelte-17odirl">License:</span> <strong class="svelte-17odirl">${escape_html(selectedDriver.license_number)}</strong></div></div>`);
        } else {
          $$payload2.out.push("<!--[!-->");
        }
        $$payload2.out.push(`<!--]--></div> <div class="summary-actions svelte-17odirl">`);
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
  $$payload.out.push(`<div class="activity-selection svelte-1k7463h">`);
  {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> `);
  {
    $$payload.out.push("<!--[-->");
    const each_array = ensure_array_like(Array(8));
    $$payload.out.push(`<div class="loading-state svelte-1k7463h"><div class="activities-grid svelte-1k7463h"><!--[-->`);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      each_array[$$index];
      $$payload.out.push(`<div class="activity-card-skeleton svelte-1k7463h"><div class="skeleton-header svelte-1k7463h"><div class="skeleton-icon svelte-1k7463h"></div> <div class="skeleton-content svelte-1k7463h"><div class="skeleton-line svelte-1k7463h"></div> <div class="skeleton-line short svelte-1k7463h"></div></div></div></div>`);
    }
    $$payload.out.push(`<!--]--></div></div>`);
  }
  $$payload.out.push(`<!--]--> `);
  if (selectedActivity) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="selection-summary svelte-1k7463h">`);
    Card($$payload, {
      class: "selected-activity-summary",
      children: ($$payload2) => {
        $$payload2.out.push(`<div class="summary-header svelte-1k7463h"><span class="summary-icon svelte-1k7463h">✓</span> <h3 class="svelte-1k7463h">Selected Activity</h3></div> <div class="summary-content svelte-1k7463h"><div class="summary-activity svelte-1k7463h"><div class="summary-activity-icon svelte-1k7463h"${attr_style(`color: ${stringify(getActivityColor(selectedActivity.name))}`)}>${escape_html(getActivityIcon(selectedActivity))}</div> <div class="summary-info svelte-1k7463h"><div class="summary-name svelte-1k7463h">${escape_html(selectedActivity.name)}</div> `);
        if (selectedActivity.name_zulu) {
          $$payload2.out.push("<!--[-->");
          $$payload2.out.push(`<div class="summary-name-zulu svelte-1k7463h">${escape_html(selectedActivity.name_zulu)}</div>`);
        } else {
          $$payload2.out.push("<!--[!-->");
        }
        $$payload2.out.push(`<!--]--> `);
        if (selectedActivity.description) {
          $$payload2.out.push("<!--[-->");
          $$payload2.out.push(`<div class="summary-description svelte-1k7463h">${escape_html(selectedActivity.description)}</div>`);
        } else {
          $$payload2.out.push("<!--[!-->");
        }
        $$payload2.out.push(`<!--]--></div></div></div> <div class="summary-actions svelte-1k7463h">`);
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
  let hasSelection = selectedField !== null || selectedZone !== null;
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
  $$payload.out.push(`<div class="location-selection svelte-1hbgin6">`);
  if (errors.length > 0) {
    $$payload.out.push("<!--[-->");
    const each_array = ensure_array_like(errors);
    $$payload.out.push(`<div class="error-messages svelte-1hbgin6"><!--[-->`);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let error = each_array[$$index];
      $$payload.out.push(`<div class="error-message svelte-1hbgin6"><span class="error-icon svelte-1hbgin6">⚠️</span> ${escape_html(error)}</div>`);
    }
    $$payload.out.push(`<!--]--></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> <div class="skip-option svelte-1hbgin6"><div class="skip-message svelte-1hbgin6">⏭️ Skip Location Selection (Optional)</div></div> `);
  {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> `);
  {
    $$payload.out.push("<!--[-->");
    const each_array_1 = ensure_array_like(Array(6));
    $$payload.out.push(`<div class="loading-state svelte-1hbgin6"><div class="fields-grid svelte-1hbgin6"><!--[-->`);
    for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
      each_array_1[$$index_1];
      $$payload.out.push(`<div class="field-card-skeleton svelte-1hbgin6"><div class="skeleton-header svelte-1hbgin6"><div class="skeleton-icon svelte-1hbgin6"></div> <div class="skeleton-content svelte-1hbgin6"><div class="skeleton-line svelte-1hbgin6"></div> <div class="skeleton-line short svelte-1hbgin6"></div></div></div></div>`);
    }
    $$payload.out.push(`<!--]--></div></div>`);
  }
  $$payload.out.push(`<!--]--> `);
  if (hasSelection) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="selection-summary svelte-1hbgin6">`);
    Card($$payload, {
      class: "selected-location-summary",
      children: ($$payload2) => {
        $$payload2.out.push(`<div class="summary-header svelte-1hbgin6"><span class="summary-icon svelte-1hbgin6">✓</span> <h3 class="svelte-1hbgin6">Selected Location</h3></div> <div class="summary-content svelte-1hbgin6">`);
        if (selectedField) {
          $$payload2.out.push("<!--[-->");
          $$payload2.out.push(`<div class="summary-field svelte-1hbgin6"><div class="summary-field-icon svelte-1hbgin6"${attr_style(`color: ${stringify(getFieldColor(selectedField.crop_type))}`)}>${escape_html(getFieldIcon(selectedField.crop_type))}</div> <div class="summary-info svelte-1hbgin6"><div class="summary-name svelte-1hbgin6">Field: ${escape_html(selectedField.name)}</div> <div class="summary-details svelte-1hbgin6">${escape_html(selectedField.code)} • ${escape_html(formatArea(selectedField.area))} `);
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
            $$payload2.out.push(`<div class="summary-zone svelte-1hbgin6"><div class="summary-zone-badge svelte-1hbgin6"${attr_style(`background-color: ${stringify(selectedZone.color || "#95A5A6")}`)}>${escape_html(selectedZone.code)}</div> <div class="summary-info svelte-1hbgin6"><div class="summary-name svelte-1hbgin6">Zone: ${escape_html(selectedZone.name)}</div> `);
            if (selectedZone.description) {
              $$payload2.out.push("<!--[-->");
              $$payload2.out.push(`<div class="summary-details svelte-1hbgin6">${escape_html(selectedZone.description)}</div>`);
            } else {
              $$payload2.out.push("<!--[!-->");
            }
            $$payload2.out.push(`<!--]--></div></div>`);
          } else {
            $$payload2.out.push("<!--[!-->");
          }
          $$payload2.out.push(`<!--]-->`);
        }
        $$payload2.out.push(`<!--]--></div> <div class="summary-actions svelte-1hbgin6">`);
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
  let newOdo = odometerEnd?.toString() || "";
  let isBrokenGauge = false;
  $$payload.out.push(`<div class="odometer-reading svelte-1i40lvu">`);
  if (
    // Update distance when values change
    selectedVehicle
  ) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="current-odo-display svelte-1i40lvu"><div class="current-odo-value svelte-1i40lvu">${escape_html(currentOdo || "No reading")}</div> <div class="current-odo-label svelte-1i40lvu">Current ODO (km)</div></div> <div class="gauge-toggle svelte-1i40lvu"><label class="checkbox svelte-1i40lvu"><input type="checkbox"${attr("checked", isBrokenGauge, true)} class="svelte-1i40lvu"/> <span>Broken Gauge</span></label></div> `);
    {
      $$payload.out.push("<!--[-->");
      $$payload.out.push(`<div class="new-odo-container svelte-1i40lvu"><input type="number" inputmode="numeric" pattern="[0-9]*"${attr("value", newOdo)} placeholder="Enter new reading" class="new-odo-input svelte-1i40lvu" autocomplete="off"/> <div class="new-odo-label svelte-1i40lvu">New ODO reading (km)</div></div> `);
      {
        $$payload.out.push("<!--[!-->");
      }
      $$payload.out.push(`<!--]-->`);
    }
    $$payload.out.push(`<!--]-->`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<div class="no-vehicle svelte-1i40lvu">Select a vehicle first</div>`);
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
  $$payload.out.push(`<div class="fuel-data-entry svelte-1v3i59b">`);
  if (
    // Update selected bowser when values change
    selectedVehicle
  ) {
    $$payload.out.push("<!--[-->");
    {
      $$payload.out.push("<!--[-->");
      $$payload.out.push(`<div class="loading svelte-1v3i59b">Loading fuel bowsers...</div>`);
    }
    $$payload.out.push(`<!--]--> <div class="fuel-input-container svelte-1v3i59b"><input type="number" inputmode="numeric" pattern="[0-9]*"${attr("value", fuelAmount)} placeholder="Enter fuel amount" class="fuel-input svelte-1v3i59b" autocomplete="off"/> <div class="fuel-label svelte-1v3i59b">Litres dispensed</div></div> <div class="calculations svelte-1v3i59b"><div class="calc-header svelte-1v3i59b"><h3 class="svelte-1v3i59b">Bowser</h3></div> <div class="calc-item svelte-1v3i59b"><span class="calc-label svelte-1v3i59b">Start reading:</span> <span class="calc-value svelte-1v3i59b">`);
    {
      $$payload.out.push("<!--[!-->");
      $$payload.out.push(`-`);
    }
    $$payload.out.push(`<!--]--></span></div> <div class="calc-item svelte-1v3i59b"><span class="calc-label svelte-1v3i59b">End reading:</span> `);
    {
      $$payload.out.push("<!--[!-->");
      $$payload.out.push(`<span${attr_class("calc-value svelte-1v3i59b", void 0, { "editable": selectedBowserInfo })}>`);
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
    $$payload.out.push(`<!--]--></div></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<div class="no-vehicle svelte-1v3i59b">Select a vehicle first</div>`);
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
        const result = await supabaseService.createFuelEntry(fuelEntryData);
        if (result.error) {
          throw new Error(result.error);
        }
        if (currentData.odometerEnd && currentData.gaugeWorking) {
          await supabaseService.updateVehicleOdometer(
            currentData.vehicle.id,
            currentData.odometerEnd
          );
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
  $$payload.out.push(`<div class="fuel-entry-workflow svelte-15yrd6v"><div class="step-content svelte-15yrd6v">`);
  if (store_get($$store_subs ??= {}, "$currentStep", currentStep) === 0) {
    $$payload.out.push("<!--[-->");
    VehicleSelection($$payload, {
      selectedVehicle: store_get($$store_subs ??= {}, "$workflowData", workflowData).vehicle,
      onVehicleSelect: (vehicle) => {
        console.log("Vehicle selected:", vehicle);
        fuelEntryWorkflowStore.setVehicle(vehicle);
      },
      errors: getCurrentStepErrors()
    });
  } else {
    $$payload.out.push("<!--[!-->");
    if (store_get($$store_subs ??= {}, "$currentStep", currentStep) === 1) {
      $$payload.out.push("<!--[-->");
      $$payload.out.push(`<div class="driver-step svelte-15yrd6v"><div class="step-header svelte-15yrd6v"><h2 class="svelte-15yrd6v">Driver</h2></div> <div class="workflow-controls svelte-15yrd6v">`);
      if (store_get($$store_subs ??= {}, "$canGoBackToPrevious", canGoBackToPrevious)) {
        $$payload.out.push("<!--[-->");
        Button($$payload, {
          variant: "outline",
          onclick: handlePrevious,
          class: "back-button",
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
        $$payload.out.push(`<div class="activity-step svelte-15yrd6v"><div class="step-header svelte-15yrd6v"><h2 class="svelte-15yrd6v">Activity</h2></div> <div class="workflow-controls svelte-15yrd6v">`);
        if (store_get($$store_subs ??= {}, "$canGoBackToPrevious", canGoBackToPrevious)) {
          $$payload.out.push("<!--[-->");
          Button($$payload, {
            variant: "outline",
            onclick: handlePrevious,
            class: "back-button",
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
          $$payload.out.push(`<div class="location-step svelte-15yrd6v"><div class="step-header svelte-15yrd6v"><h2 class="svelte-15yrd6v">Location</h2></div> <div class="workflow-controls svelte-15yrd6v">`);
          if (store_get($$store_subs ??= {}, "$canGoBackToPrevious", canGoBackToPrevious)) {
            $$payload.out.push("<!--[-->");
            Button($$payload, {
              variant: "outline",
              onclick: handlePrevious,
              class: "back-button",
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
            $$payload.out.push(`<div class="odometer-step svelte-15yrd6v"><div class="step-header svelte-15yrd6v"><h2 class="svelte-15yrd6v">Odometer</h2></div> <div class="workflow-controls svelte-15yrd6v">`);
            if (store_get($$store_subs ??= {}, "$canGoBackToPrevious", canGoBackToPrevious)) {
              $$payload.out.push("<!--[-->");
              Button($$payload, {
                variant: "outline",
                onclick: handlePrevious,
                class: "back-button",
                children: ($$payload2) => {
                  $$payload2.out.push(`<!---->← Back`);
                }
              });
            } else {
              $$payload.out.push("<!--[!-->");
            }
            $$payload.out.push(`<!--]--> <div class="manual-controls svelte-15yrd6v"><button${attr_style(` background-color: ${stringify(store_get($$store_subs ??= {}, "$canProceedToNext", canProceedToNext) ? "#16a34a" : "#9ca3af")}; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 0.5rem; font-weight: 600; cursor: ${stringify(store_get($$store_subs ??= {}, "$canProceedToNext", canProceedToNext) ? "pointer" : "not-allowed")}; `)}>Continue →</button></div></div> `);
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
              $$payload.out.push(`<div class="fuel-step svelte-15yrd6v"><div class="step-header svelte-15yrd6v"><h2 class="svelte-15yrd6v">Fuel</h2></div> <div class="workflow-controls svelte-15yrd6v">`);
              if (store_get($$store_subs ??= {}, "$canGoBackToPrevious", canGoBackToPrevious)) {
                $$payload.out.push("<!--[-->");
                Button($$payload, {
                  variant: "outline",
                  onclick: handlePrevious,
                  class: "back-button",
                  children: ($$payload2) => {
                    $$payload2.out.push(`<!---->← Back`);
                  }
                });
              } else {
                $$payload.out.push("<!--[!-->");
              }
              $$payload.out.push(`<!--]--> <div class="manual-controls svelte-15yrd6v"><button${attr_style(` background-color: ${stringify(store_get($$store_subs ??= {}, "$canProceedToNext", canProceedToNext) ? "#16a34a" : "#9ca3af")}; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 0.5rem; font-weight: 600; cursor: ${stringify(store_get($$store_subs ??= {}, "$canProceedToNext", canProceedToNext) ? "pointer" : "not-allowed")}; `)}>Continue →</button></div></div> `);
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
                $$payload.out.push(`<div class="review-step svelte-15yrd6v"><div class="step-header svelte-15yrd6v"><h2 class="svelte-15yrd6v">Review</h2></div> <div class="workflow-controls svelte-15yrd6v">`);
                if (store_get($$store_subs ??= {}, "$canGoBackToPrevious", canGoBackToPrevious)) {
                  $$payload.out.push("<!--[-->");
                  Button($$payload, {
                    variant: "outline",
                    onclick: handlePrevious,
                    class: "back-button",
                    children: ($$payload2) => {
                      $$payload2.out.push(`<!---->← Back`);
                    }
                  });
                } else {
                  $$payload.out.push("<!--[!-->");
                }
                $$payload.out.push(`<!--]--></div> <div class="summary svelte-15yrd6v"><div class="summary-header svelte-15yrd6v"><div class="summary-title svelte-15yrd6v">FUEL ENTRY SUMMARY</div> <div class="summary-date svelte-15yrd6v">${escape_html((/* @__PURE__ */ new Date()).toLocaleString())}</div></div> <div class="summary-body svelte-15yrd6v"><table class="summary-table svelte-15yrd6v"><tbody>`);
                if (store_get($$store_subs ??= {}, "$workflowData", workflowData).vehicle) {
                  $$payload.out.push("<!--[-->");
                  $$payload.out.push(`<tr class="section-header svelte-15yrd6v"><td colspan="2" class="svelte-15yrd6v">VEHICLE</td></tr> <tr><td class="svelte-15yrd6v">Name</td><td class="svelte-15yrd6v">${escape_html(store_get($$store_subs ??= {}, "$workflowData", workflowData).vehicle.name || `${store_get($$store_subs ??= {}, "$workflowData", workflowData).vehicle.make || ""} ${store_get($$store_subs ??= {}, "$workflowData", workflowData).vehicle.model || ""}`.trim() || "Unnamed")}</td></tr> <tr><td class="svelte-15yrd6v">Code</td><td class="svelte-15yrd6v">${escape_html(store_get($$store_subs ??= {}, "$workflowData", workflowData).vehicle.code)}</td></tr> `);
                  if (store_get($$store_subs ??= {}, "$workflowData", workflowData).vehicle.registration || store_get($$store_subs ??= {}, "$workflowData", workflowData).vehicle.registration_number) {
                    $$payload.out.push("<!--[-->");
                    $$payload.out.push(`<tr><td class="svelte-15yrd6v">Registration</td><td class="svelte-15yrd6v">${escape_html(store_get($$store_subs ??= {}, "$workflowData", workflowData).vehicle.registration || store_get($$store_subs ??= {}, "$workflowData", workflowData).vehicle.registration_number)}</td></tr>`);
                  } else {
                    $$payload.out.push("<!--[!-->");
                  }
                  $$payload.out.push(`<!--]-->`);
                } else {
                  $$payload.out.push("<!--[!-->");
                }
                $$payload.out.push(`<!--]-->`);
                if (store_get($$store_subs ??= {}, "$workflowData", workflowData).driver) {
                  $$payload.out.push("<!--[-->");
                  $$payload.out.push(`<tr class="section-header svelte-15yrd6v"><td colspan="2" class="svelte-15yrd6v">DRIVER</td></tr> <tr><td class="svelte-15yrd6v">Name</td><td class="svelte-15yrd6v">${escape_html(store_get($$store_subs ??= {}, "$workflowData", workflowData).driver.name)}</td></tr> `);
                  if (store_get($$store_subs ??= {}, "$workflowData", workflowData).driver.employee_code) {
                    $$payload.out.push("<!--[-->");
                    $$payload.out.push(`<tr><td class="svelte-15yrd6v">Code</td><td class="svelte-15yrd6v">#${escape_html(store_get($$store_subs ??= {}, "$workflowData", workflowData).driver.employee_code)}</td></tr>`);
                  } else {
                    $$payload.out.push("<!--[!-->");
                  }
                  $$payload.out.push(`<!--]-->`);
                } else {
                  $$payload.out.push("<!--[!-->");
                }
                $$payload.out.push(`<!--]-->`);
                if (store_get($$store_subs ??= {}, "$workflowData", workflowData).activity) {
                  $$payload.out.push("<!--[-->");
                  $$payload.out.push(`<tr class="section-header svelte-15yrd6v"><td colspan="2" class="svelte-15yrd6v">ACTIVITY</td></tr> <tr><td class="svelte-15yrd6v">Activity</td><td class="svelte-15yrd6v">${escape_html(store_get($$store_subs ??= {}, "$workflowData", workflowData).activity.name)}</td></tr> <tr><td class="svelte-15yrd6v">Code</td><td class="svelte-15yrd6v">${escape_html(store_get($$store_subs ??= {}, "$workflowData", workflowData).activity.code)}</td></tr>`);
                } else {
                  $$payload.out.push("<!--[!-->");
                }
                $$payload.out.push(`<!--]-->`);
                if (store_get($$store_subs ??= {}, "$workflowData", workflowData).field) {
                  $$payload.out.push("<!--[-->");
                  $$payload.out.push(`<tr class="section-header svelte-15yrd6v"><td colspan="2" class="svelte-15yrd6v">LOCATION</td></tr> <tr><td class="svelte-15yrd6v">Field</td><td class="svelte-15yrd6v">${escape_html(store_get($$store_subs ??= {}, "$workflowData", workflowData).field.code)} - ${escape_html(store_get($$store_subs ??= {}, "$workflowData", workflowData).field.name)}</td></tr> `);
                  if (store_get($$store_subs ??= {}, "$workflowData", workflowData).field.crop_type) {
                    $$payload.out.push("<!--[-->");
                    $$payload.out.push(`<tr><td class="svelte-15yrd6v">Crop</td><td class="svelte-15yrd6v">${escape_html(store_get($$store_subs ??= {}, "$workflowData", workflowData).field.crop_type)}</td></tr>`);
                  } else {
                    $$payload.out.push("<!--[!-->");
                  }
                  $$payload.out.push(`<!--]-->`);
                } else {
                  $$payload.out.push("<!--[!-->");
                  if (store_get($$store_subs ??= {}, "$workflowData", workflowData).zone) {
                    $$payload.out.push("<!--[-->");
                    $$payload.out.push(`<tr class="section-header svelte-15yrd6v"><td colspan="2" class="svelte-15yrd6v">LOCATION</td></tr> <tr><td class="svelte-15yrd6v">Zone</td><td class="svelte-15yrd6v">${escape_html(store_get($$store_subs ??= {}, "$workflowData", workflowData).zone.code)} - ${escape_html(store_get($$store_subs ??= {}, "$workflowData", workflowData).zone.name)}</td></tr> `);
                    if (store_get($$store_subs ??= {}, "$workflowData", workflowData).zone.description) {
                      $$payload.out.push("<!--[-->");
                      $$payload.out.push(`<tr><td class="svelte-15yrd6v">Description</td><td class="svelte-15yrd6v">${escape_html(store_get($$store_subs ??= {}, "$workflowData", workflowData).zone.description)}</td></tr>`);
                    } else {
                      $$payload.out.push("<!--[!-->");
                    }
                    $$payload.out.push(`<!--]-->`);
                  } else {
                    $$payload.out.push("<!--[!-->");
                  }
                  $$payload.out.push(`<!--]-->`);
                }
                $$payload.out.push(`<!--]-->`);
                if (store_get($$store_subs ??= {}, "$workflowData", workflowData).gaugeWorking && store_get($$store_subs ??= {}, "$workflowData", workflowData).odometerStart !== null && store_get($$store_subs ??= {}, "$workflowData", workflowData).odometerEnd !== null) {
                  $$payload.out.push("<!--[-->");
                  $$payload.out.push(`<tr class="section-header svelte-15yrd6v"><td colspan="2" class="svelte-15yrd6v">ODOMETER</td></tr> <tr><td class="svelte-15yrd6v">Start</td><td class="svelte-15yrd6v">${escape_html(new Intl.NumberFormat().format(store_get($$store_subs ??= {}, "$workflowData", workflowData).odometerStart))} km</td></tr> <tr><td class="svelte-15yrd6v">End</td><td class="svelte-15yrd6v">${escape_html(new Intl.NumberFormat().format(store_get($$store_subs ??= {}, "$workflowData", workflowData).odometerEnd))} km</td></tr> <tr class="highlight svelte-15yrd6v"><td class="svelte-15yrd6v">Distance</td><td class="svelte-15yrd6v">${escape_html(new Intl.NumberFormat().format(store_get($$store_subs ??= {}, "$workflowData", workflowData).odometerEnd - store_get($$store_subs ??= {}, "$workflowData", workflowData).odometerStart))} km</td></tr>`);
                } else {
                  $$payload.out.push("<!--[!-->");
                  if (!store_get($$store_subs ??= {}, "$workflowData", workflowData).gaugeWorking) {
                    $$payload.out.push("<!--[-->");
                    $$payload.out.push(`<tr class="section-header svelte-15yrd6v"><td colspan="2" class="svelte-15yrd6v">ODOMETER</td></tr> <tr><td class="svelte-15yrd6v">Status</td><td class="warning svelte-15yrd6v">Gauge broken</td></tr>`);
                  } else {
                    $$payload.out.push("<!--[!-->");
                  }
                  $$payload.out.push(`<!--]-->`);
                }
                $$payload.out.push(`<!--]-->`);
                if (store_get($$store_subs ??= {}, "$workflowData", workflowData).bowser && store_get($$store_subs ??= {}, "$workflowData", workflowData).litresDispensed) {
                  $$payload.out.push("<!--[-->");
                  $$payload.out.push(`<tr class="section-header svelte-15yrd6v"><td colspan="2" class="svelte-15yrd6v">FUEL</td></tr> <tr><td class="svelte-15yrd6v">Bowser</td><td class="svelte-15yrd6v">${escape_html(store_get($$store_subs ??= {}, "$workflowData", workflowData).bowser.name)}</td></tr> <tr><td class="svelte-15yrd6v">Type</td><td class="svelte-15yrd6v">${escape_html(store_get($$store_subs ??= {}, "$workflowData", workflowData).bowser.fuel_type.charAt(0).toUpperCase() + store_get($$store_subs ??= {}, "$workflowData", workflowData).bowser.fuel_type.slice(1))}</td></tr> `);
                  if (store_get($$store_subs ??= {}, "$workflowData", workflowData).bowserReadingStart !== null && store_get($$store_subs ??= {}, "$workflowData", workflowData).bowserReadingEnd !== null) {
                    $$payload.out.push("<!--[-->");
                    $$payload.out.push(`<tr><td class="svelte-15yrd6v">Start reading</td><td class="svelte-15yrd6v">${escape_html(new Intl.NumberFormat().format(store_get($$store_subs ??= {}, "$workflowData", workflowData).bowserReadingStart))}L</td></tr> <tr><td class="svelte-15yrd6v">End reading</td><td class="svelte-15yrd6v">${escape_html(new Intl.NumberFormat().format(store_get($$store_subs ??= {}, "$workflowData", workflowData).bowserReadingEnd))}L</td></tr>`);
                  } else {
                    $$payload.out.push("<!--[!-->");
                  }
                  $$payload.out.push(`<!--]--> <tr class="total svelte-15yrd6v"><td class="svelte-15yrd6v"><strong>LITRES DISPENSED</strong></td><td class="svelte-15yrd6v"><strong>${escape_html(new Intl.NumberFormat().format(store_get($$store_subs ??= {}, "$workflowData", workflowData).litresDispensed))}L</strong></td></tr>`);
                } else {
                  $$payload.out.push("<!--[!-->");
                }
                $$payload.out.push(`<!--]--></tbody></table></div></div> `);
                if (getCurrentStepErrors().length > 0) {
                  $$payload.out.push("<!--[-->");
                  $$payload.out.push(`<div class="validation-errors svelte-15yrd6v">`);
                  Card($$payload, {
                    class: "error-card",
                    children: ($$payload2) => {
                      const each_array = ensure_array_like(getCurrentStepErrors());
                      $$payload2.out.push(`<div class="error-header svelte-15yrd6v"><span class="error-icon svelte-15yrd6v">⚠️</span> <h3 class="svelte-15yrd6v">Please complete all required steps</h3></div> <div class="error-list svelte-15yrd6v"><!--[-->`);
                      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
                        let error = each_array[$$index];
                        $$payload2.out.push(`<div class="error-item svelte-15yrd6v">${escape_html(error)}</div>`);
                      }
                      $$payload2.out.push(`<!--]--></div>`);
                    }
                  });
                  $$payload.out.push(`<!----></div>`);
                } else {
                  $$payload.out.push("<!--[!-->");
                }
                $$payload.out.push(`<!--]--> <div class="bottom-submit-container"><button class="bottom-submit-button"${attr_style(` background-color: ${stringify(store_get($$store_subs ??= {}, "$canProceedToNext", canProceedToNext) && !store_get($$store_subs ??= {}, "$isSubmittingEntry", isSubmittingEntry) ? "#16a34a" : "#9ca3af")}; color: white; border: none; padding: 1.25rem 2rem; border-radius: 0.75rem; font-weight: 700; font-size: 1.125rem; width: 100%; cursor: ${stringify(store_get($$store_subs ??= {}, "$canProceedToNext", canProceedToNext) && !store_get($$store_subs ??= {}, "$isSubmittingEntry", isSubmittingEntry) ? "pointer" : "not-allowed")}; transition: all 0.2s; margin-top: 2rem; `)}>${escape_html(store_get($$store_subs ??= {}, "$isSubmittingEntry", isSubmittingEntry) ? "Submitting..." : "Submit")}</button></div></div>`);
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
  $$payload.out.push(`<!--]--></div> <div class="keyboard-hints svelte-15yrd6v"><small>💡 Keyboard shortcuts: <kbd class="svelte-15yrd6v">→</kbd> or <kbd class="svelte-15yrd6v">Enter</kbd> to continue • <kbd class="svelte-15yrd6v">←</kbd> to go back • <kbd class="svelte-15yrd6v">Esc</kbd> to restart</small></div></div> `);
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
