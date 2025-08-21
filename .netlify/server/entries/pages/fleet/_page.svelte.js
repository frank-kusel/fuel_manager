import { E as store_get, K as escape_html, Q as ensure_array_like, O as attr_style, G as attr_class, P as stringify, M as attr, J as unsubscribe_stores, B as pop, z as push, R as clsx, S as bind_props, T as maybe_selected, U as copy_payload, V as assign_payload, F as head } from "../../../chunks/index2.js";
import { d as derived, w as writable } from "../../../chunks/index.js";
import { B as Button } from "../../../chunks/Button.js";
import { C as Card } from "../../../chunks/Card.js";
import "clsx";
const initialState$4 = {
  vehicles: [],
  selectedVehicle: null,
  loading: "idle",
  error: null,
  lastFetch: null,
  sortBy: "code",
  sortDirection: "asc",
  searchTerm: "",
  filterType: null
};
function createVehicleStore() {
  const { subscribe, update, set } = writable(initialState$4);
  return {
    subscribe,
    // Loading and error management
    setLoading: (loading) => {
      update((state) => ({ ...state, loading }));
    },
    setError: (error) => {
      update((state) => ({ ...state, error, loading: error ? "error" : state.loading }));
    },
    // Vehicle data management
    setVehicles: (vehicles2) => {
      update((state) => ({
        ...state,
        vehicles: vehicles2,
        loading: "success",
        error: null,
        lastFetch: (/* @__PURE__ */ new Date()).toISOString()
      }));
    },
    addVehicle: (vehicle) => {
      update((state) => ({
        ...state,
        vehicles: [vehicle, ...state.vehicles]
        // Add to beginning
      }));
    },
    updateVehicle: (updatedVehicle) => {
      update((state) => ({
        ...state,
        vehicles: state.vehicles.map(
          (vehicle) => vehicle.id === updatedVehicle.id ? updatedVehicle : vehicle
        ),
        selectedVehicle: state.selectedVehicle?.id === updatedVehicle.id ? updatedVehicle : state.selectedVehicle
      }));
    },
    removeVehicle: (vehicleId) => {
      update((state) => ({
        ...state,
        vehicles: state.vehicles.filter((vehicle) => vehicle.id !== vehicleId),
        selectedVehicle: state.selectedVehicle?.id === vehicleId ? null : state.selectedVehicle
      }));
    },
    selectVehicle: (vehicle) => {
      update((state) => ({ ...state, selectedVehicle: vehicle }));
    },
    // Search and filtering
    setSearchTerm: (searchTerm) => {
      update((state) => ({ ...state, searchTerm }));
    },
    setFilterType: (filterType) => {
      update((state) => ({ ...state, filterType }));
    },
    setSorting: (sortBy, sortDirection) => {
      update((state) => ({ ...state, sortBy, sortDirection }));
    },
    // API operations
    loadVehicles: async () => {
      update((state) => ({ ...state, loading: "loading", error: null }));
      try {
        const { default: supabaseService } = await import("../../../chunks/supabase.js");
        await supabaseService.init();
        const result = await supabaseService.getVehicles();
        if (result.error) {
          update((state) => ({
            ...state,
            error: result.error,
            loading: "error"
          }));
        } else {
          update((state) => ({
            ...state,
            vehicles: result.data || [],
            loading: "success",
            error: null,
            lastFetch: (/* @__PURE__ */ new Date()).toISOString()
          }));
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to load vehicles";
        update((state) => ({
          ...state,
          error: errorMessage,
          loading: "error"
        }));
      }
    },
    createVehicle: async (vehicleData) => {
      update((state) => ({ ...state, loading: "loading", error: null }));
      try {
        const isOnline = navigator?.onLine ?? true;
        if (isOnline) {
          const { default: supabaseService } = await import("../../../chunks/supabase.js");
          await supabaseService.init();
          const result = await supabaseService.createVehicle(vehicleData);
          if (result.error) {
            const { default: offlineService } = await import("../../../chunks/offline.js");
            const tempId = `temp_${Date.now()}`;
            await offlineService.queueForSync("vehicle", { ...vehicleData, id: tempId });
            const tempVehicle = {
              ...vehicleData,
              id: tempId,
              created_at: (/* @__PURE__ */ new Date()).toISOString(),
              updated_at: (/* @__PURE__ */ new Date()).toISOString()
            };
            update((state) => ({
              ...state,
              vehicles: [tempVehicle, ...state.vehicles],
              loading: "success",
              error: "Saved offline - will sync when connection restored"
            }));
            return { success: true, data: tempVehicle, error: null };
          } else {
            update((state) => ({
              ...state,
              vehicles: [result.data, ...state.vehicles],
              loading: "success",
              error: null
            }));
            return { success: true, data: result.data, error: null };
          }
        } else {
          const { default: offlineService } = await import("../../../chunks/offline.js");
          const tempId = `temp_${Date.now()}`;
          await offlineService.queueForSync("vehicle", { ...vehicleData, id: tempId });
          const tempVehicle = {
            ...vehicleData,
            id: tempId,
            created_at: (/* @__PURE__ */ new Date()).toISOString(),
            updated_at: (/* @__PURE__ */ new Date()).toISOString()
          };
          update((state) => ({
            ...state,
            vehicles: [tempVehicle, ...state.vehicles],
            loading: "success",
            error: "Saved offline - will sync when connection restored"
          }));
          return { success: true, data: tempVehicle, error: null };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to create vehicle";
        update((state) => ({
          ...state,
          error: errorMessage,
          loading: "error"
        }));
        return { success: false, data: null, error: errorMessage };
      }
    },
    updateVehicle: async (vehicle) => {
      update((state) => ({ ...state, loading: "loading", error: null }));
      try {
        const isOnline = navigator?.onLine ?? true;
        if (isOnline && !vehicle.id.startsWith("temp_")) {
          const { default: supabaseService } = await import("../../../chunks/supabase.js");
          await supabaseService.init();
          const result = await supabaseService.updateVehicle(vehicle.id, vehicle);
          if (result.error) {
            const { default: offlineService } = await import("../../../chunks/offline.js");
            await offlineService.queueForSync("vehicle", vehicle);
            update((state) => ({
              ...state,
              vehicles: state.vehicles.map((v) => v.id === vehicle.id ? vehicle : v),
              loading: "success",
              error: "Saved offline - will sync when connection restored"
            }));
          } else {
            update((state) => ({
              ...state,
              vehicles: state.vehicles.map((v) => v.id === vehicle.id ? result.data : v),
              selectedVehicle: state.selectedVehicle?.id === vehicle.id ? result.data : state.selectedVehicle,
              loading: "success",
              error: null
            }));
          }
        } else {
          const { default: offlineService } = await import("../../../chunks/offline.js");
          await offlineService.queueForSync("vehicle", vehicle);
          update((state) => ({
            ...state,
            vehicles: state.vehicles.map((v) => v.id === vehicle.id ? vehicle : v),
            selectedVehicle: state.selectedVehicle?.id === vehicle.id ? vehicle : state.selectedVehicle,
            loading: "success",
            error: "Saved offline - will sync when connection restored"
          }));
        }
        return { success: true, data: vehicle, error: null };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to update vehicle";
        update((state) => ({
          ...state,
          error: errorMessage,
          loading: "error"
        }));
        return { success: false, data: null, error: errorMessage };
      }
    },
    deleteVehicle: async (vehicleId) => {
      update((state) => ({ ...state, loading: "loading", error: null }));
      try {
        const isOnline = navigator?.onLine ?? true;
        if (isOnline && !vehicleId.startsWith("temp_")) {
          const { default: supabaseService } = await import("../../../chunks/supabase.js");
          await supabaseService.init();
          const result = await supabaseService.deleteVehicle(vehicleId);
          if (result.error) {
            update((state) => ({
              ...state,
              error: result.error,
              loading: "error"
            }));
            return { success: false, error: result.error };
          }
        }
        update((state) => ({
          ...state,
          vehicles: state.vehicles.filter((vehicle) => vehicle.id !== vehicleId),
          selectedVehicle: state.selectedVehicle?.id === vehicleId ? null : state.selectedVehicle,
          loading: "success",
          error: null
        }));
        return { success: true, error: null };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to delete vehicle";
        update((state) => ({
          ...state,
          error: errorMessage,
          loading: "error"
        }));
        return { success: false, error: errorMessage };
      }
    },
    // Utility methods
    getVehicleById: (id) => {
      let result = null;
      update((state) => {
        result = state.vehicles.find((vehicle) => vehicle.id === id) || null;
        return state;
      });
      return result;
    },
    clearError: () => {
      update((state) => ({ ...state, error: null }));
    },
    reset: () => set(initialState$4)
  };
}
const vehicleStore = createVehicleStore();
const vehicles = derived(vehicleStore, ($store) => $store.vehicles);
derived(vehicleStore, ($store) => $store.selectedVehicle);
const vehicleLoading = derived(vehicleStore, ($store) => $store.loading);
const vehicleError = derived(vehicleStore, ($store) => $store.error);
derived(vehicleStore, ($store) => {
  let filtered = $store.vehicles;
  if ($store.searchTerm) {
    const term = $store.searchTerm.toLowerCase();
    filtered = filtered.filter(
      (vehicle) => vehicle.code.toLowerCase().includes(term) || vehicle.name.toLowerCase().includes(term) || vehicle.registration.toLowerCase().includes(term)
    );
  }
  if ($store.filterType) {
    filtered = filtered.filter((vehicle) => vehicle.type === $store.filterType);
  }
  filtered.sort((a, b) => {
    const aVal = a[$store.sortBy];
    const bVal = b[$store.sortBy];
    if (typeof aVal === "string" && typeof bVal === "string") {
      const result = aVal.localeCompare(bVal);
      return $store.sortDirection === "asc" ? result : -result;
    }
    if (typeof aVal === "number" && typeof bVal === "number") {
      const result = aVal - bVal;
      return $store.sortDirection === "asc" ? result : -result;
    }
    return 0;
  });
  return filtered;
});
derived(vehicles, ($vehicles) => ({
  total: $vehicles.length,
  active: $vehicles.filter((v) => v.active).length,
  byType: $vehicles.reduce((acc, vehicle) => {
    acc[vehicle.type] = (acc[vehicle.type] || 0) + 1;
    return acc;
  }, {})
}));
function VehicleList($$payload, $$props) {
  push();
  var $$store_subs;
  let { onselect, oncreate } = $$props;
  function getVehicleTypeIcon(type) {
    const icons = {
      tractor: "🚜",
      bakkie: "🛻",
      truck: "🚛",
      loader: "🚧",
      harvester: "🌾",
      sprayer: "🌿",
      other: "🚗"
    };
    return icons[type] || icons.other;
  }
  function getVehicleTypeColor(type) {
    const colors = {
      tractor: "#16a34a",
      bakkie: "#2563eb",
      truck: "#dc2626",
      loader: "#ea580c",
      harvester: "#65a30d",
      sprayer: "#059669",
      other: "#6b7280"
    };
    return colors[type] || colors.other;
  }
  function formatOdometer(vehicle) {
    const odometer = vehicle.current_odometer;
    const unit = vehicle.odometer_unit || "km";
    if (odometer == null || odometer === void 0) {
      return "N/A";
    }
    return `${odometer.toLocaleString()} ${unit}`;
  }
  $$payload.out.push(`<div class="vehicle-list svelte-dydvws"><div class="header svelte-dydvws"><div class="header-content svelte-dydvws"><h2 class="svelte-dydvws">Vehicles</h2> <p class="subtitle svelte-dydvws">Manage your fleet vehicles, registration, and maintenance information</p></div> <div class="header-actions svelte-dydvws">`);
  if (oncreate) {
    $$payload.out.push("<!--[-->");
    Button($$payload, {
      variant: "primary",
      onclick: oncreate,
      children: ($$payload2) => {
        $$payload2.out.push(`<span class="icon svelte-dydvws">➕</span> Add Vehicle`);
      }
    });
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--></div></div> `);
  if (store_get($$store_subs ??= {}, "$vehicleLoading", vehicleLoading) === "loading") {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="loading-state svelte-dydvws"><div class="spinner svelte-dydvws"></div> <p>Loading vehicles...</p></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
    if (store_get($$store_subs ??= {}, "$vehicleError", vehicleError)) {
      $$payload.out.push("<!--[-->");
      Card($$payload, {
        class: "error-card",
        children: ($$payload2) => {
          $$payload2.out.push(`<div class="error-content svelte-dydvws"><span class="error-icon svelte-dydvws">⚠️</span> <div><h3 class="svelte-dydvws">Failed to Load Vehicles</h3> <p class="svelte-dydvws">${escape_html(store_get($$store_subs ??= {}, "$vehicleError", vehicleError))}</p> `);
          {
            let children = function($$payload3) {
              $$payload3.out.push(`<!---->Retry`);
            };
            Button($$payload2, {
              variant: "secondary",
              onclick: () => vehicleStore.loadVehicles(),
              children
            });
          }
          $$payload2.out.push(`<!----></div></div>`);
        }
      });
    } else {
      $$payload.out.push("<!--[!-->");
      if (store_get($$store_subs ??= {}, "$vehicles", vehicles).length === 0) {
        $$payload.out.push("<!--[-->");
        Card($$payload, {
          class: "empty-state",
          children: ($$payload2) => {
            $$payload2.out.push(`<div class="empty-content svelte-dydvws"><span class="empty-icon svelte-dydvws">🚜</span> <h3 class="svelte-dydvws">No Vehicles Found</h3> <p class="svelte-dydvws">Get started by adding your first vehicle to the fleet.</p> `);
            if (oncreate) {
              $$payload2.out.push("<!--[-->");
              Button($$payload2, {
                variant: "primary",
                onclick: oncreate,
                children: ($$payload3) => {
                  $$payload3.out.push(`<!---->Add Your First Vehicle`);
                }
              });
            } else {
              $$payload2.out.push("<!--[!-->");
            }
            $$payload2.out.push(`<!--]--></div>`);
          }
        });
      } else {
        $$payload.out.push("<!--[!-->");
        const each_array = ensure_array_like(store_get($$store_subs ??= {}, "$vehicles", vehicles));
        $$payload.out.push(`<div class="stats svelte-dydvws">`);
        Card($$payload, {
          padding: "small",
          children: ($$payload2) => {
            $$payload2.out.push(`<div class="stat svelte-dydvws"><span class="stat-value svelte-dydvws">${escape_html(store_get($$store_subs ??= {}, "$vehicles", vehicles).length)}</span> <span class="stat-label svelte-dydvws">Total Vehicles</span></div>`);
          }
        });
        $$payload.out.push(`<!----> `);
        Card($$payload, {
          padding: "small",
          children: ($$payload2) => {
            $$payload2.out.push(`<div class="stat svelte-dydvws"><span class="stat-value svelte-dydvws">${escape_html(store_get($$store_subs ??= {}, "$vehicles", vehicles).filter((v) => v.active).length)}</span> <span class="stat-label svelte-dydvws">Active</span></div>`);
          }
        });
        $$payload.out.push(`<!----> `);
        Card($$payload, {
          padding: "small",
          children: ($$payload2) => {
            $$payload2.out.push(`<div class="stat svelte-dydvws"><span class="stat-value svelte-dydvws">${escape_html(store_get($$store_subs ??= {}, "$vehicles", vehicles).filter((v) => !v.active).length)}</span> <span class="stat-label svelte-dydvws">Inactive</span></div>`);
          }
        });
        $$payload.out.push(`<!----></div> <div class="vehicle-table-container svelte-dydvws"><table class="vehicle-table svelte-dydvws"><thead><tr><th class="svelte-dydvws">Type</th><th class="svelte-dydvws">Code</th><th class="svelte-dydvws">Name</th><th class="svelte-dydvws">Registration</th><th class="svelte-dydvws">Make/Model</th><th class="svelte-dydvws">Year</th><th class="svelte-dydvws">Fuel Type</th><th class="svelte-dydvws">Odometer</th><th class="svelte-dydvws">Status</th><th class="svelte-dydvws">Actions</th></tr></thead><tbody><!--[-->`);
        for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
          let vehicle = each_array[$$index];
          $$payload.out.push(`<tr class="vehicle-row svelte-dydvws"><td class="type-cell svelte-dydvws"><div class="vehicle-type svelte-dydvws"${attr_style(`color: ${stringify(getVehicleTypeColor(vehicle.type))}`)}><span class="type-icon svelte-dydvws">${escape_html(getVehicleTypeIcon(vehicle.type))}</span> <span class="type-label svelte-dydvws">${escape_html(vehicle.type)}</span></div></td><td class="code-cell svelte-dydvws">${escape_html(vehicle.code)}</td><td class="name-cell svelte-dydvws">${escape_html(vehicle.name)}</td><td class="registration-cell svelte-dydvws">${escape_html(vehicle.registration)}</td><td class="make-model-cell svelte-dydvws">${escape_html(vehicle.make && vehicle.model ? `${vehicle.make} ${vehicle.model}` : "-")}</td><td class="year-cell svelte-dydvws">${escape_html(vehicle.year || "-")}</td><td class="fuel-type-cell svelte-dydvws"><span${attr_class(`fuel-badge ${stringify(vehicle.fuel_type || "diesel")}`, "svelte-dydvws")}>${escape_html(vehicle.fuel_type || "diesel")}</span></td><td class="odometer-cell svelte-dydvws">${escape_html(formatOdometer(vehicle))}</td><td class="status-cell svelte-dydvws"><span${attr_class(`status ${stringify(vehicle.active ? "active" : "inactive")}`, "svelte-dydvws")}>${escape_html(vehicle.active ? "Active" : "Inactive")}</span></td><td class="actions-cell svelte-dydvws"><div class="action-buttons svelte-dydvws">`);
          Button($$payload, {
            size: "sm",
            variant: "outline",
            onclick: (e) => {
              e.stopPropagation();
              onselect?.(vehicle);
            },
            children: ($$payload2) => {
              $$payload2.out.push(`<!---->View`);
            }
          });
          $$payload.out.push(`<!----> <a${attr("href", `/fleet/vehicles/${stringify(vehicle.id)}`)} class="svelte-dydvws">`);
          Button($$payload, {
            size: "sm",
            variant: "primary",
            children: ($$payload2) => {
              $$payload2.out.push(`<!---->Analytics`);
            }
          });
          $$payload.out.push(`<!----></a></div></td></tr>`);
        }
        $$payload.out.push(`<!--]--></tbody></table></div>`);
      }
      $$payload.out.push(`<!--]-->`);
    }
    $$payload.out.push(`<!--]-->`);
  }
  $$payload.out.push(`<!--]--></div>`);
  if ($$store_subs) unsubscribe_stores($$store_subs);
  pop();
}
function Input($$payload, $$props) {
  push();
  let {
    type = "text",
    value = "",
    placeholder,
    label,
    error,
    required = false,
    disabled = false,
    readonly = false,
    min,
    max,
    step,
    class: className = "",
    id,
    name,
    autocomplete
  } = $$props;
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  const classes = [
    "input",
    error && "input-error",
    disabled && "input-disabled",
    readonly && "input-readonly",
    className
  ].filter(Boolean).join(" ");
  $$payload.out.push(`<div class="input-group svelte-lr0dzf">`);
  if (label) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<label${attr("for", inputId)} class="input-label svelte-lr0dzf">${escape_html(label)} `);
    if (required) {
      $$payload.out.push("<!--[-->");
      $$payload.out.push(`<span class="required svelte-lr0dzf">*</span>`);
    } else {
      $$payload.out.push("<!--[!-->");
    }
    $$payload.out.push(`<!--]--></label>`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> <input${attr("type", type)}${attr("id", inputId)}${attr("name", name)}${attr("value", value)}${attr("placeholder", placeholder)}${attr("required", required, true)}${attr("disabled", disabled, true)}${attr("readonly", readonly, true)}${attr("min", min)}${attr("max", max)}${attr("step", step)}${attr("autocomplete", autocomplete)}${attr_class(clsx(classes), "svelte-lr0dzf")}${attr("aria-invalid", !!error)}${attr("aria-describedby", error ? `${inputId}-error` : void 0)}/> `);
  if (error) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div${attr("id", `${stringify(inputId)}-error`)} class="input-error-message svelte-lr0dzf">${escape_html(error)}</div>`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--></div>`);
  bind_props($$props, { value });
  pop();
}
function Select($$payload, $$props) {
  push();
  let {
    options,
    value = "",
    placeholder = "Select an option...",
    label,
    error,
    required = false,
    disabled = false,
    class: className = "",
    id,
    name
  } = $$props;
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
  const classes = [
    "select",
    error && "select-error",
    disabled && "select-disabled",
    className
  ].filter(Boolean).join(" ");
  const each_array = ensure_array_like(options);
  $$payload.out.push(`<div class="select-group svelte-99h4y8">`);
  if (label) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<label${attr("for", selectId)} class="select-label svelte-99h4y8">${escape_html(label)} `);
    if (required) {
      $$payload.out.push("<!--[-->");
      $$payload.out.push(`<span class="required svelte-99h4y8">*</span>`);
    } else {
      $$payload.out.push("<!--[!-->");
    }
    $$payload.out.push(`<!--]--></label>`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> <select${attr("id", selectId)}${attr("name", name)}${attr("required", required, true)}${attr("disabled", disabled, true)}${attr_class(clsx(classes), "svelte-99h4y8")}${attr("aria-invalid", !!error)}${attr("aria-describedby", error ? `${selectId}-error` : void 0)}>`);
  $$payload.select_value = value;
  if (placeholder) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<option value=""${maybe_selected($$payload, "")} disabled${attr("selected", !value, true)}>${escape_html(placeholder)}</option>`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--><!--[-->`);
  for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
    let option = each_array[$$index];
    $$payload.out.push(`<option${attr("value", option.value)}${maybe_selected($$payload, option.value)}${attr("disabled", option.disabled, true)}>${escape_html(option.label)}</option>`);
  }
  $$payload.out.push(`<!--]-->`);
  $$payload.select_value = void 0;
  $$payload.out.push(`</select> `);
  if (error) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div${attr("id", `${stringify(selectId)}-error`)} class="select-error-message svelte-99h4y8">${escape_html(error)}</div>`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--></div>`);
  bind_props($$props, { value });
  pop();
}
function VehicleForm($$payload, $$props) {
  push();
  let { vehicle = null, loading = false } = $$props;
  let formData = {
    code: vehicle?.code || "",
    name: vehicle?.name || "",
    type: vehicle?.type || "tractor",
    registration: vehicle?.registration || "",
    odometer: vehicle?.odometer || 0,
    odometerUnit: vehicle?.odometerUnit || "km",
    fuelType: vehicle?.fuelType || "diesel",
    make: vehicle?.make || "",
    model: vehicle?.model || "",
    year: vehicle?.year || (/* @__PURE__ */ new Date()).getFullYear(),
    active: vehicle?.active ?? true
  };
  let errors = {};
  const vehicleTypeOptions = [
    { value: "tractor", label: "Tractor" },
    { value: "bakkie", label: "Bakkie" },
    { value: "truck", label: "Truck" },
    { value: "loader", label: "Loader" },
    { value: "harvester", label: "Harvester" },
    { value: "sprayer", label: "Sprayer" },
    { value: "other", label: "Other" }
  ];
  const odometerUnitOptions = [
    { value: "km", label: "Kilometers" },
    { value: "hours", label: "Hours" }
  ];
  const fuelTypeOptions = [
    { value: "diesel", label: "Diesel" },
    { value: "petrol", label: "Petrol" }
  ];
  function handleCancel() {
  }
  function clearFieldError(field) {
    if (errors[field]) {
      errors = { ...errors };
      delete errors[field];
    }
  }
  function generateCode() {
    const typePrefix = {
      tractor: "TR",
      bakkie: "BK",
      truck: "TK",
      loader: "LD",
      harvester: "HV",
      sprayer: "SP",
      other: "VH"
    }[formData.type] || "VH";
    const timestamp = Date.now().toString().slice(-4);
    formData.code = `${typePrefix}${timestamp}`;
    clearFieldError("code");
  }
  const isEditing = !!vehicle;
  const formTitle = isEditing ? "Edit Vehicle" : "Add New Vehicle";
  const submitLabel = isEditing ? "Update Vehicle" : "Create Vehicle";
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    Card($$payload2, {
      class: "vehicle-form-card",
      children: ($$payload3) => {
        $$payload3.out.push(`<div class="form-header svelte-1lrizwc"><h2 class="svelte-1lrizwc">${escape_html(formTitle)}</h2> <p class="form-subtitle svelte-1lrizwc">${escape_html(isEditing ? "Update vehicle information" : "Add a new vehicle to your fleet")}</p></div> <form class="vehicle-form svelte-1lrizwc">`);
        if (errors.submit) {
          $$payload3.out.push("<!--[-->");
          $$payload3.out.push(`<div class="form-error svelte-1lrizwc"><span class="error-icon svelte-1lrizwc">⚠️</span> ${escape_html(errors.submit)}</div>`);
        } else {
          $$payload3.out.push("<!--[!-->");
        }
        $$payload3.out.push(`<!--]--> <div class="form-row svelte-1lrizwc"><div class="form-group svelte-1lrizwc">`);
        Input($$payload3, {
          label: "Vehicle Code",
          placeholder: "e.g., TR001",
          required: true,
          error: errors.code,
          oninput: () => clearFieldError("code"),
          get value() {
            return formData.code;
          },
          set value($$value) {
            formData.code = $$value;
            $$settled = false;
          }
        });
        $$payload3.out.push(`<!----> `);
        {
          let children = function($$payload4) {
            $$payload4.out.push(`<!---->Generate`);
          };
          Button($$payload3, {
            type: "button",
            variant: "secondary",
            size: "small",
            class: "code-generate-btn",
            onclick: generateCode,
            children
          });
        }
        $$payload3.out.push(`<!----></div> `);
        Select($$payload3, {
          label: "Vehicle Type",
          options: vehicleTypeOptions,
          required: true,
          error: errors.type,
          get value() {
            return formData.type;
          },
          set value($$value) {
            formData.type = $$value;
            $$settled = false;
          }
        });
        $$payload3.out.push(`<!----></div> `);
        Input($$payload3, {
          label: "Vehicle Name",
          placeholder: "e.g., John Deere 6120",
          required: true,
          error: errors.name,
          oninput: () => clearFieldError("name"),
          get value() {
            return formData.name;
          },
          set value($$value) {
            formData.name = $$value;
            $$settled = false;
          }
        });
        $$payload3.out.push(`<!----> `);
        Input($$payload3, {
          label: "Registration Number",
          placeholder: "e.g., ABC123GP",
          required: true,
          error: errors.registration,
          oninput: () => clearFieldError("registration"),
          get value() {
            return formData.registration;
          },
          set value($$value) {
            formData.registration = $$value;
            $$settled = false;
          }
        });
        $$payload3.out.push(`<!----> <div class="form-row svelte-1lrizwc">`);
        Input($$payload3, {
          type: "number",
          label: "Current Odometer Reading",
          min: 0,
          step: "0.1",
          required: true,
          error: errors.odometer,
          oninput: () => clearFieldError("odometer"),
          get value() {
            return formData.odometer;
          },
          set value($$value) {
            formData.odometer = $$value;
            $$settled = false;
          }
        });
        $$payload3.out.push(`<!----> `);
        Select($$payload3, {
          label: "Odometer Unit",
          options: odometerUnitOptions,
          required: true,
          get value() {
            return formData.odometerUnit;
          },
          set value($$value) {
            formData.odometerUnit = $$value;
            $$settled = false;
          }
        });
        $$payload3.out.push(`<!----></div> `);
        Select($$payload3, {
          label: "Fuel Type",
          options: fuelTypeOptions,
          required: true,
          get value() {
            return formData.fuelType;
          },
          set value($$value) {
            formData.fuelType = $$value;
            $$settled = false;
          }
        });
        $$payload3.out.push(`<!----> <div class="form-section svelte-1lrizwc"><h3 class="svelte-1lrizwc">Optional Information</h3> <div class="form-row svelte-1lrizwc">`);
        Input($$payload3, {
          label: "Make",
          placeholder: "e.g., John Deere",
          error: errors.make,
          get value() {
            return formData.make;
          },
          set value($$value) {
            formData.make = $$value;
            $$settled = false;
          }
        });
        $$payload3.out.push(`<!----> `);
        Input($$payload3, {
          label: "Model",
          placeholder: "e.g., 6120",
          error: errors.model,
          get value() {
            return formData.model;
          },
          set value($$value) {
            formData.model = $$value;
            $$settled = false;
          }
        });
        $$payload3.out.push(`<!----></div> `);
        Input($$payload3, {
          type: "number",
          label: "Year",
          min: 1900,
          max: (/* @__PURE__ */ new Date()).getFullYear() + 2,
          placeholder: (/* @__PURE__ */ new Date()).getFullYear().toString(),
          error: errors.year,
          oninput: () => clearFieldError("year"),
          get value() {
            return formData.year;
          },
          set value($$value) {
            formData.year = $$value;
            $$settled = false;
          }
        });
        $$payload3.out.push(`<!----></div> <div class="form-actions svelte-1lrizwc">`);
        {
          let children = function($$payload4) {
            $$payload4.out.push(`<!---->Cancel`);
          };
          Button($$payload3, {
            type: "button",
            variant: "secondary",
            onclick: handleCancel,
            disabled: loading,
            children
          });
        }
        $$payload3.out.push(`<!----> `);
        {
          let children = function($$payload4) {
            $$payload4.out.push(`<!---->${escape_html(loading ? "Saving..." : submitLabel)}`);
          };
          Button($$payload3, {
            type: "submit",
            variant: "primary",
            loading,
            disabled: loading,
            children
          });
        }
        $$payload3.out.push(`<!----></div></form>`);
      }
    });
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  pop();
}
function VehicleDetail($$payload, $$props) {
  push();
  let { vehicle } = $$props;
  function getVehicleTypeIcon(type) {
    const icons = {
      tractor: "🚜",
      bakkie: "🛻",
      truck: "🚛",
      loader: "🚧",
      harvester: "🌾",
      sprayer: "🌿",
      other: "🚗"
    };
    return icons[type] || icons.other;
  }
  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString("en-ZA", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }
  function formatOdometer(vehicle2) {
    const odometer = vehicle2.current_odometer;
    const unit = vehicle2.odometer_unit || "km";
    if (odometer == null || odometer === void 0) {
      return "N/A";
    }
    return `${odometer.toLocaleString()} ${unit}`;
  }
  function handleEdit() {
  }
  function handleDelete() {
    if (confirm(`Are you sure you want to delete vehicle "${vehicle.name}" (${vehicle.code})? This action cannot be undone.`)) ;
  }
  function handleClose() {
  }
  Card($$payload, {
    class: "vehicle-detail-card",
    children: ($$payload2) => {
      $$payload2.out.push(`<div class="detail-header svelte-1s51i5s"><div class="vehicle-title svelte-1s51i5s"><div class="vehicle-icon svelte-1s51i5s">${escape_html(getVehicleTypeIcon(vehicle.type))}</div> <div class="title-info svelte-1s51i5s"><h2 class="svelte-1s51i5s">${escape_html(vehicle.name)}</h2> <div class="vehicle-code svelte-1s51i5s">Code: ${escape_html(vehicle.code)}</div></div></div> <div class="status-badge svelte-1s51i5s"><span${attr_class(`status ${stringify(vehicle.active ? "active" : "inactive")}`, "svelte-1s51i5s")}>${escape_html(vehicle.active ? "Active" : "Inactive")}</span></div></div> <div class="detail-content svelte-1s51i5s"><div class="detail-section svelte-1s51i5s"><h3 class="svelte-1s51i5s">Basic Information</h3> <div class="detail-grid svelte-1s51i5s"><div class="detail-item svelte-1s51i5s"><span class="label svelte-1s51i5s">Vehicle Type:</span> <span class="value type-value svelte-1s51i5s">${escape_html(vehicle.type)}</span></div> <div class="detail-item svelte-1s51i5s"><span class="label svelte-1s51i5s">Registration:</span> <span class="value registration svelte-1s51i5s">${escape_html(vehicle.registration)}</span></div> <div class="detail-item svelte-1s51i5s"><span class="label svelte-1s51i5s">Fuel Type:</span> <span class="value fuel-type svelte-1s51i5s">${escape_html(vehicle.fuel_type || "diesel")}</span></div> <div class="detail-item svelte-1s51i5s"><span class="label svelte-1s51i5s">Current Odometer:</span> <span class="value odometer svelte-1s51i5s">${escape_html(formatOdometer(vehicle))}</span></div></div></div> `);
      if (vehicle.make || vehicle.model || vehicle.year) {
        $$payload2.out.push("<!--[-->");
        $$payload2.out.push(`<div class="detail-section svelte-1s51i5s"><h3 class="svelte-1s51i5s">Vehicle Specifications</h3> <div class="detail-grid svelte-1s51i5s">`);
        if (vehicle.make) {
          $$payload2.out.push("<!--[-->");
          $$payload2.out.push(`<div class="detail-item svelte-1s51i5s"><span class="label svelte-1s51i5s">Make:</span> <span class="value svelte-1s51i5s">${escape_html(vehicle.make)}</span></div>`);
        } else {
          $$payload2.out.push("<!--[!-->");
        }
        $$payload2.out.push(`<!--]--> `);
        if (vehicle.model) {
          $$payload2.out.push("<!--[-->");
          $$payload2.out.push(`<div class="detail-item svelte-1s51i5s"><span class="label svelte-1s51i5s">Model:</span> <span class="value svelte-1s51i5s">${escape_html(vehicle.model)}</span></div>`);
        } else {
          $$payload2.out.push("<!--[!-->");
        }
        $$payload2.out.push(`<!--]--> `);
        if (vehicle.year) {
          $$payload2.out.push("<!--[-->");
          $$payload2.out.push(`<div class="detail-item svelte-1s51i5s"><span class="label svelte-1s51i5s">Year:</span> <span class="value svelte-1s51i5s">${escape_html(vehicle.year)}</span></div>`);
        } else {
          $$payload2.out.push("<!--[!-->");
        }
        $$payload2.out.push(`<!--]--></div></div>`);
      } else {
        $$payload2.out.push("<!--[!-->");
      }
      $$payload2.out.push(`<!--]--> <div class="detail-section svelte-1s51i5s"><h3 class="svelte-1s51i5s">System Information</h3> <div class="detail-grid svelte-1s51i5s"><div class="detail-item svelte-1s51i5s"><span class="label svelte-1s51i5s">Created:</span> <span class="value svelte-1s51i5s">${escape_html(formatDate(vehicle.created_at))}</span></div> <div class="detail-item svelte-1s51i5s"><span class="label svelte-1s51i5s">Last Updated:</span> <span class="value svelte-1s51i5s">${escape_html(formatDate(vehicle.updated_at))}</span></div></div></div> <div class="detail-section svelte-1s51i5s"><h3 class="svelte-1s51i5s">Usage Statistics</h3> <div class="stats-placeholder svelte-1s51i5s"><p class="svelte-1s51i5s">📊 Fuel usage statistics and maintenance records will be available here once data is collected.</p></div></div></div> <div class="detail-actions svelte-1s51i5s">`);
      {
        let children = function($$payload3) {
          $$payload3.out.push(`<!---->Close`);
        };
        Button($$payload2, {
          variant: "secondary",
          onclick: handleClose,
          children
        });
      }
      $$payload2.out.push(`<!----> <div class="action-group svelte-1s51i5s">`);
      {
        let children = function($$payload3) {
          $$payload3.out.push(`<span class="action-icon svelte-1s51i5s">✏️</span> Edit`);
        };
        Button($$payload2, {
          variant: "primary",
          onclick: handleEdit,
          children
        });
      }
      $$payload2.out.push(`<!----> `);
      {
        let children = function($$payload3) {
          $$payload3.out.push(`<span class="action-icon svelte-1s51i5s">🗑️</span> Delete`);
        };
        Button($$payload2, {
          variant: "error",
          onclick: handleDelete,
          children
        });
      }
      $$payload2.out.push(`<!----></div></div>`);
    }
  });
  pop();
}
const initialState$3 = {
  drivers: [],
  selectedDriver: null,
  loading: "idle",
  error: null,
  lastFetch: null,
  sortBy: "name",
  sortDirection: "asc",
  searchTerm: "",
  filterActive: null
};
function createDriverStore() {
  const { subscribe, update, set } = writable(initialState$3);
  return {
    subscribe,
    // Loading and error management
    setLoading: (loading) => {
      update((state) => ({ ...state, loading }));
    },
    setError: (error) => {
      update((state) => ({ ...state, error, loading: error ? "error" : state.loading }));
    },
    // Driver data management
    setDrivers: (drivers2) => {
      update((state) => ({
        ...state,
        drivers: drivers2,
        loading: "success",
        error: null,
        lastFetch: (/* @__PURE__ */ new Date()).toISOString()
      }));
    },
    addDriver: (driver) => {
      update((state) => ({
        ...state,
        drivers: [driver, ...state.drivers]
        // Add to beginning
      }));
    },
    updateDriverLocal: (updatedDriver) => {
      update((state) => ({
        ...state,
        drivers: state.drivers.map(
          (driver) => driver.id === updatedDriver.id ? updatedDriver : driver
        ),
        selectedDriver: state.selectedDriver?.id === updatedDriver.id ? updatedDriver : state.selectedDriver
      }));
    },
    removeDriver: (driverId) => {
      update((state) => ({
        ...state,
        drivers: state.drivers.filter((driver) => driver.id !== driverId),
        selectedDriver: state.selectedDriver?.id === driverId ? null : state.selectedDriver
      }));
    },
    selectDriver: (driver) => {
      update((state) => ({ ...state, selectedDriver: driver }));
    },
    // Search and filtering
    setSearchTerm: (searchTerm) => {
      update((state) => ({ ...state, searchTerm }));
    },
    setFilterActive: (filterActive) => {
      update((state) => ({ ...state, filterActive }));
    },
    setSorting: (sortBy, sortDirection) => {
      update((state) => ({ ...state, sortBy, sortDirection }));
    },
    // API operations
    loadDrivers: async () => {
      update((state) => ({ ...state, loading: "loading", error: null }));
      try {
        const { default: supabaseService } = await import("../../../chunks/supabase.js");
        await supabaseService.init();
        const result = await supabaseService.getDrivers();
        if (result.error) {
          update((state) => ({
            ...state,
            error: result.error,
            loading: "error"
          }));
        } else {
          update((state) => ({
            ...state,
            drivers: result.data || [],
            loading: "success",
            error: null,
            lastFetch: (/* @__PURE__ */ new Date()).toISOString()
          }));
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to load drivers";
        update((state) => ({
          ...state,
          error: errorMessage,
          loading: "error"
        }));
      }
    },
    createDriver: async (driverData) => {
      update((state) => ({ ...state, loading: "loading", error: null }));
      try {
        const isOnline = navigator?.onLine ?? true;
        if (isOnline) {
          const { default: supabaseService } = await import("../../../chunks/supabase.js");
          await supabaseService.init();
          const result = await supabaseService.createDriver(driverData);
          if (result.error) {
            const { default: offlineService } = await import("../../../chunks/offline.js");
            const tempId = `temp_${Date.now()}`;
            await offlineService.queueForSync("driver", { ...driverData, id: tempId });
            const tempDriver = {
              ...driverData,
              id: tempId,
              created_at: (/* @__PURE__ */ new Date()).toISOString(),
              updated_at: (/* @__PURE__ */ new Date()).toISOString()
            };
            update((state) => ({
              ...state,
              drivers: [tempDriver, ...state.drivers],
              loading: "success",
              error: "Saved offline - will sync when connection restored"
            }));
            return { success: true, data: tempDriver, error: null };
          } else {
            update((state) => ({
              ...state,
              drivers: [result.data, ...state.drivers],
              loading: "success",
              error: null
            }));
            return { success: true, data: result.data, error: null };
          }
        } else {
          const { default: offlineService } = await import("../../../chunks/offline.js");
          const tempId = `temp_${Date.now()}`;
          await offlineService.queueForSync("driver", { ...driverData, id: tempId });
          const tempDriver = {
            ...driverData,
            id: tempId,
            created_at: (/* @__PURE__ */ new Date()).toISOString(),
            updated_at: (/* @__PURE__ */ new Date()).toISOString()
          };
          update((state) => ({
            ...state,
            drivers: [tempDriver, ...state.drivers],
            loading: "success",
            error: "Saved offline - will sync when connection restored"
          }));
          return { success: true, data: tempDriver, error: null };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to create driver";
        update((state) => ({
          ...state,
          error: errorMessage,
          loading: "error"
        }));
        return { success: false, data: null, error: errorMessage };
      }
    },
    updateDriver: async (driver) => {
      update((state) => ({ ...state, loading: "loading", error: null }));
      try {
        const isOnline = navigator?.onLine ?? true;
        if (isOnline && !driver.id.startsWith("temp_")) {
          const { default: supabaseService } = await import("../../../chunks/supabase.js");
          await supabaseService.init();
          const result = await supabaseService.updateDriver(driver.id, driver);
          if (result.error) {
            const { default: offlineService } = await import("../../../chunks/offline.js");
            await offlineService.queueForSync("driver", driver);
            update((state) => ({
              ...state,
              drivers: state.drivers.map((d) => d.id === driver.id ? driver : d),
              loading: "success",
              error: "Saved offline - will sync when connection restored"
            }));
          } else {
            update((state) => ({
              ...state,
              drivers: state.drivers.map((d) => d.id === driver.id ? result.data : d),
              selectedDriver: state.selectedDriver?.id === driver.id ? result.data : state.selectedDriver,
              loading: "success",
              error: null
            }));
          }
        } else {
          const { default: offlineService } = await import("../../../chunks/offline.js");
          await offlineService.queueForSync("driver", driver);
          update((state) => ({
            ...state,
            drivers: state.drivers.map((d) => d.id === driver.id ? driver : d),
            selectedDriver: state.selectedDriver?.id === driver.id ? driver : state.selectedDriver,
            loading: "success",
            error: "Saved offline - will sync when connection restored"
          }));
        }
        return { success: true, data: driver, error: null };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to update driver";
        update((state) => ({
          ...state,
          error: errorMessage,
          loading: "error"
        }));
        return { success: false, data: null, error: errorMessage };
      }
    },
    deleteDriver: async (driverId) => {
      update((state) => ({ ...state, loading: "loading", error: null }));
      try {
        const isOnline = navigator?.onLine ?? true;
        if (isOnline && !driverId.startsWith("temp_")) {
          const { default: supabaseService } = await import("../../../chunks/supabase.js");
          await supabaseService.init();
          const result = await supabaseService.deleteDriver(driverId);
          if (result.error) {
            update((state) => ({
              ...state,
              error: result.error,
              loading: "error"
            }));
            return { success: false, error: result.error };
          }
        }
        update((state) => ({
          ...state,
          drivers: state.drivers.filter((driver) => driver.id !== driverId),
          selectedDriver: state.selectedDriver?.id === driverId ? null : state.selectedDriver,
          loading: "success",
          error: null
        }));
        return { success: true, error: null };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to delete driver";
        update((state) => ({
          ...state,
          error: errorMessage,
          loading: "error"
        }));
        return { success: false, error: errorMessage };
      }
    },
    // Utility methods
    getDriverById: (id) => {
      let result = null;
      update((state) => {
        result = state.drivers.find((driver) => driver.id === id) || null;
        return state;
      });
      return result;
    },
    clearError: () => {
      update((state) => ({ ...state, error: null }));
    },
    reset: () => set(initialState$3)
  };
}
const driverStore = createDriverStore();
const drivers = derived(driverStore, ($store) => $store.drivers);
derived(driverStore, ($store) => $store.selectedDriver);
derived(driverStore, ($store) => $store.loading);
derived(driverStore, ($store) => $store.error);
derived(driverStore, ($store) => {
  let filtered = $store.drivers;
  if ($store.searchTerm) {
    const term = $store.searchTerm.toLowerCase();
    filtered = filtered.filter(
      (driver) => driver.name.toLowerCase().includes(term) || driver.employee_code.toLowerCase().includes(term) || driver.phone.toLowerCase().includes(term) || driver.email.toLowerCase().includes(term)
    );
  }
  if ($store.filterActive !== null) {
    filtered = filtered.filter((driver) => driver.active === $store.filterActive);
  }
  filtered.sort((a, b) => {
    const aVal = a[$store.sortBy];
    const bVal = b[$store.sortBy];
    if (typeof aVal === "string" && typeof bVal === "string") {
      const result = aVal.localeCompare(bVal);
      return $store.sortDirection === "asc" ? result : -result;
    }
    if (typeof aVal === "number" && typeof bVal === "number") {
      const result = aVal - bVal;
      return $store.sortDirection === "asc" ? result : -result;
    }
    if (typeof aVal === "boolean" && typeof bVal === "boolean") {
      const result = aVal === bVal ? 0 : aVal ? 1 : -1;
      return $store.sortDirection === "asc" ? result : -result;
    }
    return 0;
  });
  return filtered;
});
derived(
  drivers,
  ($drivers) => $drivers.filter((driver) => driver.active)
);
derived(drivers, ($drivers) => ({
  total: $drivers.length,
  active: $drivers.filter((d) => d.active).length,
  inactive: $drivers.filter((d) => !d.active).length,
  withValidLicense: $drivers.filter((d) => {
    if (!d.license_expiry) return false;
    return new Date(d.license_expiry) > /* @__PURE__ */ new Date();
  }).length
}));
const initialState$2 = {
  bowsers: [],
  selectedBowser: null,
  loading: "idle",
  error: null,
  lastFetch: null,
  sortBy: "code",
  sortDirection: "asc",
  searchTerm: "",
  filterActive: null
};
function createBowserStore() {
  const { subscribe, update, set } = writable(initialState$2);
  return {
    subscribe,
    // Loading and error management
    setLoading: (loading) => {
      update((state) => ({ ...state, loading }));
    },
    setError: (error) => {
      update((state) => ({ ...state, error, loading: error ? "error" : state.loading }));
    },
    // Bowser data management
    setBowsers: (bowsers2) => {
      update((state) => ({
        ...state,
        bowsers: bowsers2,
        loading: "success",
        error: null,
        lastFetch: (/* @__PURE__ */ new Date()).toISOString()
      }));
    },
    addBowser: (bowser) => {
      update((state) => ({
        ...state,
        bowsers: [bowser, ...state.bowsers]
        // Add to beginning
      }));
    },
    updateBowserLocal: (updatedBowser) => {
      update((state) => ({
        ...state,
        bowsers: state.bowsers.map(
          (bowser) => bowser.id === updatedBowser.id ? updatedBowser : bowser
        ),
        selectedBowser: state.selectedBowser?.id === updatedBowser.id ? updatedBowser : state.selectedBowser
      }));
    },
    removeBowser: (bowserId) => {
      update((state) => ({
        ...state,
        bowsers: state.bowsers.filter((bowser) => bowser.id !== bowserId),
        selectedBowser: state.selectedBowser?.id === bowserId ? null : state.selectedBowser
      }));
    },
    selectBowser: (bowser) => {
      update((state) => ({ ...state, selectedBowser: bowser }));
    },
    // Search and filtering
    setSearchTerm: (searchTerm) => {
      update((state) => ({ ...state, searchTerm }));
    },
    setFilterActive: (filterActive) => {
      update((state) => ({ ...state, filterActive }));
    },
    setSorting: (sortBy, sortDirection) => {
      update((state) => ({ ...state, sortBy, sortDirection }));
    },
    // API operations
    loadBowsers: async () => {
      update((state) => ({ ...state, loading: "loading", error: null }));
      try {
        const { default: supabaseService } = await import("../../../chunks/supabase.js");
        await supabaseService.init();
        const result = await supabaseService.getBowsers();
        if (result.error) {
          update((state) => ({
            ...state,
            error: result.error,
            loading: "error"
          }));
        } else {
          update((state) => ({
            ...state,
            bowsers: result.data || [],
            loading: "success",
            error: null,
            lastFetch: (/* @__PURE__ */ new Date()).toISOString()
          }));
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to load bowsers";
        update((state) => ({
          ...state,
          error: errorMessage,
          loading: "error"
        }));
      }
    },
    createBowser: async (bowserData) => {
      update((state) => ({ ...state, loading: "loading", error: null }));
      try {
        const isOnline = navigator?.onLine ?? true;
        if (isOnline) {
          const { default: supabaseService } = await import("../../../chunks/supabase.js");
          await supabaseService.init();
          const result = await supabaseService.createBowser(bowserData);
          if (result.error) {
            const { default: offlineService } = await import("../../../chunks/offline.js");
            const tempId = `temp_${Date.now()}`;
            await offlineService.queueForSync("bowser", { ...bowserData, id: tempId });
            const tempBowser = {
              ...bowserData,
              id: tempId,
              created_at: (/* @__PURE__ */ new Date()).toISOString(),
              updated_at: (/* @__PURE__ */ new Date()).toISOString()
            };
            update((state) => ({
              ...state,
              bowsers: [tempBowser, ...state.bowsers],
              loading: "success",
              error: "Saved offline - will sync when connection restored"
            }));
            return { success: true, data: tempBowser, error: null };
          } else {
            update((state) => ({
              ...state,
              bowsers: [result.data, ...state.bowsers],
              loading: "success",
              error: null
            }));
            return { success: true, data: result.data, error: null };
          }
        } else {
          const { default: offlineService } = await import("../../../chunks/offline.js");
          const tempId = `temp_${Date.now()}`;
          await offlineService.queueForSync("bowser", { ...bowserData, id: tempId });
          const tempBowser = {
            ...bowserData,
            id: tempId,
            created_at: (/* @__PURE__ */ new Date()).toISOString(),
            updated_at: (/* @__PURE__ */ new Date()).toISOString()
          };
          update((state) => ({
            ...state,
            bowsers: [tempBowser, ...state.bowsers],
            loading: "success",
            error: "Saved offline - will sync when connection restored"
          }));
          return { success: true, data: tempBowser, error: null };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to create bowser";
        update((state) => ({
          ...state,
          error: errorMessage,
          loading: "error"
        }));
        return { success: false, data: null, error: errorMessage };
      }
    },
    updateBowser: async (bowser) => {
      update((state) => ({ ...state, loading: "loading", error: null }));
      try {
        const isOnline = navigator?.onLine ?? true;
        if (isOnline && !bowser.id.startsWith("temp_")) {
          const { default: supabaseService } = await import("../../../chunks/supabase.js");
          await supabaseService.init();
          const result = await supabaseService.updateBowser(bowser.id, bowser);
          if (result.error) {
            const { default: offlineService } = await import("../../../chunks/offline.js");
            await offlineService.queueForSync("bowser", bowser);
            update((state) => ({
              ...state,
              bowsers: state.bowsers.map((b) => b.id === bowser.id ? bowser : b),
              loading: "success",
              error: "Saved offline - will sync when connection restored"
            }));
          } else {
            update((state) => ({
              ...state,
              bowsers: state.bowsers.map((b) => b.id === bowser.id ? result.data : b),
              selectedBowser: state.selectedBowser?.id === bowser.id ? result.data : state.selectedBowser,
              loading: "success",
              error: null
            }));
          }
        } else {
          const { default: offlineService } = await import("../../../chunks/offline.js");
          await offlineService.queueForSync("bowser", bowser);
          update((state) => ({
            ...state,
            bowsers: state.bowsers.map((b) => b.id === bowser.id ? bowser : b),
            selectedBowser: state.selectedBowser?.id === bowser.id ? bowser : state.selectedBowser,
            loading: "success",
            error: "Saved offline - will sync when connection restored"
          }));
        }
        return { success: true, data: bowser, error: null };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to update bowser";
        update((state) => ({
          ...state,
          error: errorMessage,
          loading: "error"
        }));
        return { success: false, data: null, error: errorMessage };
      }
    },
    deleteBowser: async (bowserId) => {
      update((state) => ({ ...state, loading: "loading", error: null }));
      try {
        const isOnline = navigator?.onLine ?? true;
        if (isOnline && !bowserId.startsWith("temp_")) {
          const { default: supabaseService } = await import("../../../chunks/supabase.js");
          await supabaseService.init();
          const result = await supabaseService.deleteBowser(bowserId);
          if (result.error) {
            update((state) => ({
              ...state,
              error: result.error,
              loading: "error"
            }));
            return { success: false, error: result.error };
          }
        }
        update((state) => ({
          ...state,
          bowsers: state.bowsers.filter((bowser) => bowser.id !== bowserId),
          selectedBowser: state.selectedBowser?.id === bowserId ? null : state.selectedBowser,
          loading: "success",
          error: null
        }));
        return { success: true, error: null };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to delete bowser";
        update((state) => ({
          ...state,
          error: errorMessage,
          loading: "error"
        }));
        return { success: false, error: errorMessage };
      }
    },
    // Utility methods
    getBowserById: (id) => {
      let result = null;
      update((state) => {
        result = state.bowsers.find((bowser) => bowser.id === id) || null;
        return state;
      });
      return result;
    },
    clearError: () => {
      update((state) => ({ ...state, error: null }));
    },
    reset: () => set(initialState$2)
  };
}
const bowserStore = createBowserStore();
const bowsers = derived(bowserStore, ($store) => $store.bowsers);
derived(bowserStore, ($store) => $store.selectedBowser);
derived(bowserStore, ($store) => $store.loading);
derived(bowserStore, ($store) => $store.error);
derived(bowserStore, ($store) => {
  let filtered = $store.bowsers;
  if ($store.searchTerm) {
    const term = $store.searchTerm.toLowerCase();
    filtered = filtered.filter(
      (bowser) => bowser.code.toLowerCase().includes(term) || bowser.name.toLowerCase().includes(term) || bowser.registration.toLowerCase().includes(term)
    );
  }
  if ($store.filterActive !== null) {
    filtered = filtered.filter((bowser) => bowser.active === $store.filterActive);
  }
  filtered.sort((a, b) => {
    const aVal = a[$store.sortBy];
    const bVal = b[$store.sortBy];
    if (typeof aVal === "string" && typeof bVal === "string") {
      const result = aVal.localeCompare(bVal);
      return $store.sortDirection === "asc" ? result : -result;
    }
    if (typeof aVal === "number" && typeof bVal === "number") {
      const result = aVal - bVal;
      return $store.sortDirection === "asc" ? result : -result;
    }
    if (typeof aVal === "boolean" && typeof bVal === "boolean") {
      const result = aVal === bVal ? 0 : aVal ? 1 : -1;
      return $store.sortDirection === "asc" ? result : -result;
    }
    return 0;
  });
  return filtered;
});
derived(
  bowsers,
  ($bowsers) => $bowsers.filter((bowser) => bowser.active)
);
derived(bowsers, ($bowsers) => ({
  total: $bowsers.length,
  active: $bowsers.filter((b) => b.active).length,
  inactive: $bowsers.filter((b) => !b.active).length,
  totalCapacity: $bowsers.reduce((sum, b) => sum + b.capacity, 0),
  averageCapacity: $bowsers.length > 0 ? Math.round($bowsers.reduce((sum, b) => sum + b.capacity, 0) / $bowsers.length) : 0
}));
const initialState$1 = {
  activities: [],
  selectedActivity: null,
  loading: "idle",
  error: null,
  lastFetch: null,
  sortBy: "name",
  sortDirection: "asc",
  searchTerm: "",
  filterCategory: null,
  filterActive: null
};
function createActivityStore() {
  const { subscribe, update, set } = writable(initialState$1);
  return {
    subscribe,
    // Loading and error management
    setLoading: (loading) => {
      update((state) => ({ ...state, loading }));
    },
    setError: (error) => {
      update((state) => ({ ...state, error, loading: error ? "error" : state.loading }));
    },
    // Activity data management
    setActivities: (activities2) => {
      update((state) => ({
        ...state,
        activities: activities2,
        loading: "success",
        error: null,
        lastFetch: (/* @__PURE__ */ new Date()).toISOString()
      }));
    },
    addActivity: (activity) => {
      update((state) => ({
        ...state,
        activities: [activity, ...state.activities]
        // Add to beginning
      }));
    },
    updateActivityLocal: (updatedActivity) => {
      update((state) => ({
        ...state,
        activities: state.activities.map(
          (activity) => activity.id === updatedActivity.id ? updatedActivity : activity
        ),
        selectedActivity: state.selectedActivity?.id === updatedActivity.id ? updatedActivity : state.selectedActivity
      }));
    },
    removeActivity: (activityId) => {
      update((state) => ({
        ...state,
        activities: state.activities.filter((activity) => activity.id !== activityId),
        selectedActivity: state.selectedActivity?.id === activityId ? null : state.selectedActivity
      }));
    },
    selectActivity: (activity) => {
      update((state) => ({ ...state, selectedActivity: activity }));
    },
    // Search and filtering
    setSearchTerm: (searchTerm) => {
      update((state) => ({ ...state, searchTerm }));
    },
    setFilterCategory: (filterCategory) => {
      update((state) => ({ ...state, filterCategory }));
    },
    setFilterActive: (filterActive) => {
      update((state) => ({ ...state, filterActive }));
    },
    setSorting: (sortBy, sortDirection) => {
      update((state) => ({ ...state, sortBy, sortDirection }));
    },
    // API operations
    loadActivities: async () => {
      update((state) => ({ ...state, loading: "loading", error: null }));
      try {
        const { default: supabaseService } = await import("../../../chunks/supabase.js");
        await supabaseService.init();
        const result = await supabaseService.getActivities();
        if (result.error) {
          update((state) => ({
            ...state,
            error: result.error,
            loading: "error"
          }));
        } else {
          update((state) => ({
            ...state,
            activities: result.data || [],
            loading: "success",
            error: null,
            lastFetch: (/* @__PURE__ */ new Date()).toISOString()
          }));
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to load activities";
        update((state) => ({
          ...state,
          error: errorMessage,
          loading: "error"
        }));
      }
    },
    createActivity: async (activityData) => {
      update((state) => ({ ...state, loading: "loading", error: null }));
      try {
        const isOnline = navigator?.onLine ?? true;
        if (isOnline) {
          const { default: supabaseService } = await import("../../../chunks/supabase.js");
          await supabaseService.init();
          const result = await supabaseService.createActivity(activityData);
          if (result.error) {
            const { default: offlineService } = await import("../../../chunks/offline.js");
            const tempId = `temp_${Date.now()}`;
            await offlineService.queueForSync("activity", { ...activityData, id: tempId });
            const tempActivity = {
              ...activityData,
              id: tempId,
              created_at: (/* @__PURE__ */ new Date()).toISOString(),
              updated_at: (/* @__PURE__ */ new Date()).toISOString()
            };
            update((state) => ({
              ...state,
              activities: [tempActivity, ...state.activities],
              loading: "success",
              error: "Saved offline - will sync when connection restored"
            }));
            return { success: true, data: tempActivity, error: null };
          } else {
            update((state) => ({
              ...state,
              activities: [result.data, ...state.activities],
              loading: "success",
              error: null
            }));
            return { success: true, data: result.data, error: null };
          }
        } else {
          const { default: offlineService } = await import("../../../chunks/offline.js");
          const tempId = `temp_${Date.now()}`;
          await offlineService.queueForSync("activity", { ...activityData, id: tempId });
          const tempActivity = {
            ...activityData,
            id: tempId,
            created_at: (/* @__PURE__ */ new Date()).toISOString(),
            updated_at: (/* @__PURE__ */ new Date()).toISOString()
          };
          update((state) => ({
            ...state,
            activities: [tempActivity, ...state.activities],
            loading: "success",
            error: "Saved offline - will sync when connection restored"
          }));
          return { success: true, data: tempActivity, error: null };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to create activity";
        update((state) => ({
          ...state,
          error: errorMessage,
          loading: "error"
        }));
        return { success: false, data: null, error: errorMessage };
      }
    },
    updateActivity: async (activity) => {
      update((state) => ({ ...state, loading: "loading", error: null }));
      try {
        const isOnline = navigator?.onLine ?? true;
        if (isOnline && !activity.id.startsWith("temp_")) {
          const { default: supabaseService } = await import("../../../chunks/supabase.js");
          await supabaseService.init();
          const result = await supabaseService.updateActivity(activity.id, activity);
          if (result.error) {
            const { default: offlineService } = await import("../../../chunks/offline.js");
            await offlineService.queueForSync("activity", activity);
            update((state) => ({
              ...state,
              activities: state.activities.map((a) => a.id === activity.id ? activity : a),
              loading: "success",
              error: "Saved offline - will sync when connection restored"
            }));
          } else {
            update((state) => ({
              ...state,
              activities: state.activities.map((a) => a.id === activity.id ? result.data : a),
              selectedActivity: state.selectedActivity?.id === activity.id ? result.data : state.selectedActivity,
              loading: "success",
              error: null
            }));
          }
        } else {
          const { default: offlineService } = await import("../../../chunks/offline.js");
          await offlineService.queueForSync("activity", activity);
          update((state) => ({
            ...state,
            activities: state.activities.map((a) => a.id === activity.id ? activity : a),
            selectedActivity: state.selectedActivity?.id === activity.id ? activity : state.selectedActivity,
            loading: "success",
            error: "Saved offline - will sync when connection restored"
          }));
        }
        return { success: true, data: activity, error: null };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to update activity";
        update((state) => ({
          ...state,
          error: errorMessage,
          loading: "error"
        }));
        return { success: false, data: null, error: errorMessage };
      }
    },
    deleteActivity: async (activityId) => {
      update((state) => ({ ...state, loading: "loading", error: null }));
      try {
        const isOnline = navigator?.onLine ?? true;
        if (isOnline && !activityId.startsWith("temp_")) {
          const { default: supabaseService } = await import("../../../chunks/supabase.js");
          await supabaseService.init();
          const result = await supabaseService.deleteActivity(activityId);
          if (result.error) {
            update((state) => ({
              ...state,
              error: result.error,
              loading: "error"
            }));
            return { success: false, error: result.error };
          }
        }
        update((state) => ({
          ...state,
          activities: state.activities.filter((activity) => activity.id !== activityId),
          selectedActivity: state.selectedActivity?.id === activityId ? null : state.selectedActivity,
          loading: "success",
          error: null
        }));
        return { success: true, error: null };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to delete activity";
        update((state) => ({
          ...state,
          error: errorMessage,
          loading: "error"
        }));
        return { success: false, error: errorMessage };
      }
    },
    // Utility methods
    getActivityById: (id) => {
      let result = null;
      update((state) => {
        result = state.activities.find((activity) => activity.id === id) || null;
        return state;
      });
      return result;
    },
    clearError: () => {
      update((state) => ({ ...state, error: null }));
    },
    reset: () => set(initialState$1)
  };
}
const activityStore = createActivityStore();
const activities = derived(activityStore, ($store) => $store.activities);
derived(activityStore, ($store) => $store.selectedActivity);
derived(activityStore, ($store) => $store.loading);
derived(activityStore, ($store) => $store.error);
derived(activityStore, ($store) => {
  let filtered = $store.activities;
  if ($store.searchTerm) {
    const term = $store.searchTerm.toLowerCase();
    filtered = filtered.filter(
      (activity) => activity.name.toLowerCase().includes(term) || activity.code.toLowerCase().includes(term) || (activity.description?.toLowerCase().includes(term) || false)
    );
  }
  if ($store.filterCategory) {
    filtered = filtered.filter((activity) => activity.category === $store.filterCategory);
  }
  if ($store.filterActive !== null) {
    filtered = filtered.filter((activity) => activity.active === $store.filterActive);
  }
  filtered.sort((a, b) => {
    const aVal = a[$store.sortBy];
    const bVal = b[$store.sortBy];
    if (aVal === null || aVal === void 0) return 1;
    if (bVal === null || bVal === void 0) return -1;
    if (typeof aVal === "string" && typeof bVal === "string") {
      const result = aVal.localeCompare(bVal);
      return $store.sortDirection === "asc" ? result : -result;
    }
    if (typeof aVal === "number" && typeof bVal === "number") {
      const result = aVal - bVal;
      return $store.sortDirection === "asc" ? result : -result;
    }
    if (typeof aVal === "boolean" && typeof bVal === "boolean") {
      const result = aVal === bVal ? 0 : aVal ? 1 : -1;
      return $store.sortDirection === "asc" ? result : -result;
    }
    return 0;
  });
  return filtered;
});
derived(
  activities,
  ($activities) => $activities.filter((activity) => activity.active)
);
derived(activities, ($activities) => {
  const grouped = /* @__PURE__ */ new Map();
  $activities.forEach((activity) => {
    const category = activity.category;
    if (!grouped.has(category)) {
      grouped.set(category, []);
    }
    grouped.get(category).push(activity);
  });
  return grouped;
});
derived(activities, ($activities) => ({
  total: $activities.length,
  active: $activities.filter((a) => a.active).length,
  inactive: $activities.filter((a) => !a.active).length,
  byCategory: {
    planting: $activities.filter((a) => a.category === "planting").length,
    harvesting: $activities.filter((a) => a.category === "harvesting").length,
    spraying: $activities.filter((a) => a.category === "spraying").length,
    fertilizing: $activities.filter((a) => a.category === "fertilizing").length,
    maintenance: $activities.filter((a) => a.category === "maintenance").length,
    other: $activities.filter((a) => a.category === "other").length
  }
}));
const initialState = {
  fields: [],
  selectedField: null,
  loading: "idle",
  error: null,
  lastFetch: null,
  sortBy: "name",
  sortDirection: "asc",
  searchTerm: "",
  filterType: null,
  filterActive: null
};
function createFieldStore() {
  const { subscribe, update, set } = writable(initialState);
  return {
    subscribe,
    // Loading and error management
    setLoading: (loading) => {
      update((state) => ({ ...state, loading }));
    },
    setError: (error) => {
      update((state) => ({ ...state, error, loading: error ? "error" : state.loading }));
    },
    // Field data management
    setFields: (fields2) => {
      update((state) => ({
        ...state,
        fields: fields2,
        loading: "success",
        error: null,
        lastFetch: (/* @__PURE__ */ new Date()).toISOString()
      }));
    },
    addField: (field) => {
      update((state) => ({
        ...state,
        fields: [field, ...state.fields]
        // Add to beginning
      }));
    },
    updateFieldLocal: (updatedField) => {
      update((state) => ({
        ...state,
        fields: state.fields.map(
          (field) => field.id === updatedField.id ? updatedField : field
        ),
        selectedField: state.selectedField?.id === updatedField.id ? updatedField : state.selectedField
      }));
    },
    removeField: (fieldId) => {
      update((state) => ({
        ...state,
        fields: state.fields.filter((field) => field.id !== fieldId),
        selectedField: state.selectedField?.id === fieldId ? null : state.selectedField
      }));
    },
    selectField: (field) => {
      update((state) => ({ ...state, selectedField: field }));
    },
    // Search and filtering
    setSearchTerm: (searchTerm) => {
      update((state) => ({ ...state, searchTerm }));
    },
    setFilterType: (filterType) => {
      update((state) => ({ ...state, filterType }));
    },
    setFilterActive: (filterActive) => {
      update((state) => ({ ...state, filterActive }));
    },
    setSorting: (sortBy, sortDirection) => {
      update((state) => ({ ...state, sortBy, sortDirection }));
    },
    // API operations
    loadFields: async () => {
      update((state) => ({ ...state, loading: "loading", error: null }));
      try {
        const { default: supabaseService } = await import("../../../chunks/supabase.js");
        await supabaseService.init();
        const result = await supabaseService.getFields();
        if (result.error) {
          update((state) => ({
            ...state,
            error: result.error,
            loading: "error"
          }));
        } else {
          update((state) => ({
            ...state,
            fields: result.data || [],
            loading: "success",
            error: null,
            lastFetch: (/* @__PURE__ */ new Date()).toISOString()
          }));
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to load fields";
        update((state) => ({
          ...state,
          error: errorMessage,
          loading: "error"
        }));
      }
    },
    createField: async (fieldData) => {
      update((state) => ({ ...state, loading: "loading", error: null }));
      try {
        const isOnline = navigator?.onLine ?? true;
        if (isOnline) {
          const { default: supabaseService } = await import("../../../chunks/supabase.js");
          await supabaseService.init();
          const result = await supabaseService.createField(fieldData);
          if (result.error) {
            const { default: offlineService } = await import("../../../chunks/offline.js");
            const tempId = `temp_${Date.now()}`;
            await offlineService.queueForSync("field", { ...fieldData, id: tempId });
            const tempField = {
              ...fieldData,
              id: tempId,
              created_at: (/* @__PURE__ */ new Date()).toISOString(),
              updated_at: (/* @__PURE__ */ new Date()).toISOString()
            };
            update((state) => ({
              ...state,
              fields: [tempField, ...state.fields],
              loading: "success",
              error: "Saved offline - will sync when connection restored"
            }));
            return { success: true, data: tempField, error: null };
          } else {
            update((state) => ({
              ...state,
              fields: [result.data, ...state.fields],
              loading: "success",
              error: null
            }));
            return { success: true, data: result.data, error: null };
          }
        } else {
          const { default: offlineService } = await import("../../../chunks/offline.js");
          const tempId = `temp_${Date.now()}`;
          await offlineService.queueForSync("field", { ...fieldData, id: tempId });
          const tempField = {
            ...fieldData,
            id: tempId,
            created_at: (/* @__PURE__ */ new Date()).toISOString(),
            updated_at: (/* @__PURE__ */ new Date()).toISOString()
          };
          update((state) => ({
            ...state,
            fields: [tempField, ...state.fields],
            loading: "success",
            error: "Saved offline - will sync when connection restored"
          }));
          return { success: true, data: tempField, error: null };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to create field";
        update((state) => ({
          ...state,
          error: errorMessage,
          loading: "error"
        }));
        return { success: false, data: null, error: errorMessage };
      }
    },
    updateField: async (field) => {
      update((state) => ({ ...state, loading: "loading", error: null }));
      try {
        const isOnline = navigator?.onLine ?? true;
        if (isOnline && !field.id.startsWith("temp_")) {
          const { default: supabaseService } = await import("../../../chunks/supabase.js");
          await supabaseService.init();
          const result = await supabaseService.updateField(field.id, field);
          if (result.error) {
            const { default: offlineService } = await import("../../../chunks/offline.js");
            await offlineService.queueForSync("field", field);
            update((state) => ({
              ...state,
              fields: state.fields.map((f) => f.id === field.id ? field : f),
              loading: "success",
              error: "Saved offline - will sync when connection restored"
            }));
          } else {
            update((state) => ({
              ...state,
              fields: state.fields.map((f) => f.id === field.id ? result.data : f),
              selectedField: state.selectedField?.id === field.id ? result.data : state.selectedField,
              loading: "success",
              error: null
            }));
          }
        } else {
          const { default: offlineService } = await import("../../../chunks/offline.js");
          await offlineService.queueForSync("field", field);
          update((state) => ({
            ...state,
            fields: state.fields.map((f) => f.id === field.id ? field : f),
            selectedField: state.selectedField?.id === field.id ? field : state.selectedField,
            loading: "success",
            error: "Saved offline - will sync when connection restored"
          }));
        }
        return { success: true, data: field, error: null };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to update field";
        update((state) => ({
          ...state,
          error: errorMessage,
          loading: "error"
        }));
        return { success: false, data: null, error: errorMessage };
      }
    },
    deleteField: async (fieldId) => {
      update((state) => ({ ...state, loading: "loading", error: null }));
      try {
        const isOnline = navigator?.onLine ?? true;
        if (isOnline && !fieldId.startsWith("temp_")) {
          const { default: supabaseService } = await import("../../../chunks/supabase.js");
          await supabaseService.init();
          const result = await supabaseService.deleteField(fieldId);
          if (result.error) {
            update((state) => ({
              ...state,
              error: result.error,
              loading: "error"
            }));
            return { success: false, error: result.error };
          }
        }
        update((state) => ({
          ...state,
          fields: state.fields.filter((field) => field.id !== fieldId),
          selectedField: state.selectedField?.id === fieldId ? null : state.selectedField,
          loading: "success",
          error: null
        }));
        return { success: true, error: null };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to delete field";
        update((state) => ({
          ...state,
          error: errorMessage,
          loading: "error"
        }));
        return { success: false, error: errorMessage };
      }
    },
    // Utility methods
    getFieldById: (id) => {
      let result = null;
      update((state) => {
        result = state.fields.find((field) => field.id === id) || null;
        return state;
      });
      return result;
    },
    clearError: () => {
      update((state) => ({ ...state, error: null }));
    },
    reset: () => set(initialState)
  };
}
const fieldStore = createFieldStore();
const fields = derived(fieldStore, ($store) => $store.fields);
derived(fieldStore, ($store) => $store.selectedField);
derived(fieldStore, ($store) => $store.loading);
derived(fieldStore, ($store) => $store.error);
derived(fieldStore, ($store) => {
  let filtered = $store.fields;
  if ($store.searchTerm) {
    const term = $store.searchTerm.toLowerCase();
    filtered = filtered.filter(
      (field) => field.name.toLowerCase().includes(term) || field.code.toLowerCase().includes(term) || (field.location?.toLowerCase().includes(term) || false) || (field.crop_type?.toLowerCase().includes(term) || false)
    );
  }
  if ($store.filterType) {
    filtered = filtered.filter((field) => field.type === $store.filterType);
  }
  if ($store.filterActive !== null) {
    filtered = filtered.filter((field) => field.active === $store.filterActive);
  }
  filtered.sort((a, b) => {
    const aVal = a[$store.sortBy];
    const bVal = b[$store.sortBy];
    if (aVal === null || aVal === void 0) return 1;
    if (bVal === null || bVal === void 0) return -1;
    if (typeof aVal === "string" && typeof bVal === "string") {
      const result = aVal.localeCompare(bVal);
      return $store.sortDirection === "asc" ? result : -result;
    }
    if (typeof aVal === "number" && typeof bVal === "number") {
      const result = aVal - bVal;
      return $store.sortDirection === "asc" ? result : -result;
    }
    if (typeof aVal === "boolean" && typeof bVal === "boolean") {
      const result = aVal === bVal ? 0 : aVal ? 1 : -1;
      return $store.sortDirection === "asc" ? result : -result;
    }
    return 0;
  });
  return filtered;
});
derived(
  fields,
  ($fields) => $fields.filter((field) => field.active)
);
derived(fields, ($fields) => {
  const grouped = /* @__PURE__ */ new Map();
  $fields.forEach((field) => {
    const type = field.type;
    if (!grouped.has(type)) {
      grouped.set(type, []);
    }
    grouped.get(type).push(field);
  });
  return grouped;
});
derived(fields, ($fields) => ({
  total: $fields.length,
  active: $fields.filter((f) => f.active).length,
  inactive: $fields.filter((f) => !f.active).length,
  totalArea: $fields.reduce((sum, f) => sum + f.area, 0),
  averageArea: $fields.length > 0 ? Math.round($fields.reduce((sum, f) => sum + f.area, 0) / $fields.length * 10) / 10 : 0,
  byType: {
    arable: $fields.filter((f) => f.type === "arable").length,
    pasture: $fields.filter((f) => f.type === "pasture").length,
    orchard: $fields.filter((f) => f.type === "orchard").length,
    greenhouse: $fields.filter((f) => f.type === "greenhouse").length,
    other: $fields.filter((f) => f.type === "other").length
  }
}));
function _page($$payload, $$props) {
  push();
  let selectedSection = "vehicles";
  let vehicleView = "list";
  let selectedVehicle = null;
  let isEditingVehicle = false;
  const sections = [
    { id: "vehicles", label: "Vehicles", icon: "🚛" },
    { id: "drivers", label: "Drivers", icon: "👨‍💼" },
    { id: "bowsers", label: "Bowsers", icon: "⛽" },
    { id: "activities", label: "Activities", icon: "⚙️" },
    { id: "fields", label: "Fields", icon: "🌾" },
    { id: "zones", label: "Zones", icon: "📍" }
  ];
  function handleVehicleSelect(vehicle) {
    selectedVehicle = vehicle;
    vehicleView = "detail";
  }
  function handleVehicleCreate() {
    selectedVehicle = null;
    isEditingVehicle = false;
    vehicleView = "form";
  }
  const each_array = ensure_array_like(sections);
  head($$payload, ($$payload2) => {
    $$payload2.title = `<title>Database - FarmTrack</title>`;
  });
  $$payload.out.push(`<div class="fleet-management svelte-4ybcic"><div class="container svelte-4ybcic"><div class="page-header svelte-4ybcic"><h1 class="svelte-4ybcic">Database Management</h1> <p class="subtitle svelte-4ybcic">Manage vehicles, drivers, bowsers, activities, fields, and zones</p></div> <div class="section-tabs svelte-4ybcic"><!--[-->`);
  for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
    let section = each_array[$$index];
    $$payload.out.push(`<button${attr_class("tab-btn svelte-4ybcic", void 0, { "active": section.id === selectedSection })}><span class="tab-icon svelte-4ybcic">${escape_html(section.icon)}</span> <span class="tab-label svelte-4ybcic">${escape_html(section.label)}</span></button>`);
  }
  $$payload.out.push(`<!--]--></div> <div class="section-content svelte-4ybcic">`);
  {
    $$payload.out.push("<!--[-->");
    if (vehicleView === "list") {
      $$payload.out.push("<!--[-->");
      VehicleList($$payload, { onselect: handleVehicleSelect, oncreate: handleVehicleCreate });
    } else {
      $$payload.out.push("<!--[!-->");
      if (vehicleView === "form") {
        $$payload.out.push("<!--[-->");
        VehicleForm($$payload, {
          vehicle: isEditingVehicle ? selectedVehicle : null
        });
      } else {
        $$payload.out.push("<!--[!-->");
        if (vehicleView === "detail" && selectedVehicle) {
          $$payload.out.push("<!--[-->");
          VehicleDetail($$payload, {
            vehicle: selectedVehicle
          });
        } else {
          $$payload.out.push("<!--[!-->");
        }
        $$payload.out.push(`<!--]-->`);
      }
      $$payload.out.push(`<!--]-->`);
    }
    $$payload.out.push(`<!--]-->`);
  }
  $$payload.out.push(`<!--]--></div></div></div>`);
  pop();
}
export {
  _page as default
};
