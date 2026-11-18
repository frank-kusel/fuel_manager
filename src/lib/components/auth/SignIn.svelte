<script lang="ts">
	// Sign in with the Fallow account, then pick the farm (only when there is
	// more than one).
	import Button from '$lib/components/ui/Button.svelte';
	import { auth } from '$lib/stores/auth';

	let email = $state('');
	let password = $state('');
	let busy = $state(false);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (!email.trim() || !password) return;
		busy = true;
		try {
			await auth.signIn(email, password);
		} finally {
			busy = false;
			password = '';
		}
	}
</script>

<div class="signin">
	<div class="panel">
		<div class="brand">
			<svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
				<path
					d="M12 2.5C12 2.5 5.5 9.8 5.5 14.5a6.5 6.5 0 0 0 13 0C18.5 9.8 12 2.5 12 2.5Z"
					fill="currentColor"
				/>
			</svg>
			<span>FarmTrack</span>
		</div>

		{#if $auth.status === 'loading'}
			<p class="muted">Opening…</p>
		{:else if $auth.status === 'pick_farm'}
			<h1>Which farm?</h1>
			<p class="muted">This device remembers it. You can change it from the menu later.</p>
			<div class="farms">
				{#each $auth.farms as farm (farm.id)}
					<button class="farm" onclick={() => auth.pickFarm(farm.id)}>
						<span class="farm-name">{farm.name}</span>
						<span class="farm-role">{farm.role === 'owner' ? 'Owner' : 'Member'}</span>
					</button>
				{/each}
			</div>
			<button class="link" onclick={() => auth.signOut()}>Sign out</button>
		{:else if $auth.status === 'no_farm'}
			<h1>No farm yet</h1>
			<p class="muted">
				{$auth.email} is not in a farm. Ask the farm's owner to invite you in Fallow, then sign in
				again.
			</p>
			<button class="link" onclick={() => auth.signOut()}>Sign out</button>
		{:else}
			<h1>Sign in</h1>
			<p class="muted">Use the email and password you sign in to Fallow with.</p>
			<form onsubmit={submit}>
				<label>
					<span>Email</span>
					<input
						type="email"
						autocomplete="username"
						inputmode="email"
						bind:value={email}
						required
					/>
				</label>
				<label>
					<span>Password</span>
					<input type="password" autocomplete="current-password" bind:value={password} required />
				</label>
				{#if $auth.error}
					<p class="error" role="alert">{$auth.error}</p>
				{/if}
				<Button type="submit" fullWidth loading={busy} disabled={!email.trim() || !password}>
					Sign in
				</Button>
			</form>
		{/if}
	</div>
</div>

<style>
	.signin {
		min-height: 100vh;
		min-height: 100dvh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-lg);
		background: var(--gray-50);
	}
	.panel {
		width: 100%;
		max-width: 380px;
		background: var(--white);
		border: 1px solid var(--gray-200);
		border-radius: var(--radius-xl);
		padding: var(--space-xl);
	}
	.brand {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		color: var(--brand);
		font-weight: 700;
		font-size: var(--text-lg);
		margin-bottom: var(--space-xl);
	}
	h1 {
		font-size: var(--text-xl);
		margin: 0 0 var(--space-xs);
		color: var(--gray-900);
	}
	.muted {
		color: var(--gray-600);
		font-size: var(--text-sm);
		margin: 0 0 var(--space-lg);
	}
	form {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}
	label {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
		font-size: var(--text-sm);
		color: var(--gray-700);
		font-weight: 500;
	}
	input {
		font: inherit;
		font-size: var(--text-base);
		padding: 0.625rem var(--space-md);
		border: 1px solid var(--gray-300);
		border-radius: var(--radius-md);
		background: var(--white);
	}
	input:focus {
		outline: none;
		border-color: var(--brand);
		box-shadow: var(--focus-ring);
	}
	.error {
		color: var(--error);
		font-size: var(--text-sm);
		margin: 0;
	}
	.farms {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		margin-bottom: var(--space-lg);
	}
	.farm {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-md) var(--space-lg);
		border: 1px solid var(--gray-200);
		border-radius: var(--radius-lg);
		background: var(--white);
		font: inherit;
		cursor: pointer;
		text-align: left;
	}
	.farm:hover {
		border-color: var(--brand);
		background: var(--brand-tint-weak);
	}
	.farm-name {
		font-weight: 600;
		color: var(--gray-900);
	}
	.farm-role {
		font-size: var(--text-xs);
		color: var(--gray-500);
	}
	.link {
		background: none;
		border: none;
		padding: 0;
		font: inherit;
		font-size: var(--text-sm);
		color: var(--gray-600);
		text-decoration: underline;
		cursor: pointer;
	}
</style>
