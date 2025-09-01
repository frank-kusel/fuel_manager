<script lang="ts">
	import SystemSettings from '$lib/components/settings/SystemSettings.svelte';

	let showSettings = $state(false);

	const tools = [
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
			title: 'Advanced Reports',
			description: 'Generate detailed analytics and custom reporting views',
			href: '/tools/reports',
			disabled: true
		}
	];
</script>

<svelte:head>
	<title>Tools - FarmTrack</title>
</svelte:head>

<div class="tools-container">
	<div class="header">
		<h1>Tools</h1>
		<p>Administrative tools and system management</p>
	</div>

	<div class="tools-grid">
		{#each tools as tool}
			{#if tool.onclick}
				<button
					class="tool-card tool-button"
					onclick={tool.onclick}
				>
					<div class="tool-content">
						<h3 class="tool-title">{tool.title}</h3>
						<p class="tool-description">{tool.description}</p>
					</div>
				</button>
			{:else}
				<a 
					href={tool.href} 
					class="tool-card"
					class:disabled={tool.disabled}
					aria-disabled={tool.disabled}
				>
					<div class="tool-content">
						<h3 class="tool-title">{tool.title}</h3>
						<p class="tool-description">{tool.description}</p>
					</div>
					{#if tool.disabled}
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
	.tools-container {
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

	.tools-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 1rem;
	}

	.tool-card {
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

	.tool-card:hover:not(.disabled) {
		border-color: #f97316;
		box-shadow: 0 4px 12px rgba(249, 115, 22, 0.15);
		transform: translateY(-2px);
	}

	.tool-card.disabled {
		opacity: 0.6;
		cursor: not-allowed;
		pointer-events: none;
	}

	.tool-button {
		background: white;
		border: 1px solid #e5e7eb;
		cursor: pointer;
		font-family: inherit;
		text-align: left;
	}

	.tool-button:hover {
		border-color: #f97316;
		box-shadow: 0 4px 12px rgba(249, 115, 22, 0.15);
		transform: translateY(-2px);
	}

	.tool-content {
		flex: 1;
	}

	.tool-title {
		margin: 0 0 0.5rem;
		font-size: 1.25rem;
		font-weight: 600;
		color: #111827;
	}

	.tool-description {
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
		.tools-grid {
			grid-template-columns: 1fr;
		}
		
		.tool-card {
			padding: 1rem;
		}
		
		.header h1 {
			font-size: 1.5rem;
		}
	}
</style>