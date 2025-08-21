<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { formatDate, formatNumber } from '$lib/utils/formatting';
	import Chart from '$lib/components/charts/Chart.svelte';
	
	let { data }: { data: PageData } = $props();
	
	const { activity, vehicleStats, recentEntries, monthlyStats, hourDistribution, topLocations, metrics } = data;
	
	// Prepare monthly trend chart data
	const monthlyTrendData = $derived(() => {
		return {
			labels: monthlyStats.map(m => {
				const [year, month] = m.month.split('-');
				return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
			}),
			datasets: [
				{
					label: 'Fuel Usage (L)',
					data: monthlyStats.map(m => m.fuel),
					borderColor: 'rgb(59, 130, 246)',
					backgroundColor: 'rgba(59, 130, 246, 0.1)',
					yAxisID: 'y',
				},
				{
					label: 'Activity Count',
					data: monthlyStats.map(m => m.entries),
					borderColor: 'rgb(34, 197, 94)',
					backgroundColor: 'rgba(34, 197, 94, 0.1)',
					yAxisID: 'y1',
				}
			]
		};
	});
	
	// Prepare hour distribution chart data
	const hourChartData = $derived(() => {
		const labels = Array.from({length: 24}, (_, i) => `${i}:00`);
		return {
			labels,
			datasets: [{
				label: 'Activities by Hour',
				data: hourDistribution,
				backgroundColor: 'rgba(168, 85, 247, 0.5)',
				borderColor: 'rgb(168, 85, 247)',
				borderWidth: 1
			}]
		};
	});
	
	// Vehicle efficiency comparison
	const vehicleEfficiencyData = $derived(() => {
		const sorted = [...vehicleStats].sort((a, b) => (b.avg_consumption || 0) - (a.avg_consumption || 0));
		return {
			labels: sorted.slice(0, 10).map(v => v.vehicle_name),
			datasets: [{
				label: 'Avg Consumption (L/100km)',
				data: sorted.slice(0, 10).map(v => v.avg_consumption || 0),
				backgroundColor: sorted.slice(0, 10).map((_, i) => 
					i < 3 ? 'rgba(239, 68, 68, 0.5)' : 'rgba(59, 130, 246, 0.5)'
				),
				borderColor: sorted.slice(0, 10).map((_, i) => 
					i < 3 ? 'rgb(239, 68, 68)' : 'rgb(59, 130, 246)'
				),
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
	
	// Pagination for vehicle stats
	let currentPage = $state(1);
	const itemsPerPage = 10;
	const totalPages = Math.ceil(vehicleStats.length / itemsPerPage);
	
	const paginatedVehicles = $derived(() => {
		const start = (currentPage - 1) * itemsPerPage;
		const end = start + itemsPerPage;
		return vehicleStats.slice(start, end);
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
			<h1 class="text-3xl font-bold text-gray-900 flex items-center gap-3">
				<span class="text-4xl">{activity.icon || '📋'}</span>
				{activity.name}
				{#if activity.name_zulu}
					<span class="text-gray-500 text-xl">({activity.name_zulu})</span>
				{/if}
			</h1>
			<div class="flex items-center gap-4 mt-2">
				<span class={`px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor(activity.category)}`}>
					{activity.category}
				</span>
				<p class="text-gray-600">Code: {activity.code}</p>
			</div>
			{#if activity.description}
				<p class="text-gray-600 mt-2">{activity.description}</p>
			{/if}
		</div>
		<button 
			onclick={() => goto(`/fleet?edit-activity=${activity.id}`)}
			class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
		>
			Edit Activity
		</button>
	</div>
	
	<!-- Key Metrics -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
		<div class="bg-white rounded-lg shadow p-6">
			<div class="text-sm text-gray-600">Total Vehicles</div>
			<div class="text-2xl font-bold text-gray-900">{metrics.totalVehicles}</div>
			<div class="text-xs text-gray-500">Using this activity</div>
		</div>
		
		<div class="bg-white rounded-lg shadow p-6">
			<div class="text-sm text-gray-600">Total Fuel Used</div>
			<div class="text-2xl font-bold text-gray-900">{formatNumber(metrics.totalFuel)} L</div>
			<div class="text-xs text-gray-500">All time</div>
		</div>
		
		<div class="bg-white rounded-lg shadow p-6">
			<div class="text-sm text-gray-600">Total Distance</div>
			<div class="text-2xl font-bold text-gray-900">{formatNumber(metrics.totalDistance)} km</div>
			<div class="text-xs text-gray-500">All time</div>
		</div>
		
		<div class="bg-white rounded-lg shadow p-6">
			<div class="text-sm text-gray-600">Total Entries</div>
			<div class="text-2xl font-bold text-gray-900">{formatNumber(metrics.totalEntries)}</div>
			<div class="text-xs text-gray-500">All time</div>
		</div>
	</div>
	
	<!-- Charts Row 1 -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
		<!-- Monthly Trend -->
		<div class="bg-white rounded-lg shadow p-6">
			<h2 class="text-lg font-semibold mb-4">Monthly Trend</h2>
			{#if monthlyStats.length > 0}
				<Chart 
					type="line" 
					data={monthlyTrendData()} 
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
								title: { display: true, text: 'Count' },
								grid: { drawOnChartArea: false }
							}
						}
					}}
					height="250px"
				/>
			{:else}
				<p class="text-gray-500 text-center py-8">No trend data available</p>
			{/if}
		</div>
		
		<!-- Hour Distribution -->
		<div class="bg-white rounded-lg shadow p-6">
			<h2 class="text-lg font-semibold mb-4">Peak Activity Hours</h2>
			<Chart 
				type="bar" 
				data={hourChartData()} 
				options={{
					responsive: true,
					maintainAspectRatio: false,
					plugins: {
						legend: { display: false }
					},
					scales: {
						y: {
							beginAtZero: true,
							title: { display: true, text: 'Number of Activities' }
						}
					}
				}}
				height="250px"
			/>
		</div>
	</div>
	
	<!-- Charts Row 2 -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
		<!-- Vehicle Efficiency -->
		<div class="bg-white rounded-lg shadow p-6">
			<h2 class="text-lg font-semibold mb-4">Vehicle Efficiency Comparison</h2>
			{#if vehicleStats.length > 0}
				<Chart 
					type="bar" 
					data={vehicleEfficiencyData()} 
					options={{
						responsive: true,
						maintainAspectRatio: false,
						indexAxis: 'y',
						plugins: {
							legend: { display: false }
						},
						scales: {
							x: {
								beginAtZero: true,
								title: { display: true, text: 'L/100km' }
							}
						}
					}}
					height="250px"
				/>
			{:else}
				<p class="text-gray-500 text-center py-8">No efficiency data available</p>
			{/if}
		</div>
		
		<!-- Top Locations -->
		<div class="bg-white rounded-lg shadow p-6">
			<h2 class="text-lg font-semibold mb-4">Top Locations</h2>
			{#if topLocations.length > 0}
				<div class="space-y-2">
					{#each topLocations as location}
						<div class="flex justify-between items-center py-2 border-b">
							<span class="text-sm font-medium text-gray-900">{location.name}</span>
							<span class="text-sm text-gray-600">{location.count} activities</span>
						</div>
					{/each}
				</div>
			{:else}
				<p class="text-gray-500 text-center py-8">No location data available</p>
			{/if}
		</div>
	</div>
	
	<!-- Vehicle Performance Table -->
	<div class="bg-white rounded-lg shadow mb-8">
		<div class="px-6 py-4 border-b">
			<h2 class="text-lg font-semibold">Vehicle Performance</h2>
		</div>
		
		{#if vehicleStats.length > 0}
			<div class="overflow-x-auto">
				<table class="w-full">
					<thead class="bg-gray-50 border-b">
						<tr>
							<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
							<th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Entries</th>
							<th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Fuel</th>
							<th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg per Entry</th>
							<th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Distance</th>
							<th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg L/100km</th>
							<th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
						</tr>
					</thead>
					<tbody class="divide-y">
						{#each paginatedVehicles() as vehicle}
							<tr class="hover:bg-gray-50">
								<td class="px-4 py-3 text-sm font-medium">
									{vehicle.vehicle_name}
									{#if vehicle.vehicle_registration}
										<span class="text-gray-500 text-xs">({vehicle.vehicle_registration})</span>
									{/if}
								</td>
								<td class="px-4 py-3 text-sm">{vehicle.vehicle_type}</td>
								<td class="px-4 py-3 text-sm text-right">{vehicle.entry_count}</td>
								<td class="px-4 py-3 text-sm text-right">{formatNumber(vehicle.total_fuel)} L</td>
								<td class="px-4 py-3 text-sm text-right">{vehicle.avg_fuel_per_entry.toFixed(1)} L</td>
								<td class="px-4 py-3 text-sm text-right">{formatNumber(vehicle.total_distance)} km</td>
								<td class="px-4 py-3 text-sm text-right">
									{#if vehicle.avg_consumption > 0}
										<span class={vehicle.avg_consumption > 30 ? 'text-red-600 font-medium' : ''}>
											{vehicle.avg_consumption.toFixed(1)}
										</span>
									{:else}
										-
									{/if}
								</td>
								<td class="px-4 py-3 text-sm text-center">
									<a href="/fleet/vehicles/{vehicle.vehicle_id}" class="text-blue-600 hover:text-blue-800">
										View Details →
									</a>
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
						Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, vehicleStats.length)} of {vehicleStats.length} vehicles
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
				No vehicle performance data available for this activity
			</div>
		{/if}
	</div>
</div>