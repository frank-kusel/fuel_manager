import { w as writable, g as get, d as derived } from "./index.js";
import supabaseService from "./supabase.js";
const initialState = {
  isOnline: navigator?.onLine ?? true,
  queue: [],
  syncing: false,
  lastSync: null,
  syncError: null,
  syncProgress: 0
};
function createOfflineStore() {
  const { subscribe, set, update } = writable(initialState);
  if (typeof window !== "undefined") {
    const savedQueue = localStorage.getItem("farmtrack_offline_queue");
    const savedLastSync = localStorage.getItem("farmtrack_last_sync");
    if (savedQueue) {
      try {
        const queue = JSON.parse(savedQueue);
        update((state) => ({
          ...state,
          queue,
          lastSync: savedLastSync
        }));
      } catch (error) {
        console.error("Failed to load offline queue:", error);
      }
    }
  }
  return {
    subscribe,
    // Set online/offline status
    setOnlineStatus: (isOnline2) => {
      update((state) => ({ ...state, isOnline: isOnline2 }));
      if (isOnline2 && get({ subscribe }).queue.length > 0) {
        setTimeout(() => {
          const store = get({ subscribe });
          if (!store.syncing) {
            Promise.resolve().then(() => offline).then(({ default: offlineService2 }) => {
              offlineService2.syncAll();
            });
          }
        }, 1e3);
      }
    },
    // Add entry to offline queue
    addToQueue: (entry) => {
      const offlineEntry = {
        ...entry,
        id: crypto.randomUUID(),
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        synced: false
      };
      update((state) => {
        const newQueue = [...state.queue, offlineEntry];
        if (typeof window !== "undefined") {
          localStorage.setItem("farmtrack_offline_queue", JSON.stringify(newQueue));
        }
        return { ...state, queue: newQueue };
      });
      return offlineEntry.id;
    },
    // Remove entry from queue
    removeFromQueue: (entryId) => {
      update((state) => {
        const newQueue = state.queue.filter((entry) => entry.id !== entryId);
        if (typeof window !== "undefined") {
          localStorage.setItem("farmtrack_offline_queue", JSON.stringify(newQueue));
        }
        return { ...state, queue: newQueue };
      });
    },
    // Mark entry as synced
    markSynced: (entryId) => {
      update((state) => {
        const newQueue = state.queue.map(
          (entry) => entry.id === entryId ? { ...entry, synced: true } : entry
        );
        if (typeof window !== "undefined") {
          localStorage.setItem("farmtrack_offline_queue", JSON.stringify(newQueue));
        }
        return { ...state, queue: newQueue };
      });
    },
    // Clear synced entries
    clearSynced: () => {
      update((state) => {
        const newQueue = state.queue.filter((entry) => !entry.synced);
        if (typeof window !== "undefined") {
          localStorage.setItem("farmtrack_offline_queue", JSON.stringify(newQueue));
        }
        return { ...state, queue: newQueue };
      });
    },
    // Set sync status
    setSyncing: (syncing, progress = 0) => {
      update((state) => ({ ...state, syncing, syncProgress: progress }));
    },
    // Set sync error
    setSyncError: (error) => {
      update((state) => ({ ...state, syncError: error, syncing: false }));
    },
    // Set last sync time
    setLastSync: (timestamp) => {
      update((state) => ({ ...state, lastSync: timestamp }));
      if (typeof window !== "undefined") {
        localStorage.setItem("farmtrack_last_sync", timestamp);
      }
    },
    // Clear all offline data
    clear: () => {
      if (typeof window !== "undefined") {
        localStorage.removeItem("farmtrack_offline_queue");
        localStorage.removeItem("farmtrack_last_sync");
      }
      set(initialState);
    },
    // Get pending entries by type
    getPendingByType: (type) => {
      const state = get({ subscribe });
      return state.queue.filter((entry) => entry.type === type && !entry.synced);
    },
    // Get sync statistics
    getSyncStats: () => {
      const state = get({ subscribe });
      const total = state.queue.length;
      const synced = state.queue.filter((entry) => entry.synced).length;
      const pending = total - synced;
      return { total, synced, pending };
    }
  };
}
const offlineStore = createOfflineStore();
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    offlineStore.setOnlineStatus(true);
  });
  window.addEventListener("offline", () => {
    offlineStore.setOnlineStatus(false);
  });
}
derived(offlineStore, ($offline) => $offline.isOnline);
derived(offlineStore, ($offline) => $offline.queue);
derived(
  offlineStore,
  ($offline) => $offline.queue.filter((entry) => !entry.synced).length
);
derived(offlineStore, ($offline) => $offline.syncing);
derived(offlineStore, ($offline) => $offline.syncProgress);
derived(offlineStore, ($offline) => $offline.lastSync);
derived(offlineStore, ($offline) => $offline.syncError);
class OfflineService {
  syncInProgress = false;
  // Add data to offline queue when offline or sync fails
  async queueForSync(type, data) {
    return offlineStore.addToQueue({ type, data });
  }
  // Sync all pending entries
  async syncAll() {
    if (this.syncInProgress) {
      return { success: false, synced: 0, errors: ["Sync already in progress"] };
    }
    this.syncInProgress = true;
    offlineStore.setSyncing(true, 0);
    offlineStore.setSyncError(null);
    const errors = [];
    let syncedCount = 0;
    try {
      await supabaseService.init();
      const state = offlineStore.getSyncStats();
      const pendingEntries = offlineStore.getPendingByType("fuel_entry").concat(offlineStore.getPendingByType("vehicle")).concat(offlineStore.getPendingByType("driver")).concat(offlineStore.getPendingByType("refill"));
      if (pendingEntries.length === 0) {
        offlineStore.setSyncing(false, 100);
        offlineStore.setLastSync((/* @__PURE__ */ new Date()).toISOString());
        this.syncInProgress = false;
        return { success: true, synced: 0, errors: [] };
      }
      for (let i = 0; i < pendingEntries.length; i++) {
        const entry = pendingEntries[i];
        const progress = Math.round((i + 1) / pendingEntries.length * 100);
        offlineStore.setSyncing(true, progress);
        try {
          await this.syncEntry(entry);
          offlineStore.markSynced(entry.id);
          syncedCount++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown sync error";
          errors.push(`Failed to sync ${entry.type} (${entry.id}): ${errorMessage}`);
          console.error(`Sync error for entry ${entry.id}:`, error);
        }
      }
      setTimeout(() => {
        offlineStore.clearSynced();
      }, 5e3);
      offlineStore.setSyncing(false, 100);
      offlineStore.setLastSync((/* @__PURE__ */ new Date()).toISOString());
      if (errors.length > 0) {
        offlineStore.setSyncError(`${errors.length} items failed to sync`);
      }
      return { success: errors.length < pendingEntries.length, synced: syncedCount, errors };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Sync failed";
      offlineStore.setSyncError(errorMessage);
      console.error("Sync failed:", error);
      return { success: false, synced: syncedCount, errors: [errorMessage] };
    } finally {
      this.syncInProgress = false;
    }
  }
  // Sync individual entry based on type
  async syncEntry(entry) {
    switch (entry.type) {
      case "fuel_entry":
        await this.syncFuelEntry(entry);
        break;
      case "vehicle":
        await this.syncVehicle(entry);
        break;
      case "driver":
        await this.syncDriver(entry);
        break;
      case "refill":
        await this.syncRefill(entry);
        break;
      default:
        throw new Error(`Unknown entry type: ${entry.type}`);
    }
  }
  // Sync fuel entry
  async syncFuelEntry(entry) {
    const fuelEntryData = entry.data;
    if (fuelEntryData.id && fuelEntryData.id.startsWith("temp_")) {
      const { id, ...dataWithoutId } = fuelEntryData;
      const result = await supabaseService.createFuelEntry(dataWithoutId);
      if (result.error) {
        throw new Error(result.error);
      }
    } else {
      const result = await supabaseService.updateFuelEntry(fuelEntryData.id, fuelEntryData);
      if (result.error) {
        throw new Error(result.error);
      }
    }
  }
  // Sync vehicle
  async syncVehicle(entry) {
    const vehicleData = entry.data;
    if (vehicleData.id && vehicleData.id.startsWith("temp_")) {
      const { id, ...dataWithoutId } = vehicleData;
      const result = await supabaseService.createVehicle(dataWithoutId);
      if (result.error) {
        throw new Error(result.error);
      }
    } else {
      const result = await supabaseService.updateVehicle(vehicleData.id, vehicleData);
      if (result.error) {
        throw new Error(result.error);
      }
    }
  }
  // Sync driver
  async syncDriver(entry) {
    const driverData = entry.data;
    if (driverData.id && driverData.id.startsWith("temp_")) {
      const { id, ...dataWithoutId } = driverData;
      const result = await supabaseService.createDriver(dataWithoutId);
      if (result.error) {
        throw new Error(result.error);
      }
    } else {
      const result = await supabaseService.updateDriver(driverData.id, driverData);
      if (result.error) {
        throw new Error(result.error);
      }
    }
  }
  // Sync refill record
  async syncRefill(entry) {
    console.log("Refill sync not implemented yet:", entry.data);
  }
  // Manually trigger sync
  async manualSync() {
    if (!navigator.onLine) {
      throw new Error("Cannot sync while offline");
    }
    const result = await this.syncAll();
    if (!result.success && result.errors.length > 0) {
      throw new Error(result.errors.join(", "));
    }
  }
  // Check if entry exists in queue
  isQueued(type, dataId) {
    const pending = offlineStore.getPendingByType(type);
    if (!dataId) return pending.length > 0;
    return pending.some(
      (entry) => entry.data.id === dataId || entry.data.code === dataId
      // For items that might be identified by code
    );
  }
  // Get queue stats
  getStats() {
    return offlineStore.getSyncStats();
  }
  // Clear all offline data (use with caution)
  async clearAll() {
    if (confirm("Are you sure you want to clear all offline data? This cannot be undone.")) {
      offlineStore.clear();
    }
  }
  // Auto-sync when online
  startAutoSync() {
    if (typeof window === "undefined") return;
    setInterval(async () => {
      if (navigator.onLine && !this.syncInProgress) {
        const stats = this.getStats();
        if (stats.pending > 0) {
          try {
            await this.syncAll();
          } catch (error) {
            console.warn("Auto-sync failed:", error);
          }
        }
      }
    }, 3e4);
  }
}
const offlineService = new OfflineService();
const offline = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: offlineService
}, Symbol.toStringTag, { value: "Module" }));
export {
  offlineService as default
};
