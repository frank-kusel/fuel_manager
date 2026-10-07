<script lang="ts">
	/**
	 * Month-end readiness, pinned above the work tabs.
	 *
	 * This is a band rather than a tab on purpose: readiness is a *precondition*
	 * for both closing and exporting, so it has to be visible WHILE you do
	 * either. On its own tab, "2 activities still need confirmation" is hidden
	 * the moment you switch to Claim to read the eligible litres — precisely
	 * when it matters.
	 *
	 * Collapsed it is one line: how many checks are outstanding, and the single
	 * next thing to do. Expanded it is the full list, each blocker carrying its
	 * own action — summary and index in one control. It never auto-expands; the
	 * summary already names the top blocker.
	 */
	import { formatLitres, formatNumber } from '$lib/utils/formatting';
	import {
		firstOutstanding,
		type ReadinessItem,
		type ReadinessTarget
	} from '$lib/utils/audit-readiness';

	interface Props {
		items: ReadinessItem[];
		next: ReadinessItem | null;
		outstanding: number;
		monthLabel: string;
		eligibleLitres: number;
		refundRands: number;
		onact: (target: ReadinessTarget) => void;
		onexports: () => void;
	}

	let {
		items,
		next,
		outstanding,
		monthLabel,
		eligibleLitres,
		refundRands,
		onact,
		onexports
	}: Props = $props();

	let open = $state(false);

	// A close over tolerance is a `warn` check, so it already counts as
	// outstanding — no separate over-tolerance state is needed.
	let tone = $derived(outstanding === 0 ? 'ok' : 'warn');
	let headline = $derived(next ?? firstOutstanding(items));

	// Month-scoped rows and standing ones read very differently next to a month
	// selector: without the split, two failures that have nothing to do with
	// June make the band say "June is 4 of 6 ready".
	let monthItems = $derived(items.filter((i) => i.scope === 'month'));
	let standingItems = $derived(items.filter((i) => i.scope === 'standing'));
</script>

<section class="band {tone}" class:open>
	<div class="summary">
		<button
			class="toggle"
			aria-expanded={open}
			onclick={() => (open = !open)}
		>
			<span class="ic">{tone === 'ok' ? '✓' : '!'}</span>
			<span class="text">
				{#if outstanding > 0}
					<strong>
						{outstanding}
						{outstanding === 1 ? 'check' : 'checks'} outstanding
					</strong>
					<!-- The detail, not the title: titles name the goal ("June closed"),
					     which reads as already done next to an outstanding count. -->
					{#if headline}<span class="sub">{headline.detail}</span>{/if}
				{:else}
					<strong>{monthLabel} ready</strong>
					<span class="sub"
						>{formatLitres(eligibleLitres)} L eligible · R {formatNumber(refundRands, 0)} estimate</span
					>
				{/if}
			</span>
			<svg
				class="chev"
				class:open
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"><path d="M6 9l6 6 6-6" /></svg
			>
		</button>

		{#if next?.action}
			<button class="cta" onclick={() => onact(next.action!.target)}>
				{next.action.label}
			</button>
		{:else if outstanding === 0}
			<!-- Green still gets a verb: exports are the month's actual last step. -->
			<button class="cta ghost" onclick={onexports}>Claim and exports</button>
		{/if}
	</div>

	{#if open}
		<div class="detail">
			{#each [{ label: 'This month', rows: monthItems }, { label: 'Standing', rows: standingItems }] as group (group.label)}
				{#if group.rows.length > 0}
					<div class="group-label">{group.label}</div>
					{#each group.rows as item (item.id)}
						<div class="row">
							<span class="dot {item.state}">
								{item.state === 'ok' ? '✓' : item.state === 'info' ? '·' : '!'}
							</span>
							<span class="row-text">
								<span class="row-t">{item.title}</span>
								<span class="row-d">{item.detail}</span>
							</span>
							{#if item.action}
								<button class="row-act" onclick={() => onact(item.action!.target)}>
									{item.action.label}
								</button>
							{/if}
						</div>
					{/each}
				{/if}
			{/each}
		</div>
	{/if}
</section>

<style>
	/* Same panel treatment as everything else on the page — the state icon
	   carries the tone. */
	.band {
		background: var(--white);
		border: 1px solid var(--gray-200);
		border-radius: var(--radius-lg);
	}

	.summary {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.6rem 0.75rem;
	}

	.toggle {
		flex: 1;
		min-width: 0;
		display: flex;
		align-items: center;
		gap: 0.6rem;
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		text-align: left;
		font: inherit;
		color: inherit;
	}

	.ic {
		flex-shrink: 0;
		width: 1.5rem;
		height: 1.5rem;
		border-radius: var(--radius-md);
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: var(--font-weight-bold);
		font-size: var(--text-sm);
		background: var(--gray-100);
		color: var(--gray-500);
	}

	.band.ok .ic {
		background: #dcfce7;
		color: var(--success-dark);
	}

	.band.warn .ic {
		background: #fef3c7;
		color: #92400e;
	}

	.text {
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	.text strong {
		font-size: var(--text-sm);
		font-weight: var(--font-weight-semibold);
		color: var(--gray-900);
	}

	.sub {
		font-size: var(--text-xs);
		color: var(--gray-500);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.chev {
		flex-shrink: 0;
		width: 1rem;
		height: 1rem;
		color: var(--gray-400);
		transition: transform 0.15s ease;
	}

	.chev.open {
		transform: rotate(180deg);
	}

	.cta {
		flex-shrink: 0;
		background: var(--brand);
		color: #fff;
		border: none;
		border-radius: var(--radius-md);
		padding: 0.45rem 0.75rem;
		font-size: var(--text-xs);
		font-weight: var(--font-weight-semibold);
		cursor: pointer;
		white-space: nowrap;
	}

	.cta.ghost {
		background: none;
		color: var(--brand);
		border: 1px solid var(--gray-300);
	}

	.detail {
		border-top: 1px solid var(--gray-100);
		padding: 0.5rem 0.75rem 0.75rem;
	}

	.group-label {
		font-size: var(--text-xs);
		color: var(--gray-400);
		margin: 0.5rem 0 0.25rem;
	}

	.row {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		padding: 0.3rem 0;
	}

	.dot {
		flex-shrink: 0;
		width: 1.15rem;
		height: 1.15rem;
		border-radius: var(--radius-sm);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: var(--text-xs);
		font-weight: var(--font-weight-bold);
		margin-top: 0.1rem;
		background: var(--gray-100);
		color: var(--gray-400);
	}

	.dot.ok {
		background: #dcfce7;
		color: var(--success-dark);
	}

	.dot.blocker {
		background: #fee2e2;
		color: #991b1b;
	}

	.dot.warn {
		background: #fef3c7;
		color: #92400e;
	}

	.row-text {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	.row-t {
		font-size: var(--text-sm);
		color: var(--gray-900);
	}

	.row-d {
		font-size: var(--text-xs);
		color: var(--gray-500);
		line-height: 1.4;
	}

	.row-act {
		flex-shrink: 0;
		background: none;
		border: none;
		padding: 0;
		font-size: var(--text-xs);
		font-weight: 500;
		color: var(--brand);
		cursor: pointer;
		white-space: nowrap;
		margin-top: 0.1rem;
	}

	.row-act:hover {
		text-decoration: underline;
	}

	@media (max-width: 768px) {
		/* Keep the action on the summary row. Stacking it full-width read better
		   in isolation but pushed the chips + band + tabs stack past 210px, which
		   is a real cost on a 375px screen where the ledger below is long. */
		.summary {
			padding: 0.5rem 0.6rem;
			gap: 0.4rem;
		}

		.cta {
			padding: 0.5rem 0.6rem;
			font-size: 0.72rem;
		}

		/* Next to the CTA there's room for ~20 characters — wrap rather than
		   cut the one line that says what's wrong. */
		.sub {
			white-space: normal;
		}

		.chev {
			display: none;
		}
	}
</style>
