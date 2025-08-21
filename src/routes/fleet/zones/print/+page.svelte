<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import supabaseService from '$lib/services/supabase';
	import type { Zone } from '$lib/types';

	let zones: Zone[] = $state([]);
	let loading = $state(true);

	onMount(async () => {
		if (browser) {
			await loadZones();
			// Auto-print after loading
			setTimeout(() => {
				window.print();
			}, 500);
		}
	});

	async function loadZones() {
		try {
			await supabaseService.init();
			const result = await supabaseService.getZones();
			if (result.data) {
				zones = result.data;
			}
		} catch (err) {
			console.error('Failed to load zones:', err);
		} finally {
			loading = false;
		}
	}

	// Create a simple 2x3 grid layout for 6 zones
	function getGridPosition(index: number): { row: number; col: number } {
		const positions = [
			{ row: 1, col: 1 }, // A1 - North
			{ row: 1, col: 2 }, // A2 - Northeast
			{ row: 2, col: 2 }, // B1 - East
			{ row: 3, col: 2 }, // B2 - South
			{ row: 3, col: 1 }, // C1 - West
			{ row: 2, col: 1 }, // C2 - Central
		];
		return positions[index] || { row: 1, col: 1 };
	}
</script>

<svelte:head>
	<title>Zone Map - FarmTrack</title>
</svelte:head>

<div class="print-page">
	<div class="header">
		<h1>Farm Zone Map</h1>
		<p class="subtitle">Reference map for fuel entry location tracking</p>
		<p class="date">Generated: {new Date().toLocaleDateString()}</p>
	</div>

	{#if loading}
		<div class="loading">Loading zones...</div>
	{:else}
		<div class="map-container">
			<div class="map-grid">
				{#each zones.slice(0, 6) as zone, index}
					{@const position = getGridPosition(index)}
					<div 
						class="zone-block"
						style="
							grid-row: {position.row};
							grid-column: {position.col};
							background-color: {zone.color || '#95A5A6'}20;
							border-color: {zone.color || '#95A5A6'};
						"
					>
						<div class="zone-code" style="background-color: {zone.color || '#95A5A6'}">
							{zone.code}
						</div>
						<div class="zone-name">{zone.name}</div>
						{#if zone.description}
							<div class="zone-desc">{zone.description}</div>
						{/if}
					</div>
				{/each}
				
				<!-- Central feature markers -->
				<div class="feature fuel-station">
					⛽ Fuel Station
				</div>
				<div class="feature workshop">
					🔧 Workshop
				</div>
			</div>
		</div>

		<div class="legend">
			<h2>Zone Reference</h2>
			<div class="zone-list">
				{#each zones as zone}
					<div class="zone-item">
						<span class="zone-badge" style="background-color: {zone.color || '#95A5A6'}">
							{zone.code}
						</span>
						<span class="zone-details">
							<strong>{zone.name}</strong>
							{#if zone.description}
								- {zone.description}
							{/if}
						</span>
					</div>
				{/each}
			</div>
		</div>

		<div class="instructions">
			<h3>Instructions for Fuel Attendant:</h3>
			<ol>
				<li>When a vehicle is refueling for work in a specific field, select the field name in the app</li>
				<li>For general operations (road maintenance, transport, etc.), select the appropriate zone from this map</li>
				<li>The zone represents the general area where the work will be performed</li>
				<li>This ensures SARS compliance by tracking start/end locations for all trips</li>
			</ol>
		</div>
	{/if}

	<div class="footer">
		<button class="print-button" onclick={() => window.print()}>
			🖨️ Print This Page
		</button>
		<button class="close-button" onclick={() => window.close()}>
			Close
		</button>
	</div>
</div>

<style>
	/* General Layout */
	.print-page {
		max-width: 1000px;
		margin: 0 auto;
		padding: 2rem;
		background: white;
		min-height: 100vh;
	}

	.header {
		text-align: center;
		margin-bottom: 2rem;
		padding-bottom: 1rem;
		border-bottom: 2px solid #e5e7eb;
	}

	.header h1 {
		font-size: 2rem;
		font-weight: 700;
		color: #0f172a;
		margin: 0 0 0.5rem 0;
	}

	.subtitle {
		color: #64748b;
		font-size: 1rem;
		margin: 0 0 0.5rem 0;
	}

	.date {
		color: #94a3b8;
		font-size: 0.875rem;
		margin: 0;
	}

	/* Map Grid */
	.map-container {
		margin: 2rem 0;
		padding: 2rem;
		background: #f8fafc;
		border: 2px solid #e2e8f0;
		border-radius: 12px;
	}

	.map-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		grid-template-rows: repeat(3, 200px);
		gap: 1rem;
		position: relative;
	}

	.zone-block {
		border: 3px solid;
		border-radius: 12px;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		position: relative;
	}

	.zone-code {
		color: white;
		font-weight: 700;
		font-size: 1.5rem;
		padding: 0.5rem 1rem;
		border-radius: 8px;
		margin-bottom: 0.5rem;
	}

	.zone-name {
		font-weight: 600;
		font-size: 1rem;
		color: #334155;
		margin-bottom: 0.25rem;
	}

	.zone-desc {
		font-size: 0.75rem;
		color: #64748b;
		max-width: 150px;
	}

	/* Feature Markers */
	.feature {
		position: absolute;
		background: white;
		border: 2px solid #334155;
		border-radius: 8px;
		padding: 0.5rem 1rem;
		font-weight: 600;
		font-size: 0.875rem;
		box-shadow: 0 2px 4px rgba(0,0,0,0.1);
		z-index: 10;
	}

	.fuel-station {
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
	}

	.workshop {
		top: 60%;
		left: 50%;
		transform: translate(-50%, -50%);
	}

	/* Legend */
	.legend {
		margin: 2rem 0;
		padding: 1.5rem;
		background: #f1f5f9;
		border-radius: 8px;
	}

	.legend h2 {
		font-size: 1.25rem;
		font-weight: 600;
		color: #0f172a;
		margin: 0 0 1rem 0;
	}

	.zone-list {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 0.75rem;
	}

	.zone-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.zone-badge {
		padding: 0.25rem 0.75rem;
		border-radius: 6px;
		color: white;
		font-weight: 600;
		font-size: 0.875rem;
		flex-shrink: 0;
	}

	.zone-details {
		font-size: 0.875rem;
		color: #475569;
	}

	.zone-details strong {
		color: #0f172a;
	}

	/* Instructions */
	.instructions {
		margin: 2rem 0;
		padding: 1.5rem;
		background: #fef3c7;
		border: 1px solid #fcd34d;
		border-radius: 8px;
	}

	.instructions h3 {
		font-size: 1rem;
		font-weight: 600;
		color: #92400e;
		margin: 0 0 0.75rem 0;
	}

	.instructions ol {
		margin: 0;
		padding-left: 1.5rem;
		color: #78350f;
		font-size: 0.875rem;
		line-height: 1.6;
	}

	.instructions li {
		margin-bottom: 0.5rem;
	}

	/* Footer */
	.footer {
		margin-top: 2rem;
		padding-top: 1rem;
		border-top: 1px solid #e5e7eb;
		display: flex;
		justify-content: center;
		gap: 1rem;
	}

	.print-button,
	.close-button {
		padding: 0.75rem 1.5rem;
		border-radius: 8px;
		font-weight: 600;
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.print-button {
		background: #2563eb;
		color: white;
		border: none;
	}

	.print-button:hover {
		background: #1d4ed8;
	}

	.close-button {
		background: white;
		color: #475569;
		border: 1px solid #e5e7eb;
	}

	.close-button:hover {
		background: #f8fafc;
	}

	.loading {
		text-align: center;
		padding: 4rem 2rem;
		color: #64748b;
	}

	/* Print Styles */
	@media print {
		.print-page {
			padding: 0;
			max-width: 100%;
		}

		.footer {
			display: none;
		}

		.header {
			page-break-after: avoid;
		}

		.map-container {
			page-break-inside: avoid;
		}

		.legend {
			page-break-inside: avoid;
		}

		.instructions {
			page-break-inside: avoid;
		}
		
		/* Make colors more print-friendly */
		.zone-block {
			border-width: 2px;
		}
		
		.feature {
			border-width: 1px;
		}
	}

	/* Mobile responsiveness */
	@media (max-width: 768px) {
		.map-grid {
			grid-template-columns: 1fr;
			grid-template-rows: repeat(6, 150px);
		}
		
		.zone-block {
			grid-column: 1 !important;
		}
		
		.zone-list {
			grid-template-columns: 1fr;
		}
	}
</style>