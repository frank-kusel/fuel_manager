import { z as push, M as ensure_array_like, K as attr, J as escape_html, N as maybe_selected, B as pop, F as head, G as attr_class } from "../../../chunks/index2.js";
import { B as Button } from "../../../chunks/Button.js";
import supabaseService from "../../../chunks/supabase.js";
function SystemSettings($$payload, $$props) {
  push();
  let { onclose = () => {
  } } = $$props;
  let saving = false;
  let error = "";
  let settings = {
    tankCapacity: 24e3,
    fuelPrice: 23.5,
    currency: "ZAR",
    timezone: "Africa/Johannesburg",
    reconciliationThresholds: {
      fuelVarianceLow: 50,
      fuelVarianceHigh: 200,
      tankVarianceLow: 1,
      tankVarianceHigh: 5
    },
    reportingDefaults: {
      defaultDateRange: "week",
      includeDetails: true,
      groupBy: "vehicle"
    },
    systemPreferences: {
      autoCleanupCache: true,
      cacheRetentionDays: 7,
      enableAuditLogging: true,
      showAdvancedFeatures: false
    }
  };
  let originalSettings = {};
  async function saveSettings() {
    saving = true;
    error = "";
    try {
      await supabaseService.init();
      await new Promise((resolve) => setTimeout(resolve, 1e3));
      originalSettings = JSON.parse(JSON.stringify(settings));
      onclose();
    } catch (err) {
      error = err instanceof Error ? err.message : "Failed to save settings";
    }
    saving = false;
  }
  function resetSettings() {
    settings = JSON.parse(JSON.stringify(originalSettings));
  }
  function restoreDefaults() {
    settings = {
      tankCapacity: 24e3,
      fuelPrice: 23.5,
      currency: "ZAR",
      timezone: "Africa/Johannesburg",
      reconciliationThresholds: {
        fuelVarianceLow: 50,
        fuelVarianceHigh: 200,
        tankVarianceLow: 1,
        tankVarianceHigh: 5
      },
      reportingDefaults: {
        defaultDateRange: "week",
        includeDetails: true,
        groupBy: "vehicle"
      },
      systemPreferences: {
        autoCleanupCache: true,
        cacheRetentionDays: 7,
        enableAuditLogging: true,
        showAdvancedFeatures: false
      }
    };
  }
  function formatCurrency(amount) {
    return new Intl.NumberFormat("en-ZA", { style: "currency", currency: settings.currency }).format(amount);
  }
  const hasChanges = () => {
    return JSON.stringify(settings) !== JSON.stringify(originalSettings);
  };
  const currencyOptions = [
    { value: "ZAR", label: "South African Rand (ZAR)" },
    { value: "USD", label: "US Dollar (USD)" },
    { value: "EUR", label: "Euro (EUR)" },
    { value: "GBP", label: "British Pound (GBP)" }
  ];
  const timezoneOptions = [
    { value: "Africa/Johannesburg", label: "South Africa (SAST)" },
    { value: "UTC", label: "UTC" },
    { value: "America/New_York", label: "Eastern Time (ET)" },
    { value: "Europe/London", label: "London (GMT)" }
  ];
  const dateRangeOptions = [
    { value: "today", label: "Today" },
    { value: "week", label: "Last 7 Days" },
    { value: "thisWeek", label: "This Week" },
    { value: "month", label: "This Month" }
  ];
  const groupByOptions = [
    { value: "vehicle", label: "By Vehicle" },
    { value: "driver", label: "By Driver" },
    { value: "date", label: "By Date" },
    { value: "activity", label: "By Activity" }
  ];
  $$payload.out.push(`<div class="settings-overlay svelte-r9ts0e"><div class="settings-modal svelte-r9ts0e"><div class="modal-header svelte-r9ts0e"><div class="header-content svelte-r9ts0e"><h2 class="svelte-r9ts0e">System Settings</h2> <p class="svelte-r9ts0e">Configure operational parameters and system preferences</p></div> <div class="header-actions svelte-r9ts0e">`);
  Button($$payload, {
    variant: "outline",
    size: "sm",
    onclick: resetSettings,
    disabled: !hasChanges(),
    children: ($$payload2) => {
      $$payload2.out.push(`<!---->Reset`);
    }
  });
  $$payload.out.push(`<!----> `);
  Button($$payload, {
    variant: "outline",
    size: "sm",
    onclick: restoreDefaults,
    children: ($$payload2) => {
      $$payload2.out.push(`<!---->Defaults`);
    }
  });
  $$payload.out.push(`<!----> `);
  Button($$payload, {
    variant: "outline",
    size: "sm",
    onclick: onclose,
    children: ($$payload2) => {
      $$payload2.out.push(`<!---->Close`);
    }
  });
  $$payload.out.push(`<!----></div></div> `);
  if (error) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="error-message svelte-r9ts0e"><span class="error-icon">⚠️</span> <span>${escape_html(error)}</span></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> `);
  {
    $$payload.out.push("<!--[!-->");
    const each_array = ensure_array_like(currencyOptions);
    const each_array_1 = ensure_array_like(timezoneOptions);
    const each_array_2 = ensure_array_like(dateRangeOptions);
    const each_array_3 = ensure_array_like(groupByOptions);
    $$payload.out.push(`<div class="settings-content svelte-r9ts0e"><div class="settings-sections svelte-r9ts0e"><section class="settings-section svelte-r9ts0e"><h3 class="svelte-r9ts0e">Tank &amp; Fuel Configuration</h3> <div class="setting-group svelte-r9ts0e"><label for="tank-capacity" class="svelte-r9ts0e">Tank Capacity (Liters)</label> <input id="tank-capacity" type="number" step="1" min="1000" max="100000"${attr("value", settings.tankCapacity)} class="setting-input svelte-r9ts0e"/> <span class="setting-help svelte-r9ts0e">Total capacity of your main fuel tank</span></div> <div class="setting-group svelte-r9ts0e"><label for="fuel-price" class="svelte-r9ts0e">Current Fuel Price</label> <div class="input-with-currency svelte-r9ts0e"><input id="fuel-price" type="number" step="0.01" min="0"${attr("value", settings.fuelPrice)} class="setting-input svelte-r9ts0e"/> <span class="currency-display svelte-r9ts0e">${escape_html(settings.currency)}</span></div> <span class="setting-help svelte-r9ts0e">Price per liter for cost calculations</span></div> <div class="setting-group svelte-r9ts0e"><label for="currency" class="svelte-r9ts0e">Currency</label> <select id="currency" class="setting-select svelte-r9ts0e">`);
    $$payload.select_value = settings.currency;
    $$payload.out.push(`<!--[-->`);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let option = each_array[$$index];
      $$payload.out.push(`<option${attr("value", option.value)}${maybe_selected($$payload, option.value)}>${escape_html(option.label)}</option>`);
    }
    $$payload.out.push(`<!--]-->`);
    $$payload.select_value = void 0;
    $$payload.out.push(`</select></div> <div class="setting-group svelte-r9ts0e"><label for="timezone" class="svelte-r9ts0e">Timezone</label> <select id="timezone" class="setting-select svelte-r9ts0e">`);
    $$payload.select_value = settings.timezone;
    $$payload.out.push(`<!--[-->`);
    for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
      let option = each_array_1[$$index_1];
      $$payload.out.push(`<option${attr("value", option.value)}${maybe_selected($$payload, option.value)}>${escape_html(option.label)}</option>`);
    }
    $$payload.out.push(`<!--]-->`);
    $$payload.select_value = void 0;
    $$payload.out.push(`</select></div></section> <section class="settings-section svelte-r9ts0e"><h3 class="svelte-r9ts0e">Reconciliation Thresholds</h3> <p class="section-description svelte-r9ts0e">Configure variance thresholds for confidence scoring</p> <div class="threshold-grid svelte-r9ts0e"><div class="setting-group svelte-r9ts0e"><label for="fuel-var-low" class="svelte-r9ts0e">Fuel Variance - Low Threshold (L)</label> <input id="fuel-var-low" type="number" step="1" min="0"${attr("value", settings.reconciliationThresholds.fuelVarianceLow)} class="setting-input svelte-r9ts0e"/> <span class="setting-help svelte-r9ts0e">Green indicator below this value</span></div> <div class="setting-group svelte-r9ts0e"><label for="fuel-var-high" class="svelte-r9ts0e">Fuel Variance - High Threshold (L)</label> <input id="fuel-var-high" type="number" step="1" min="0"${attr("value", settings.reconciliationThresholds.fuelVarianceHigh)} class="setting-input svelte-r9ts0e"/> <span class="setting-help svelte-r9ts0e">Red indicator above this value</span></div> <div class="setting-group svelte-r9ts0e"><label for="tank-var-low" class="svelte-r9ts0e">Tank Variance - Low Threshold (%)</label> <input id="tank-var-low" type="number" step="0.1" min="0" max="100"${attr("value", settings.reconciliationThresholds.tankVarianceLow)} class="setting-input svelte-r9ts0e"/> <span class="setting-help svelte-r9ts0e">Green indicator below this percentage</span></div> <div class="setting-group svelte-r9ts0e"><label for="tank-var-high" class="svelte-r9ts0e">Tank Variance - High Threshold (%)</label> <input id="tank-var-high" type="number" step="0.1" min="0" max="100"${attr("value", settings.reconciliationThresholds.tankVarianceHigh)} class="setting-input svelte-r9ts0e"/> <span class="setting-help svelte-r9ts0e">Red indicator above this percentage</span></div></div></section> <section class="settings-section svelte-r9ts0e"><h3 class="svelte-r9ts0e">Reporting Defaults</h3> <p class="section-description svelte-r9ts0e">Default settings for reports and reconciliations</p> <div class="setting-group svelte-r9ts0e"><label for="default-range" class="svelte-r9ts0e">Default Date Range</label> <select id="default-range" class="setting-select svelte-r9ts0e">`);
    $$payload.select_value = settings.reportingDefaults.defaultDateRange;
    $$payload.out.push(`<!--[-->`);
    for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
      let option = each_array_2[$$index_2];
      $$payload.out.push(`<option${attr("value", option.value)}${maybe_selected($$payload, option.value)}>${escape_html(option.label)}</option>`);
    }
    $$payload.out.push(`<!--]-->`);
    $$payload.select_value = void 0;
    $$payload.out.push(`</select></div> <div class="setting-group svelte-r9ts0e"><label for="default-group" class="svelte-r9ts0e">Default Group By</label> <select id="default-group" class="setting-select svelte-r9ts0e">`);
    $$payload.select_value = settings.reportingDefaults.groupBy;
    $$payload.out.push(`<!--[-->`);
    for (let $$index_3 = 0, $$length = each_array_3.length; $$index_3 < $$length; $$index_3++) {
      let option = each_array_3[$$index_3];
      $$payload.out.push(`<option${attr("value", option.value)}${maybe_selected($$payload, option.value)}>${escape_html(option.label)}</option>`);
    }
    $$payload.out.push(`<!--]-->`);
    $$payload.select_value = void 0;
    $$payload.out.push(`</select></div> <div class="setting-group checkbox-group svelte-r9ts0e"><label for="include-details" class="svelte-r9ts0e"><input id="include-details" type="checkbox"${attr("checked", settings.reportingDefaults.includeDetails, true)} class="svelte-r9ts0e"/> Include detailed breakdowns by default</label></div></section> <section class="settings-section svelte-r9ts0e"><h3 class="svelte-r9ts0e">System Preferences</h3> <p class="section-description svelte-r9ts0e">Advanced system behavior and performance settings</p> <div class="setting-group checkbox-group svelte-r9ts0e"><label for="auto-cleanup" class="svelte-r9ts0e"><input id="auto-cleanup" type="checkbox"${attr("checked", settings.systemPreferences.autoCleanupCache, true)} class="svelte-r9ts0e"/> Automatically cleanup old cache data</label></div> <div class="setting-group svelte-r9ts0e"><label for="cache-retention" class="svelte-r9ts0e">Cache Retention (Days)</label> <input id="cache-retention" type="number" step="1" min="1" max="30"${attr("value", settings.systemPreferences.cacheRetentionDays)} class="setting-input svelte-r9ts0e"${attr("disabled", !settings.systemPreferences.autoCleanupCache, true)}/> <span class="setting-help svelte-r9ts0e">How long to keep cached data before cleanup</span></div> <div class="setting-group checkbox-group svelte-r9ts0e"><label for="audit-logging" class="svelte-r9ts0e"><input id="audit-logging" type="checkbox"${attr("checked", settings.systemPreferences.enableAuditLogging, true)} class="svelte-r9ts0e"/> Enable audit logging for data changes</label></div> <div class="setting-group checkbox-group svelte-r9ts0e"><label for="advanced-features" class="svelte-r9ts0e"><input id="advanced-features" type="checkbox"${attr("checked", settings.systemPreferences.showAdvancedFeatures, true)} class="svelte-r9ts0e"/> Show advanced features and options</label></div></section></div> <div class="settings-summary svelte-r9ts0e"><h4 class="svelte-r9ts0e">Configuration Summary</h4> <div class="summary-grid svelte-r9ts0e"><div class="summary-item svelte-r9ts0e"><span class="summary-label svelte-r9ts0e">Tank Capacity:</span> <span class="summary-value svelte-r9ts0e">${escape_html(settings.tankCapacity.toLocaleString())}L</span></div> <div class="summary-item svelte-r9ts0e"><span class="summary-label svelte-r9ts0e">Fuel Price:</span> <span class="summary-value svelte-r9ts0e">${escape_html(formatCurrency(settings.fuelPrice))}/L</span></div> <div class="summary-item svelte-r9ts0e"><span class="summary-label svelte-r9ts0e">Fuel Thresholds:</span> <span class="summary-value svelte-r9ts0e">${escape_html(settings.reconciliationThresholds.fuelVarianceLow)}L - ${escape_html(settings.reconciliationThresholds.fuelVarianceHigh)}L</span></div> <div class="summary-item svelte-r9ts0e"><span class="summary-label svelte-r9ts0e">Tank Thresholds:</span> <span class="summary-value svelte-r9ts0e">${escape_html(settings.reconciliationThresholds.tankVarianceLow)}% - ${escape_html(settings.reconciliationThresholds.tankVarianceHigh)}%</span></div></div> `);
    if (hasChanges()) {
      $$payload.out.push("<!--[-->");
      $$payload.out.push(`<div class="unsaved-warning svelte-r9ts0e"><span class="warning-icon">⚠️</span> <span>You have unsaved changes</span></div>`);
    } else {
      $$payload.out.push("<!--[!-->");
    }
    $$payload.out.push(`<!--]--></div></div> <div class="modal-footer svelte-r9ts0e">`);
    Button($$payload, {
      variant: "outline",
      onclick: onclose,
      children: ($$payload2) => {
        $$payload2.out.push(`<!---->Cancel`);
      }
    });
    $$payload.out.push(`<!----> `);
    Button($$payload, {
      variant: "primary",
      onclick: saveSettings,
      disabled: saving || !hasChanges(),
      children: ($$payload2) => {
        $$payload2.out.push(`<!---->${escape_html(saving ? "Saving..." : "Save Settings")}`);
      }
    });
    $$payload.out.push(`<!----></div>`);
  }
  $$payload.out.push(`<!--]--></div></div>`);
  pop();
}
function _page($$payload) {
  let showSettings = false;
  const tools = [
    {
      title: "Reconciliations",
      description: "Fuel usage and tank level reconciliation with flexible date ranges",
      href: "/tools/reconciliations"
    },
    {
      title: "Database Management",
      description: "Comprehensive CRUD management for vehicles, drivers, bowsers, activities, fields, and zones",
      href: "/tools/database"
    },
    {
      title: "System Settings",
      description: "Configure operational parameters, thresholds, and system preferences",
      onclick: () => showSettings = true
    },
    {
      title: "Advanced Reports",
      description: "Generate detailed analytics and custom reporting views",
      href: "/tools/reports",
      disabled: true
    }
  ];
  const each_array = ensure_array_like(tools);
  head($$payload, ($$payload2) => {
    $$payload2.title = `<title>Tools - FarmTrack</title>`;
  });
  $$payload.out.push(`<div class="tools-container svelte-171l7w4"><div class="header svelte-171l7w4"><h1 class="svelte-171l7w4">Tools</h1> <p class="svelte-171l7w4">Administrative tools and system management</p></div> <div class="tools-grid svelte-171l7w4"><!--[-->`);
  for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
    let tool = each_array[$$index];
    if (tool.onclick) {
      $$payload.out.push("<!--[-->");
      $$payload.out.push(`<button class="tool-card tool-button svelte-171l7w4"><div class="tool-content svelte-171l7w4"><h3 class="tool-title svelte-171l7w4">${escape_html(tool.title)}</h3> <p class="tool-description svelte-171l7w4">${escape_html(tool.description)}</p></div></button>`);
    } else {
      $$payload.out.push("<!--[!-->");
      $$payload.out.push(`<a${attr("href", tool.href)}${attr_class("tool-card svelte-171l7w4", void 0, { "disabled": tool.disabled })}${attr("aria-disabled", tool.disabled)}><div class="tool-content svelte-171l7w4"><h3 class="tool-title svelte-171l7w4">${escape_html(tool.title)}</h3> <p class="tool-description svelte-171l7w4">${escape_html(tool.description)}</p></div> `);
      if (tool.disabled) {
        $$payload.out.push("<!--[-->");
        $$payload.out.push(`<div class="coming-soon svelte-171l7w4">Coming Soon</div>`);
      } else {
        $$payload.out.push("<!--[!-->");
      }
      $$payload.out.push(`<!--]--></a>`);
    }
    $$payload.out.push(`<!--]-->`);
  }
  $$payload.out.push(`<!--]--></div> `);
  if (showSettings) {
    $$payload.out.push("<!--[-->");
    SystemSettings($$payload, { onclose: () => showSettings = false });
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--></div>`);
}
export {
  _page as default
};
