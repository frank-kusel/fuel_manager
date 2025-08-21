import { writable, derived } from 'svelte/store';
import type { DashboardStats, VehicleSummary, ActivitySummary, LoadingState } from '$lib/types';

interface DashboardState {
	stats: DashboardStats | null;
	vehicleSummaries: VehicleSummary[];
	activitySummaries: ActivitySummary[];
	dateRange: { start: string; end: string };
	loading: LoadingState;
	error: string | null;
	refreshInterval: number | null;
}

const initialState: DashboardState = {
	stats: null,
	vehicleSummaries: [],
	activitySummaries: [],
	dateRange: {
		start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
		end: new Date().toISOString().split('T')[0] // today
	},
	loading: 'idle',
	error: null,
	refreshInterval: null
};

function createDashboardStore() {
	const { subscribe, set, update } = writable<DashboardState>(initialState);

	return {
		subscribe,
		
		setLoading: (loading: LoadingState) => {
			update(state => ({ ...state, loading }));
		},
		
		setError: (error: string | null) => {
			update(state => ({ ...state, error, loading: error ? 'error' : state.loading }));
		},
		
		setStats: (stats: DashboardStats) => {
			update(state => ({ 
				...state, 
				stats, 
				loading: 'success', 
				error: null 
			}));
		},
		
		setVehicleSummaries: (summaries: VehicleSummary[]) => {
			update(state => ({ ...state, vehicleSummaries: summaries }));
		},
		
		setActivitySummaries: (summaries: ActivitySummary[]) => {
			update(state => ({ ...state, activitySummaries: summaries }));
		},
		
		setDateRange: (start: string, end: string) => {
			update(state => ({ 
				...state, 
				dateRange: { start, end } 
			}));
		},
		
		loadDashboardData: async () => {
			update(state => ({ ...state, loading: 'loading', error: null }));
			
			try {
				const { default: supabaseService } = await import('$lib/services/supabase');
				await supabaseService.init();
				
				// Load comprehensive dashboard stats and vehicle performance
				const [statsResult, performanceResult] = await Promise.all([
					supabaseService.getDashboardStats(),
					supabaseService.getVehiclePerformance(undefined, 30) // All vehicles, last 30 days
				]);
				
				if (statsResult.error) {
					update(state => ({ 
						...state, 
						error: statsResult.error, 
						loading: 'error' 
					}));
					return;
				}
				
				// Transform vehicle performance data for summaries
				const vehicleSummaries: VehicleSummary[] = performanceResult.data?.vehicleStats?.map(stat => ({
					vehicleId: stat.vehicle?.id || '',
					vehicleCode: stat.vehicle?.code || 'N/A',
					vehicleName: stat.vehicle?.name || 'Unknown Vehicle',
					totalFuel: stat.totalFuel,
					totalDistance: stat.totalDistance,
					averageConsumption: stat.efficiency,
					recordCount: stat.entryCount
				})) || [];
				
				// Create activity summaries from recent entries
				const activitySummaries: ActivitySummary[] = [];
				const recentEntries = statsResult.data?.recentEntries || [];
				
				// Group entries by date for activity summary
				const entriesByDate = recentEntries.reduce((acc, entry) => {
					const date = entry.entry_date;
					if (!acc[date]) {
						acc[date] = { date, recordCount: 0, totalFuel: 0 };
					}
					acc[date].recordCount++;
					acc[date].totalFuel += entry.litres_used || 0;
					return acc;
				}, {});
				
				activitySummaries.push(...Object.values(entriesByDate));
				
				update(state => ({ 
					...state, 
					stats: statsResult.data,
					vehicleSummaries,
					activitySummaries,
					loading: 'success',
					error: null
				}));
				
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Failed to load dashboard data';
				update(state => ({ 
					...state, 
					error: errorMessage, 
					loading: 'error' 
				}));
			}
		},

		// Load vehicle-specific performance data
		loadVehiclePerformance: async (vehicleId: string, days: number = 30) => {
			try {
				const { default: supabaseService } = await import('$lib/services/supabase');
				await supabaseService.init();
				
				const result = await supabaseService.getVehiclePerformance(vehicleId, days);
				
				if (result.error) {
					update(state => ({ ...state, error: result.error }));
					return null;
				}
				
				return result.data;
				
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Failed to load vehicle performance';
				update(state => ({ ...state, error: errorMessage }));
				return null;
			}
		},
		
		// Auto-refresh functionality
		startAutoRefresh: (intervalMs = 60000) => { // Default 1 minute
			update(state => {
				// Clear existing interval
				if (state.refreshInterval) {
					clearInterval(state.refreshInterval);
				}
				
				// Set new interval
				const interval = setInterval(() => {
					// Reload data automatically
					const store = derived({ subscribe }, $state => $state);
					store.subscribe($state => {
						if ($state.loading !== 'loading') {
							const { loadDashboardData } = createDashboardStore();
							loadDashboardData();
						}
					})();
				}, intervalMs);
				
				return { ...state, refreshInterval: interval };
			});
		},
		
		stopAutoRefresh: () => {
			update(state => {
				if (state.refreshInterval) {
					clearInterval(state.refreshInterval);
				}
				return { ...state, refreshInterval: null };
			});
		},
		
		refreshData: async () => {
			// Manual refresh
			const { loadDashboardData } = createDashboardStore();
			await loadDashboardData();
		},
		
		reset: () => {
			update(state => {
				if (state.refreshInterval) {
					clearInterval(state.refreshInterval);
				}
				return initialState;
			});
		}
	};
}

const dashboardStore = createDashboardStore();
export default dashboardStore;

// Derived stores
export const dashboardStats = derived(dashboardStore, $store => $store.stats);
export const vehicleSummaries = derived(dashboardStore, $store => $store.vehicleSummaries);
export const activitySummaries = derived(dashboardStore, $store => $store.activitySummaries);
export const dashboardLoading = derived(dashboardStore, $store => $store.loading);
export const dashboardError = derived(dashboardStore, $store => $store.error);
export const dashboardDateRange = derived(dashboardStore, $store => $store.dateRange);
export const isAutoRefreshing = derived(dashboardStore, $store => !!$store.refreshInterval);