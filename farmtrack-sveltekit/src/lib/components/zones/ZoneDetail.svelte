<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import type { Zone } from '$lib/types';

	interface Props {
		zone: Zone;
		onedit: () => void;
		ondelete: () => void;
		onback: () => void;
	}

	let { zone, onedit, ondelete, onback }: Props = $props();

	function getZoneTypeLabel(type: string | undefined): string {
		const labels: Record<string, string> = {
			'farm_section': 'Farm Section',
			'infrastructure': 'Infrastructure',
			'transport': 'Transport',
			'maintenance': 'Maintenance',
			'general': 'General'
		};
		return labels[type || 'general'] || 'General';
	}

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString();
	}
</script>

<div class="zone-detail">
	<Card>
		<div class="detail-header">
			<div class="header-content">
				<div class="zone-badge" style="background-color: {zone.color || '#95A5A6'}">
					{zone.code}
				</div>
				<div class="zone-info">
					<h2>{zone.name}</h2>
					<p class="zone-type">{getZoneTypeLabel(zone.zone_type)}</p>
				</div>
			</div>
			<div class="header-actions">
				<Button variant="outline" onclick={onback}>
					← Back
				</Button>
				<Button variant="outline" onclick={onedit}>
					Edit
				</Button>
				<Button variant="outline" onclick={ondelete} class="delete-btn">
					Delete
				</Button>
			</div>
		</div>

		<div class="detail-grid">
			<div class="detail-section">
				<h3>Basic Information</h3>
				<div class="detail-rows">
					<div class="detail-row">
						<span class="label">Code:</span>
						<span class="value">{zone.code}</span>
					</div>
					<div class="detail-row">
						<span class="label">Name:</span>
						<span class="value">{zone.name}</span>
					</div>
					<div class="detail-row">
						<span class="label">Type:</span>
						<span class="value">{getZoneTypeLabel(zone.zone_type)}</span>
					</div>
					<div class="detail-row">
						<span class="label">Display Order:</span>
						<span class="value">{zone.display_order || 0}</span>
					</div>
					<div class="detail-row">
						<span class="label">Status:</span>
						<span class="value status {zone.active ? 'active' : 'inactive'}">
							{zone.active ? 'Active' : 'Inactive'}
						</span>
					</div>
				</div>
			</div>

			<div class="detail-section">
				<h3>Visual Settings</h3>
				<div class="detail-rows">
					<div class="detail-row">
						<span class="label">Color:</span>
						<div class="color-display">
							<div class="color-swatch" style="background-color: {zone.color || '#95A5A6'}"></div>
							<span class="value">{zone.color || '#95A5A6'}</span>
						</div>
					</div>
				</div>
			</div>

			{#if zone.description}
				<div class="detail-section full-width">
					<h3>Description</h3>
					<p class="description">{zone.description}</p>
				</div>
			{/if}

			<div class="detail-section full-width">
				<h3>System Information</h3>
				<div class="detail-rows">
					<div class="detail-row">
						<span class="label">Zone ID:</span>
						<span class="value code">{zone.id}</span>
					</div>
					<div class="detail-row">
						<span class="label">Created:</span>
						<span class="value">{formatDate(zone.created_at)}</span>
					</div>
					<div class="detail-row">
						<span class="label">Last Updated:</span>
						<span class="value">{formatDate(zone.updated_at)}</span>
					</div>
				</div>
			</div>
		</div>
	</Card>
</div>

<style>
	.zone-detail {
		max-width: 800px;
		margin: 0 auto;
	}

	.detail-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 2rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--color-border);
	}

	.header-content {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.zone-badge {
		padding: 0.5rem 1rem;
		border-radius: 8px;
		color: white;
		font-weight: 700;
		font-size: 1.125rem;
		text-align: center;
		min-width: 80px;
	}

	.zone-info h2 {
		margin: 0 0 0.25rem 0;
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--color-text);
	}

	.zone-type {
		margin: 0;
		color: var(--color-text-secondary);
		font-size: 0.875rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.header-actions {
		display: flex;
		gap: 0.75rem;
	}

	.detail-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 2rem;
	}

	.detail-section {
		display: flex;
		flex-direction: column;
	}

	.detail-section.full-width {
		grid-column: 1 / -1;
	}

	.detail-section h3 {
		margin: 0 0 1rem 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--color-text);
		border-bottom: 1px solid var(--color-border);
		padding-bottom: 0.5rem;
	}

	.detail-rows {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.detail-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem 0;
	}

	.detail-row .label {
		font-weight: 500;
		color: var(--color-text-secondary);
		min-width: 120px;
	}

	.detail-row .value {
		color: var(--color-text);
		font-weight: 500;
		text-align: right;
		flex: 1;
	}

	.detail-row .value.code {
		font-family: monospace;
		font-size: 0.875rem;
		background: var(--color-background-secondary);
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
	}

	.status {
		padding: 0.25rem 0.75rem;
		border-radius: 12px;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.status.active {
		background: #dcfce7;
		color: #166534;
	}

	.status.inactive {
		background: #fee2e2;
		color: #991b1b;
	}

	.color-display {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		justify-content: flex-end;
	}

	.color-swatch {
		width: 24px;
		height: 24px;
		border-radius: 4px;
		border: 1px solid var(--color-border);
	}

	.description {
		color: var(--color-text-secondary);
		line-height: 1.6;
		margin: 0;
		padding: 1rem;
		background: var(--color-background-secondary);
		border-radius: 6px;
		border-left: 4px solid var(--color-primary);
	}

	:global(.delete-btn) {
		border-color: #dc2626 !important;
		color: #dc2626 !important;
	}

	:global(.delete-btn:hover) {
		background: #dc2626 !important;
		color: white !important;
	}

	@media (max-width: 768px) {
		.detail-header {
			flex-direction: column;
			align-items: stretch;
			gap: 1rem;
		}

		.header-content {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.75rem;
		}

		.header-actions {
			justify-content: stretch;
		}

		.detail-grid {
			grid-template-columns: 1fr;
			gap: 1.5rem;
		}

		.detail-row {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.25rem;
		}

		.detail-row .value {
			text-align: left;
		}

		.color-display {
			justify-content: flex-start;
		}
	}
</style>