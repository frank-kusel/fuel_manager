<script lang="ts">
	import { onMount } from 'svelte';
	import supabaseService from '$lib/services/supabase';
	
	// Tank configuration and status
	let tankStatus = $state({
		tank_name: 'Tank A',
		capacity: 5000,
		current_calculated_level: 0,
		last_dipstick_level: null,
		last_dipstick_date: null,
		variance: 0,
		variance_percentage: 0,
		tank_percentage: 0
	});
	
	// Loading state
	let loading = $state(true);
	
	onMount(async () => {
		await loadTankData();
	});
	
	async function loadTankData() {
		loading = true;
		try {
			await supabaseService.init();
			const result = await supabaseService.getTankStatus();
			
			if (result.data) {
				// The data comes directly, not as an array
				tankStatus = {
					tank_name: result.data.tank_name || 'Tank A',
					capacity: result.data.capacity || 5000,
					current_calculated_level: result.data.current_calculated_level || 0,
					last_dipstick_level: result.data.last_dipstick_level,
					last_dipstick_date: result.data.last_dipstick_date,
					variance: result.data.variance || 0,
					variance_percentage: result.data.variance_percentage || 0,
					tank_percentage: result.data.tank_percentage || 0
				};
			}
		} catch (error) {
			console.error('Failed to load tank data:', error);
		} finally {
			loading = false;
		}
	}
	
	function formatNumber(num: number): string {
		if (num === null || num === undefined) return '0';
		return Math.round(num).toLocaleString();
	}
	
	function formatDate(dateStr: string): string {
		if (!dateStr) return '';
		return new Date(dateStr).toLocaleDateString('en-ZA', { 
			day: 'numeric', 
			month: 'short' 
		});
	}
	
	function getVarianceClass(percentage: number) {
		const abs = Math.abs(percentage);
		if (abs < 2) return 'good';
		if (abs < 5) return 'warning';
		return 'alert';
	}
</script>

<div class="tank-status">
	{#if loading}
		<div class="loading">
			<div class="loading-content">
				<div class="loading-header"></div>
				<div class="loading-bar"></div>
				<div class="loading-text"></div>
			</div>
		</div>
	{:else}
		<div class="tank-status-content">
			<div class="tank-header">
				<h3>Fuel Tank</h3>
				<div class="level-value">{formatNumber(tankStatus.current_calculated_level)}<span class="unit">L</span></div>
			</div>
			
			<div class="tank-bar">
				<div class="tank-fill" style="width: {tankStatus.tank_percentage}%"></div>
			</div>
			
			{#if tankStatus.last_dipstick_level}
				<div class="variance-compact {getVarianceClass(tankStatus.variance_percentage)}">
					<div class="variance-info">
						<span class="dipstick-value">Dipstick: {formatNumber(tankStatus.last_dipstick_level)}L</span>
						<span class="variance-amount">{tankStatus.variance > 0 ? '+' : ''}{formatNumber(Math.abs(tankStatus.variance))}L</span>
					</div>
					{#if tankStatus.last_dipstick_date}
						<div class="variance-date">{formatDate(tankStatus.last_dipstick_date)}</div>
					{/if}
				</div>
			{:else}
				<div class="no-dipstick-compact">
					<span class="no-dipstick-text">No dipstick reading</span>
					<span class="no-dipstick-prompt">Take reading to verify</span>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.tank-status {
		background: white;
		border-radius: 1rem;
		padding: 1.5rem;
		border: 1px solid #e5e7eb;
		margin-top: 0.5rem;
	}
	
	.loading {
		height: 120px;
		display: flex;
		align-items: center;
	}
	
	.loading-content {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	
	.loading-header {
		height: 20px;
		background: #f3f4f6;
		border-radius: 0.25rem;
		width: 60%;
		animation: pulse 1.5s ease-in-out infinite;
	}
	
	.loading-bar {
		height: 12px;
		background: #f3f4f6;
		border-radius: 0.5rem;
		animation: pulse 1.5s ease-in-out infinite;
		animation-delay: 0.2s;
	}
	
	.loading-text {
		height: 16px;
		background: #f3f4f6;
		border-radius: 0.25rem;
		width: 40%;
		animation: pulse 1.5s ease-in-out infinite;
		animation-delay: 0.4s;
	}
	
	@keyframes pulse {
		0%, 100% { opacity: 0.4; }
		50% { opacity: 1; }
	}
	
	.tank-status-content {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	
	.tank-header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
	}
	
	.tank-header h3 {
		font-size: 1.125rem;
		font-weight: 600;
		color: #111827;
		margin: 0;
	}
	
	.level-value {
		font-size: 1.5rem;
		font-weight: 700;
		color: #f97316;
		display: flex;
		align-items: baseline;
		gap: 0.25rem;
	}
	
	.unit {
		font-size: 0.875rem;
		color: #6b7280;
		font-weight: 500;
	}
	
	.tank-bar {
		height: 12px;
		background: #f3f4f6;
		border-radius: 0.5rem;
		overflow: hidden;
		position: relative;
	}
	
	.tank-fill {
		height: 100%;
		background: linear-gradient(90deg, #f97316 0%, #ea580c 100%);
		transition: width 0.5s ease;
		border-radius: 0.5rem;
	}
	
	.variance-compact {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 0.75rem;
		border-radius: 0.5rem;
		border: 1px solid;
	}
	
	.variance-compact.good {
		background: #f0fdf4;
		border-color: #bbf7d0;
		color: #166534;
	}
	
	.variance-compact.warning {
		background: #fffbeb;
		border-color: #fde68a;
		color: #d97706;
	}
	
	.variance-compact.alert {
		background: #fef2f2;
		border-color: #fecaca;
		color: #dc2626;
	}
	
	.variance-info {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.875rem;
		font-weight: 500;
	}
	
	.variance-date {
		font-size: 0.75rem;
		opacity: 0.7;
	}
	
	.no-dipstick-compact {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 0.75rem;
		background: #f9fafb;
		border: 1px solid #e5e7eb;
		border-radius: 0.5rem;
		color: #6b7280;
	}
	
	.no-dipstick-text {
		font-size: 0.875rem;
		font-weight: 500;
	}
	
	.no-dipstick-prompt {
		font-size: 0.75rem;
		opacity: 0.7;
	}
	
	/* Mobile responsiveness */
	@media (max-width: 640px) {
		.tank-status {
			padding: 1rem;
		}
		
		.tank-header {
			flex-direction: column;
			gap: 0.5rem;
			align-items: flex-start;
		}
		
		.level-value {
			font-size: 1.25rem;
		}
	}
</style>