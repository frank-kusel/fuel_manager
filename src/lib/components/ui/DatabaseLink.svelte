<!--
	Database (vehicles, drivers, activities, fields, zones) from the top-right
	of Dashboard, Tank and Audit on phones and tablets. From 1024px the
	sidebar carries it, so the icon hides there.
-->
<a class="ui-btn db-link" href="/tools/database" aria-label="Database" title="Database">
	<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
		><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path
			d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"
		/></svg
	>
</a>

<style>
	.db-link {
		padding: 0.5rem;
	}

	@media (min-width: 1024px) {
		.db-link {
			display: none;
		}
	}
</style>
