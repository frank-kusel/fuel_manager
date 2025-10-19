import { M as ensure_array_like, J as escape_html, B as pop, z as push, K as attr, G as attr_class, F as head, E as store_get, O as attr_style, P as stringify, I as unsubscribe_stores } from "../../../chunks/index2.js";
/* empty css                                                   */
/* empty css                                                 */
import { d as derived, w as writable } from "../../../chunks/index.js";
function VehicleSelection($$payload, $$props) {
  push();
  let { selectedVehicle, errors } = $$props;
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
  $$payload.out.push(`<div class="vehicle-selection svelte-fspqbb">`);
  if (errors.length > 0) {
    $$payload.out.push("<!--[-->");
    const each_array = ensure_array_like(errors);
    $$payload.out.push(`<div class="error-messages svelte-fspqbb"><!--[-->`);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let error = each_array[$$index];
      $$payload.out.push(`<div class="error-message svelte-fspqbb"><span class="error-icon svelte-fspqbb">⚠️</span> ${escape_html(error)}</div>`);
    }
    $$payload.out.push(`<!--]--></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> `);
  {
    $$payload.out.push("<!--[-->");
    const each_array_1 = ensure_array_like(Array(6));
    $$payload.out.push(`<div class="loading-state svelte-fspqbb"><div class="vehicles-grid svelte-fspqbb"><!--[-->`);
    for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
      each_array_1[$$index_1];
      $$payload.out.push(`<div class="vehicle-card-skeleton svelte-fspqbb"><div class="skeleton-header svelte-fspqbb"><div class="skeleton-icon svelte-fspqbb"></div> <div class="skeleton-content svelte-fspqbb"><div class="skeleton-line svelte-fspqbb"></div> <div class="skeleton-line short svelte-fspqbb"></div></div></div> <div class="skeleton-body svelte-fspqbb"><div class="skeleton-line svelte-fspqbb"></div> <div class="skeleton-line short svelte-fspqbb"></div></div></div>`);
    }
    $$payload.out.push(`<!--]--></div></div>`);
  }
  $$payload.out.push(`<!--]--> `);
  if (selectedVehicle) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="selected-summary svelte-fspqbb"><div class="selected-item svelte-fspqbb"><div class="selected-label svelte-fspqbb">Selected Vehicle</div> <div class="selected-name svelte-fspqbb">${escape_html(selectedVehicle.name || `${selectedVehicle.make || ""} ${selectedVehicle.model || ""}`.trim())}</div> <div class="selected-detail svelte-fspqbb">${escape_html(selectedVehicle.registration || "")}</div></div></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--></div>`);
  pop();
}
function DriverSelection($$payload, $$props) {
  push();
  let { selectedDriver } = $$props;
  let drivers = [];
  [...drivers].sort((a, b) => {
    const codeA = a.employee_code || "ZZZ";
    const codeB = b.employee_code || "ZZZ";
    return codeA.localeCompare(codeB);
  });
  $$payload.out.push(`<div class="driver-selection svelte-13kq9od">`);
  {
    $$payload.out.push("<!--[-->");
    const each_array = ensure_array_like(Array(6));
    $$payload.out.push(`<div class="loading-state svelte-13kq9od"><div class="drivers-grid svelte-13kq9od"><!--[-->`);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      each_array[$$index];
      $$payload.out.push(`<div class="driver-card-skeleton svelte-13kq9od"><div class="skeleton-header svelte-13kq9od"><div class="skeleton-avatar svelte-13kq9od"></div> <div class="skeleton-content svelte-13kq9od"><div class="skeleton-line svelte-13kq9od"></div> <div class="skeleton-line short svelte-13kq9od"></div></div></div> <div class="skeleton-body svelte-13kq9od"><div class="skeleton-line svelte-13kq9od"></div> <div class="skeleton-line short svelte-13kq9od"></div></div></div>`);
    }
    $$payload.out.push(`<!--]--></div></div>`);
  }
  $$payload.out.push(`<!--]--> `);
  if (selectedDriver) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="selected-summary svelte-13kq9od"><div class="selected-item svelte-13kq9od"><div class="selected-label svelte-13kq9od">Selected Driver</div> <div class="selected-name svelte-13kq9od">${escape_html(selectedDriver.name)}</div> `);
    if (selectedDriver.employee_code) {
      $$payload.out.push("<!--[-->");
      $$payload.out.push(`<div class="selected-detail svelte-13kq9od">#${escape_html(selectedDriver.employee_code)}</div>`);
    } else {
      $$payload.out.push("<!--[!-->");
    }
    $$payload.out.push(`<!--]--></div></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--></div>`);
  pop();
}
function ActivitySelection($$payload, $$props) {
  push();
  let { selectedActivity } = $$props;
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
  $$payload.out.push(`<div class="activity-selection svelte-hfgmfu">`);
  {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> `);
  {
    $$payload.out.push("<!--[-->");
    const each_array = ensure_array_like(Array(8));
    $$payload.out.push(`<div class="loading-state svelte-hfgmfu"><div class="activities-grid svelte-hfgmfu"><!--[-->`);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      each_array[$$index];
      $$payload.out.push(`<div class="activity-card-skeleton svelte-hfgmfu"><div class="skeleton-header svelte-hfgmfu"><div class="skeleton-icon svelte-hfgmfu"></div> <div class="skeleton-content svelte-hfgmfu"><div class="skeleton-line svelte-hfgmfu"></div> <div class="skeleton-line short svelte-hfgmfu"></div></div></div></div>`);
    }
    $$payload.out.push(`<!--]--></div></div>`);
  }
  $$payload.out.push(`<!--]--> `);
  if (selectedActivity) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="selected-summary svelte-hfgmfu"><div class="selected-item svelte-hfgmfu"><div class="selected-label svelte-hfgmfu">Selected Activity</div> <div class="selected-name svelte-hfgmfu">${escape_html(selectedActivity.name)}</div> <div class="selected-detail svelte-hfgmfu">${escape_html(selectedActivity.code)}</div></div></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--></div>`);
  pop();
}
function LocationSelection($$payload, $$props) {
  push();
  let {
    selectedZone,
    selectedFields = [],
    errors
  } = $$props;
  selectedZone !== null || selectedFields.length > 0;
  $$payload.out.push(`<div class="location-selection svelte-1cdw10">`);
  if (errors.length > 0) {
    $$payload.out.push("<!--[-->");
    const each_array = ensure_array_like(errors);
    $$payload.out.push(`<div class="error-messages svelte-1cdw10"><!--[-->`);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let error = each_array[$$index];
      $$payload.out.push(`<div class="error-message svelte-1cdw10"><span class="error-icon svelte-1cdw10">⚠️</span> ${escape_html(error)}</div>`);
    }
    $$payload.out.push(`<!--]--></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> <div class="skip-option svelte-1cdw10"><div class="skip-message svelte-1cdw10">Skip Location</div></div> `);
  {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> `);
  {
    $$payload.out.push("<!--[-->");
    const each_array_1 = ensure_array_like(Array(6));
    $$payload.out.push(`<div class="loading-state svelte-1cdw10"><div class="fields-grid svelte-1cdw10"><!--[-->`);
    for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
      each_array_1[$$index_1];
      $$payload.out.push(`<div class="field-card-skeleton svelte-1cdw10"><div class="skeleton-header svelte-1cdw10"><div class="skeleton-icon svelte-1cdw10"></div> <div class="skeleton-content svelte-1cdw10"><div class="skeleton-line svelte-1cdw10"></div> <div class="skeleton-line short svelte-1cdw10"></div></div></div></div>`);
    }
    $$payload.out.push(`<!--]--></div></div>`);
  }
  $$payload.out.push(`<!--]--></div>`);
  pop();
}
function OdometerReading($$payload, $$props) {
  push();
  let {
    selectedVehicle,
    odometerEnd,
    canProceedToNext: canProceedToNext2 = false,
    onNext
  } = $$props;
  let currentOdo = selectedVehicle?.current_odometer?.toString() || "";
  selectedVehicle?.current_odometer || 0;
  let newOdo = odometerEnd?.toString() || "";
  let isBrokenGauge = false;
  $$payload.out.push(`<div class="odometer-reading svelte-n0vyi8">`);
  if (
    // Update distance when values change
    selectedVehicle
  ) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="odo-section svelte-n0vyi8"><div class="odo-card current-odo svelte-n0vyi8"><div class="current-odo-controls svelte-n0vyi8">`);
    {
      $$payload.out.push("<!--[!-->");
      $$payload.out.push(`<button class="odo-control-btn edit-btn svelte-n0vyi8" title="Manual override">✏️</button>`);
    }
    $$payload.out.push(`<!--]--></div> <input type="number" inputmode="decimal" step="0.1"${attr("value", currentOdo)} placeholder="Old" class="current-odo-input svelte-n0vyi8" autocomplete="off"${attr("readonly", true, true)}/></div> `);
    {
      $$payload.out.push("<!--[!-->");
    }
    $$payload.out.push(`<!--]--></div> `);
    {
      $$payload.out.push("<!--[-->");
      $$payload.out.push(`<div class="odo-section svelte-n0vyi8"><div class="odo-card new-odo svelte-n0vyi8"><input type="number" inputmode="decimal" step="0.1"${attr("value", newOdo)} placeholder="New" class="new-odo-input svelte-n0vyi8" autocomplete="off"/></div> `);
      {
        $$payload.out.push("<!--[!-->");
      }
      $$payload.out.push(`<!--]--></div> <div class="gauge-toggle svelte-n0vyi8"><label class="checkbox svelte-n0vyi8"><input type="checkbox"${attr("checked", isBrokenGauge, true)} class="svelte-n0vyi8"/> <span>Broken Gauge</span></label></div>`);
    }
    $$payload.out.push(`<!--]-->`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<div class="no-vehicle svelte-n0vyi8">Select a vehicle first</div>`);
  }
  $$payload.out.push(`<!--]--> `);
  if (canProceedToNext2 && onNext) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<button class="continue-button-fixed svelte-n0vyi8"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"></path></svg></button>`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--></div>`);
  pop();
}
function FuelDataEntry($$payload, $$props) {
  push();
  let {
    selectedVehicle,
    selectedBowser,
    litresDispensed,
    canProceedToNext: canProceedToNext2 = false,
    onNext
  } = $$props;
  let fuelAmount = litresDispensed?.toString() || "";
  selectedBowser?.id || "";
  let selectedBowserInfo = null;
  $$payload.out.push(`<div class="fuel-data-entry svelte-1cd30ed">`);
  if (
    // Check for reading continuity
    // Allow small rounding differences
    selectedVehicle
  ) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="fuel-input-container svelte-1cd30ed"><input type="number" inputmode="decimal" step="0.1"${attr("value", fuelAmount)} placeholder="Enter fuel" class="fuel-input svelte-1cd30ed" autocomplete="off"/> <div class="fuel-label svelte-1cd30ed">Litres</div> `);
    {
      $$payload.out.push("<!--[-->");
      $$payload.out.push(`<div class="loading-status svelte-1cd30ed">Loading fuel bowsers...</div>`);
    }
    $$payload.out.push(`<!--]--></div> <div class="calculations svelte-1cd30ed"><div class="calc-header svelte-1cd30ed"><h3 class="svelte-1cd30ed">Bowser Readings</h3></div> <div class="calc-item svelte-1cd30ed"><span class="calc-label svelte-1cd30ed">Start:</span> <div class="calc-item-right svelte-1cd30ed">`);
    {
      $$payload.out.push("<!--[!-->");
      $$payload.out.push(`<span class="calc-value editable svelte-1cd30ed">`);
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
    $$payload.out.push(`<!--]--></div></div> <div class="calc-item svelte-1cd30ed"><span class="calc-label svelte-1cd30ed">End:</span> <div class="calc-item-right svelte-1cd30ed">`);
    {
      $$payload.out.push("<!--[!-->");
      $$payload.out.push(`<span${attr_class("calc-value svelte-1cd30ed", void 0, { "editable": selectedBowserInfo })}>`);
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
    $$payload.out.push(`<div class="no-vehicle svelte-1cd30ed">Select a vehicle first</div>`);
  }
  $$payload.out.push(`<!--]--> `);
  if (canProceedToNext2 && onNext) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<button class="continue-button-fixed svelte-1cd30ed"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"></path></svg></button>`);
  } else {
    $$payload.out.push("<!--[!-->");
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
    valid: false,
    required: true
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
  selectedFields: [],
  fieldSelectionMode: "single",
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
        if (!data.zone && data.selectedFields.length === 0) {
          errors.push("Please select at least one field or zone");
        }
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
        data: {
          ...state.data,
          field,
          zone: null,
          selectedFields: [],
          fieldSelectionMode: "single"
        }
      }));
      updateStepValidation();
    },
    setLocation: (field, zone, selectedFields = []) => {
      const mode = selectedFields.length > 0 ? "multiple" : "single";
      update((state) => ({
        ...state,
        data: {
          ...state.data,
          field: mode === "single" ? field : null,
          zone,
          selectedFields,
          fieldSelectionMode: mode
        }
      }));
      updateStepValidation();
    },
    setFieldSelectionMode: (mode) => {
      update((state) => ({
        ...state,
        data: {
          ...state.data,
          fieldSelectionMode: mode,
          field: mode === "multiple" ? null : state.data.field,
          selectedFields: mode === "single" ? [] : state.data.selectedFields
        }
      }));
      updateStepValidation();
    },
    setMultipleFields: (fields) => {
      update((state) => ({
        ...state,
        data: {
          ...state.data,
          selectedFields: fields,
          field: null,
          zone: null,
          fieldSelectionMode: "multiple"
        }
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
          field_id: currentData.fieldSelectionMode === "single" ? currentData.field?.id || null : null,
          zone_id: currentData.zone?.id || null,
          field_selection_mode: currentData.fieldSelectionMode,
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
          const fieldIds = [];
          if (currentData.fieldSelectionMode === "multiple" && currentData.selectedFields.length > 0) {
            fieldIds.push(...currentData.selectedFields.map((f) => f.id));
          }
          if (fieldIds.length > 0) {
            result = await supabaseService.createFuelEntryWithFields(fuelEntryData, fieldIds);
          } else {
            result = await supabaseService.createFuelEntry(fuelEntryData);
          }
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
  async function handleNext() {
    fuelEntryWorkflowStore.nextStep();
    scrollToTop();
  }
  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function getStepTitle(step) {
    const titles = [
      "Vehicle",
      "Driver",
      "Activity",
      "Location",
      "Odometer",
      "Fuel Data",
      "Review & Submit"
    ];
    return titles[step] || "";
  }
  let progressItems = [];
  function getCurrentStepErrors() {
    const currentStepId = store_get($$store_subs ??= {}, "$currentStepData", currentStepData)?.id || "";
    return store_get($$store_subs ??= {}, "$workflowErrors", workflowErrors)[currentStepId] || [];
  }
  head($$payload, ($$payload2) => {
    $$payload2.out.push(`<link rel="preconnect" href="https://fonts.googleapis.com"/> <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin=""/> <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&amp;display=swap" rel="stylesheet"/>`);
  });
  $$payload.out.push(`<div class="fuel-entry-workflow svelte-2venva"><div class="app-header-card svelte-2venva"><div class="dashboard-header svelte-2venva"><div class="header-content svelte-2venva"><h1 class="svelte-2venva">${escape_html(getStepTitle(store_get($$store_subs ??= {}, "$currentStep", currentStep)))}</h1></div></div> <div class="progress-summary svelte-2venva">`);
  if (progressItems.length > 0) {
    $$payload.out.push("<!--[-->");
    const each_array = ensure_array_like(progressItems);
    $$payload.out.push(`<!--[-->`);
    for (let i = 0, $$length = each_array.length; i < $$length; i++) {
      let item = each_array[i];
      if (i > 0) {
        $$payload.out.push("<!--[-->");
        $$payload.out.push(`<span class="progress-separator svelte-2venva">•</span>`);
      } else {
        $$payload.out.push("<!--[!-->");
      }
      $$payload.out.push(`<!--]--> <span class="progress-item svelte-2venva">${escape_html(item)}</span>`);
    }
    $$payload.out.push(`<!--]-->`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<span class="progress-placeholder"> </span>`);
  }
  $$payload.out.push(`<!--]--></div> <div class="progress-track svelte-2venva"><div class="progress-indicator svelte-2venva"${attr_style(`width: ${stringify(Math.round((store_get($$store_subs ??= {}, "$currentStep", currentStep) + 1) / 7 * 100))}%`)}></div></div></div> <div class="step-content svelte-2venva">`);
  if (store_get($$store_subs ??= {}, "$currentStep", currentStep) === 0) {
    $$payload.out.push("<!--[-->");
    VehicleSelection($$payload, {
      selectedVehicle: store_get($$store_subs ??= {}, "$workflowData", workflowData).vehicle,
      errors: getCurrentStepErrors()
    });
    $$payload.out.push(`<!----> <div class="step-actions svelte-2venva"><button class="continue-button svelte-2venva"${attr("disabled", !store_get($$store_subs ??= {}, "$canProceedToNext", canProceedToNext), true)}>Continue →</button></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
    if (store_get($$store_subs ??= {}, "$currentStep", currentStep) === 1) {
      $$payload.out.push("<!--[-->");
      DriverSelection($$payload, {
        selectedDriver: store_get($$store_subs ??= {}, "$workflowData", workflowData).driver,
        errors: getCurrentStepErrors()
      });
      $$payload.out.push(`<!----> <div class="step-actions svelte-2venva"><button class="continue-button svelte-2venva"${attr("disabled", !store_get($$store_subs ??= {}, "$canProceedToNext", canProceedToNext), true)}>Continue →</button></div>`);
    } else {
      $$payload.out.push("<!--[!-->");
      if (store_get($$store_subs ??= {}, "$currentStep", currentStep) === 2) {
        $$payload.out.push("<!--[-->");
        ActivitySelection($$payload, {
          selectedActivity: store_get($$store_subs ??= {}, "$workflowData", workflowData).activity,
          errors: getCurrentStepErrors()
        });
        $$payload.out.push(`<!----> <div class="step-actions svelte-2venva"><button class="continue-button svelte-2venva"${attr("disabled", !store_get($$store_subs ??= {}, "$canProceedToNext", canProceedToNext), true)}>Continue →</button></div>`);
      } else {
        $$payload.out.push("<!--[!-->");
        if (store_get($$store_subs ??= {}, "$currentStep", currentStep) === 3) {
          $$payload.out.push("<!--[-->");
          LocationSelection($$payload, {
            selectedField: store_get($$store_subs ??= {}, "$workflowData", workflowData).field,
            selectedZone: store_get($$store_subs ??= {}, "$workflowData", workflowData).zone,
            fieldSelectionMode: store_get($$store_subs ??= {}, "$workflowData", workflowData).fieldSelectionMode,
            selectedFields: store_get($$store_subs ??= {}, "$workflowData", workflowData).selectedFields,
            errors: getCurrentStepErrors()
          });
          $$payload.out.push(`<!----> <div class="step-actions svelte-2venva"><button class="continue-button svelte-2venva"${attr("disabled", !store_get($$store_subs ??= {}, "$canProceedToNext", canProceedToNext), true)}>Continue →</button></div>`);
        } else {
          $$payload.out.push("<!--[!-->");
          if (store_get($$store_subs ??= {}, "$currentStep", currentStep) === 4) {
            $$payload.out.push("<!--[-->");
            OdometerReading($$payload, {
              selectedVehicle: store_get($$store_subs ??= {}, "$workflowData", workflowData).vehicle,
              odometerStart: store_get($$store_subs ??= {}, "$workflowData", workflowData).odometerStart,
              odometerEnd: store_get($$store_subs ??= {}, "$workflowData", workflowData).odometerEnd,
              gaugeWorking: store_get($$store_subs ??= {}, "$workflowData", workflowData).gaugeWorking,
              errors: getCurrentStepErrors(),
              canProceedToNext: store_get($$store_subs ??= {}, "$canProceedToNext", canProceedToNext),
              onNext: handleNext
            });
          } else {
            $$payload.out.push("<!--[!-->");
            if (store_get($$store_subs ??= {}, "$currentStep", currentStep) === 5) {
              $$payload.out.push("<!--[-->");
              FuelDataEntry($$payload, {
                selectedVehicle: store_get($$store_subs ??= {}, "$workflowData", workflowData).vehicle,
                selectedBowser: store_get($$store_subs ??= {}, "$workflowData", workflowData).bowser,
                bowserReadingStart: store_get($$store_subs ??= {}, "$workflowData", workflowData).bowserReadingStart,
                bowserReadingEnd: store_get($$store_subs ??= {}, "$workflowData", workflowData).bowserReadingEnd,
                litresDispensed: store_get($$store_subs ??= {}, "$workflowData", workflowData).litresDispensed,
                errors: getCurrentStepErrors(),
                canProceedToNext: store_get($$store_subs ??= {}, "$canProceedToNext", canProceedToNext),
                onNext: handleNext
              });
            } else {
              $$payload.out.push("<!--[!-->");
              if (store_get($$store_subs ??= {}, "$currentStep", currentStep) === 6) {
                $$payload.out.push("<!--[-->");
                $$payload.out.push(`<div class="step-container"><div class="review-summary svelte-2venva">`);
                if (store_get($$store_subs ??= {}, "$workflowData", workflowData).vehicle) {
                  $$payload.out.push("<!--[-->");
                  $$payload.out.push(`<div class="review-row svelte-2venva"><span class="review-label svelte-2venva">Vehicle</span> <span class="review-value svelte-2venva">${escape_html(store_get($$store_subs ??= {}, "$workflowData", workflowData).vehicle.name || `${store_get($$store_subs ??= {}, "$workflowData", workflowData).vehicle.make || ""} ${store_get($$store_subs ??= {}, "$workflowData", workflowData).vehicle.model || ""}`.trim() || "Unnamed")}</span></div>`);
                } else {
                  $$payload.out.push("<!--[!-->");
                }
                $$payload.out.push(`<!--]--> `);
                if (store_get($$store_subs ??= {}, "$workflowData", workflowData).driver) {
                  $$payload.out.push("<!--[-->");
                  $$payload.out.push(`<div class="review-row svelte-2venva"><span class="review-label svelte-2venva">Driver</span> <span class="review-value svelte-2venva">${escape_html(store_get($$store_subs ??= {}, "$workflowData", workflowData).driver.name)}</span></div>`);
                } else {
                  $$payload.out.push("<!--[!-->");
                }
                $$payload.out.push(`<!--]--> `);
                if (store_get($$store_subs ??= {}, "$workflowData", workflowData).activity) {
                  $$payload.out.push("<!--[-->");
                  $$payload.out.push(`<div class="review-row svelte-2venva"><span class="review-label svelte-2venva">Activity</span> <span class="review-value svelte-2venva">${escape_html(store_get($$store_subs ??= {}, "$workflowData", workflowData).activity.name)}</span></div>`);
                } else {
                  $$payload.out.push("<!--[!-->");
                }
                $$payload.out.push(`<!--]--> `);
                if (store_get($$store_subs ??= {}, "$workflowData", workflowData).fieldSelectionMode === "multiple" && store_get($$store_subs ??= {}, "$workflowData", workflowData).selectedFields.length > 0) {
                  $$payload.out.push("<!--[-->");
                  const each_array_1 = ensure_array_like(store_get($$store_subs ??= {}, "$workflowData", workflowData).selectedFields);
                  $$payload.out.push(`<div class="review-row svelte-2venva"><span class="review-label svelte-2venva">Fields</span> <span class="review-value svelte-2venva">${escape_html(store_get($$store_subs ??= {}, "$workflowData", workflowData).selectedFields.length)} field${escape_html(store_get($$store_subs ??= {}, "$workflowData", workflowData).selectedFields.length !== 1 ? "s" : "")}</span></div> <div class="review-multi-fields svelte-2venva"><!--[-->`);
                  for (let index = 0, $$length = each_array_1.length; index < $$length; index++) {
                    let field = each_array_1[index];
                    $$payload.out.push(`<span class="field-chip svelte-2venva">${escape_html(field.name)}</span> `);
                    if (index < store_get($$store_subs ??= {}, "$workflowData", workflowData).selectedFields.length - 1) {
                      $$payload.out.push("<!--[-->");
                      $$payload.out.push(`,`);
                    } else {
                      $$payload.out.push("<!--[!-->");
                    }
                    $$payload.out.push(`<!--]-->`);
                  }
                  $$payload.out.push(`<!--]--></div>`);
                } else {
                  $$payload.out.push("<!--[!-->");
                  if (store_get($$store_subs ??= {}, "$workflowData", workflowData).field) {
                    $$payload.out.push("<!--[-->");
                    $$payload.out.push(`<div class="review-row svelte-2venva"><span class="review-label svelte-2venva">Field</span> <span class="review-value svelte-2venva">${escape_html(store_get($$store_subs ??= {}, "$workflowData", workflowData).field.name)}</span></div>`);
                  } else {
                    $$payload.out.push("<!--[!-->");
                    if (store_get($$store_subs ??= {}, "$workflowData", workflowData).zone) {
                      $$payload.out.push("<!--[-->");
                      $$payload.out.push(`<div class="review-row svelte-2venva"><span class="review-label svelte-2venva">Zone</span> <span class="review-value svelte-2venva">${escape_html(store_get($$store_subs ??= {}, "$workflowData", workflowData).zone.name)}</span></div>`);
                    } else {
                      $$payload.out.push("<!--[!-->");
                    }
                    $$payload.out.push(`<!--]-->`);
                  }
                  $$payload.out.push(`<!--]-->`);
                }
                $$payload.out.push(`<!--]--> `);
                if (store_get($$store_subs ??= {}, "$workflowData", workflowData).odometerStart !== null) {
                  $$payload.out.push("<!--[-->");
                  $$payload.out.push(`<div class="review-row svelte-2venva"><span class="review-label svelte-2venva">ODO Start</span> <span class="review-value svelte-2venva">${escape_html(new Intl.NumberFormat("en-US").format(store_get($$store_subs ??= {}, "$workflowData", workflowData).odometerStart))} km</span></div>`);
                } else {
                  $$payload.out.push("<!--[!-->");
                }
                $$payload.out.push(`<!--]--> `);
                if (store_get($$store_subs ??= {}, "$workflowData", workflowData).gaugeWorking && store_get($$store_subs ??= {}, "$workflowData", workflowData).odometerEnd !== null) {
                  $$payload.out.push("<!--[-->");
                  $$payload.out.push(`<div class="review-row svelte-2venva"><span class="review-label svelte-2venva">ODO End</span> <span class="review-value svelte-2venva">${escape_html(new Intl.NumberFormat("en-US").format(store_get($$store_subs ??= {}, "$workflowData", workflowData).odometerEnd))} km</span></div> `);
                  if (store_get($$store_subs ??= {}, "$workflowData", workflowData).odometerStart !== null) {
                    $$payload.out.push("<!--[-->");
                    $$payload.out.push(`<div class="review-row svelte-2venva"><span class="review-label svelte-2venva">Distance</span> <span class="review-value svelte-2venva">${escape_html(new Intl.NumberFormat("en-US").format(store_get($$store_subs ??= {}, "$workflowData", workflowData).odometerEnd - store_get($$store_subs ??= {}, "$workflowData", workflowData).odometerStart))} km</span></div>`);
                  } else {
                    $$payload.out.push("<!--[!-->");
                  }
                  $$payload.out.push(`<!--]-->`);
                } else {
                  $$payload.out.push("<!--[!-->");
                  if (!store_get($$store_subs ??= {}, "$workflowData", workflowData).gaugeWorking) {
                    $$payload.out.push("<!--[-->");
                    $$payload.out.push(`<div class="review-row svelte-2venva"><span class="review-label svelte-2venva">ODO Status</span> <span class="review-value svelte-2venva">Gauge broken</span></div>`);
                  } else {
                    $$payload.out.push("<!--[!-->");
                  }
                  $$payload.out.push(`<!--]-->`);
                }
                $$payload.out.push(`<!--]--> `);
                if (store_get($$store_subs ??= {}, "$workflowData", workflowData).bowser) {
                  $$payload.out.push("<!--[-->");
                  if (store_get($$store_subs ??= {}, "$workflowData", workflowData).bowserReadingStart !== null) {
                    $$payload.out.push("<!--[-->");
                    $$payload.out.push(`<div class="review-row svelte-2venva"><span class="review-label svelte-2venva">Bowser Start</span> <span class="review-value svelte-2venva">${escape_html(new Intl.NumberFormat("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(store_get($$store_subs ??= {}, "$workflowData", workflowData).bowserReadingStart))} L</span></div>`);
                  } else {
                    $$payload.out.push("<!--[!-->");
                  }
                  $$payload.out.push(`<!--]--> `);
                  if (store_get($$store_subs ??= {}, "$workflowData", workflowData).bowserReadingEnd !== null) {
                    $$payload.out.push("<!--[-->");
                    $$payload.out.push(`<div class="review-row svelte-2venva"><span class="review-label svelte-2venva">Bowser End</span> <span class="review-value svelte-2venva">${escape_html(new Intl.NumberFormat("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(store_get($$store_subs ??= {}, "$workflowData", workflowData).bowserReadingEnd))} L</span></div>`);
                  } else {
                    $$payload.out.push("<!--[!-->");
                  }
                  $$payload.out.push(`<!--]-->`);
                } else {
                  $$payload.out.push("<!--[!-->");
                }
                $$payload.out.push(`<!--]--> `);
                if (store_get($$store_subs ??= {}, "$workflowData", workflowData).bowser && store_get($$store_subs ??= {}, "$workflowData", workflowData).litresDispensed) {
                  $$payload.out.push("<!--[-->");
                  $$payload.out.push(`<div class="fuel-total svelte-2venva"><span class="fuel-amount svelte-2venva">${escape_html(new Intl.NumberFormat("en-US").format(store_get($$store_subs ??= {}, "$workflowData", workflowData).litresDispensed))}</span> <span class="fuel-unit svelte-2venva">L</span></div>`);
                } else {
                  $$payload.out.push("<!--[!-->");
                }
                $$payload.out.push(`<!--]--></div> `);
                if (getCurrentStepErrors().length > 0) {
                  $$payload.out.push("<!--[-->");
                  const each_array_2 = ensure_array_like(getCurrentStepErrors());
                  $$payload.out.push(`<div class="error-message svelte-2venva"><!--[-->`);
                  for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
                    let error = each_array_2[$$index_2];
                    $$payload.out.push(`<p class="svelte-2venva">${escape_html(error)}</p>`);
                  }
                  $$payload.out.push(`<!--]--></div>`);
                } else {
                  $$payload.out.push("<!--[!-->");
                }
                $$payload.out.push(`<!--]--> <button class="submit-btn svelte-2venva"${attr("disabled", !store_get($$store_subs ??= {}, "$canProceedToNext", canProceedToNext) || store_get($$store_subs ??= {}, "$isSubmittingEntry", isSubmittingEntry), true)}>`);
                if (store_get($$store_subs ??= {}, "$isSubmittingEntry", isSubmittingEntry)) {
                  $$payload.out.push("<!--[-->");
                  $$payload.out.push(`Submitting...`);
                } else {
                  $$payload.out.push("<!--[!-->");
                  $$payload.out.push(`Submit`);
                }
                $$payload.out.push(`<!--]--></button></div>`);
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
  $$payload.out.push(`<!--]--></div> <div class="keyboard-hints svelte-2venva"><small>💡 Keyboard shortcuts: <kbd class="svelte-2venva">→</kbd> or <kbd class="svelte-2venva">Enter</kbd> to continue • <kbd class="svelte-2venva">←</kbd> to go back • <kbd class="svelte-2venva">Esc</kbd> to restart</small></div> <button${attr_class(`back-button-fixed ${stringify(store_get($$store_subs ??= {}, "$canGoBackToPrevious", canGoBackToPrevious) ? "visible" : "hidden")}`, "svelte-2venva")}${attr("disabled", !store_get($$store_subs ??= {}, "$canGoBackToPrevious", canGoBackToPrevious), true)} aria-label="Previous step"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"></path></svg></button> <button${attr_class(`next-button-fixed ${stringify(store_get($$store_subs ??= {}, "$canProceedToNext", canProceedToNext) && store_get($$store_subs ??= {}, "$currentStep", currentStep) < store_get($$store_subs ??= {}, "$fuelEntryWorkflowStore", fuelEntryWorkflowStore).steps.length - 1 ? "visible" : "hidden")}`, "svelte-2venva")}${attr("disabled", !store_get($$store_subs ??= {}, "$canProceedToNext", canProceedToNext), true)} aria-label="Next step"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"></path></svg></button></div> `);
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
  $$payload.out.push(`<div class="fuel-management-page svelte-1lvqx35">`);
  FuelEntryWorkflow($$payload);
  $$payload.out.push(`<!----></div>`);
}
export {
  _page as default
};
