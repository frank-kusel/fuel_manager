// Sign-in and the farm this device works on.
//
// Fuel Manager now reads and writes a Fallow farm's records (the `fuel_manager`
// schema in the Farm Manager project), so every request is made as a signed-in
// farm member, and says which farm with the `x-fallow-farm` header. The farm
// is remembered on the device; someone in one farm never has to pick.

import { writable, get } from 'svelte/store';
import supabaseService from '$lib/services/supabase';

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
}

const FARM_KEY = 'fallow_farm_id';

export function storedFarmId(): string | null {
	try {
		return localStorage.getItem(FARM_KEY);
	} catch {
		return null;
	}
}

function storeFarmId(id: string | null) {
	try {
		if (id) localStorage.setItem(FARM_KEY, id);
		else localStorage.removeItem(FARM_KEY);
	} catch {
		/* private mode: asked again next time */
	}
}

/** The farm a list of farms settles on: the remembered one, else the only one. */
export function settleFarm(farms: FarmChoice[], remembered: string | null): string | null {
	if (remembered && farms.some((f) => f.id === remembered)) return remembered;
	return farms.length === 1 ? farms[0].id : null;
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

	async function loadFarms(email: string | null) {
		const client = supabaseService.getClient();
		const { data, error } = await client.from('my_farms').select('id, name, role').order('name');
		if (error) {
			set({ status: 'signed_out', email, farms: [], farmId: null, error: error.message });
			return;
		}
		const farms = (data || []) as FarmChoice[];
		const farmId = settleFarm(farms, storedFarmId());
		storeFarmId(farmId);
		set({
			status: farms.length === 0 ? 'no_farm' : farmId ? 'ready' : 'pick_farm',
			email,
			farms,
			farmId,
			error: null
		});
	}

	return {
		subscribe,

		/** Picks up a session kept on this device. Call once, in the browser. */
		async start() {
			if (started) return;
			started = true;
			await supabaseService.init();
			const client = supabaseService.getClient();
			const { data } = await client.auth.getSession();
			if (data.session) {
				await loadFarms(data.session.user.email ?? null);
			} else {
				update((s) => ({ ...s, status: 'signed_out' }));
			}
			// Signed out elsewhere, or the session could not be renewed.
			client.auth.onAuthStateChange((event) => {
				if (event === 'SIGNED_OUT') {
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
			storeFarmId(id);
			set({ ...state, farmId: id, status: 'ready' });
		},

		/**
		 * Back to the farm pick (someone in more than one farm). The page starts
		 * again so nothing cached from the other farm is shown.
		 */
		changeFarm() {
			storeFarmId(null);
			location.reload();
		},

		async signOut() {
			storeFarmId(null);
			await supabaseService.getClient().auth.signOut();
			location.reload();
		}
	};
}

export const auth = createAuthStore();
