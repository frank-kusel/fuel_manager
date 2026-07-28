import { redirect } from '@sveltejs/kit';

/**
 * The month-end close now lives on /audit as the first section, so the whole
 * month-end ritual — close, leak trend, claim, readiness, export — is one
 * top-to-bottom flow instead of two pages that referenced each other.
 *
 * 307, not 308: a permanent redirect is cached by browsers indefinitely and is
 * painful to walk back if this ever moves again.
 */
export const load = () => {
	redirect(307, '/audit');
};
