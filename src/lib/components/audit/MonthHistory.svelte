<script lang="ts">
	/**
	 * Every month at a glance: litres used, litres claimed, the refund, and the
	 * gap the close signed off — drawn as a bar either side of zero, so a gap
	 * walking steadily one way (a leak) stands out from dipstick noise. Each
	 * gap is a running level, not a monthly loss: it is never summed.
	 */
	import { fmtMonthYear, financialYearStart, fyLabel, isoLocal } from '$lib/utils/dates';
	import { formatRand, formatSigned, formatWholeLitres } from '$lib/utils/formatting';
	import { bandVariance, varianceTrend, type CloseRow } from '$lib/utils/tank-balance';
	import type { MonthClaim } from '$lib/utils/claim-totals';

	interface Props {
		months: MonthClaim[] | null;
		closes: CloseRow[];
		rateCents: number;
		toleranceL: number;
		selectedKey: string;
		/** Months the page can open (the chips); others are read-only rows. */
		selectable: Set<string>;
		onselect: (key: string) => void;
	}

	let { months, closes, rateCents, toleranceL, selectedKey, selectable, onselect }: Props =
		$props();

	const TONE = { good: 'good', acceptable: 'warn', high: 'bad' } as const;

	let closeOf = $derived(new Map(closes.map((c) => [c.reconciliation_date.slice(0, 7), c])));

	let rows = $derived(
		(months ?? []).map((m) => {
			const close = closeOf.get(m.month) ?? null;
			const measured = close?.measured_level ?? null;
			const gap =
				close && measured !== null
					? close.book_at_dip !== null && close.book_at_dip !== undefined
						? close.book_at_dip - measured
						: (close.variance ?? null)
					: null;
			return {
				...m,
				refund: (m.claimableLitres * rateCents) / 100,
				close,
				gap,
				band: gap !== null && measured !== null ? bandVariance(gap, measured, toleranceL) : null
			};
		})
	);
	let maxGap = $derived(Math.max(toleranceL * 2, ...rows.map((r) => Math.abs(r.gap ?? 0))));

	const seasonStart = isoLocal(financialYearStart()).slice(0, 7);
	let season = $derived(
		rows
			.filter((r) => r.month >= seasonStart)
			.reduce(
				(t, r) => ({
					used: t.used + r.totalLitres,
					claimable: t.claimable + r.claimableLitres,
					refund: t.refund + r.refund
				}),
				{ used: 0, claimable: 0, refund: 0 }
			)
	);
	let trend = $derived(varianceTrend([...closes].sort((a, b) => (a.reconciliation_date < b.reconciliation_date ? 1 : -1))));
</script>

<section class="ui-panel history" id="history">
	<div class="ui-panel-head">
		<p class="ui-label">History</p>
		{#if trend.driftLitres !== null}
			<span class="ui-muted drift" title="Change in the gap over {trend.months} closes">
				gap drift {formatSigned(trend.driftLitres)} L / {trend.months} closes
			</span>
		{/if}
	</div>

	{#if months === null}
		<div class="ui-skeleton" style="height: 12rem"></div>
	{:else}
		<div class="season">
			<div>
				<p class="ui-label">Season {fyLabel(financialYearStart())}</p>
				<p class="ui-figure s-v">{formatWholeLitres(season.used)}<small>L used</small></p>
			</div>
			<div>
				<p class="ui-label">Claimed</p>
				<p class="ui-figure s-v">{formatWholeLitres(season.claimable)}<small>L</small></p>
			</div>
			<div>
				<p class="ui-label">Refund</p>
				<p class="ui-figure s-v good">{formatRand(season.refund)}</p>
			</div>
		</div>

		<div class="table-wrap">
			<table>
				<thead>
					<tr>
						<th>Month</th>
						<th class="num">Used</th>
						<th class="num">Claimed</th>
						<th class="num">Refund</th>
						<th class="gap-h">Gap at close</th>
					</tr>
				</thead>
				<tbody>
					{#each rows as r (r.month)}
						{@const canOpen = selectable.has(r.month)}
						<tr
							class:on={r.month === selectedKey}
							class:clickable={canOpen}
							onclick={() => canOpen && onselect(r.month)}
						>
							<td class="month">
								{fmtMonthYear(`${r.month}-01`)}
								{#if r.missingAdjustments > 0}
									<span class="flag" title="{formatWholeLitres(r.excludedLitres)} L held back: classifier result missing">●</span>
								{/if}
							</td>
							<td class="num">{formatWholeLitres(r.totalLitres)}</td>
							<td class="num claim">
								{formatWholeLitres(r.claimableLitres)}
								<span class="share">{r.totalLitres > 0 ? Math.round((r.claimableLitres / r.totalLitres) * 100) : 0}%</span>
							</td>
							<td class="num">{formatRand(r.refund)}</td>
							<td><div class="gap">
								{#if r.gap !== null}
									<span class="bar" aria-hidden="true">
										<i
											class={r.band ? TONE[r.band.key] : ''}
											style="{r.gap >= 0 ? 'left' : 'right'}: 50%; width: {(Math.abs(r.gap) / maxGap) * 50}%"
										></i>
									</span>
									<span class="gap-v {r.band ? TONE[r.band.key] : ''}">{formatSigned(r.gap)}</span>
								{:else}
									<span class="ui-muted open">not closed</span>
								{/if}
							</div></td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</section>

<style>
	p {
		margin: 0;
	}

	.drift {
		font-size: var(--text-xs);
	}

	.season {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.75rem;
		padding-bottom: 0.875rem;
		margin-bottom: 0.5rem;
		border-bottom: 1px solid var(--gray-100);
	}

	.s-v {
		font-size: 1.375rem;
		margin-top: 0.25rem;
	}

	.s-v small {
		font-size: 0.5em;
	}

	.s-v.good {
		color: #1f6b3a;
	}

	.table-wrap {
		overflow-x: auto;
		margin: 0 -0.25rem;
	}


	table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-sm);
		font-variant-numeric: tabular-nums;
	}

	th {
		text-align: left;
		font-size: var(--text-xs);
		font-weight: var(--font-weight-semibold);
		color: var(--gray-500);
		padding: 0.25rem;
		white-space: nowrap;
	}

	td {
		padding: 0.4375rem 0.25rem;
		border-top: 1px solid var(--gray-100);
		white-space: nowrap;
	}

	tr.clickable {
		cursor: pointer;
	}

	tr.clickable:hover td {
		background: var(--gray-50);
	}

	tr.on td {
		background: var(--brand-tint-weak);
		font-weight: var(--font-weight-semibold);
	}

	.num {
		text-align: right;
	}

	.claim {
		color: #1f6b3a;
		font-weight: 600;
	}

	.share {
		display: inline-block;
		width: 2.25rem;
		color: var(--gray-400);
		font-size: var(--text-xs);
		font-weight: 400;
	}

	.flag {
		color: var(--warning);
		font-size: 0.625rem;
		vertical-align: middle;
	}

	.gap-h {
		text-align: center;
		min-width: 9rem;
	}

	.gap {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.bar {
		position: relative;
		flex: 1;
		height: 8px;
		min-width: 4rem;
		background: linear-gradient(to right, transparent calc(50% - 0.5px), var(--gray-300) calc(50% - 0.5px), var(--gray-300) calc(50% + 0.5px), transparent calc(50% + 0.5px));
	}

	.bar i {
		position: absolute;
		top: 0;
		bottom: 0;
		border-radius: 2px;
		background: var(--gray-400);
	}

	.bar i.good {
		background: var(--success);
	}
	.bar i.warn {
		background: var(--warning);
	}
	.bar i.bad {
		background: var(--error);
	}

	.gap-v {
		width: 3.25rem;
		text-align: right;
		font-weight: 600;
	}
	.gap-v.good {
		color: #1f6b3a;
	}
	.gap-v.warn {
		color: #8a4b08;
	}
	.gap-v.bad {
		color: var(--error);
	}

	.open {
		font-size: var(--text-xs);
		margin: 0 auto;
	}

	/* Phones: no card — the table runs edge to edge on the page background,
	   like the Tank chart. The side margins cancel the page gutter (main
	   0.5rem + ui-page 0.25rem); the first and last columns keep it as
	   padding so the figures still line up with the rest of the page. */
	@media (max-width: 639px) {
		.history {
			margin: 0 -0.75rem;
			padding: 0.5rem 0 0;
			background: none;
			border: 0;
			border-radius: 0;
		}

		.history .ui-panel-head,
		.history .season {
			padding-left: 0.75rem;
			padding-right: 0.75rem;
		}

		.table-wrap {
			margin: 0;
		}

		th:first-child,
		td:first-child {
			padding-left: 0.75rem;
		}

		th:last-child,
		td:last-child {
			padding-right: 0.75rem;
		}

		/* Fit every column on a phone: the share is the least needed figure. */
		.share {
			display: none;
		}

		.gap-h {
			min-width: 0;
		}

		.bar {
			min-width: 2rem;
		}

		.gap-v {
			width: 2.75rem;
		}
	}
</style>
