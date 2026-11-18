// Sign-in and the farm this device works on.
//
// Fuel Manager now reads and writes a Fallow farm's records (the `fuel_manager`
// schema in the Farm Manager project), so every request is made as a signed-in
// farm member, and says which farm with the `x-fallow-farm` header. The farm
// is remembered on the device; someone in one farm never has to pick.
//
// Without signal the app still opens on the device's kept sign-in and farm,
// so fill-ups can be queued; it checks the sign-in again when signal returns.

import { writable, get } from 'svelte/store';
import supabaseService from '$lib/services/supabase';
import {
	clearFarmCopies,
	setFarm,
	storedFarmId as rememberedFarm,
	watchOtherTabs
} from '$lib/services/farm';

export interface FarmChoice {
	id: string;
	name: string;
	role: 'owner' | 'member';
}

export type AuthStatus = 'loading' | 'signed_out' | 'pick_farm' | 'ready' | 'no_farm';

export interface AuthState {
	status: AuthStatus;
	email: string | null;
	farms: FarmChoice[];
	farmId: string | null;
	error: string | null;
	/** Opened without signal on the kept sign-in; checked again when online. */
	offline?: boolean;
}

/** The farms last loaded, for opening without signal. */
const FARMS_KEY = 'fallow_farms';
/** Where supabase-js keeps the session (storageKey in services/supabase). */
const SESSION_KEY = 'fallow-fuel-auth';

export function storedFarmId(): string | null {
	return rememberedFarm();
}

/** The farm a list of farms settles on: the remembered one, else the only one. */
export function settleFarm(farms: FarmChoice[], remembered: string | null): string | null {
	if (remembered && farms.some((f) => f.id === remembered)) return remembered;
	return farms.length === 1 ? farms[0].id : null;
}

/** A failure to reach the server, as opposed to an answer from it. */
export function isNetworkError(message: string | null | undefined): boolean {
	if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
	const m = (message ?? '').toLowerCase();
	return (
		m.includes('failed to fetch') ||
		m.includes('networkerror') ||
		m.includes('network request failed') ||
		m.includes('load failed') ||
		m.includes('fetch failed') ||
		m.includes('retryable')
	);
}

function readJson<T>(key: string): T | null {
	try {
		return JSON.parse(localStorage.getItem(key) || 'null') as T | null;
	} catch {
		return null;
	}
}

function keptFarms(): FarmChoice[] {
	return readJson<FarmChoice[]>(FARMS_KEY) ?? [];
}

function keepFarms(farms: FarmChoice[] | null) {
	try {
		if (farms) localStorage.setItem(FARMS_KEY, JSON.stringify(farms));
		else localStorage.removeItem(FARMS_KEY);
	} catch {
		/* private mode */
	}
}

function keptEmail(): string | null {
	return readJson<{ user?: { email?: string } }>(SESSION_KEY)?.user?.email ?? null;
}

function createAuthStore() {
	const store = writable<AuthState>({
		status: 'loading',
		email: null,
		farms: [],
		farmId: null,
		error: null
	});
	const { subscribe, update, set } = store;
	let started = false;

	/**
	 * Without signal: open on the kept sign-in and the remembered farm, if the
	 * device has both. Returns false when it cannot.
	 */
	function openOffline(): boolean {
		const farms = keptFarms();
		const farmId = settleFarm(farms, rememberedFarm());
		if (!farmId || !keptEmail()) return false;
		setFarm(farmId);
		set({ status: 'ready', email: keptEmail(), farms, farmId, error: null, offline: true });
		return true;
	}

	async function loadFarms(email: string | null) {
		const client = supabaseService.getClient();
		const { data, error } = await client.from('my_farms').select('id, name, role').order('name');
		if (error) {
			if (isNetworkError(error.message) && openOffline()) return;
			set({ status: 'signed_out', email, farms: [], farmId: null, error: error.message });
			return;
		}
		const farms = (data || []) as FarmChoice[];
		keepFarms(farms);
		const farmId = settleFarm(farms, rememberedFarm());
		setFarm(farmId);
		set({
			status: farms.length === 0 ? 'no_farm' : farmId ? 'ready' : 'pick_farm',
			email,
			farms,
			farmId,
			error: null
		});
	}

	/** Signal is back after an offline start: check the sign-in properly. */
	async function recheck() {
		if (!get(store).offline) return;
		const client = supabaseService.getClient();
		const { data, error } = await client.auth.getSession();
		if (data.session) {
			await loadFarms(data.session.user.email ?? null);
		} else if (!isNetworkError(error?.message)) {
			set({ status: 'signed_out', email: null, farms: [], farmId: null, error: null });
		}
	}

	async function forgetDevice() {
		setFarm(null);
		keepFarms(null);
		await clearFarmCopies();
	}

	return {
		subscribe,

		/** Picks up a session kept on this device. Call once, in the browser. */
		async start() {
			if (started) return;
			started = true;
			watchOtherTabs();
			await supabaseService.init();
			const client = supabaseService.getClient();
			const { data, error } = await client.auth.getSession();
			if (data.session) {
				await loadFarms(data.session.user.email ?? null);
			} else if (isNetworkError(error?.message) && openOffline()) {
				/* opened offline */
			} else {
				update((s) => ({ ...s, status: 'signed_out' }));
			}
			window.addEventListener('online', () => void recheck());
			// Signed out elsewhere, or the session could not be renewed.
			client.auth.onAuthStateChange((event) => {
				if (event === 'SIGNED_OUT') {
					void forgetDevice();
					set({ status: 'signed_out', email: null, farms: [], farmId: null, error: null });
				}
			});
		},

		async signIn(email: string, password: string): Promise<boolean> {
			await supabaseService.init();
			const client = supabaseService.getClient();
			update((s) => ({ ...s, error: null }));
			const { data, error } = await client.auth.signInWithPassword({
				email: email.trim(),
				password
			});
			if (error || !data.session) {
				update((s) => ({
					...s,
					status: 'signed_out',
					error:
						error?.message === 'Invalid login credentials'
							? 'That email and password do not match. Use your Fallow sign-in.'
							: isNetworkError(error?.message)
								? 'No signal. Signing in needs a connection.'
								: (error?.message ?? 'Could not sign in.')
				}));
				return false;
			}
			await loadFarms(data.session.user.email ?? null);
			return true;
		},

		pickFarm(id: string) {
			const state = get(store);
			if (!state.farms.some((f) => f.id === id)) return;
			setFarm(id);
			set({ ...state, farmId: id, status: 'ready' });
		},

		/**
		 * Back to the farm pick (someone in more than one farm). The page starts
		 * again, with the other farm's copies removed from the device.
		 */
		async changeFarm() {
			await forgetDevice();
			location.reload();
		},

		async signOut() {
			await forgetDevice();
			await supabaseService.getClient().auth.signOut();
			location.reload();
		}
	};
}

export const auth = createAuthStore();
