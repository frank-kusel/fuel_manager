import { F as head, J as escape_html, B as pop, z as push } from "../../../../../chunks/index2.js";
function _page($$payload, $$props) {
  push();
  head($$payload, ($$payload2) => {
    $$payload2.title = `<title>Zone Map - FarmTrack</title>`;
  });
  $$payload.out.push(`<div class="print-page svelte-hspfq1"><div class="header svelte-hspfq1"><h1 class="svelte-hspfq1">Farm Zone Map</h1> <p class="subtitle svelte-hspfq1">Reference map for fuel entry location tracking</p> <p class="date svelte-hspfq1">Generated: ${escape_html((/* @__PURE__ */ new Date()).toLocaleDateString())}</p></div> `);
  {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="loading svelte-hspfq1">Loading zones...</div>`);
  }
  $$payload.out.push(`<!--]--> <div class="footer svelte-hspfq1"><button class="print-button svelte-hspfq1">🖨️ Print This Page</button> <button class="close-button svelte-hspfq1">Close</button></div></div>`);
  pop();
}
export {
  _page as default
};
