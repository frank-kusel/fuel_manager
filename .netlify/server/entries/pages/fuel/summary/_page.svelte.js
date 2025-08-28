import { F as head, K as attr, B as pop, z as push, J as escape_html } from "../../../../chunks/index2.js";
function _page($$payload, $$props) {
  push();
  let entries = [];
  let selectedDate = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  (() => {
    if (!entries || entries.length === 0) {
      return { totalFuel: 0, openingReading: null, closingReading: null };
    }
    const sortedEntries = [...entries].sort((a, b) => a.time.localeCompare(b.time));
    const totalFuel = entries.reduce((sum, entry) => sum + (entry.litres_dispensed || 0), 0);
    const firstEntry = sortedEntries[0];
    const lastEntry = sortedEntries[sortedEntries.length - 1];
    const openingReading = firstEntry?.bowser_reading_start || null;
    const closingReading = lastEntry?.bowser_reading_end || null;
    return { totalFuel, openingReading, closingReading };
  })();
  head($$payload, ($$payload2) => {
    $$payload2.title = `<title>Fuel Summary - ${escape_html(selectedDate)}</title>`;
    $$payload2.out.push(`<link rel="preconnect" href="https://fonts.googleapis.com"/> <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin=""/> <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&amp;display=swap" rel="stylesheet"/>`);
  });
  $$payload.out.push(`<div class="container svelte-63o43h"><header class="header svelte-63o43h"><h1 class="header-title svelte-63o43h">Summary</h1> <input type="date"${attr("value", selectedDate)} class="date-picker svelte-63o43h"/></header> `);
  {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="state-container svelte-63o43h"><p>Loading...</p></div>`);
  }
  $$payload.out.push(`<!--]--></div>`);
  pop();
}
export {
  _page as default
};
