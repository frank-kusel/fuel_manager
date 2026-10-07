<script lang="ts">
	import DashboardInsights from '$lib/components/dashboard/DashboardInsights.svelte';
	import DatabaseLink from '$lib/components/ui/DatabaseLink.svelte';
</script>

<svelte:head>
	<title>Dashboard - FarmTrack</title>
	<meta
		name="description"
		content="FarmTrack: this month's diesel use, its pace against last month, and where it went"
	/>
</svelte:head>

<div class="ui-page">
	<div class="ui-head">
		<h1>Dashboard</h1>
		<DatabaseLink />
	</div>

	<DashboardInsights />
</div>
