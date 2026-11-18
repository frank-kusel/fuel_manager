// The farm this tab works on, and the copies kept on the device for it.
//
// Every data request names the farm in the `x-fallow-farm` header. The farm is
// held in memory for this tab, so picking another farm in a second tab never
// sends this tab's writes to it: that tab's pick reloads this one instead.

export const FARM_KEY = 'fallow_farm_id';
/** The farm the device's cached copies (pickers, log, tank, draft) belong to. */
const CACHE_FARM_KEY = 'fallow_cache_farm_id';
const DRAFT_KEY = 'fuelEntryDraft';
const API_CACHE_PREFIX = 'farmtrack-api-';

function read(key: string): string | null {
	try {
		return localStorage.getItem(key);
	} catch {
		return null;
	}
}

function write(key: string, value: string | null) {
	try {
		if (value) localStorage.setItem(key, value);
		else localStorage.removeItem(key);
	} catch {
		/* private mode: asked again next time */
	}
}

let current: string | null = typeof localStorage === 'undefined' ? null : read(FARM_KEY);

/** The farm requests from this tab are for. */
export function requestFarm(): string | null {
	return current;
}

/** The farm remembered on the device (the last one picked in any tab). */
export function storedFarmId(): string | null {
	return read(FARM_KEY);
}

/** Picks the farm for this tab and remembers it on the device. */
export function setFarm(id: string | null) {
	current = id;
	write(FARM_KEY, id);
	if (id && read(CACHE_FARM_KEY) !== id) {
		void clearFarmCopies();
		write(CACHE_FARM_KEY, id);
	}
}

/**
 * Removes every copy of a farm's records kept on the device: the pickers,
 * log, tank and dashboard copies, the half-filled fill-up, and the service
 * worker's copies of the server's answers. Queued fill-ups stay: each is sent
 * only to the farm it was made for.
 */
export async function clearFarmCopies(): Promise<void> {
	try {
		const keys: string[] = [];
		for (let i = 0; i < localStorage.length; i++) {
			const k = localStorage.key(i);
			if (k && (k.startsWith('farmtrack_') || k === DRAFT_KEY) && k !== 'farmtrack_audit_settings_v1') {
				keys.push(k);
			}
		}
		keys.forEach((k) => localStorage.removeItem(k));
		localStorage.removeItem(CACHE_FARM_KEY);
	} catch {
		/* nothing kept */
	}
	try {
		if (typeof caches !== 'undefined') {
			const names = await caches.keys();
			await Promise.all(names.filter((n) => n.startsWith(API_CACHE_PREFIX)).map((n) => caches.delete(n)));
		}
	} catch {
		/* no service worker caches */
	}
}

/** Another tab picked a farm: this tab starts again on it. */
export function watchOtherTabs() {
	if (typeof window === 'undefined') return;
	window.addEventListener('storage', (event) => {
		if (event.key === FARM_KEY && event.newValue !== current) location.reload();
	});
}
