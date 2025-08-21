<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { formatDate, formatNumber } from '$lib/utils/formatting';
	import Chart from '$lib/components/charts/Chart.svelte';
	
	let { data }: { data: PageData } = $props();
	
	const { vehicle, fuelEntries, monthlyStats, metrics } = data;
	
	// Prepare data for consumption chart
	const consumptionChartData = $derived(() => {
		const chartData = monthlyStats
			.filter(entry => entry.fuel_consumption_l_per_100km && entry.fuel_consumption_l_per_100km > 0)
			.map(entry => ({
				date: entry.entry_date,
				value: entry.fuel_consumption_l_per_100km
			}));
		
		return {
			labels: chartData.map(d => formatDate(d.date, 'short')),
			datasets: [{
				label: 'Fuel Consumption (L/100km)',
				data: chartData.map(d => d.value),
				borderColor: 'rgb(59, 130, 246)',
				backgroundColor: 'rgba(59, 130, 246, 0.1)',
				tension: 0.1
			}]
		};
	});
	
	// Prepare data for daily fuel usage chart
	const dailyUsageChartData = $derived(() => {
		const dailyTotals = new Map();
		
		monthlyStats.forEach(entry => {
			const date = entry.entry_date;
			const current = dailyTotals.get(date) || 0;
			dailyTotals.set(date, current + (entry.litres_used || 0));
		});
		
		const sortedDates = Array.from(dailyTotals.keys()).sort();
		
		return {
			labels: sortedDates.map(d => formatDate(d, 'short')),
			datasets: [{
				label: 'Daily Fuel Usage (L)',
				data: sortedDates.map(d => dailyTotals.get(d)),
				backgroundColor: 'rgba(34, 197, 94, 0.5)',
				borderColor: 'rgb(34, 197, 94)',
				borderWidth: 1
			}]
		};
	});
	
	// Activity breakdown data
	const activityBreakdown = $derived(() => {
		const breakdown = new Map();
		
		fuelEntries.forEach(entry => {
			if (entry.activity) {
				const key = entry.activity.name;
				const current = breakdown.get(key) || { 
					count: 0, 
					fuel: 0, 
					icon: entry.activity.icon,
					category: entry.activity.category 
				};
				current.count++;
				current.fuel += entry.litres_used || 0;
				breakdown.set(key, current);
			}
		});
		
		return Array.from(breakdown.entries())
			.map(([name, data]) => ({ name, ...data }))
			.sort((a, b) => b.fuel - a.fuel);
	});
	
	// Pagination state
	let currentPage = $state(1);
	const itemsPerPage = 10;
	const totalPages = Math.ceil(fuelEntries.length / itemsPerPage);
	
	const paginatedEntries = $derived(() => {
		const start = (currentPage - 1) * itemsPerPage;
		const end = start + itemsPerPage;
		return fuelEntries.slice(start, end);
	});
	
	function getCategoryColor(category: string): string {
		const colors: Record<string, string> = {
			planting: 'bg-green-100 text-green-800',
			harvesting: 'bg-yellow-100 text-yellow-800',
			spraying: 'bg-blue-100 text-blue-800',
			fertilizing: 'bg-purple-100 text-purple-800',
			maintenance: 'bg-gray-100 text-gray-800',
			other: 'bg-orange-100 text-orange-800'
		};
		return colors[category] || 'bg-gray-100 text-gray-800';
	}
	
	// Maintenance alerts based on odometer readings
	const maintenanceAlerts = $derived(() => {
		const currentOdometer = vehicle.current_odometer || 0;
		const alerts = [];
		
		// Standard maintenance intervals
		const intervals = {
			'Oil Change': { interval: 10000, urgency: 'warning' },
			'Air Filter': { interval: 15000, urgency: 'info' },
			'Hydraulic Service': { interval: 25000, urgency: 'warning' },
			'Major Service': { interval: 50000, urgency: 'critical' }
		};
		
		Object.entries(intervals).forEach(([service, config]) => {
			const nextService = Math.ceil(currentOdometer / config.interval) * config.interval;
			const kmRemaining = nextService - currentOdometer;
			
			if (kmRemaining <= 2000) {
				alerts.push({
					service,
					nextService,
					kmRemaining,
					urgency: kmRemaining <= 500 ? 'critical' : config.urgency
				});
			}
		});
		
		return alerts.sort((a, b) => a.kmRemaining - b.kmRemaining);
	});
	
	function getAlertColor(urgency: string): string {
		const colors = {
			critical: 'bg-red-50 border-red-200 text-red-800',
			warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
			info: 'bg-blue-50 border-blue-200 text-blue-800'
		};
		return colors[urgency] || colors.info;
	}
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
				{vehicle.name}
				{#if vehicle.registration}
					<span class="text-gray-500 text-xl ml-2">({vehicle.registration})</span>
				{/if}
			</h1>
			<p class="text-gray-600 mt-1">
				{vehicle.type} • Code: {vehicle.code}
				{#if vehicle.make || vehicle.model}
					• {vehicle.make} {vehicle.model}
				{/if}
			</p>
		</div>
		<button 
			onclick={() => goto(`/fleet?edit=${vehicle.id}`)}
			class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
		>
			Edit Vehicle
		</button>
	</div>
	
	<!-- Key Metrics -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
		<div class="bg-white rounded-lg shadow p-6">
			<div class="text-sm text-gray-600">Current Odometer</div>
			<div class="text-2xl font-bold text-gray-900">
				{formatNumber(vehicle.current_odometer || 0)} {vehicle.odometer_unit || 'km'}
			</div>
		</div>
		
		<div class="bg-white rounded-lg shadow p-6">
			<div class="text-sm text-gray-600">Avg Consumption</div>
			<div class="text-2xl font-bold text-gray-900">
				{#if vehicle.average_consumption_l_per_100km}
					{vehicle.average_consumption_l_per_100km.toFixed(1)} L/100km
				{:else}
					No data
				{/if}
			</div>
		</div>
		
		<div class="bg-white rounded-lg shadow p-6">
			<div class="text-sm text-gray-600">Monthly Fuel</div>
			<div class="text-2xl font-bold text-gray-900">
				{formatNumber(metrics.totalFuel)} L
			</div>
		</div>
		
		<div class="bg-white rounded-lg shadow p-6">
			<div class="text-sm text-gray-600">Monthly Distance</div>
			<div class="text-2xl font-bold text-gray-900">
				{formatNumber(metrics.totalDistance)} km
			</div>
		</div>
		
		<div class="bg-white rounded-lg shadow p-6">
			<div class="text-sm text-gray-600">Data Quality</div>
			<div class="text-2xl font-bold text-gray-900">
				{metrics.dataQuality.toFixed(0)}%
			</div>
			<div class="text-xs text-gray-500">Valid readings</div>
		</div>
	</div>
	
	<!-- Maintenance Alerts -->
	{#if maintenanceAlerts().length > 0}
		<div class="bg-white rounded-lg shadow p-6 mb-8">
			<h2 class="text-lg font-semibold mb-4 flex items-center">
				<span class="text-2xl mr-2">🔧</span>
				Maintenance Alerts
			</h2>
			<div class="grid gap-3">
				{#each maintenanceAlerts() as alert}
					<div class="border rounded-lg p-4 {getAlertColor(alert.urgency)}">
						<div class="flex items-center justify-between">
							<div>
								<div class="font-medium">{alert.service}</div>
								<div class="text-sm opacity-75">
									Next service: {formatNumber(alert.nextService)} {vehicle.odometer_unit || 'km'}
								</div>
							</div>
							<div class="text-right">
								<div class="font-bold">
									{alert.kmRemaining} {vehicle.odometer_unit || 'km'}
								</div>
								<div class="text-xs opacity-75">remaining</div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
	
	<!-- Charts Section -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
		<!-- Consumption Trend -->
		<div class="bg-white rounded-lg shadow p-6">
			<h2 class="text-lg font-semibold mb-4">Fuel Consumption Trend</h2>
			{#if consumptionChartData().labels.length > 0}
				<Chart 
					type="line" 
					data={consumptionChartData()} 
					options={{
						responsive: true,
						maintainAspectRatio: false,
						plugins: {
							legend: { display: false }
						},
						scales: {
							y: {
								beginAtZero: false,
								title: {
									display: true,
									text: 'L/100km'
								}
							}
						}
					}}
					height="250px"
				/>
			{:else}
				<p class="text-gray-500 text-center py-8">No consumption data available</p>
			{/if}
		</div>
		
		<!-- Daily Usage -->
		<div class="bg-white rounded-lg shadow p-6">
			<h2 class="text-lg font-semibold mb-4">Daily Fuel Usage</h2>
			{#if dailyUsageChartData().labels.length > 0}
				<Chart 
					type="bar" 
					data={dailyUsageChartData()} 
					options={{
						responsive: true,
						maintainAspectRatio: false,
						plugins: {
							legend: { display: false }
						},
						scales: {
							y: {
								beginAtZero: true,
								title: {
									display: true,
									text: 'Litres'
								}
							}
						}
					}}
					height="250px"
				/>
			{:else}
				<p class="text-gray-500 text-center py-8">No usage data available</p>
			{/if}
		</div>
	</div>
	
	<!-- Activity Breakdown -->
	<div class="bg-white rounded-lg shadow p-6 mb-8">
		<h2 class="text-lg font-semibold mb-4">Activity Breakdown</h2>
		{#if activityBreakdown().length > 0}
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{#each activityBreakdown().slice(0, 6) as activity}
					<div class="border rounded-lg p-4">
						<div class="flex items-center justify-between mb-2">
							<span class="text-2xl">{activity.icon || '📋'}</span>
							<span class={`px-2 py-1 rounded text-xs font-medium ${getCategoryColor(activity.category)}`}>
								{activity.category}
							</span>
						</div>
						<div class="font-medium text-gray-900">{activity.name}</div>
						<div class="text-sm text-gray-600 mt-1">
							{activity.count} entries • {formatNumber(activity.fuel)} L
						</div>
						<div class="text-xs text-gray-500 mt-1">
							Avg: {(activity.fuel / activity.count).toFixed(1)} L/entry
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<p class="text-gray-500 text-center py-4">No activity data available</p>
		{/if}
	</div>
	
	<!-- Fuel Records Table -->
	<div class="bg-white rounded-lg shadow">
		<div class="px-6 py-4 border-b">
			<h2 class="text-lg font-semibold">Recent Fuel Entries</h2>
		</div>
		
		{#if fuelEntries.length > 0}
			<div class="overflow-x-auto">
				<table class="w-full">
					<thead class="bg-gray-50 border-b">
						<tr>
							<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Driver</th>
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
									{entry.driver?.name || 'Unknown'}
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
						Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, fuelEntries.length)} of {fuelEntries.length} entries
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
				No fuel entries found for this vehicle
			</div>
		{/if}
	</div>
</div>