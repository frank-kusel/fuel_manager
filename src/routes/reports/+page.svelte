<script lang="ts">
	import DataExport from '$lib/components/dashboard/DataExport.svelte';
	import VehicleFuelHistory from '$lib/components/reports/VehicleFuelHistory.svelte';
</script>

<svelte:head>
	<title>Reports & Exports - FarmTrack</title>
</svelte:head>

<div class="reports-container">
	<div class="header">
		<h1>Reports & Exports</h1>
		<p>Generate detailed analytics, Excel exports, and PDF reports</p>
	</div>

	<!-- Data Export Component -->
	<DataExport />

	<!-- Vehicle Fuel History -->
	<div class="section-divider"></div>
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

	.section-divider {
		height: 2rem;
	}

	@media (max-width: 768px) {
		.header h1 {
			font-size: 1.5rem;
		}
	}
</style>
