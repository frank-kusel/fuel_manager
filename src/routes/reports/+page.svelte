<script lang="ts">
	// The export panel that used to sit here was a duplicate of the one on
	// /audit — and worse, it had no month bound to it, so it always defaulted to
	// the current month rather than the one being claimed. Exports live on
	// /audit, driven by that page's month selector.
	import VehicleFuelHistory from '$lib/components/reports/VehicleFuelHistory.svelte';
</script>

<svelte:head>
	<title>Vehicle fuel history - FarmTrack</title>
</svelte:head>

<div class="reports-container">
	<div class="header">
		<h1>Vehicle fuel history</h1>
		<p>Per-vehicle consumption over time. Exports live on the Audit page.</p>
	</div>

	<VehicleFuelHistory />
</div>

<style>
	.reports-container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0.25rem;
	}

	.header {
		margin-bottom: 2rem;
	}

	.header h1 {
		margin: 0;
		font-size: 2rem;
		font-weight: 700;
		color: #111827;
	}

	.header p {
		margin: 0.5rem 0 0;
		color: #6b7280;
		font-size: 1rem;
	}

	@media (max-width: 768px) {
		.header h1 {
			font-size: 1.5rem;
		}
	}
</style>
