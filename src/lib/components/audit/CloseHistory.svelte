<script lang="ts">
	/**
	 * Close history and the leak trend.
	 *
	 * The gap column is a LEVEL, not a monthly increment: a close carries the
	 * book forward instead of resetting it to the dip, so each gap already
	 * contains every earlier month's unexplained difference. Read the column as
	 * a walk — oscillating around zero is dipstick noise, drifting steadily one
	 * way is a real loss. Summing it would double-count, which is why there is
	 * no total row. See $lib/utils/tank-balance.
	 */
	import { fmtMonthYear } from '$lib/utils/dates';
	import { bandVariance, varianceTrend, type CloseRow } from '$lib/utils/tank-balance';

	interface Props {
		rows: CloseRow[];
		toleranceL?: number;
	}

	let { rows, toleranceL }: Props = $props();

	const nf = new Intl.NumberFormat('en-ZA');

	let trend = $derived(varianceTrend(rows));

	function signed(v: number): string {
		return `${v > 0 ? '+' : ''}${nf.format(Math.round(v))}`;
	}

	/** Bar width relative to the largest absolute gap in the window. */
	let maxGap = $derived(Math.max(1, ...trend.points.map((p) => Math.abs(p.gapLitres))));
</script>

<section class="panel">
	<h2 class="panel-title">Leak trend</h2>

	{#if trend.months === 0}
		<p class="empty-note">No months closed yet.</p>
	{:else}
		<div class="trend-head">
			<div>
				<div class="trend-k">Standing gap</div>
				<div class="trend-v {bandVariance(trend.latestGapLitres, Math.abs(rows[0]?.measured_level ?? 0), toleranceL)?.key ?? ''}">
					{signed(trend.latestGapLitres ?? 0)}<span class="unit">L</span>
				</div>
				<div class="trend-sub">book vs physical at the latest close</div>
			</div>
			<div>
				<div class="trend-k">Drift</div>
				<div class="trend-v">
					{trend.driftLitres !== null ? signed(trend.driftLitres) : '—'}<span class="unit">L</span>
				</div>
				<div class="trend-sub">
					over {trend.months}
					{trend.months === 1 ? 'close' : 'closes'}{#if trend.sinceDate}, since the {fmtMonthYear(
							trend.sinceDate
						)} re-baseline{/if}
				</div>
			</div>
		</div>

		<p class="trend-note">
			The gap is a running level, not a monthly loss — a close carries the book forward, so it is
			never reset. Wandering either side of zero is dipstick noise; a steady walk one way is not.
			{#if trend.anyApproximate}
				<em>Rows before migration 020 are approximate — their stored variance folds in movements
					after the dip.</em>
			{/if}
		</p>

		<div class="table-wrap">
			<table class="history-table">
				<thead>
					<tr>
						<th>Month</th>
						<th class="num">Carried fwd</th>
						<th class="num">Dip</th>
						<th class="num">Gap</th>
						<th></th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each trend.points as point (point.date)}
						{@const row = rows.find((r) => r.reconciliation_date === point.date)}
						<tr>
							<td>{fmtMonthYear(point.date)}</td>
							<td class="num">{nf.format(Math.round(row?.calculated_level ?? 0))} L</td>
							<td class="num">{nf.format(Math.round(row?.measured_level ?? 0))} L</td>
							<td class="num" class:approx={point.approximate}>{signed(point.gapLitres)} L</td>
							<td class="spark">
								<span
									class="bar"
									class:neg={point.gapLitres < 0}
									style="width: {(Math.abs(point.gapLitres) / maxGap) * 100}%"
								></span>
							</td>
							<td class="accepted">{row?.accepted ? '✓' : '!'}</td>
						</tr>
					{/each}
					{#if trend.sinceDate}
						<tr class="rebase-row">
							<td colspan="6">⟲ Re-baselined {fmtMonthYear(trend.sinceDate)} — earlier closes belong to a different book</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>
	{/if}
</section>

<style>
	.panel {
		background: var(--white);
		border: 1px solid var(--gray-200);
		border-radius: var(--radius-lg);
		padding: 1rem 1.125rem;
	}

	.panel-title {
		font-size: var(--text-sm);
		font-weight: var(--font-weight-semibold);
		color: var(--gray-600);
		margin: 0 0 0.75rem;
	}

	.empty-note {
		font-size: var(--text-sm);
		color: var(--gray-500);
		margin: 0;
	}

	.trend-head {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 1rem;
		margin-bottom: 0.75rem;
	}

	.trend-k {
		font-size: var(--text-xs);
		color: var(--gray-500);
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.trend-v {
		font-size: var(--text-2xl);
		font-weight: var(--font-weight-bold);
		color: var(--gray-900);
		font-variant-numeric: tabular-nums;
		line-height: 1.1;
	}

	.trend-v.acceptable {
		color: #92400e;
	}

	.trend-v.high {
		color: #991b1b;
	}

	.trend-v .unit {
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--gray-500);
		margin-left: 0.2rem;
	}

	.trend-sub {
		font-size: var(--text-xs);
		color: var(--gray-500);
		margin-top: 0.15rem;
	}

	.trend-note {
		font-size: var(--text-xs);
		color: var(--gray-500);
		line-height: 1.5;
		margin: 0 0 0.875rem;
	}

	.trend-note em {
		color: var(--gray-600);
	}

	.table-wrap {
		overflow-x: auto;
	}

	.history-table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-sm);
	}

	.history-table th {
		text-align: left;
		font-weight: var(--font-weight-semibold);
		color: var(--gray-500);
		font-size: var(--text-xs);
		padding: 0 0.5rem 0.35rem 0;
		white-space: nowrap;
	}

	.history-table td {
		padding: 0.4rem 0.5rem 0.4rem 0;
		border-top: 1px solid var(--gray-100);
		color: var(--gray-700);
		white-space: nowrap;
	}

	.history-table th.num,
	.history-table td.num {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	.history-table td.approx {
		font-style: italic;
		opacity: 0.8;
	}

	.spark {
		width: 30%;
		min-width: 60px;
	}

	.bar {
		display: block;
		height: 6px;
		border-radius: 3px;
		background: var(--gray-300);
	}

	.bar.neg {
		background: #fca5a5;
	}

	.accepted {
		text-align: center;
		color: var(--gray-400);
	}

	.rebase-row td {
		font-size: var(--text-xs);
		color: #92400e;
		background: #fffbeb;
		white-space: normal;
	}
</style>
