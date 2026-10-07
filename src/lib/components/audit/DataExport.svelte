<script lang="ts">
	/**
	 * Exports for the selected month: the claim pack (PDF or Excel, for the
	 * month or a custom period) and every entry as Excel. The month comes from
	 * the Audit page; both date ranges follow it.
	 */
	import { claimSettings } from '$lib/stores/claim-settings';
	import { toast } from '$lib/stores/toast';
	import { monthRange } from '$lib/utils/dates';

	interface Props {
		selectedYear: number;
		/** 1–12 */
		selectedMonth: number;
	}

	let { selectedYear, selectedMonth }: Props = $props();

	const COMPANY = 'KCT Farming (Pty) Ltd';

	let month = $derived(monthRange(selectedYear, selectedMonth));
	let claimMode = $state<'month' | 'range'>('month');
	let claimStart = $state('');
	let claimEnd = $state('');
	let entriesStart = $state('');
	let entriesEnd = $state('');
	let busy = $state<'pdf' | 'claim-xlsx' | 'entries-xlsx' | null>(null);

	// Follow the page's month; either range can still be edited by hand.
	$effect(() => {
		claimStart = entriesStart = month.start;
		claimEnd = entriesEnd = month.end;
	});

	let claimRange = $derived(
		claimMode === 'month'
			? month
			: claimStart && claimEnd && claimStart <= claimEnd
				? { start: claimStart, end: claimEnd }
				: null
	);
	let entriesValid = $derived(!!entriesStart && !!entriesEnd && entriesStart <= entriesEnd);

	// SheetJS + jsPDF (~1 MB) load only when an export is clicked.
	async function deps() {
		const [{ default: exportService }, { default: supabaseService }] = await Promise.all([
			import('$lib/services/export'),
			import('$lib/services/supabase')
		]);
		return { exportService, supabaseService };
	}

	async function run(
		kind: NonNullable<typeof busy>,
		task: (d: Awaited<ReturnType<typeof deps>>) => Promise<{ success: boolean; error?: string }>
	) {
		busy = kind;
		try {
			const result = await task(await deps());
			if (result.success) toast.success('Export ready');
			else toast.error(result.error || 'Export failed');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Export failed');
		} finally {
			busy = null;
		}
	}

	function claimPdf() {
		if (!claimRange) return;
		const { start, end } = claimRange;
		run('pdf', ({ exportService, supabaseService }) =>
			exportService.exportClaimSummaryPDF(start, end, supabaseService, {
				companyName: COMPANY,
				toleranceL: $claimSettings.dipToleranceL
			})
		);
	}

	function claimExcel() {
		if (!claimRange) return;
		const { start, end } = claimRange;
		run('claim-xlsx', ({ exportService, supabaseService }) =>
			exportService.exportClaimSummary(start, end, supabaseService, COMPANY)
		);
	}

	function entriesExcel() {
		if (!entriesValid) return;
		run('entries-xlsx', ({ exportService, supabaseService }) =>
			exportService.exportToExcel(entriesStart, entriesEnd, supabaseService, COMPANY)
		);
	}
</script>

<div class="exports">
	<div class="row">
		<div class="what">
			<p class="ui-label">Claim pack</p>
			<div class="seg" role="radiogroup" aria-label="Claim period">
				<button role="radio" aria-checked={claimMode === 'month'} class:on={claimMode === 'month'} onclick={() => (claimMode = 'month')}>Month</button>
				<button role="radio" aria-checked={claimMode === 'range'} class:on={claimMode === 'range'} onclick={() => (claimMode = 'range')}>Custom</button>
			</div>
			{#if claimMode === 'range'}
				<div class="dates">
					<input type="date" bind:value={claimStart} aria-label="Claim from" />
					<span>–</span>
					<input type="date" bind:value={claimEnd} aria-label="Claim to" />
				</div>
			{/if}
		</div>
		<div class="btns">
			<button class="ui-btn primary" onclick={claimPdf} disabled={!claimRange || busy !== null}>
				{busy === 'pdf' ? 'Building…' : 'PDF'}
			</button>
			<button class="ui-btn" onclick={claimExcel} disabled={!claimRange || busy !== null}>
				{busy === 'claim-xlsx' ? 'Building…' : 'Excel'}
			</button>
		</div>
	</div>

	<div class="row">
		<div class="what">
			<p class="ui-label">All entries</p>
			<div class="dates">
				<input type="date" bind:value={entriesStart} aria-label="Entries from" />
				<span>–</span>
				<input type="date" bind:value={entriesEnd} aria-label="Entries to" />
			</div>
		</div>
		<div class="btns">
			<button class="ui-btn" onclick={entriesExcel} disabled={!entriesValid || busy !== null}>
				{busy === 'entries-xlsx' ? 'Building…' : 'Excel'}
			</button>
		</div>
	</div>
</div>

<style>
	.exports {
		display: grid;
		gap: 0.5rem;
	}

	.row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.625rem 1rem;
		min-width: 0;
		padding: 0.75rem 0.875rem;
		border: 1px solid var(--gray-200);
		border-radius: var(--radius-lg);
	}

	.what {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.5rem 0.75rem;
		flex: 1 1 auto;
	}

	.what .ui-label {
		min-width: 5.5rem;
	}

	.seg {
		display: inline-flex;
		padding: 2px;
		border-radius: var(--radius-md);
		background: var(--gray-100);
	}

	.seg button {
		padding: 0.25rem 0.625rem;
		border: 0;
		border-radius: 4px;
		background: none;
		font: inherit;
		font-size: var(--text-xs);
		font-weight: var(--font-weight-semibold);
		color: var(--gray-500);
		cursor: pointer;
	}

	.seg button.on {
		background: var(--white);
		color: var(--gray-900);
		box-shadow: var(--shadow-sm);
	}

	.dates {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		color: var(--gray-400);
	}

	.dates input {
		min-width: 0;
		max-width: 9.5rem;
		padding: 0.3125rem 0.5rem;
		border: 1px solid var(--gray-300);
		border-radius: var(--radius-md);
		font: inherit;
		font-size: var(--text-sm);
		color: var(--gray-800);
	}

	.btns {
		display: flex;
		gap: 0.375rem;
		flex: none;
	}

	@media (max-width: 560px) {
		.row {
			flex-direction: column;
			align-items: stretch;
		}

		.btns .ui-btn {
			flex: 1;
		}
	}
</style>
