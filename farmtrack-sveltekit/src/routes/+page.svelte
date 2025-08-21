<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	// Redirect to fuel management on load
	onMount(() => {
		goto('/fuel', { replaceState: true });
	});
</script>

<svelte:head>
	<title>FarmTrack - Loading...</title>
</svelte:head>

<div class="loading-container">
	<div class="loading-spinner">
		<div class="brand-icon">🚜</div>
		<h2>Loading FarmTrack...</h2>
		<p>Redirecting to fuel management...</p>
	</div>
</div>

<style>
	.loading-container {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 60vh;
		text-align: center;
	}

	.loading-spinner {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}

	.brand-icon {
		font-size: 4rem;
		animation: bounce 2s infinite;
	}

	@keyframes bounce {
		0%, 20%, 50%, 80%, 100% {
			transform: translateY(0);
		}
		40% {
			transform: translateY(-10px);
		}
		60% {
			transform: translateY(-5px);
		}
	}

	h2 {
		color: var(--primary);
		margin: 0;
	}

	p {
		color: var(--gray-600);
		margin: 0;
	}
</style>