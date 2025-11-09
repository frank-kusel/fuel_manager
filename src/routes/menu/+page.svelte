<script lang="ts">
	import SystemSettings from '$lib/components/settings/SystemSettings.svelte';

	let showSettings = $state(false);

	const menuItems = [
		{
			title: 'Reconciliations',
			description: 'Fuel usage and tank level reconciliation with flexible date ranges',
			href: '/tools/reconciliations'
		},
		{
			title: 'Database Management',
			description: 'Comprehensive CRUD management for vehicles, drivers, bowsers, activities, fields, and zones',
			href: '/tools/database'
		},
		{
			title: 'System Settings',
			description: 'Configure operational parameters, thresholds, and system preferences',
			onclick: () => showSettings = true
		},
		{
			title: 'Reports & Exports',
			description: 'Generate detailed analytics, Excel exports, and PDF reports',
			href: '/reports'
		}
	];
</script>

<svelte:head>
	<title>Menu - FarmTrack</title>
</svelte:head>

<div class="menu-container">
	<div class="header">
		<h1>Menu</h1>
		<p>Administrative tools and system management</p>
	</div>

	<div class="menu-grid">
		{#each menuItems as item}
			{#if item.onclick}
				<button
					class="menu-card menu-button"
					onclick={item.onclick}
				>
					<div class="menu-content">
						<h3 class="menu-title">{item.title}</h3>
						<p class="menu-description">{item.description}</p>
					</div>
				</button>
			{:else}
				<a
					href={item.href}
					class="menu-card"
					class:disabled={item.disabled}
					aria-disabled={item.disabled}
				>
					<div class="menu-content">
						<h3 class="menu-title">{item.title}</h3>
						<p class="menu-description">{item.description}</p>
					</div>
					{#if item.disabled}
						<div class="coming-soon">Coming Soon</div>
					{/if}
				</a>
			{/if}
		{/each}
	</div>

	{#if showSettings}
		<SystemSettings
			onclose={() => showSettings = false}
		/>
	{/if}
</div>

<style>
	.menu-container {
		max-width: 800px;
		margin: 0 auto;
		padding: 1rem;
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

	.menu-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 1rem;
	}

	.menu-card {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 12px;
		padding: 1.5rem;
		text-decoration: none;
		color: inherit;
		transition: all 0.2s;
		position: relative;
		display: flex;
		flex-direction: column;
		min-height: 120px;
	}

	.menu-card:hover:not(.disabled) {
		border-color: #f97316;
		box-shadow: 0 4px 12px rgba(249, 115, 22, 0.15);
		transform: translateY(-2px);
	}

	.menu-card.disabled {
		opacity: 0.6;
		cursor: not-allowed;
		pointer-events: none;
	}

	.menu-button {
		background: white;
		border: 1px solid #e5e7eb;
		cursor: pointer;
		font-family: inherit;
		text-align: left;
	}

	.menu-button:hover {
		border-color: #f97316;
		box-shadow: 0 4px 12px rgba(249, 115, 22, 0.15);
		transform: translateY(-2px);
	}

	.menu-content {
		flex: 1;
	}

	.menu-title {
		margin: 0 0 0.5rem;
		font-size: 1.25rem;
		font-weight: 600;
		color: #111827;
	}

	.menu-description {
		margin: 0;
		color: #6b7280;
		font-size: 0.9rem;
		line-height: 1.4;
	}

	.coming-soon {
		position: absolute;
		top: 1rem;
		right: 1rem;
		background: #f3f4f6;
		color: #6b7280;
		padding: 0.25rem 0.5rem;
		border-radius: 6px;
		font-size: 0.75rem;
		font-weight: 500;
	}

	@media (max-width: 768px) {
		.menu-grid {
			grid-template-columns: 1fr;
		}

		.menu-card {
			padding: 1rem;
		}

		.header h1 {
			font-size: 1.5rem;
		}
	}
</style>
