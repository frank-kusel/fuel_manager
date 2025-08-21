import offlineStore from '$lib/stores/offline';
import supabaseService from './supabase';
import type { OfflineEntry, FuelEntry, Vehicle, Driver } from '$lib/types';

class OfflineService {
	private syncInProgress = false;

	// Add data to offline queue when offline or sync fails
	async queueForSync(type: OfflineEntry['type'], data: any): Promise<string> {
		return offlineStore.addToQueue({ type, data });
	}

	// Sync all pending entries
	async syncAll(): Promise<{ success: boolean; synced: number; errors: string[] }> {
		if (this.syncInProgress) {
			return { success: false, synced: 0, errors: ['Sync already in progress'] };
		}

		this.syncInProgress = true;
		offlineStore.setSyncing(true, 0);
		offlineStore.setSyncError(null);

		const errors: string[] = [];
		let syncedCount = 0;

		try {
			// Initialize supabase service
			await supabaseService.init();

			// Get all pending entries
			const state = offlineStore.getSyncStats();
			const pendingEntries = offlineStore.getPendingByType('fuel_entry')
				.concat(offlineStore.getPendingByType('vehicle'))
				.concat(offlineStore.getPendingByType('driver'))
				.concat(offlineStore.getPendingByType('refill'));

			if (pendingEntries.length === 0) {
				offlineStore.setSyncing(false, 100);
				offlineStore.setLastSync(new Date().toISOString());
				this.syncInProgress = false;
				return { success: true, synced: 0, errors: [] };
			}

			// Process each entry
			for (let i = 0; i < pendingEntries.length; i++) {
				const entry = pendingEntries[i];
				const progress = Math.round(((i + 1) / pendingEntries.length) * 100);
				
				offlineStore.setSyncing(true, progress);

				try {
					await this.syncEntry(entry);
					offlineStore.markSynced(entry.id);
					syncedCount++;
				} catch (error) {
					const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
					errors.push(`Failed to sync ${entry.type} (${entry.id}): ${errorMessage}`);
					console.error(`Sync error for entry ${entry.id}:`, error);
				}
			}

			// Clean up synced entries
			setTimeout(() => {
				offlineStore.clearSynced();
			}, 5000); // Keep for 5 seconds to show success

			offlineStore.setSyncing(false, 100);
			offlineStore.setLastSync(new Date().toISOString());

			if (errors.length > 0) {
				offlineStore.setSyncError(`${errors.length} items failed to sync`);
			}

			return { success: errors.length < pendingEntries.length, synced: syncedCount, errors };

		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Sync failed';
			offlineStore.setSyncError(errorMessage);
			console.error('Sync failed:', error);
			return { success: false, synced: syncedCount, errors: [errorMessage] };
		} finally {
			this.syncInProgress = false;
		}
	}

	// Sync individual entry based on type
	private async syncEntry(entry: OfflineEntry): Promise<void> {
		switch (entry.type) {
			case 'fuel_entry':
				await this.syncFuelEntry(entry);
				break;
			case 'vehicle':
				await this.syncVehicle(entry);
				break;
			case 'driver':
				await this.syncDriver(entry);
				break;
			case 'refill':
				await this.syncRefill(entry);
				break;
			default:
				throw new Error(`Unknown entry type: ${entry.type}`);
		}
	}

	// Sync fuel entry
	private async syncFuelEntry(entry: OfflineEntry): Promise<void> {
		const fuelEntryData = entry.data as FuelEntry;
		
		if (fuelEntryData.id && fuelEntryData.id.startsWith('temp_')) {
			// Create new entry (remove temp ID)
			const { id, ...dataWithoutId } = fuelEntryData;
			const result = await supabaseService.createFuelEntry(dataWithoutId);
			
			if (result.error) {
				throw new Error(result.error);
			}
		} else {
			// Update existing entry
			const result = await supabaseService.updateFuelEntry(fuelEntryData.id, fuelEntryData);
			
			if (result.error) {
				throw new Error(result.error);
			}
		}
	}

	// Sync vehicle
	private async syncVehicle(entry: OfflineEntry): Promise<void> {
		const vehicleData = entry.data as Vehicle;
		
		if (vehicleData.id && vehicleData.id.startsWith('temp_')) {
			// Create new vehicle
			const { id, ...dataWithoutId } = vehicleData;
			const result = await supabaseService.createVehicle(dataWithoutId);
			
			if (result.error) {
				throw new Error(result.error);
			}
		} else {
			// Update existing vehicle
			const result = await supabaseService.updateVehicle(vehicleData.id, vehicleData);
			
			if (result.error) {
				throw new Error(result.error);
			}
		}
	}

	// Sync driver
	private async syncDriver(entry: OfflineEntry): Promise<void> {
		const driverData = entry.data as Driver;
		
		if (driverData.id && driverData.id.startsWith('temp_')) {
			// Create new driver
			const { id, ...dataWithoutId } = driverData;
			const result = await supabaseService.createDriver(dataWithoutId);
			
			if (result.error) {
				throw new Error(result.error);
			}
		} else {
			// Update existing driver
			const result = await supabaseService.updateDriver(driverData.id, driverData);
			
			if (result.error) {
				throw new Error(result.error);
			}
		}
	}

	// Sync refill record
	private async syncRefill(entry: OfflineEntry): Promise<void> {
		// Implement refill sync when refill operations are added to SupabaseService
		console.log('Refill sync not implemented yet:', entry.data);
	}

	// Manually trigger sync
	async manualSync(): Promise<void> {
		if (!navigator.onLine) {
			throw new Error('Cannot sync while offline');
		}

		const result = await this.syncAll();
		
		if (!result.success && result.errors.length > 0) {
			throw new Error(result.errors.join(', '));
		}
	}

	// Check if entry exists in queue
	isQueued(type: OfflineEntry['type'], dataId?: string): boolean {
		const pending = offlineStore.getPendingByType(type);
		
		if (!dataId) return pending.length > 0;
		
		return pending.some(entry => 
			entry.data.id === dataId || 
			entry.data.code === dataId // For items that might be identified by code
		);
	}

	// Get queue stats
	getStats() {
		return offlineStore.getSyncStats();
	}

	// Clear all offline data (use with caution)
	async clearAll(): Promise<void> {
		if (confirm('Are you sure you want to clear all offline data? This cannot be undone.')) {
			offlineStore.clear();
		}
	}

	// Auto-sync when online
	startAutoSync(): void {
		if (typeof window === 'undefined') return;

		// Check periodically for pending items and sync if online
		setInterval(async () => {
			if (navigator.onLine && !this.syncInProgress) {
				const stats = this.getStats();
				if (stats.pending > 0) {
					try {
						await this.syncAll();
					} catch (error) {
						console.warn('Auto-sync failed:', error);
					}
				}
			}
		}, 30000); // Check every 30 seconds
	}
}

// Export singleton instance
const offlineService = new OfflineService();
export default offlineService;