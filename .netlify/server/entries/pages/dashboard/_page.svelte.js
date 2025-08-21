import { M as current_component, J as escape_html, G as attr_class, N as attr_style, O as stringify, B as pop, z as push, P as ensure_array_like, F as head, E as store_get, I as unsubscribe_stores } from "../../../chunks/index2.js";
import { C as Card } from "../../../chunks/Card.js";
import { B as Button } from "../../../chunks/Button.js";
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
  $$payload.out.push(`<div class="dashboard-stats svelte-1ptmk1e"><div class="stats-grid svelte-1ptmk1e">`);
  Card($$payload, {
    class: "stat-card fuel-daily",
    children: ($$payload2) => {
      $$payload2.out.push(`<div class="stat-content svelte-1ptmk1e"><div class="stat-icon svelte-1ptmk1e">⛽</div> <div class="stat-info svelte-1ptmk1e"><h3 class="svelte-1ptmk1e">Today's Fuel</h3> `);
      if (loading) {
        $$payload2.out.push("<!--[-->");
        $$payload2.out.push(`<div class="loading-skeleton svelte-1ptmk1e"></div>`);
      } else {
        $$payload2.out.push("<!--[!-->");
        $$payload2.out.push(`<div class="stat-value svelte-1ptmk1e">${escape_html(formatDecimal(stats?.dailyFuel || 0))}L</div>`);
      }
      $$payload2.out.push(`<!--]--></div></div>`);
    }
  });
  $$payload.out.push(`<!----> `);
  Card($$payload, {
    class: "stat-card fuel-weekly",
    children: ($$payload2) => {
      $$payload2.out.push(`<div class="stat-content svelte-1ptmk1e"><div class="stat-icon svelte-1ptmk1e">📊</div> <div class="stat-info svelte-1ptmk1e"><h3 class="svelte-1ptmk1e">This Week</h3> `);
      if (loading) {
        $$payload2.out.push("<!--[-->");
        $$payload2.out.push(`<div class="loading-skeleton svelte-1ptmk1e"></div>`);
      } else {
        $$payload2.out.push("<!--[!-->");
        $$payload2.out.push(`<div class="stat-value svelte-1ptmk1e">${escape_html(formatDecimal(stats?.weeklyFuel || 0))}L</div>`);
      }
      $$payload2.out.push(`<!--]--></div></div>`);
    }
  });
  $$payload.out.push(`<!----> `);
  Card($$payload, {
    class: "stat-card fuel-monthly",
    children: ($$payload2) => {
      $$payload2.out.push(`<div class="stat-content svelte-1ptmk1e"><div class="stat-icon svelte-1ptmk1e">📈</div> <div class="stat-info svelte-1ptmk1e"><h3 class="svelte-1ptmk1e">This Month</h3> `);
      if (loading) {
        $$payload2.out.push("<!--[-->");
        $$payload2.out.push(`<div class="loading-skeleton svelte-1ptmk1e"></div>`);
      } else {
        $$payload2.out.push("<!--[!-->");
        $$payload2.out.push(`<div class="stat-value svelte-1ptmk1e">${escape_html(formatDecimal(stats?.monthlyFuel || 0))}L</div> <div class="stat-subtitle svelte-1ptmk1e">${escape_html(formatNumber(stats?.monthlyDistance || 0))} km</div>`);
      }
      $$payload2.out.push(`<!--]--></div></div>`);
    }
  });
  $$payload.out.push(`<!----> `);
  Card($$payload, {
    class: "stat-card tank-level",
    children: ($$payload2) => {
      $$payload2.out.push(`<div class="stat-content svelte-1ptmk1e"><div class="stat-icon svelte-1ptmk1e">🪣</div> <div class="stat-info svelte-1ptmk1e"><h3 class="svelte-1ptmk1e">Tank Level</h3> `);
      if (loading) {
        $$payload2.out.push("<!--[-->");
        $$payload2.out.push(`<div class="loading-skeleton svelte-1ptmk1e"></div>`);
      } else {
        $$payload2.out.push("<!--[!-->");
        $$payload2.out.push(`<div class="stat-value svelte-1ptmk1e">${escape_html(formatDecimal(stats?.tankPercentage || 0))}%</div> <div class="stat-subtitle svelte-1ptmk1e">${escape_html(formatDecimal(stats?.tankLevel || 0))}L / ${escape_html(formatNumber(stats?.tankCapacity || 0))}L</div> <div class="tank-bar svelte-1ptmk1e"><div${attr_class(`tank-fill ${stringify(getTankLevelClass(stats?.tankPercentage || 0))}`, "svelte-1ptmk1e")}${attr_style(`width: ${stringify(Math.min(stats?.tankPercentage || 0, 100))}%`)}></div></div>`);
      }
      $$payload2.out.push(`<!--]--></div></div>`);
    }
  });
  $$payload.out.push(`<!----> `);
  Card($$payload, {
    class: "stat-card fleet-status",
    children: ($$payload2) => {
      $$payload2.out.push(`<div class="stat-content svelte-1ptmk1e"><div class="stat-icon svelte-1ptmk1e">🚜</div> <div class="stat-info svelte-1ptmk1e"><h3 class="svelte-1ptmk1e">Fleet Status</h3> `);
      if (loading) {
        $$payload2.out.push("<!--[-->");
        $$payload2.out.push(`<div class="loading-skeleton svelte-1ptmk1e"></div>`);
      } else {
        $$payload2.out.push("<!--[!-->");
        $$payload2.out.push(`<div class="stat-value svelte-1ptmk1e">${escape_html(stats?.activeVehicles || 0)}</div> <div class="stat-subtitle svelte-1ptmk1e">Active Vehicles</div> <div class="fleet-detail svelte-1ptmk1e">${escape_html(stats?.vehiclesWithOdometer || 0)} with odometer data</div>`);
      }
      $$payload2.out.push(`<!--]--></div></div>`);
    }
  });
  $$payload.out.push(`<!----> `);
  Card($$payload, {
    class: "stat-card efficiency",
    children: ($$payload2) => {
      $$payload2.out.push(`<div class="stat-content svelte-1ptmk1e"><div class="stat-icon svelte-1ptmk1e">⚡</div> <div class="stat-info svelte-1ptmk1e"><h3 class="svelte-1ptmk1e">Fuel Efficiency</h3> `);
      if (loading) {
        $$payload2.out.push("<!--[-->");
        $$payload2.out.push(`<div class="loading-skeleton svelte-1ptmk1e"></div>`);
      } else {
        $$payload2.out.push("<!--[!-->");
        $$payload2.out.push(`<div class="stat-value svelte-1ptmk1e">${escape_html(formatDecimal(stats?.averageEfficiency || 0))}</div> <div class="stat-subtitle svelte-1ptmk1e">L/100km fleet average `);
        if (stats?.consumptionDataQuality) {
          $$payload2.out.push("<!--[-->");
          $$payload2.out.push(`<span${attr_class(
            `data-quality ${stringify(stats.consumptionDataQuality >= 70 ? "good" : stats.consumptionDataQuality >= 40 ? "fair" : "poor")}`,
            "svelte-1ptmk1e"
          )}>(${escape_html(stats.consumptionDataQuality)}% reliable)</span>`);
        } else {
          $$payload2.out.push("<!--[!-->");
        }
        $$payload2.out.push(`<!--]--></div> `);
        if (stats?.validConsumptionEntries) {
          $$payload2.out.push("<!--[-->");
          $$payload2.out.push(`<div class="efficiency-detail svelte-1ptmk1e">${escape_html(stats.validConsumptionEntries)} entries this month</div>`);
        } else {
          $$payload2.out.push("<!--[!-->");
        }
        $$payload2.out.push(`<!--]-->`);
      }
      $$payload2.out.push(`<!--]--></div></div>`);
    }
  });
  $$payload.out.push(`<!----> `);
  Card($$payload, {
    class: "stat-card activity-summary",
    children: ($$payload2) => {
      $$payload2.out.push(`<div class="stat-content svelte-1ptmk1e"><div class="stat-icon svelte-1ptmk1e">📋</div> <div class="stat-info svelte-1ptmk1e"><h3 class="svelte-1ptmk1e">Activity</h3> `);
      if (loading) {
        $$payload2.out.push("<!--[-->");
        $$payload2.out.push(`<div class="loading-skeleton svelte-1ptmk1e"></div>`);
      } else {
        $$payload2.out.push("<!--[!-->");
        $$payload2.out.push(`<div class="stat-value svelte-1ptmk1e">${escape_html(stats?.entriesThisWeek || 0)}</div> <div class="stat-subtitle svelte-1ptmk1e">Entries this week</div> <div class="activity-detail svelte-1ptmk1e">${escape_html(stats?.entriesThisMonth || 0)} this month</div>`);
      }
      $$payload2.out.push(`<!--]--></div></div>`);
    }
  });
  $$payload.out.push(`<!----> `);
  Card($$payload, {
    class: "stat-card daily-average",
    children: ($$payload2) => {
      $$payload2.out.push(`<div class="stat-content svelte-1ptmk1e"><div class="stat-icon svelte-1ptmk1e">📊</div> <div class="stat-info svelte-1ptmk1e"><h3 class="svelte-1ptmk1e">Daily Average</h3> `);
      if (loading) {
        $$payload2.out.push("<!--[-->");
        $$payload2.out.push(`<div class="loading-skeleton svelte-1ptmk1e"></div>`);
      } else {
        $$payload2.out.push("<!--[!-->");
        $$payload2.out.push(`<div class="stat-value svelte-1ptmk1e">${escape_html(formatDecimal(stats?.avgDailyUsage || 0))}L</div> <div class="stat-subtitle svelte-1ptmk1e">Per day this month</div>`);
      }
      $$payload2.out.push(`<!--]--></div></div>`);
    }
  });
  $$payload.out.push(`<!----></div></div>`);
  pop();
}
function RecentActivity($$payload, $$props) {
  push();
  let { entries, loading = false } = $$props;
  function formatDate(dateStr) {
    const date = new Date(dateStr);
    const today = /* @__PURE__ */ new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-ZA", { month: "short", day: "numeric" });
    }
  }
  function formatTime(timeStr) {
    return timeStr.substring(0, 5);
  }
  Card($$payload, {
    class: "recent-activity",
    children: ($$payload2) => {
      $$payload2.out.push(`<div class="activity-header svelte-gwdetf"><h3 class="svelte-gwdetf">Recent Fuel Entries</h3> `);
      Button($$payload2, {
        variant: "outline",
        size: "sm",
        children: ($$payload3) => {
          $$payload3.out.push(`<!---->View All`);
        }
      });
      $$payload2.out.push(`<!----></div> `);
      if (loading) {
        $$payload2.out.push("<!--[-->");
        const each_array = ensure_array_like(Array(5));
        $$payload2.out.push(`<div class="loading-state svelte-gwdetf"><!--[-->`);
        for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
          each_array[$$index];
          $$payload2.out.push(`<div class="activity-item-skeleton svelte-gwdetf"><div class="skeleton-icon svelte-gwdetf"></div> <div class="skeleton-content svelte-gwdetf"><div class="skeleton-line svelte-gwdetf"></div> <div class="skeleton-line short svelte-gwdetf"></div></div> <div class="skeleton-value svelte-gwdetf"></div></div>`);
        }
        $$payload2.out.push(`<!--]--></div>`);
      } else {
        $$payload2.out.push("<!--[!-->");
        if (entries.length === 0) {
          $$payload2.out.push("<!--[-->");
          $$payload2.out.push(`<div class="empty-state svelte-gwdetf"><div class="empty-icon svelte-gwdetf">📊</div> <p class="svelte-gwdetf">No recent fuel entries</p> <small class="svelte-gwdetf">Fuel entries will appear here once vehicles start logging fuel usage</small></div>`);
        } else {
          $$payload2.out.push("<!--[!-->");
          const each_array_1 = ensure_array_like(entries);
          $$payload2.out.push(`<div class="activity-list svelte-gwdetf"><!--[-->`);
          for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
            let entry = each_array_1[$$index_1];
            $$payload2.out.push(`<div class="activity-item svelte-gwdetf"><div class="activity-info svelte-gwdetf"><div class="activity-primary svelte-gwdetf"><span class="vehicle-name svelte-gwdetf">${escape_html(entry.vehicles?.name || "Unknown Vehicle")}</span> <span class="activity-separator svelte-gwdetf">•</span> <span class="activity-name svelte-gwdetf">${escape_html(entry.activities?.name || "Unknown Activity")}</span></div> <div class="activity-secondary svelte-gwdetf"><span class="driver-name svelte-gwdetf">${escape_html(entry.drivers?.name || "Unknown Driver")}</span> <span class="activity-separator svelte-gwdetf">•</span> <span class="entry-time svelte-gwdetf">${escape_html(formatDate(entry.entry_date))} ${escape_html(formatTime(entry.time))}</span> `);
            if (entry.odometer_start && entry.odometer_end) {
              $$payload2.out.push("<!--[-->");
              $$payload2.out.push(`<span class="activity-separator svelte-gwdetf">•</span> <span class="distance svelte-gwdetf">${escape_html(Math.round((entry.odometer_end - entry.odometer_start) * 10) / 10)}km</span>`);
            } else {
              $$payload2.out.push("<!--[!-->");
            }
            $$payload2.out.push(`<!--]--></div></div> <div class="activity-metrics svelte-gwdetf"><div class="fuel-amount svelte-gwdetf">${escape_html(Math.round((entry.litres_used || 0) * 10) / 10)}L</div> `);
            if (entry.fuel_consumption_l_per_100km && entry.gauge_working) {
              $$payload2.out.push("<!--[-->");
              $$payload2.out.push(`<div class="efficiency svelte-gwdetf">${escape_html(Math.round(entry.fuel_consumption_l_per_100km * 10) / 10)} L/100km</div>`);
            } else {
              $$payload2.out.push("<!--[!-->");
              if (entry.odometer_start && entry.odometer_end && entry.gauge_working !== false) {
                $$payload2.out.push("<!--[-->");
                const distance = entry.odometer_end - entry.odometer_start;
                const efficiency = distance > 0 ? entry.litres_used / distance * 100 : 0;
                if (efficiency > 0) {
                  $$payload2.out.push("<!--[-->");
                  $$payload2.out.push(`<div class="efficiency svelte-gwdetf">${escape_html(Math.round(efficiency * 10) / 10)} L/100km</div>`);
                } else {
                  $$payload2.out.push("<!--[!-->");
                }
                $$payload2.out.push(`<!--]-->`);
              } else {
                $$payload2.out.push("<!--[!-->");
                if (entry.odometer_start && entry.odometer_end && entry.gauge_working === false) {
                  $$payload2.out.push("<!--[-->");
                  $$payload2.out.push(`<div class="efficiency broken-gauge svelte-gwdetf" title="Calculated from broken gauge - not reliable">~${escape_html(Math.round(entry.litres_used / (entry.odometer_end - entry.odometer_start) * 100 * 10) / 10)} L/100km</div>`);
                } else {
                  $$payload2.out.push("<!--[!-->");
                  if (entry.gauge_working === false) {
                    $$payload2.out.push("<!--[-->");
                    $$payload2.out.push(`<div class="efficiency broken-gauge svelte-gwdetf">Gauge broken</div>`);
                  } else {
                    $$payload2.out.push("<!--[!-->");
                  }
                  $$payload2.out.push(`<!--]-->`);
                }
                $$payload2.out.push(`<!--]-->`);
              }
              $$payload2.out.push(`<!--]-->`);
            }
            $$payload2.out.push(`<!--]--></div></div>`);
          }
          $$payload2.out.push(`<!--]--></div>`);
        }
        $$payload2.out.push(`<!--]-->`);
      }
      $$payload2.out.push(`<!--]-->`);
    }
  });
  pop();
}
function TankMonitoring($$payload, $$props) {
  push();
  let { bowsers, loading = false } = $$props;
  let mainTank = bowsers.find((b) => b.fuel_type === "diesel") || bowsers[0] || null;
  function getPercentage(current, capacity) {
    return capacity > 0 ? Math.round(current / capacity * 100 * 10) / 10 : 0;
  }
  function getLevelStatus(percentage) {
    if (percentage > 75) return "high";
    if (percentage > 50) return "medium";
    if (percentage > 25) return "low";
    return "critical";
  }
  function formatLitres(amount) {
    return new Intl.NumberFormat("en-ZA", { maximumFractionDigits: 0 }).format(amount);
  }
  Card($$payload, {
    class: "tank-monitoring",
    children: ($$payload2) => {
      $$payload2.out.push(`<div class="tank-header svelte-w0brre"><h3 class="svelte-w0brre">Fuel Tank</h3> `);
      Button($$payload2, {
        variant: "outline",
        size: "sm",
        href: "/fleet/bowsers",
        children: ($$payload3) => {
          $$payload3.out.push(`<!---->Manage`);
        }
      });
      $$payload2.out.push(`<!----></div> `);
      if (loading) {
        $$payload2.out.push("<!--[-->");
        $$payload2.out.push(`<div class="loading-state svelte-w0brre"><div class="skeleton-tank svelte-w0brre"></div></div>`);
      } else {
        $$payload2.out.push("<!--[!-->");
        if (!mainTank) {
          $$payload2.out.push("<!--[-->");
          $$payload2.out.push(`<div class="empty-state svelte-w0brre"><div class="empty-icon svelte-w0brre">🪣</div> <p class="svelte-w0brre">No fuel tank configured</p></div>`);
        } else {
          $$payload2.out.push("<!--[!-->");
          const percentage = getPercentage(mainTank.current_reading, mainTank.capacity);
          const status = getLevelStatus(percentage);
          $$payload2.out.push(`<div class="tank-display svelte-w0brre"><div class="bar-chart-container svelte-w0brre"><div class="capacity-label svelte-w0brre">${escape_html(formatLitres(mainTank.capacity))}L</div> <div class="tank-bar svelte-w0brre"><div${attr_class(`tank-fill ${stringify(status)}`, "svelte-w0brre")}${attr_style(`height: ${stringify(Math.min(percentage, 100))}%`)}><div class="percentage-overlay svelte-w0brre">${escape_html(percentage)}%</div></div></div> <div class="current-level-below svelte-w0brre">${escape_html(formatLitres(mainTank.current_reading))}L</div></div></div>`);
        }
        $$payload2.out.push(`<!--]-->`);
      }
      $$payload2.out.push(`<!--]-->`);
    }
  });
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
          acc[date].totalFuel += entry.litres_used || 0;
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
  $$payload.out.push(`<div class="dashboard-page svelte-2un3n7"><div class="dashboard-header svelte-2un3n7"><div class="header-content svelte-2un3n7"><h1 class="svelte-2un3n7">Dashboard</h1> <p class="dashboard-subtitle svelte-2un3n7">Farm operations overview and analytics</p></div> <div class="header-actions svelte-2un3n7">`);
  Button($$payload, {
    variant: "outline",
    onclick: handleRefresh,
    disabled: store_get($$store_subs ??= {}, "$dashboardLoading", dashboardLoading) === "loading",
    children: ($$payload2) => {
      $$payload2.out.push(`<!---->${escape_html(store_get($$store_subs ??= {}, "$dashboardLoading", dashboardLoading) === "loading" ? "Refreshing..." : "Refresh")}`);
    }
  });
  $$payload.out.push(`<!----></div></div> `);
  if (store_get($$store_subs ??= {}, "$dashboardError", dashboardError)) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="error-banner svelte-2un3n7"><div class="error-content svelte-2un3n7"><span class="error-icon svelte-2un3n7">⚠️</span> <div class="svelte-2un3n7"><p class="svelte-2un3n7">Failed to load dashboard data</p> <small class="svelte-2un3n7">${escape_html(store_get($$store_subs ??= {}, "$dashboardError", dashboardError))}</small></div> `);
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
  $$payload.out.push(`<!----> <div class="dashboard-grid svelte-2un3n7"><div class="dashboard-section activity-section svelte-2un3n7">`);
  RecentActivity($$payload, {
    entries: store_get($$store_subs ??= {}, "$dashboardStats", dashboardStats)?.recentEntries || [],
    loading: store_get($$store_subs ??= {}, "$dashboardLoading", dashboardLoading) === "loading"
  });
  $$payload.out.push(`<!----></div> <div class="dashboard-section tanks-section svelte-2un3n7">`);
  TankMonitoring($$payload, {
    bowsers: store_get($$store_subs ??= {}, "$dashboardStats", dashboardStats)?.bowserLevels || [],
    loading: store_get($$store_subs ??= {}, "$dashboardLoading", dashboardLoading) === "loading"
  });
  $$payload.out.push(`<!----></div></div> <div class="quick-actions svelte-2un3n7"><h3 class="svelte-2un3n7">Quick Actions</h3> <div class="actions-grid svelte-2un3n7">`);
  Button($$payload, {
    href: "/fuel",
    variant: "primary",
    class: "action-button",
    children: ($$payload2) => {
      $$payload2.out.push(`<span class="action-icon svelte-2un3n7">⛽</span> Add Fuel Entry`);
    }
  });
  $$payload.out.push(`<!----> `);
  Button($$payload, {
    href: "/fleet/vehicles",
    variant: "outline",
    class: "action-button",
    children: ($$payload2) => {
      $$payload2.out.push(`<span class="action-icon svelte-2un3n7">🚜</span> Manage Vehicles`);
    }
  });
  $$payload.out.push(`<!----> `);
  Button($$payload, {
    href: "/fleet/drivers",
    variant: "outline",
    class: "action-button",
    children: ($$payload2) => {
      $$payload2.out.push(`<span class="action-icon svelte-2un3n7">👤</span> Manage Drivers`);
    }
  });
  $$payload.out.push(`<!----> `);
  Button($$payload, {
    href: "/fleet/bowsers",
    variant: "outline",
    class: "action-button",
    children: ($$payload2) => {
      $$payload2.out.push(`<span class="action-icon svelte-2un3n7">🪣</span> Tank Management`);
    }
  });
  $$payload.out.push(`<!----></div></div></div>`);
  if ($$store_subs) unsubscribe_stores($$store_subs);
  pop();
}
export {
  _page as default
};
