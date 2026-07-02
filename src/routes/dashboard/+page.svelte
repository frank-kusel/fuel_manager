<script lang="ts">
	import DashboardInsights from '$lib/components/dashboard/DashboardInsights.svelte';
</script>

<svelte:head>
	<title>Dashboard - FarmTrack</title>
	<meta name="description" content="FarmTrack operations dashboard: monthly fuel breakdown, fleet outliers, tank runway, and attention flags" />
</svelte:head>

<div class="dashboard-page">
	<div class="dashboard-header">
		<div class="header-content">
			<h1>Dashboard</h1>
		</div>
	</div>

	<DashboardInsights />
</div>

<style>
	.dashboard-page {
		width: 100%;
		max-width: 1400px;
		margin: 0 auto;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.dashboard-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
	}

	.header-content h1 {
		font-size: 2.25rem;
		font-weight: 700;
		color: var(--color-text-primary);
		line-height: 1.2;
	}

	/* Mobile Responsiveness */
	@media (max-width: 768px) {
		.dashboard-page {
			padding: 0 0.5rem 0.5rem;
			gap: 0.5rem;
		}

		.dashboard-header {
			flex-direction: column;
			gap: 0.75rem;
			padding: 0.5rem 0;
		}

		.header-content h1 {
			font-size: 1.75rem;
		}
	}

</style>