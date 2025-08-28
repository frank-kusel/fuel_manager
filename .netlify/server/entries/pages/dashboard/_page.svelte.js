import { M as current_component, J as escape_html, G as attr_class, N as attr_style, O as stringify, B as pop, z as push, P as ensure_array_like, F as head, E as store_get, I as unsubscribe_stores } from "../../../chunks/index2.js";
/* empty css                                                 */
import { B as Button } from "../../../chunks/Button.js";
import "clsx";
import { d as derived, w as writable } from "../../../chunks/index.js";
function onDestroy(fn) {
  var context = (
    /** @type {Component} */
    current_component
  );
  (context.d ??= []).push(fn);
}
function DashboardStats($$payload, $$props) {
  push();
  let { stats, loading = false } = $$props;
  function formatNumber(num) {
    return new Intl.NumberFormat("en-ZA").format(num);
  }
  function formatDecimal(num, decimals = 1) {
    return num.toFixed(decimals);
  }
  function getTankLevelClass(percentage) {
    if (percentage > 75) return "high";
    if (percentage > 25) return "medium";
    return "low";
  }
  $$payload.out.push(`<div class="dashboard-overview svelte-10z1854"><div class="primary-metrics svelte-10z1854"><div class="metric-card primary svelte-10z1854"><div class="metric-content svelte-10z1854"><div class="metric-label svelte-10z1854">Today's Fuel</div> `);
  if (loading) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="metric-skeleton svelte-10z1854"></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<div class="metric-value svelte-10z1854">${escape_html(formatDecimal(stats?.dailyFuel || 0))}<span class="unit svelte-10z1854">L</span></div>`);
  }
  $$payload.out.push(`<!--]--></div></div> <div class="metric-card tank-status svelte-10z1854"><div class="metric-content svelte-10z1854"><div class="metric-label svelte-10z1854">Fuel Tank</div> `);
  if (loading) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="metric-skeleton svelte-10z1854"></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<div class="metric-value svelte-10z1854">${escape_html(formatNumber(stats?.tankLevel || 0))}<span class="unit svelte-10z1854">L</span></div> <div class="tank-visual svelte-10z1854"><div${attr_class(`tank-indicator ${stringify(getTankLevelClass(stats?.tankPercentage || 0))}`, "svelte-10z1854")}><div class="tank-level svelte-10z1854"${attr_style(`height: ${stringify(Math.min(stats?.tankPercentage || 0, 100))}%`)}></div></div> <div class="tank-info svelte-10z1854">${escape_html(formatDecimal(stats?.tankPercentage || 0))}%</div></div>`);
  }
  $$payload.out.push(`<!--]--></div></div></div> <div class="secondary-metrics svelte-10z1854"><div class="metric-card compact svelte-10z1854"><div class="compact-header svelte-10z1854">This Week</div> `);
  if (loading) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="compact-skeleton svelte-10z1854"></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<div class="compact-value svelte-10z1854">${escape_html(formatDecimal(stats?.weeklyFuel || 0))}L</div> <div class="compact-subtitle svelte-10z1854">${escape_html(stats?.entriesThisWeek || 0)} entries</div>`);
  }
  $$payload.out.push(`<!--]--></div> <div class="metric-card compact svelte-10z1854"><div class="compact-header svelte-10z1854">This Month</div> `);
  if (loading) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="compact-skeleton svelte-10z1854"></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<div class="compact-value svelte-10z1854">${escape_html(formatDecimal(stats?.monthlyFuel || 0))}L</div> <div class="compact-subtitle svelte-10z1854">${escape_html(formatNumber(stats?.monthlyDistance || 0))} km</div>`);
  }
  $$payload.out.push(`<!--]--></div> <div class="metric-card compact svelte-10z1854"><div class="compact-header svelte-10z1854">Fleet Average</div> `);
  if (loading) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="compact-skeleton svelte-10z1854"></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<div class="compact-value svelte-10z1854">${escape_html(formatDecimal(stats?.averageEfficiency || 0))}</div> <div class="compact-subtitle svelte-10z1854">L/100km</div>`);
  }
  $$payload.out.push(`<!--]--></div> <div class="metric-card compact svelte-10z1854"><div class="compact-header svelte-10z1854">Bowser Reading</div> `);
  if (loading) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="compact-skeleton svelte-10z1854"></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<div class="compact-value svelte-10z1854">${escape_html(formatDecimal(stats?.bowserReading || 0))}</div> <div class="compact-subtitle svelte-10z1854">litres</div>`);
  }
  $$payload.out.push(`<!--]--></div></div></div>`);
  pop();
}
function RecentActivity($$payload, $$props) {
  push();
  let { entries, loading = false } = $$props;
  function groupEntriesByDate(entries2) {
    const groups = {};
    entries2.forEach((entry) => {
      const date = new Date(entry.entry_date);
      const dateKey = formatDateGroup(date);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(entry);
    });
    return groups;
  }
  function formatDateGroup(date) {
    const today = /* @__PURE__ */ new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const diffTime = today.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1e3 * 60 * 60 * 24));
    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return date.toLocaleDateString("en-ZA", { weekday: "long" });
    } else if (diffDays < 14) {
      return "Last Week";
    } else if (diffDays < 21) {
      return "2 Weeks Ago";
    } else if (diffDays < 28) {
      return "3 Weeks Ago";
    } else {
      return date.toLocaleDateString("en-ZA", { month: "short", day: "numeric" });
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
  const groupedEntries = groupEntriesByDate(entries);
  const dateGroups = Object.keys(groupedEntries);
  $$payload.out.push(`<div class="fuel-activity svelte-rf411x"><div class="activity-header svelte-rf411x"><h3 class="svelte-rf411x">Recent Fuel Activity</h3> `);
  Button($$payload, {
    variant: "outline",
    size: "sm",
    href: "/fuel/summary",
    children: ($$payload2) => {
      $$payload2.out.push(`<!---->View All`);
    }
  });
  $$payload.out.push(`<!----></div> `);
  if (loading) {
    $$payload.out.push("<!--[-->");
    const each_array = ensure_array_like(Array(6));
    $$payload.out.push(`<div class="loading-grid svelte-rf411x"><!--[-->`);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      each_array[$$index];
      $$payload.out.push(`<div class="entry-skeleton svelte-rf411x"><div class="skeleton-header svelte-rf411x"></div> <div class="skeleton-content svelte-rf411x"><div class="skeleton-bar svelte-rf411x"></div> <div class="skeleton-text svelte-rf411x"></div></div></div>`);
    }
    $$payload.out.push(`<!--]--></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
    if (entries.length === 0) {
      $$payload.out.push("<!--[-->");
      $$payload.out.push(`<div class="empty-state svelte-rf411x"><div class="empty-visual svelte-rf411x"><div class="fuel-drop svelte-rf411x"></div></div> <h4 class="svelte-rf411x">No recent activity</h4> <p class="svelte-rf411x">Fuel entries will appear here once vehicles start logging usage</p></div>`);
    } else {
      $$payload.out.push("<!--[!-->");
      const each_array_1 = ensure_array_like(dateGroups);
      $$payload.out.push(`<div class="entries-container svelte-rf411x"><!--[-->`);
      for (let $$index_2 = 0, $$length = each_array_1.length; $$index_2 < $$length; $$index_2++) {
        let dateGroup = each_array_1[$$index_2];
        const each_array_2 = ensure_array_like(groupedEntries[dateGroup]);
        $$payload.out.push(`<div class="date-section svelte-rf411x"><div class="date-header svelte-rf411x"><span class="date-badge svelte-rf411x">${escape_html(dateGroup)}</span></div> <div class="entries-grid svelte-rf411x"><!--[-->`);
        for (let $$index_1 = 0, $$length2 = each_array_2.length; $$index_1 < $$length2; $$index_1++) {
          let entry = each_array_2[$$index_1];
          $$payload.out.push(`<div class="entry-card svelte-rf411x"><div class="entry-header svelte-rf411x"><div class="vehicle-badge svelte-rf411x">${escape_html(entry.vehicles?.code || "N/A")}</div> <div class="fuel-amount svelte-rf411x">${escape_html(Math.round((entry.litres_dispensed || 0) * 10) / 10)}<span class="fuel-unit svelte-rf411x">L</span></div></div> <div class="entry-details svelte-rf411x"><div class="detail-row svelte-rf411x"><span class="detail-label svelte-rf411x">Vehicle</span> <span class="detail-value svelte-rf411x">${escape_html(entry.vehicles?.name || "-")}</span></div> <div class="detail-row svelte-rf411x"><span class="detail-label svelte-rf411x">Field</span> <span class="detail-value svelte-rf411x">${escape_html(entry.fields?.code || "-")}</span></div> <div class="detail-row svelte-rf411x"><span class="detail-label svelte-rf411x">Usage</span> <span class="detail-value usage-highlight svelte-rf411x">${escape_html(getUsage(entry))}</span></div></div></div>`);
        }
        $$payload.out.push(`<!--]--></div></div>`);
      }
      $$payload.out.push(`<!--]--></div>`);
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
  $$payload.out.push(`<div class="tank-management svelte-1l7f49i"><div class="section-header svelte-1l7f49i"><h2 class="svelte-1l7f49i">Tank Management</h2> <div class="actions svelte-1l7f49i"><button class="action-btn svelte-1l7f49i">📏 Dipstick</button> <button class="action-btn svelte-1l7f49i">🚚 Refill</button></div></div> `);
  {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="loading svelte-1l7f49i">Loading tank data...</div>`);
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
  onDestroy(() => {
  });
  async function handleRefresh() {
    await dashboardStore.loadDashboardData();
  }
  head($$payload, ($$payload2) => {
    $$payload2.title = `<title>Dashboard - FarmTrack</title>`;
    $$payload2.out.push(`<meta name="description" content="FarmTrack dashboard with fuel consumption analytics, vehicle performance metrics, and tank monitoring"/>`);
  });
  $$payload.out.push(`<div class="dashboard-page svelte-17lz8u9"><div class="dashboard-header svelte-17lz8u9"><div class="header-content svelte-17lz8u9"><h1 class="svelte-17lz8u9">Dashboard</h1></div></div> `);
  if (store_get($$store_subs ??= {}, "$dashboardError", dashboardError)) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="error-banner svelte-17lz8u9"><div class="error-content svelte-17lz8u9"><span class="error-icon svelte-17lz8u9">⚠️</span> <div class="svelte-17lz8u9"><p class="svelte-17lz8u9">Failed to load dashboard data</p> <small class="svelte-17lz8u9">${escape_html(store_get($$store_subs ??= {}, "$dashboardError", dashboardError))}</small></div> `);
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
  $$payload.out.push(`<!----> <div class="dashboard-content svelte-17lz8u9"><div class="dashboard-section activity-section svelte-17lz8u9">`);
  RecentActivity($$payload, {
    entries: store_get($$store_subs ??= {}, "$dashboardStats", dashboardStats)?.recentEntries || [],
    loading: store_get($$store_subs ??= {}, "$dashboardLoading", dashboardLoading) === "loading"
  });
  $$payload.out.push(`<!----></div></div> `);
  TankManagement($$payload);
  $$payload.out.push(`<!----></div>`);
  if ($$store_subs) unsubscribe_stores($$store_subs);
  pop();
}
export {
  _page as default
};
