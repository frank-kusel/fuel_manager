<script lang="ts">
	import type { EntityConfig, FieldDef } from './entities';

	/**
	 * One editor for all six reference entities, rendered from the entity's
	 * field config. Destructive action is deactivate (active=false) — nothing
	 * here hard-deletes, so fuel-entry history always keeps its references.
	 */

	let {
		config,
		row = null, // null = create
		rows = [], // current entity rows, for suggest datalists
		vehicles = [], // for the driver default-vehicle select
		onclose,
		onsaved
	}: {
		config: EntityConfig;
		row?: any | null;
		rows?: any[];
		vehicles?: { id: string; code: string; name: string }[];
		onclose: () => void;
		onsaved: () => void;
	} = $props();

	function initialForm(): Record<string, any> {
		const f: Record<string, any> = {};
		for (const fd of config.fields) {
			f[fd.key] = row ? (row[fd.key] ?? '') : '';
		}
		f.active = row ? row.active !== false : true;
		return f;
	}

	let form = $state(initialForm());
	let saving = $state(false);
	let error = $state<string | null>(null);
	let fieldErrors = $state<Record<string, string>>({});

	function suggestions(fd: FieldDef): string[] {
		const vals = rows.map((r) => r[fd.key]).filter((v) => typeof v === 'string' && v.trim());
		return [...new Set(vals)].sort();
	}

	function validate(): boolean {
		const errs: Record<string, string> = {};
		for (const fd of config.fields) {
			if (!fd.required) continue;
			const v = form[fd.key];
			if (v === '' || v === null || v === undefined) errs[fd.key] = 'Required';
			if (fd.type === 'number' && v !== '' && isNaN(Number(v))) errs[fd.key] = 'Must be a number';
		}
		fieldErrors = errs;
		return Object.keys(errs).length === 0;
	}

	function buildPayload(): Record<string, any> {
		const payload: Record<string, any> = { active: !!form.active };
		for (const fd of config.fields) {
			const raw = form[fd.key];
			if (fd.type === 'number') {
				payload[fd.key] = raw === '' || raw === null ? null : Number(raw);
			} else if (typeof raw === 'string') {
				const trimmed = raw.trim();
				// Required text keeps '', optional empties go to null
				payload[fd.key] = trimmed === '' ? (fd.required ? '' : null) : trimmed;
			} else {
				payload[fd.key] = raw ?? null;
			}
		}
		return payload;
	}

	async function save() {
		if (!validate()) return;
		saving = true;
		error = null;
		try {
			const payload = buildPayload();
			const result = row
				? await config.update(row.id, payload)
				: await config.create(payload);
			if (result.error) throw new Error(result.error);
			onsaved();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Save failed';
		} finally {
			saving = false;
		}
	}

	function onOverlayClick(e: MouseEvent) {
		if (e.target === e.currentTarget) onclose();
	}
</script>

<div class="overlay" onclick={onOverlayClick} role="presentation">
	<div class="sheet" role="dialog" aria-label="{row ? 'Edit' : 'Add'} {config.label}">
		<div class="sheet-head">
			<h2>{row ? `Edit ${config.label.toLowerCase()}` : `Add ${config.label.toLowerCase()}`}</h2>
			<button class="x" onclick={onclose} aria-label="Close">✕</button>
		</div>

		<div class="sheet-body">
			{#each config.fields as fd}
				<label class="frow">
					<span class="flabel">
						{fd.label}{fd.required ? ' *' : ''}{fd.unit ? ` (${fd.unit})` : ''}
					</span>
					{#if fd.type === 'select'}
						<select bind:value={form[fd.key]} class:invalid={fieldErrors[fd.key]}>
							{#if !fd.required}
								<option value="">—</option>
							{/if}
							{#if fd.optionsFromVehicles}
								{#each vehicles as v}
									<option value={v.id}>{v.code} — {v.name}</option>
								{/each}
							{:else}
								{#each fd.options || [] as opt}
									<option value={opt.value}>{opt.label}</option>
								{/each}
							{/if}
						</select>
					{:else if fd.type === 'suggest'}
						<input
							type="text"
							bind:value={form[fd.key]}
							list="dl-{config.key}-{fd.key}"
							placeholder={fd.placeholder || ''}
							class:invalid={fieldErrors[fd.key]}
						/>
						<datalist id="dl-{config.key}-{fd.key}">
							{#each suggestions(fd) as s}
								<option value={s}></option>
							{/each}
						</datalist>
					{:else if fd.type === 'number'}
						<input
							type="number"
							step="any"
							bind:value={form[fd.key]}
							class:invalid={fieldErrors[fd.key]}
						/>
					{:else if fd.type === 'color'}
						<input type="color" bind:value={form[fd.key]} class="color-input" />
					{:else if fd.type === 'textarea'}
						<textarea rows="2" bind:value={form[fd.key]}></textarea>
					{:else}
						<input
							type="text"
							bind:value={form[fd.key]}
							placeholder={fd.placeholder || ''}
							class:invalid={fieldErrors[fd.key]}
						/>
					{/if}
					{#if fieldErrors[fd.key]}
						<span class="ferror">{fieldErrors[fd.key]}</span>
					{/if}
				</label>
			{/each}

			<label class="frow active-row">
				<span class="flabel">Active</span>
				<span class="switch-wrap">
					<input type="checkbox" bind:checked={form.active} />
					<span class="switch-hint">
						{form.active
							? 'Shown in fuel entry pickers'
							: 'Hidden from pickers — history is kept'}
					</span>
				</span>
			</label>

			{#if error}
				<div class="save-error">{error}</div>
			{/if}
		</div>

		<div class="sheet-foot">
			<button class="btn ghost" onclick={onclose} disabled={saving}>Cancel</button>
			<button class="btn primary" onclick={save} disabled={saving}>
				{saving ? 'Saving…' : row ? 'Save changes' : `Add ${config.label.toLowerCase()}`}
			</button>
		</div>
	</div>
</div>

<style>
	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(28, 25, 23, 0.45);
		z-index: 999;
		display: flex;
		align-items: flex-end;
		justify-content: center;
	}

	.sheet {
		background: var(--white);
		width: 100%;
		max-width: 480px;
		max-height: 88vh;
		border-radius: 16px 16px 0 0;
		display: flex;
		flex-direction: column;
		animation: rise 0.25s ease;
	}

	@keyframes rise {
		from {
			transform: translateY(24px);
			opacity: 0;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
	}

	@media (min-width: 640px) {
		.overlay {
			align-items: center;
		}
		.sheet {
			border-radius: 16px;
		}
	}

	.sheet-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.875rem 1.125rem 0.5rem;
	}

	.sheet-head h2 {
		font-size: var(--text-lg);
		font-weight: var(--font-weight-bold);
		color: var(--gray-900);
		margin: 0;
	}

	.x {
		border: none;
		background: none;
		color: var(--gray-400);
		font-size: 1rem;
		cursor: pointer;
		padding: 0.25rem 0.4rem;
	}

	.sheet-body {
		padding: 0.25rem 1.125rem 0.75rem;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
	}

	.frow {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.flabel {
		font-size: var(--text-xs);
		font-weight: var(--font-weight-semibold);
		color: var(--gray-500);
	}

	input[type='text'],
	input[type='number'],
	select,
	textarea {
		padding: 0.5rem 0.7rem;
		border: 1px solid var(--gray-200);
		border-radius: var(--radius-md);
		font-size: var(--text-sm);
		color: var(--gray-800);
		background: var(--gray-50);
		font-family: inherit;
	}

	input:focus,
	select:focus,
	textarea:focus {
		outline: none;
		border-color: var(--brand-ring);
		background: var(--white);
	}

	input.invalid,
	select.invalid {
		border-color: var(--error);
	}

	.color-input {
		width: 56px;
		height: 34px;
		padding: 2px;
		border: 1px solid var(--gray-200);
		border-radius: var(--radius-md);
		background: var(--white);
		cursor: pointer;
	}

	.ferror {
		font-size: var(--text-xs);
		color: var(--error);
	}

	.active-row {
		margin-top: 0.25rem;
		padding-top: 0.625rem;
		border-top: 1px solid var(--gray-100);
	}

	.switch-wrap {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.switch-wrap input {
		width: 18px;
		height: 18px;
		accent-color: var(--brand);
	}

	.switch-hint {
		font-size: var(--text-xs);
		color: var(--gray-400);
	}

	.save-error {
		background: #fef2f2;
		border: 1px solid #fecaca;
		color: #991b1b;
		border-radius: var(--radius-md);
		padding: 0.5rem 0.75rem;
		font-size: var(--text-sm);
	}

	.sheet-foot {
		display: flex;
		gap: 0.5rem;
		padding: 0.75rem 1.125rem calc(0.875rem + env(safe-area-inset-bottom));
		border-top: 1px solid var(--gray-100);
	}

	.btn {
		flex: 1;
		padding: 0.6rem 1rem;
		border-radius: var(--radius-md);
		font-size: var(--text-sm);
		font-weight: var(--font-weight-semibold);
		cursor: pointer;
		border: none;
	}

	.btn.ghost {
		background: var(--white);
		border: 1px solid var(--gray-200);
		color: var(--gray-600);
	}

	.btn.primary {
		background: var(--brand);
		color: #fff;
	}

	.btn.primary:hover {
		background: var(--brand-hover);
	}

	.btn:disabled {
		opacity: 0.6;
		cursor: default;
	}
</style>
