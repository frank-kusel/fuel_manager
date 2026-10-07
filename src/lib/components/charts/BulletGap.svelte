<script lang="ts">
	/**
	 * A book-vs-dip gap on its tolerance bands: the inner band is "good", the
	 * outer "acceptable", beyond is high. Zero sits in the middle, so the side
	 * the marker falls on says whether the book claims more (right) or less
	 * (left) than the dip found.
	 */
	import { bandLimits, bandVariance, DEFAULT_DIP_TOLERANCE_L } from '$lib/utils/tank-balance';
	import { formatSigned } from '$lib/utils/formatting';

	interface Props {
		gap: number;
		/** The dip the gap is measured against — percentage bands scale with it. */
		measured: number;
		toleranceL?: number;
		/** Show the ± limits under the bar. */
		labels?: boolean;
	}

	let { gap, measured, toleranceL = DEFAULT_DIP_TOLERANCE_L, labels = false }: Props = $props();

	let limits = $derived(bandLimits(measured, toleranceL));
	let band = $derived(bandVariance(gap, measured, toleranceL));
	let range = $derived(Math.max(limits.acceptable * 1.5, Math.abs(gap) * 1.15));
	const x = (litres: number) => 50 + (litres / range) * 50;
</script>

<div class="bullet" role="img" aria-label="Gap {formatSigned(gap)} litres, {band?.label ?? ''}">
	<svg viewBox="0 0 100 12" preserveAspectRatio="none" aria-hidden="true">
		<rect x="0" y="3" width="100" height="6" rx="1" class="track" />
		<rect
			x={x(-limits.acceptable)}
			y="3"
			width={x(limits.acceptable) - x(-limits.acceptable)}
			height="6"
			class="acceptable"
		/>
		<rect
			x={x(-limits.good)}
			y="3"
			width={x(limits.good) - x(-limits.good)}
			height="6"
			class="good"
		/>
		<line x1="50" x2="50" y1="1" y2="11" class="zero" />
	</svg>
	<span class="marker {band?.key ?? ''}" style="left: {x(gap)}%"></span>
	{#if labels}
		<div class="limits" aria-hidden="true">
			<span style="left: {x(-limits.good)}%">−{Math.round(limits.good)}</span>
			<span style="left: 50%">0</span>
			<span style="left: {x(limits.good)}%">+{Math.round(limits.good)}</span>
		</div>
	{/if}
</div>

<style>
	.bullet {
		position: relative;
		width: 100%;
	}

	svg {
		display: block;
		width: 100%;
		height: 12px;
	}

	.track {
		fill: #fbeaea;
	}

	.acceptable {
		fill: #fdf3e2;
	}

	.good {
		fill: #e3f1e7;
	}

	.zero {
		stroke: var(--gray-400);
		stroke-width: 1;
		vector-effect: non-scaling-stroke;
	}

	.marker {
		position: absolute;
		top: 50%;
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: var(--gray-700);
		border: 2px solid var(--white);
		box-shadow: 0 0 0 1px rgba(28, 25, 23, 0.25);
		transform: translate(-50%, -50%);
	}

	.bullet:has(.limits) .marker {
		top: 6px;
	}

	.marker.good {
		background: var(--success);
	}

	.marker.acceptable {
		background: var(--warning);
	}

	.marker.high {
		background: var(--error);
	}

	.limits {
		position: relative;
		height: 1rem;
		font-size: 0.625rem;
		color: var(--gray-400);
		font-variant-numeric: tabular-nums;
	}

	.limits span {
		position: absolute;
		top: 2px;
		transform: translateX(-50%);
	}
</style>
