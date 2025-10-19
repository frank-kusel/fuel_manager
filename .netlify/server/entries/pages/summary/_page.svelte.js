import { F as head, B as pop, z as push } from "../../../chunks/index2.js";
function _page($$payload, $$props) {
  push();
  let entries = [];
  (() => {
    if (!entries || entries.length === 0) {
      return [];
    }
    const grouped = entries.reduce(
      (acc, entry) => {
        if (!acc[entry.entry_date]) {
          acc[entry.entry_date] = [];
        }
        acc[entry.entry_date].push(entry);
        return acc;
      },
      {}
    );
    return Object.entries(grouped).map(([date, dayEntries]) => {
      const sortedEntries = [...dayEntries].sort((a, b) => a.time.localeCompare(b.time));
      const totalFuel = dayEntries.reduce((sum, entry) => sum + (entry.litres_dispensed || 0), 0);
      const firstEntry = sortedEntries[0];
      const lastEntry = sortedEntries[sortedEntries.length - 1];
      const openingReading = firstEntry?.bowser_reading_start || null;
      const closingReading = lastEntry?.bowser_reading_end || null;
      return {
        date,
        totalFuel,
        openingReading,
        closingReading,
        entries: dayEntries.sort((a, b) => b.time.localeCompare(a.time))
        // Most recent first
      };
    }).sort((a, b) => b.date.localeCompare(a.date));
  })();
  head($$payload, ($$payload2) => {
    $$payload2.title = `<title>Fuel Summary</title>`;
    $$payload2.out.push(`<link rel="preconnect" href="https://fonts.googleapis.com"/> <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin=""/> <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&amp;display=swap" rel="stylesheet"/>`);
  });
  $$payload.out.push(`<div class="container svelte-nqt2bf"><div class="dashboard-header svelte-nqt2bf"><div class="header-content svelte-nqt2bf"><h1 class="svelte-nqt2bf">Summary</h1></div></div> `);
  {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="state-container svelte-nqt2bf"><p>Loading...</p></div>`);
  }
  $$payload.out.push(`<!--]--></div>`);
  pop();
}
export {
  _page as default
};
