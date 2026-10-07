<script lang="ts">
	/**
	 * The settings that are actually used: the diesel refund rate, the DRS
	 * registration number and the dipstick tolerance. Shared across devices via
	 * the app_settings row (migration 022); per-browser until it is applied.
	 */
	import { onMount } from 'svelte';
	import { claimSettings } from '$lib/stores/claim-settings';
	import { toast } from '$lib/stores/toast';

	interface Props {
		onclose: () => void;
	}

	let { onclose }: Props = $props();

	const settingsState = claimSettings.state;
	let rateCents = $state<number | null>($claimSettings.rateCents);
	let regNo = $state($claimSettings.regNo);
	let toleranceL = $state<number | null>($claimSettings.dipToleranceL);
	let saving = $state(false);

	onMount(() => {
		claimSettings.load().then(() => {
			rateCents = $claimSettings.rateCents;
			regNo = $claimSettings.regNo;
			toleranceL = $claimSettings.dipToleranceL;
		});
	});

	let valid = $derived(
		rateCents !== null && Number(rateCents) >= 0 && toleranceL !== null && Number(toleranceL) > 0
	);
	let dirty = $derived(
		Number(rateCents) !== $claimSettings.rateCents ||
			regNo.trim() !== $claimSettings.regNo ||
			Number(toleranceL) !== $claimSettings.dipToleranceL
	);

	async function save() {
		if (!valid) return;
		saving = true;
		const error = await claimSettings.save({
			rateCents: Number(rateCents),
			regNo: regNo.trim(),
			dipToleranceL: Number(toleranceL)
		});
		saving = false;
		if (error) {
			toast.error(`Settings not saved: ${error}`);
			return;
		}
		toast.success('Settings saved');
		onclose();
	}

	function onkeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') onclose();
	}
</script>

<svelte:window {onkeydown} />

<div class="overlay" onclick={onclose} aria-hidden="true"></div>
<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="settings-title">
	<header>
		<h2 id="settings-title">Settings</h2>
		<button class="icon-btn" onclick={onclose} aria-label="Close">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
		</button>
	</header>

	<form
		onsubmit={(e) => {
			e.preventDefault();
			save();
		}}
	>
		<label>
			<span>Refund rate</span>
			<div class="input-unit">
				<input type="number" inputmode="decimal" min="0" step="0.1" bind:value={rateCents} />
				<em>c/L</em>
			</div>
		</label>
		<label>
			<span>DRS registration no.</span>
			<input type="text" bind:value={regNo} placeholder="Not set" autocomplete="off" />
		</label>
		<label>
			<span>Dipstick tolerance</span>
			<div class="input-unit">
				<input type="number" inputmode="decimal" min="1" step="10" bind:value={toleranceL} />
				<em>L</em>
			</div>
		</label>

		<p class="source" class:local={$settingsState.source === 'local'}>
			{$settingsState.source === 'db' ? 'Shared across all devices' : 'Saved on this device only'}
		</p>

		<footer>
			<button type="button" class="btn ghost" onclick={onclose}>Cancel</button>
			<button type="submit" class="btn primary" disabled={!valid || !dirty || saving}>
				{saving ? 'Saving…' : 'Save'}
			</button>
		</footer>
	</form>
</div>

<style>
	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(28, 25, 23, 0.45);
		z-index: 1000;
	}

	.sheet {
		position: fixed;
		z-index: 1001;
		left: 50%;
		top: 50%;
		transform: translate(-50%, -50%);
		width: min(26rem, calc(100% - 2rem));
		background: var(--white);
		border-radius: var(--radius-xl);
		box-shadow: 0 24px 64px rgba(28, 25, 23, 0.25);
		padding: 1.25rem;
	}

	@media (max-width: 640px) {
		.sheet {
			top: auto;
			bottom: 0;
			transform: translateX(-50%);
			width: 100%;
			border-radius: var(--radius-xl) var(--radius-xl) 0 0;
			padding-bottom: calc(1.25rem + env(safe-area-inset-bottom));
		}
	}

	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	h2 {
		margin: 0;
		font-size: var(--text-lg);
	}

	.icon-btn {
		display: grid;
		place-items: center;
		width: 2rem;
		height: 2rem;
		border: 0;
		border-radius: var(--radius-md);
		background: none;
		color: var(--gray-500);
		cursor: pointer;
	}

	.icon-btn:hover {
		background: var(--gray-100);
	}

	.icon-btn svg {
		width: 1.125rem;
		height: 1.125rem;
	}

	form {
		display: grid;
		gap: 0.875rem;
	}

	label {
		display: grid;
		gap: 0.375rem;
	}

	label > span {
		font-size: var(--text-xs);
		font-weight: var(--font-weight-semibold);
		color: var(--gray-500);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	input {
		width: 100%;
		padding: 0.625rem 0.75rem;
		border: 1px solid var(--gray-300);
		border-radius: var(--radius-md);
		font: inherit;
		font-variant-numeric: tabular-nums;
	}

	input:focus {
		outline: none;
		border-color: var(--brand);
		box-shadow: var(--focus-ring);
	}

	.input-unit {
		position: relative;
	}

	.input-unit em {
		position: absolute;
		right: 0.75rem;
		top: 50%;
		transform: translateY(-50%);
		font-style: normal;
		font-size: var(--text-sm);
		color: var(--gray-400);
		pointer-events: none;
	}

	.input-unit input {
		padding-right: 2.75rem;
	}

	.source {
		margin: 0;
		font-size: var(--text-xs);
		color: var(--gray-500);
	}

	.source::before {
		content: '';
		display: inline-block;
		width: 0.4rem;
		height: 0.4rem;
		margin-right: 0.4rem;
		border-radius: 50%;
		background: var(--success);
		vertical-align: middle;
	}

	.source.local::before {
		background: var(--warning);
	}

	footer {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		margin-top: 0.25rem;
	}

	.btn {
		padding: 0.625rem 1rem;
		border-radius: var(--radius-md);
		font: inherit;
		font-weight: var(--font-weight-semibold);
		cursor: pointer;
		border: 1px solid transparent;
	}

	.btn.ghost {
		background: none;
		border-color: var(--gray-300);
		color: var(--gray-700);
	}

	.btn.primary {
		background: var(--brand);
		color: var(--white);
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
