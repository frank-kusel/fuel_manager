<script lang="ts">
	import { browser } from '$app/environment';
	
	// Check environment variables status (without exposing values)
	let envStatus: Record<string, boolean> = {};
	let connectionResult: any = null;
	
	if (browser) {
		envStatus = {
			VITE_SUPABASE_URL: !!(import.meta.env.VITE_SUPABASE_URL),
			VITE_SUPABASE_ANON_KEY: !!(import.meta.env.VITE_SUPABASE_ANON_KEY),
			VITE_APP_NAME: !!(import.meta.env.VITE_APP_NAME),
			VITE_APP_VERSION: !!(import.meta.env.VITE_APP_VERSION)
		};
	}
	
	async function testConnection() {
		try {
			const url = import.meta.env.VITE_SUPABASE_URL;
			const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
			
			if (!url || !key) {
				connectionResult = {
					error: true,
					message: 'Missing environment variables'
				};
				return;
			}
			
			const response = await fetch(`${url}/rest/v1/vehicles?select=count&limit=1`, {
				headers: {
					'apikey': key,
					'Authorization': `Bearer ${key}`,
					'Content-Type': 'application/json'
				}
			});
			
			if (response.ok) {
				connectionResult = {
					error: false,
					message: 'Connection successful!'
				};
			} else {
				const error = await response.text();
				connectionResult = {
					error: true,
					message: `Connection failed: ${response.status} - ${error}`
				};
			}
		} catch (error) {
			connectionResult = {
				error: true,
				message: `Connection error: ${error.message}`
			};
		}
	}
</script>

<svelte:head>
	<title>Debug - Environment Status</title>
</svelte:head>

<div class="debug-container">
	<h1>Environment Debug</h1>
	
	<div class="section">
		<h2>Environment Variables Status</h2>
		<div class="env-vars">
			{#each Object.entries(envStatus) as [key, isSet]}
				<div class="env-var">
					<strong>{key}:</strong> 
					<span class:error={!isSet}>
						{isSet ? '✅ Set' : '❌ Missing'}
					</span>
				</div>
			{/each}
		</div>
	</div>
	
	<div class="section">
		<h2>Build Info</h2>
		<p>Mode: {import.meta.env.MODE}</p>
		<p>Dev: {import.meta.env.DEV}</p>
		<p>Prod: {import.meta.env.PROD}</p>
	</div>
	
	<div class="section">
		<h2>Test Supabase Connection</h2>
		<button onclick={testConnection}>Test Connection</button>
		{#if connectionResult}
			<div class="result" class:error={connectionResult.error}>
				{connectionResult.message}
			</div>
		{/if}
	</div>
</div>

<style>
	.debug-container {
		max-width: 800px;
		margin: 0 auto;
		padding: 2rem;
	}
	
	.section {
		margin-bottom: 2rem;
		padding: 1rem;
		border: 1px solid #ddd;
		border-radius: 8px;
	}
	
	.env-vars {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	
	.env-var {
		padding: 0.5rem;
		background: #f5f5f5;
		border-radius: 4px;
		font-family: monospace;
	}
	
	.error {
		color: red;
		font-weight: bold;
	}
	
	.result {
		margin-top: 1rem;
		padding: 0.5rem;
		border-radius: 4px;
		background: #e6ffed;
		border: 1px solid #4caf50;
	}
	
	.result.error {
		background: #ffebee;
		border-color: #f44336;
		color: #c62828;
	}
	
	button {
		padding: 0.5rem 1rem;
		background: #007bff;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
	}
	
	button:hover {
		background: #0056b3;
	}
</style>