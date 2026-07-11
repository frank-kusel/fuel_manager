import { writable } from 'svelte/store';

export interface Toast {
	id: number;
	kind: 'ok' | 'err';
	text: string;
}

/**
 * App-wide toast notifications, rendered once by ToastContainer in the root
 * layout. Success toasts auto-dismiss quickly; errors linger long enough to
 * read.
 */
function createToastStore() {
	const { subscribe, update } = writable<Toast[]>([]);
	let nextId = 1;

	function push(kind: Toast['kind'], text: string) {
		const id = nextId++;
		update((toasts) => [...toasts, { id, kind, text }]);
		setTimeout(() => dismiss(id), kind === 'ok' ? 2500 : 6000);
		return id;
	}

	function dismiss(id: number) {
		update((toasts) => toasts.filter((t) => t.id !== id));
	}

	return {
		subscribe,
		success: (text: string) => push('ok', text),
		error: (text: string) => push('err', text),
		dismiss
	};
}

export const toast = createToastStore();
