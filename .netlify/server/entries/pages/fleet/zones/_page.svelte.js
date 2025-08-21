import { B as pop, z as push, J as escape_html, K as attr, S as maybe_selected, N as attr_style, O as stringify, P as ensure_array_like } from "../../../../chunks/index2.js";
import { C as Card } from "../../../../chunks/Card.js";
import { B as Button } from "../../../../chunks/Button.js";
import supabaseService from "../../../../chunks/supabase.js";
function _page($$payload, $$props) {
  push();
  let zones = [];
  let loading = true;
  let error = null;
  let editingZone = null;
  let showAddForm = false;
  let formData = {
    code: "",
    name: "",
    description: "",
    zone_type: "general",
    color: "#95A5A6",
    display_order: 0
  };
  async function loadZones() {
    try {
      loading = true;
      await supabaseService.init();
      const result = await supabaseService.getZones();
      if (result.error) {
        throw new Error(result.error);
      }
      zones = result.data || [];
    } catch (err) {
      error = err instanceof Error ? err.message : "Failed to load zones";
    } finally {
      loading = false;
    }
  }
  function startEdit(zone) {
    editingZone = zone;
    formData = {
      code: zone.code,
      name: zone.name,
      description: zone.description || "",
      zone_type: zone.zone_type || "general",
      color: zone.color || "#95A5A6",
      display_order: zone.display_order || 0
    };
    showAddForm = false;
  }
  function startAdd() {
    showAddForm = true;
    editingZone = null;
    formData = {
      code: "",
      name: "",
      description: "",
      zone_type: "general",
      color: "#95A5A6",
      display_order: zones.length
    };
  }
  function cancelEdit() {
    editingZone = null;
    showAddForm = false;
  }
  async function saveZone() {
    try {
      if (editingZone) {
        const result = await supabaseService.updateZone(editingZone.id, formData);
        if (result.error) throw new Error(result.error);
      } else {
        const result = await supabaseService.createZone(formData);
        if (result.error) throw new Error(result.error);
      }
      await loadZones();
      cancelEdit();
    } catch (err) {
      error = err instanceof Error ? err.message : "Failed to save zone";
    }
  }
  async function deleteZone(zone) {
    if (!confirm(`Are you sure you want to delete zone "${zone.name}"?`)) return;
    try {
      const result = await supabaseService.deleteZone(zone.id);
      if (result.error) throw new Error(result.error);
      await loadZones();
    } catch (err) {
      error = err instanceof Error ? err.message : "Failed to delete zone";
    }
  }
  function getZoneTypeLabel(type) {
    const labels = {
      "farm_section": "Farm Section",
      "infrastructure": "Infrastructure",
      "transport": "Transport",
      "maintenance": "Maintenance",
      "general": "General"
    };
    return labels[type || "general"] || "General";
  }
  $$payload.out.push(`<div class="zones-page svelte-1b1qym6"><div class="page-header svelte-1b1qym6"><h1 class="svelte-1b1qym6">Zone Management</h1> <p class="svelte-1b1qym6">Manage location zones for operations that don't occur in specific fields</p></div> `);
  if (error) {
    $$payload.out.push("<!--[-->");
    Card($$payload, {
      class: "error-message",
      children: ($$payload2) => {
        $$payload2.out.push(`<div class="error-content svelte-1b1qym6"><span class="error-icon svelte-1b1qym6">⚠️</span> <p>${escape_html(error)}</p></div>`);
      }
    });
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> <div class="zones-header svelte-1b1qym6">`);
  Button($$payload, {
    variant: "outline",
    onclick: () => window.open("/fleet/zones/print", "_blank"),
    children: ($$payload2) => {
      $$payload2.out.push(`<span class="btn-icon svelte-1b1qym6">🖨️</span> Print Zone Map`);
    }
  });
  $$payload.out.push(`<!----> `);
  Button($$payload, {
    onclick: startAdd,
    disabled: showAddForm,
    children: ($$payload2) => {
      $$payload2.out.push(`<span class="btn-icon svelte-1b1qym6">➕</span> Add New Zone`);
    }
  });
  $$payload.out.push(`<!----></div> `);
  if (showAddForm || editingZone) {
    $$payload.out.push("<!--[-->");
    Card($$payload, {
      class: "zone-form",
      children: ($$payload2) => {
        $$payload2.out.push(`<h3>${escape_html(editingZone ? "Edit Zone" : "Add New Zone")}</h3> <div class="form-grid svelte-1b1qym6"><div class="form-group svelte-1b1qym6"><label for="code" class="svelte-1b1qym6">Code *</label> <input id="code" type="text"${attr("value", formData.code)} placeholder="e.g., Z-A1" required class="svelte-1b1qym6"/></div> <div class="form-group svelte-1b1qym6"><label for="name" class="svelte-1b1qym6">Name *</label> <input id="name" type="text"${attr("value", formData.name)} placeholder="e.g., Zone A1 - North Section" required class="svelte-1b1qym6"/></div> <div class="form-group svelte-1b1qym6"><label for="type" class="svelte-1b1qym6">Zone Type</label> <select id="type" class="svelte-1b1qym6">`);
        $$payload2.select_value = formData.zone_type;
        $$payload2.out.push(`<option value="farm_section"${maybe_selected($$payload2, "farm_section")}>Farm Section</option><option value="infrastructure"${maybe_selected($$payload2, "infrastructure")}>Infrastructure</option><option value="transport"${maybe_selected($$payload2, "transport")}>Transport</option><option value="maintenance"${maybe_selected($$payload2, "maintenance")}>Maintenance</option><option value="general"${maybe_selected($$payload2, "general")}>General</option>`);
        $$payload2.select_value = void 0;
        $$payload2.out.push(`</select></div> <div class="form-group svelte-1b1qym6"><label for="color" class="svelte-1b1qym6">Color</label> <div class="color-input svelte-1b1qym6"><input id="color" type="color"${attr("value", formData.color)} class="svelte-1b1qym6"/> <span class="color-preview svelte-1b1qym6"${attr_style(`background-color: ${stringify(formData.color)}`)}></span></div></div> <div class="form-group full-width svelte-1b1qym6"><label for="description" class="svelte-1b1qym6">Description</label> <textarea id="description" placeholder="Describe this zone's location and purpose" rows="3" class="svelte-1b1qym6">`);
        const $$body = escape_html(formData.description);
        if ($$body) {
          $$payload2.out.push(`${$$body}`);
        }
        $$payload2.out.push(`</textarea></div></div> <div class="form-actions svelte-1b1qym6">`);
        Button($$payload2, {
          variant: "outline",
          onclick: cancelEdit,
          children: ($$payload3) => {
            $$payload3.out.push(`<!---->Cancel`);
          }
        });
        $$payload2.out.push(`<!----> `);
        Button($$payload2, {
          onclick: saveZone,
          children: ($$payload3) => {
            $$payload3.out.push(`<!---->${escape_html(editingZone ? "Update Zone" : "Create Zone")}`);
          }
        });
        $$payload2.out.push(`<!----></div>`);
      }
    });
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> `);
  if (loading) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="loading-state svelte-1b1qym6"><div class="spinner svelte-1b1qym6"></div> <p>Loading zones...</p></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
    if (zones.length === 0) {
      $$payload.out.push("<!--[-->");
      Card($$payload, {
        class: "empty-state",
        children: ($$payload2) => {
          $$payload2.out.push(`<div class="empty-icon svelte-1b1qym6">📍</div> <h3>No Zones Yet</h3> <p>Create your first zone to track non-field locations</p>`);
        }
      });
    } else {
      $$payload.out.push("<!--[!-->");
      const each_array = ensure_array_like(zones);
      $$payload.out.push(`<div class="zones-grid svelte-1b1qym6"><!--[-->`);
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let zone = each_array[$$index];
        Card($$payload, {
          class: "zone-card",
          children: ($$payload2) => {
            $$payload2.out.push(`<div class="zone-header svelte-1b1qym6"><div class="zone-badge svelte-1b1qym6"${attr_style(`background-color: ${stringify(zone.color || "#95A5A6")}`)}>${escape_html(zone.code)}</div> <div class="zone-type svelte-1b1qym6">${escape_html(getZoneTypeLabel(zone.zone_type))}</div></div> <h3>${escape_html(zone.name)}</h3> `);
            if (zone.description) {
              $$payload2.out.push("<!--[-->");
              $$payload2.out.push(`<p class="zone-description svelte-1b1qym6">${escape_html(zone.description)}</p>`);
            } else {
              $$payload2.out.push("<!--[!-->");
            }
            $$payload2.out.push(`<!--]--> <div class="zone-actions svelte-1b1qym6">`);
            Button($$payload2, {
              size: "sm",
              variant: "outline",
              onclick: () => startEdit(zone),
              children: ($$payload3) => {
                $$payload3.out.push(`<!---->Edit`);
              }
            });
            $$payload2.out.push(`<!----> `);
            Button($$payload2, {
              size: "sm",
              variant: "outline",
              onclick: () => deleteZone(zone),
              children: ($$payload3) => {
                $$payload3.out.push(`<!---->Delete`);
              }
            });
            $$payload2.out.push(`<!----></div>`);
          }
        });
      }
      $$payload.out.push(`<!--]--></div>`);
    }
    $$payload.out.push(`<!--]-->`);
  }
  $$payload.out.push(`<!--]--></div>`);
  pop();
}
export {
  _page as default
};
