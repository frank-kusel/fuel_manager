<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { formatDate, formatNumber } from '$lib/utils/formatting';
	import Chart from '$lib/components/charts/Chart.svelte';
	
	let { data }: { data: PageData } = $props();
	
	const { driver, performanceStats, recentEntries, vehicleUsageData, activityData, weeklyData, metrics } = data;
	
	// Prepare vehicle usage chart
	const vehicleUsageChartData = $derived(() => {
		return {
			labels: vehicleUsageData.map(v => v.name),
			datasets: [{
				label: 'Times Used',
				data: vehicleUsageData.map(v => v.count),
				backgroundColor: [
					'rgba(59, 130, 246, 0.5)',
					'rgba(34, 197, 94, 0.5)',
					'rgba(251, 191, 36, 0.5)',
					'rgba(239, 68, 68, 0.5)',
					'rgba(168, 85, 247, 0.5)',
				],
				borderColor: [
					'rgb(59, 130, 246)',
					'rgb(34, 197, 94)',
					'rgb(251, 191, 36)',
					'rgb(239, 68, 68)',
					'rgb(168, 85, 247)',
				],
				borderWidth: 1
			}]
		};
	});
	
	// Prepare weekly trend chart
	const weeklyTrendChartData = $derived(() => {
		return {
			labels: weeklyData.map(w => {
				const date = new Date(w.week);
				return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
			}),
			datasets: [
				{
					label: 'Fuel Used (L)',
					data: weeklyData.map(w => w.fuel),
					borderColor: 'rgb(59, 130, 246)',
					backgroundColor: 'rgba(59, 130, 246, 0.1)',
					yAxisID: 'y',
				},
				{
					label: 'Distance (km)',
					data: weeklyData.map(w => w.distance),
					borderColor: 'rgb(34, 197, 94)',
					backgroundColor: 'rgba(34, 197, 94, 0.1)',
					yAxisID: 'y1',
				}
			]
		};
	});
	
	// Activity fuel consumption chart
	const activityFuelChartData = $derived(() => {
		const topActivities = activityData.slice(0, 6);
		return {
			labels: topActivities.map(a => a.name),
			datasets: [{
				label: 'Fuel Used (L)',
				data: topActivities.map(a => a.fuel),
				backgroundColor: 'rgba(251, 191, 36, 0.5)',
				borderColor: 'rgb(251, 191, 36)',
				borderWidth: 1
			}]
		};
	});
	
	function getCategoryColor(category: string): string {
		const colors: Record<string, string> = {
			planting: 'bg-green-100 text-green-800',
			harvesting: 'bg-yellow-100 text-yellow-800',
			spraying: 'bg-blue-100 text-blue-800',
			fertilizing: 'bg-purple-100 text-purple-800',
			maintenance: 'bg-gray-100 text-gray-800',
			field_prep: 'bg-orange-100 text-orange-800',
			transport: 'bg-indigo-100 text-indigo-800',
			monitoring: 'bg-teal-100 text-teal-800',
			other: 'bg-pink-100 text-pink-800'
		};
		return colors[category] || 'bg-gray-100 text-gray-800';
	}
	
	// Pagination
	let currentPage = $state(1);
	const itemsPerPage = 10;
	const totalPages = Math.ceil(recentEntries.length / itemsPerPage);
	
	const paginatedEntries = $derived(() => {
		const start = (currentPage - 1) * itemsPerPage;
		const end = start + itemsPerPage;
		return recentEntries.slice(start, end);
	});
</script>

<div class="container mx-auto px-4 py-8 max-w-7xl">
	<!-- Header -->
	<div class="flex items-center justify-between mb-8">
		<div>
			<button 
				onclick={() => goto('/fleet')}
				class="text-gray-500 hover:text-gray-700 mb-2 inline-flex items-center"
			>
				← Back to Fleet
			</button>
			<h1 class="text-3xl font-bold text-gray-900">
				{driver.name}
				<span class="text-gray-500 text-xl ml-2">({driver.employee_code})</span>
			</h1>
			<div class="flex items-center gap-4 mt-2 text-gray-600">
				{#if driver.phone}
					<span>📞 {driver.phone}</span>
				{/if}
				{#if driver.email}
					<span>✉️ {driver.email}</span>
				{/if}
				{#if driver.default_vehicle}
					<span>🚛 Default: {driver.default_vehicle.name}</span>
				{/if}
			</div>
			{#if driver.license_number}
				<div class="text-sm text-gray-500 mt-1">
					License: {driver.license_number} 
					{#if driver.license_expiry}
						(Expires: {formatDate(driver.license_expiry)})
					{/if}
				</div>
			{/if}
		</div>
		<button 
			onclick={() => goto(`/fleet?edit-driver=${driver.id}`)}
			class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
		>
			Edit Driver
		</button>
	</div>
	
	<!-- Key Metrics -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
		<div class="bg-white rounded-lg shadow p-6">
			<div class="text-sm text-gray-600">Entries</div>
			<div class="text-2xl font-bold text-gray-900">{metrics.entriesThisMonth}</div>
			<div class="text-xs text-gray-500">This month</div>
		</div>
		
		<div class="bg-white rounded-lg shadow p-6">
			<div class="text-sm text-gray-600">Fuel Used</div>
			<div class="text-2xl font-bold text-gray-900">{formatNumber(metrics.totalFuel)} L</div>
			<div class="text-xs text-gray-500">This month</div>
		</div>
		
		<div class="bg-white rounded-lg shadow p-6">
			<div class="text-sm text-gray-600">Distance</div>
			<div class="text-2xl font-bold text-gray-900">{formatNumber(metrics.totalDistance)} km</div>
			<div class="text-xs text-gray-500">This month</div>
		</div>
		
		<div class="bg-white rounded-lg shadow p-6">
			<div class="text-sm text-gray-600">Avg L/100km</div>
			<div class="text-2xl font-bold text-gray-900">
				{#if metrics.avgConsumption}
					{metrics.avgConsumption.toFixed(1)}
				{:else}
					-
				{/if}
			</div>
			<div class="text-xs text-gray-500">This month</div>
		</div>
		
		<div class="bg-white rounded-lg shadow p-6">
			<div class="text-sm text-gray-600">Vehicles</div>
			<div class="text-2xl font-bold text-gray-900">{metrics.vehiclesUsed}</div>
			<div class="text-xs text-gray-500">Used this month</div>
		</div>
		
		<div class="bg-white rounded-lg shadow p-6">
			<div class="text-sm text-gray-600">Activities</div>
			<div class="text-2xl font-bold text-gray-900">{metrics.activitiesPerformed}</div>
			<div class="text-xs text-gray-500">Types performed</div>
		</div>
	</div>
	
	<!-- Charts Row 1 -->
	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
		<!-- Vehicle Usage -->
		<div class="bg-white rounded-lg shadow p-6">
			<h2 class="text-lg font-semibold mb-4">Vehicle Usage</h2>
			{#if vehicleUsageData.length > 0}
				<Chart 
					type="doughnut" 
					data={vehicleUsageChartData()} 
					options={{
						responsive: true,
						maintainAspectRatio: false,
						plugins: {
							legend: { position: 'bottom' }
						}
					}}
					height="250px"
				/>
			{:else}
				<p class="text-gray-500 text-center py-8">No vehicle usage data</p>
			{/if}
		</div>
		
		<!-- Weekly Trend -->
		<div class="bg-white rounded-lg shadow p-6 lg:col-span-2">
			<h2 class="text-lg font-semibold mb-4">Weekly Performance</h2>
			{#if weeklyData.length > 0}
				<Chart 
					type="line" 
					data={weeklyTrendChartData()} 
					options={{
						responsive: true,
						maintainAspectRatio: false,
						interaction: {
							mode: 'index',
							intersect: false,
						},
						plugins: {
							legend: { position: 'bottom' }
						},
						scales: {
							y: {
								type: 'linear',
								display: true,
								position: 'left',
								title: { display: true, text: 'Fuel (L)' }
							},
							y1: {
								type: 'linear',
								display: true,
								position: 'right',
								title: { display: true, text: 'Distance (km)' },
								grid: { drawOnChartArea: false }
							}
						}
					}}
					height="250px"
				/>
			{:else}
				<p class="text-gray-500 text-center py-8">No weekly data available</p>
			{/if}
		</div>
	</div>
	
	<!-- Activity Breakdown -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
		<!-- Activity Fuel Chart -->
		<div class="bg-white rounded-lg shadow p-6">
			<h2 class="text-lg font-semibold mb-4">Activity Fuel Consumption</h2>
			{#if activityData.length > 0}
				<Chart 
					type="bar" 
					data={activityFuelChartData()} 
					options={{
						responsive: true,
						maintainAspectRatio: false,
						plugins: {
							legend: { display: false }
						},
						scales: {
							y: {
								beginAtZero: true,
								title: { display: true, text: 'Litres' }
							}
						}
					}}
					height="250px"
				/>
			{:else}
				<p class="text-gray-500 text-center py-8">No activity data available</p>
			{/if}
		</div>
		
		<!-- Activity Details -->
		<div class="bg-white rounded-lg shadow p-6">
			<h2 class="text-lg font-semibold mb-4">Activity Details</h2>
			{#if activityData.length > 0}
				<div class="space-y-3">
					{#each activityData.slice(0, 6) as activity}
						<div class="flex items-center justify-between p-3 border rounded-lg">
							<div class="flex items-center gap-3">
								<span class="text-2xl">{activity.icon || '📋'}</span>
								<div>
									<div class="font-medium">{activity.name}</div>
									<span class={`text-xs px-2 py-1 rounded ${getCategoryColor(activity.category)}`}>
										{activity.category}
									</span>
								</div>
							</div>
							<div class="text-right">
								<div class="font-medium">{activity.count} times</div>
								<div class="text-sm text-gray-600">{formatNumber(activity.fuel)} L</div>
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<p class="text-gray-500 text-center py-8">No activity data available</p>
			{/if}
		</div>
	</div>
	
	<!-- Recent Entries Table -->
	<div class="bg-white rounded-lg shadow">
		<div class="px-6 py-4 border-b">
			<h2 class="text-lg font-semibold">Recent Fuel Entries</h2>
		</div>
		
		{#if recentEntries.length > 0}
			<div class="overflow-x-auto">
				<table class="w-full">
					<thead class="bg-gray-50 border-b">
						<tr>
							<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Activity</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
							<th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Distance</th>
							<th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Fuel</th>
							<th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">L/100km</th>
						</tr>
					</thead>
					<tbody class="divide-y">
						{#each paginatedEntries() as entry}
							<tr class="hover:bg-gray-50">
								<td class="px-4 py-3 text-sm">
									{formatDate(entry.entry_date)} {entry.time}
								</td>
								<td class="px-4 py-3 text-sm">
									{entry.vehicle?.name || 'Unknown'}
									{#if entry.vehicle?.registration}
										<span class="text-gray-500 text-xs">({entry.vehicle.registration})</span>
									{/if}
								</td>
								<td class="px-4 py-3 text-sm">
									<span class="inline-flex items-center">
										{entry.activity?.icon || '📋'}
										<span class="ml-1">{entry.activity?.name || 'Unknown'}</span>
									</span>
								</td>
								<td class="px-4 py-3 text-sm">
									{entry.field?.name || entry.zone?.name || '-'}
								</td>
								<td class="px-4 py-3 text-sm text-right">
									{#if entry.odometer_end && entry.odometer_start}
										{entry.odometer_end - entry.odometer_start} km
									{:else}
										-
									{/if}
								</td>
								<td class="px-4 py-3 text-sm text-right">
									{formatNumber(entry.litres_used)} L
								</td>
								<td class="px-4 py-3 text-sm text-right">
									{#if entry.fuel_consumption_l_per_100km}
										{entry.fuel_consumption_l_per_100km.toFixed(1)}
									{:else}
										-
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			
			<!-- Pagination -->
			{#if totalPages > 1}
				<div class="px-6 py-4 border-t flex items-center justify-between">
					<div class="text-sm text-gray-600">
						Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, recentEntries.length)} of {recentEntries.length} entries
					</div>
					<div class="flex gap-2">
						<button 
							onclick={() => currentPage = Math.max(1, currentPage - 1)}
							disabled={currentPage === 1}
							class="px-3 py-1 rounded border {currentPage === 1 ? 'bg-gray-100 text-gray-400' : 'bg-white hover:bg-gray-50'}"
						>
							Previous
						</button>
						<span class="px-3 py-1">
							Page {currentPage} of {totalPages}
						</span>
						<button 
							onclick={() => currentPage = Math.min(totalPages, currentPage + 1)}
							disabled={currentPage === totalPages}
							class="px-3 py-1 rounded border {currentPage === totalPages ? 'bg-gray-100 text-gray-400' : 'bg-white hover:bg-gray-50'}"
						>
							Next
						</button>
					</div>
				</div>
			{/if}
		{:else}
			<div class="px-6 py-12 text-center text-gray-500">
				No fuel entries found for this driver
			</div>
		{/if}
	</div>
</div>