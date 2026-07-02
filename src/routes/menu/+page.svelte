<script lang="ts">
	import SystemSettings from '$lib/components/settings/SystemSettings.svelte';

	let showSettings = $state(false);

	const menuItems = [
		{
			title: 'Reconciliations',
			description: 'Fuel usage and tank level reconciliation with flexible date ranges',
			href: '/tools/reconciliations',
			icon: 'scale'
		},
		{
			title: 'Database Management',
			description: 'Manage vehicles, drivers, bowsers, activities, fields, and zones',
			href: '/tools/database',
			icon: 'database'
		},
		{
			title: 'System Settings',
			description: 'Configure operational parameters, thresholds, and system preferences',
			onclick: () => (showSettings = true),
			icon: 'settings'
		},
		{
			title: 'Reports & Exports',
			description: 'Generate detailed analytics, Excel exports, and PDF reports',
			href: '/reports',
			icon: 'report'
		}
	];
</script>

<svelte:head>
	<title>Menu - FarmTrack</title>
</svelte:head>

{#snippet menuIcon(name: string)}
	{#if name === 'scale'}
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M5 7l7-4 7 4M3 13l2-6 2 6a3 3 0 0 1-4 0ZM17 13l2-6 2 6a3 3 0 0 1-4 0ZM8 21h8"/></svg>
	{:else if name === 'database'}
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5"/><path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3"/></svg>
	{:else if name === 'settings'}
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>
	{:else}
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M8 17v-3M12 17v-6M16 17v-4"/></svg>
	{/if}
{/snippet}

{#snippet cardBody(item: (typeof menuItems)[number])}
	<div class="menu-icon" aria-hidden="true">
		{@render menuIcon(item.icon)}
	</div>
	<div class="menu-content">
		<h3 class="menu-title">{item.title}</h3>
		<p class="menu-description">{item.description}</p>
	</div>
	<div class="menu-arrow" aria-hidden="true">
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
	</div>
{/snippet}

<div class="menu-container">
	<div class="header">
		<h1>Menu</h1>
		<p>Administrative tools and system management</p>
	</div>

	<div class="menu-grid">
		{#each menuItems as item}
			{#if item.onclick}
				<button class="menu-card" onclick={item.onclick}>
					{@render cardBody(item)}
				</button>
			{:else}
				<a href={item.href} class="menu-card">
					{@render cardBody(item)}
				</a>
			{/if}
		{/each}
	</div>

	{#if showSettings}
		<SystemSettings onclose={() => (showSettings = false)} />
	{/if}
</div>

<style>
	.menu-container {
		max-width: 800px;
		margin: 0 auto;
		padding: 1rem;
	}

	.header {
		margin-bottom: 1.5rem;
	}

	.header h1 {
		margin: 0;
		font-size: 2rem;
		font-weight: var(--font-weight-bold);
		color: var(--gray-900);
	}

	.header p {
		margin: 0.375rem 0 0;
		color: var(--gray-500);
		font-size: var(--text-base);
	}

	.menu-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 0.875rem;
	}

	.menu-card {
		display: flex;
		align-items: center;
		gap: 1rem;
		background: var(--white);
		border: 1px solid var(--gray-200);
		border-radius: var(--radius-lg);
		padding: 1.125rem 1.25rem;
		text-decoration: none;
		color: inherit;
		transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
		cursor: pointer;
		font-family: inherit;
		text-align: left;
		box-shadow: var(--shadow-sm);
	}

	.menu-card:hover {
		border-color: var(--brand);
		box-shadow: 0 4px 12px rgba(13, 148, 136, 0.15);
		transform: translateY(-1px);
	}

	.menu-card:hover .menu-arrow {
		color: var(--brand);
		transform: translateX(2px);
	}

	.menu-icon {
		flex-shrink: 0;
		width: 2.75rem;
		height: 2.75rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-md);
		background: #f0fdfa;
		color: var(--brand-hover);
	}

	.menu-icon svg {
		width: 1.5rem;
		height: 1.5rem;
	}

	.menu-content {
		flex: 1;
		min-width: 0;
	}

	.menu-title {
		margin: 0 0 0.25rem;
		font-size: var(--text-base);
		font-weight: var(--font-weight-semibold);
		color: var(--gray-900);
	}

	.menu-description {
		margin: 0;
		color: var(--gray-500);
		font-size: var(--text-sm);
		line-height: 1.45;
	}

	.menu-arrow {
		flex-shrink: 0;
		color: var(--gray-300);
		transition: color 0.15s ease, transform 0.15s ease;
	}

	.menu-arrow svg {
		width: 1.25rem;
		height: 1.25rem;
	}

	@media (max-width: 768px) {
		.menu-container {
			padding: 0.5rem;
		}

		.menu-grid {
			grid-template-columns: 1fr;
			gap: 0.625rem;
		}

		.menu-card {
			padding: 1rem;
		}

		.header h1 {
			font-size: 1.5rem;
		}
	}
</style>
