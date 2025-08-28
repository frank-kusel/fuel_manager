import { w as writable } from "./index.js";
import supabaseService from "./supabase.js";
const syncStatus = writable({
  online: true,
  syncing: false,
  pendingCount: 0,
  lastSync: null,
  conflicts: []
});
class OfflineSyncService {
  dbName = "FuelManagerOffline";
  version = 1;
  db = null;
  deviceId;
  constructor() {
    this.deviceId = this.getOrCreateDeviceId();
  }
  getOrCreateDeviceId() {
    return "server";
  }
  async initDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains("offline_entries")) {
          const store = db.createObjectStore("offline_entries", { keyPath: "id" });
          store.createIndex("timestamp", "timestamp");
          store.createIndex("synced", "synced");
          store.createIndex("type", "type");
        }
        if (!db.objectStoreNames.contains("sync_conflicts")) {
          const conflictStore = db.createObjectStore("sync_conflicts", { keyPath: "id" });
          conflictStore.createIndex("timestamp", "timestamp");
        }
      };
    });
  }
  setupNetworkListeners() {
    window.addEventListener("online", () => {
      syncStatus.update((status) => ({ ...status, online: true }));
      this.syncOfflineEntries();
    });
    window.addEventListener("offline", () => {
      syncStatus.update((status) => ({ ...status, online: false }));
    });
  }
  startPeriodicSync() {
    setInterval(() => {
      if (navigator.onLine) {
        this.syncOfflineEntries();
      }
    }, 5 * 60 * 1e3);
  }
  async storeOfflineEntry(type, data) {
    if (!this.db) await this.initDatabase();
    const entry = {
      id: "offline_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
      type,
      data: {
        ...data,
        offline_created_at: (/* @__PURE__ */ new Date()).toISOString(),
        device_id: this.deviceId
      },
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      deviceId: this.deviceId,
      synced: false,
      conflictResolved: false
    };
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["offline_entries"], "readwrite");
      const store = transaction.objectStore("offline_entries");
      const request = store.add(entry);
      request.onsuccess = () => {
        this.updatePendingCount();
        resolve(entry.id);
      };
      request.onerror = () => reject(request.error);
    });
  }
  async syncOfflineEntries() {
    if (!this.db || !navigator.onLine) return;
    syncStatus.update((status) => ({ ...status, syncing: true }));
    try {
      const entries = await this.getUnsyncedEntries();
      entries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      for (const entry of entries) {
        try {
          await this.syncSingleEntry(entry);
          await this.markAsSynced(entry.id);
        } catch (error) {
          console.error("Failed to sync entry:", entry.id, error);
          await this.createSyncConflict(entry, error);
        }
      }
      syncStatus.update((status) => ({
        ...status,
        syncing: false,
        lastSync: (/* @__PURE__ */ new Date()).toISOString()
      }));
      this.updatePendingCount();
    } catch (error) {
      console.error("Sync failed:", error);
      syncStatus.update((status) => ({ ...status, syncing: false }));
    }
  }
  async syncSingleEntry(entry) {
    await supabaseService.init();
    switch (entry.type) {
      case "fuel_entry":
        await supabaseService.createFuelEntry(entry.data);
        break;
      case "bowser_reading":
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
  async getUnsyncedEntries() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["offline_entries"], "readonly");
      const store = transaction.objectStore("offline_entries");
      const index = store.index("synced");
      const request = index.getAll(false);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  async markAsSynced(entryId) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["offline_entries"], "readwrite");
      const store = transaction.objectStore("offline_entries");
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
  async createSyncConflict(entry, error) {
    const conflict = {
      id: "conflict_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
      originalEntry: entry,
      error: error instanceof Error ? error.message : String(error),
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      resolved: false
    };
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["sync_conflicts"], "readwrite");
      const store = transaction.objectStore("sync_conflicts");
      const request = store.add(conflict);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
  async updatePendingCount() {
    try {
      const entries = await this.getUnsyncedEntries();
      syncStatus.update((status) => ({ ...status, pendingCount: entries.length }));
    } catch (error) {
      console.error("Failed to update pending count:", error);
    }
  }
  // Public method to manually trigger sync
  async forcSync() {
    await this.syncOfflineEntries();
  }
  // Method to clear synced entries (cleanup)
  async clearSyncedEntries() {
    if (!this.db) return;
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["offline_entries"], "readwrite");
      const store = transaction.objectStore("offline_entries");
      const index = store.index("synced");
      const request = index.openCursor(true);
      request.onsuccess = (event) => {
        const cursor = event.target.result;
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
const offlineSyncService = new OfflineSyncService();
export {
  offlineSyncService,
  syncStatus
};
