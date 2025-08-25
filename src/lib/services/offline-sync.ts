import { browser } from '$app/environment';
import { writable } from 'svelte/store';
import supabaseService from './supabase';

// Types for offline sync
export interface OfflineEntry {
	id: string;
	type: 'fuel_entry' | 'bowser_reading';
	data: any;
	timestamp: string;
	deviceId: string;
	synced: boolean;
	conflictResolved: boolean;
}

export interface SyncStatus {
	online: boolean;
	syncing: boolean;
	pendingCount: number;
	lastSync: string | null;
	conflicts: OfflineEntry[];
}

// Store for sync status
export const syncStatus = writable<SyncStatus>({
	online: true,
	syncing: false,
	pendingCount: 0,
	lastSync: null,
	conflicts: []
});

class OfflineSyncService {
	private dbName = 'FuelManagerOffline';
	private version = 1;
	private db: IDBDatabase | null = null;
	private deviceId: string;

	constructor() {
		this.deviceId = this.getOrCreateDeviceId();
		if (browser) {
			this.initDatabase();
			this.setupNetworkListeners();
			this.startPeriodicSync();
		}
	}

	private getOrCreateDeviceId(): string {
		if (!browser) return 'server';
		
		let deviceId = localStorage.getItem('device_id');
		if (!deviceId) {
			deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
			localStorage.setItem('device_id', deviceId);
		}
		return deviceId;
	}

	private async initDatabase(): Promise<void> {
		return new Promise((resolve, reject) => {
			const request = indexedDB.open(this.dbName, this.version);
			
			request.onerror = () => reject(request.error);
			request.onsuccess = () => {
				this.db = request.result;
				resolve();
			};
			
			request.onupgradeneeded = (event) => {
				const db = (event.target as IDBOpenDBRequest).result;
				
				// Create offline entries store
				if (!db.objectStoreNames.contains('offline_entries')) {
					const store = db.createObjectStore('offline_entries', { keyPath: 'id' });
					store.createIndex('timestamp', 'timestamp');
					store.createIndex('synced', 'synced');
					store.createIndex('type', 'type');
				}
				
				// Create conflict resolution store
				if (!db.objectStoreNames.contains('sync_conflicts')) {
					const conflictStore = db.createObjectStore('sync_conflicts', { keyPath: 'id' });
					conflictStore.createIndex('timestamp', 'timestamp');
				}
			};
		});
	}

	private setupNetworkListeners(): void {
		window.addEventListener('online', () => {
			syncStatus.update(status => ({ ...status, online: true }));
			this.syncOfflineEntries();
		});
		
		window.addEventListener('offline', () => {
			syncStatus.update(status => ({ ...status, online: false }));
		});
	}

	private startPeriodicSync(): void {
		// Sync every 5 minutes when online
		setInterval(() => {
			if (navigator.onLine) {
				this.syncOfflineEntries();
			}
		}, 5 * 60 * 1000);
	}

	async storeOfflineEntry(type: OfflineEntry['type'], data: any): Promise<string> {
		if (!this.db) await this.initDatabase();
		
		const entry: OfflineEntry = {
			id: 'offline_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
			type,
			data: {
				...data,
				offline_created_at: new Date().toISOString(),
				device_id: this.deviceId
			},
			timestamp: new Date().toISOString(),
			deviceId: this.deviceId,
			synced: false,
			conflictResolved: false
		};

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction(['offline_entries'], 'readwrite');
			const store = transaction.objectStore('offline_entries');
			const request = store.add(entry);
			
			request.onsuccess = () => {
				this.updatePendingCount();
				resolve(entry.id);
			};
			request.onerror = () => reject(request.error);
		});
	}

	async syncOfflineEntries(): Promise<void> {
		if (!this.db || !navigator.onLine) return;
		
		syncStatus.update(status => ({ ...status, syncing: true }));
		
		try {
			const entries = await this.getUnsyncedEntries();
			
			// Sort by timestamp for proper order
			entries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
			
			for (const entry of entries) {
				try {
					await this.syncSingleEntry(entry);
					await this.markAsSynced(entry.id);
				} catch (error) {
					console.error('Failed to sync entry:', entry.id, error);
					// Create conflict resolution record
					await this.createSyncConflict(entry, error);
				}
			}
			
			syncStatus.update(status => ({ 
				...status, 
				syncing: false, 
				lastSync: new Date().toISOString() 
			}));
			
			this.updatePendingCount();
		} catch (error) {
			console.error('Sync failed:', error);
			syncStatus.update(status => ({ ...status, syncing: false }));
		}
	}

	private async syncSingleEntry(entry: OfflineEntry): Promise<void> {
		await supabaseService.init();
		
		switch (entry.type) {
			case 'fuel_entry':
				await supabaseService.createFuelEntry(entry.data);
				break;
			case 'bowser_reading':
				await supabaseService.updateBowserReading(
					entry.data.bowser_id,
					entry.data.new_reading,
					entry.data.fuel_entry_id
				);
				break;
			default:
				throw new Error(`Unknown entry type: ${entry.type}`);
		}
	}

	private async getUnsyncedEntries(): Promise<OfflineEntry[]> {
		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction(['offline_entries'], 'readonly');
			const store = transaction.objectStore('offline_entries');
			const index = store.index('synced');
			const request = index.getAll(false);
			
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});
	}

	private async markAsSynced(entryId: string): Promise<void> {
		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction(['offline_entries'], 'readwrite');
			const store = transaction.objectStore('offline_entries');
			const getRequest = store.get(entryId);
			
			getRequest.onsuccess = () => {
				const entry = getRequest.result;
				if (entry) {
					entry.synced = true;
					const updateRequest = store.put(entry);
					updateRequest.onsuccess = () => resolve();
					updateRequest.onerror = () => reject(updateRequest.error);
				} else {
					resolve();
				}
			};
			getRequest.onerror = () => reject(getRequest.error);
		});
	}

	private async createSyncConflict(entry: OfflineEntry, error: any): Promise<void> {
		const conflict = {
			id: 'conflict_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
			originalEntry: entry,
			error: error instanceof Error ? error.message : String(error),
			timestamp: new Date().toISOString(),
			resolved: false
		};

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction(['sync_conflicts'], 'readwrite');
			const store = transaction.objectStore('sync_conflicts');
			const request = store.add(conflict);
			
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	}

	private async updatePendingCount(): Promise<void> {
		try {
			const entries = await this.getUnsyncedEntries();
			syncStatus.update(status => ({ ...status, pendingCount: entries.length }));
		} catch (error) {
			console.error('Failed to update pending count:', error);
		}
	}

	// Public method to manually trigger sync
	async forcSync(): Promise<void> {
		await this.syncOfflineEntries();
	}

	// Method to clear synced entries (cleanup)
	async clearSyncedEntries(): Promise<void> {
		if (!this.db) return;
		
		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction(['offline_entries'], 'readwrite');
			const store = transaction.objectStore('offline_entries');
			const index = store.index('synced');
			const request = index.openCursor(true);
			
			request.onsuccess = (event) => {
				const cursor = (event.target as IDBRequest).result;
				if (cursor) {
					cursor.delete();
					cursor.continue();
				} else {
					resolve();
				}
			};
			request.onerror = () => reject(request.error);
		});
	}
}

// Export singleton instance
export const offlineSyncService = new OfflineSyncService();