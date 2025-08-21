import { writable, derived, get } from 'svelte/store';
import type { OfflineEntry, LoadingState } from '$lib/types';

// Offline state interface
interface OfflineState {
	isOnline: boolean;
	queue: OfflineEntry[];
	syncing: boolean;
	lastSync: string | null;
	syncError: string | null;
	syncProgress: number; // 0-100
}

// Initial offline state
const initialState: OfflineState = {
	isOnline: navigator?.onLine ?? true,
	queue: [],
	syncing: false,
	lastSync: null,
	syncError: null,
	syncProgress: 0
};

// Create the offline store
function createOfflineStore() {
	const { subscribe, set, update } = writable<OfflineState>(initialState);

	// Load queue from localStorage on init
	if (typeof window !== 'undefined') {
		const savedQueue = localStorage.getItem('farmtrack_offline_queue');
		const savedLastSync = localStorage.getItem('farmtrack_last_sync');
		
		if (savedQueue) {
			try {
				const queue = JSON.parse(savedQueue);
				update(state => ({ 
					...state, 
					queue, 
					lastSync: savedLastSync 
				}));
			} catch (error) {
				console.error('Failed to load offline queue:', error);
			}
		}
	}

	return {
		subscribe,
		
		// Set online/offline status
		setOnlineStatus: (isOnline: boolean) => {
			update(state => ({ ...state, isOnline }));
			
			// Auto-sync when coming online
			if (isOnline && get({ subscribe }).queue.length > 0) {
				setTimeout(() => {
					const store = get({ subscribe });
					if (!store.syncing) {
						// Import and trigger sync
						import('$lib/services/offline').then(({ default: offlineService }) => {
							offlineService.syncAll();
						});
					}
				}, 1000); // Wait 1 second after coming online
			}
		},
		
		// Add entry to offline queue
		addToQueue: (entry: Omit<OfflineEntry, 'id' | 'timestamp' | 'synced'>) => {
			const offlineEntry: OfflineEntry = {
				...entry,
				id: crypto.randomUUID(),
				timestamp: new Date().toISOString(),
				synced: false
			};
			
			update(state => {
				const newQueue = [...state.queue, offlineEntry];
				// Save to localStorage
				if (typeof window !== 'undefined') {
					localStorage.setItem('farmtrack_offline_queue', JSON.stringify(newQueue));
				}
				return { ...state, queue: newQueue };
			});
			
			return offlineEntry.id;
		},
		
		// Remove entry from queue
		removeFromQueue: (entryId: string) => {
			update(state => {
				const newQueue = state.queue.filter(entry => entry.id !== entryId);
				// Save to localStorage
				if (typeof window !== 'undefined') {
					localStorage.setItem('farmtrack_offline_queue', JSON.stringify(newQueue));
				}
				return { ...state, queue: newQueue };
			});
		},
		
		// Mark entry as synced
		markSynced: (entryId: string) => {
			update(state => {
				const newQueue = state.queue.map(entry =>
					entry.id === entryId ? { ...entry, synced: true } : entry
				);
				// Save to localStorage
				if (typeof window !== 'undefined') {
					localStorage.setItem('farmtrack_offline_queue', JSON.stringify(newQueue));
				}
				return { ...state, queue: newQueue };
			});
		},
		
		// Clear synced entries
		clearSynced: () => {
			update(state => {
				const newQueue = state.queue.filter(entry => !entry.synced);
				// Save to localStorage
				if (typeof window !== 'undefined') {
					localStorage.setItem('farmtrack_offline_queue', JSON.stringify(newQueue));
				}
				return { ...state, queue: newQueue };
			});
		},
		
		// Set sync status
		setSyncing: (syncing: boolean, progress = 0) => {
			update(state => ({ ...state, syncing, syncProgress: progress }));
		},
		
		// Set sync error
		setSyncError: (error: string | null) => {
			update(state => ({ ...state, syncError: error, syncing: false }));
		},
		
		// Set last sync time
		setLastSync: (timestamp: string) => {
			update(state => ({ ...state, lastSync: timestamp }));
			if (typeof window !== 'undefined') {
				localStorage.setItem('farmtrack_last_sync', timestamp);
			}
		},
		
		// Clear all offline data
		clear: () => {
			if (typeof window !== 'undefined') {
				localStorage.removeItem('farmtrack_offline_queue');
				localStorage.removeItem('farmtrack_last_sync');
			}
			set(initialState);
		},
		
		// Get pending entries by type
		getPendingByType: (type: OfflineEntry['type']) => {
			const state = get({ subscribe });
			return state.queue.filter(entry => entry.type === type && !entry.synced);
		},
		
		// Get sync statistics
		getSyncStats: () => {
			const state = get({ subscribe });
			const total = state.queue.length;
			const synced = state.queue.filter(entry => entry.synced).length;
			const pending = total - synced;
			
			return { total, synced, pending };
		}
	};
}

// Create and export the store
const offlineStore = createOfflineStore();
export default offlineStore;

// Set up online/offline listeners
if (typeof window !== 'undefined') {
	window.addEventListener('online', () => {
		offlineStore.setOnlineStatus(true);
	});
	
	window.addEventListener('offline', () => {
		offlineStore.setOnlineStatus(false);
	});
}

// Derived stores for convenience
export const isOnline = derived(offlineStore, $offline => $offline.isOnline);
export const offlineQueue = derived(offlineStore, $offline => $offline.queue);
export const pendingCount = derived(offlineStore, $offline => 
	$offline.queue.filter(entry => !entry.synced).length
);
export const isSyncing = derived(offlineStore, $offline => $offline.syncing);
export const syncProgress = derived(offlineStore, $offline => $offline.syncProgress);
export const lastSync = derived(offlineStore, $offline => $offline.lastSync);
export const syncError = derived(offlineStore, $offline => $offline.syncError);