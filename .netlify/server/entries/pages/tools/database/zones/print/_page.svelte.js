import { F as head, J as escape_html, B as pop, z as push } from "../../../../../../chunks/index2.js";
function _page($$payload, $$props) {
  push();
  head($$payload, ($$payload2) => {
    $$payload2.title = `<title>Zone Map - FarmTrack</title>`;
  });
  $$payload.out.push(`<div class="print-page svelte-1y1zndm"><div class="header svelte-1y1zndm"><h1 class="svelte-1y1zndm">Farm Zone Map</h1> <p class="subtitle svelte-1y1zndm">Reference map for fuel entry location tracking</p> <p class="date svelte-1y1zndm">Generated: ${escape_html((/* @__PURE__ */ new Date()).toLocaleDateString())}</p></div> `);
  {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="loading svelte-1y1zndm">Loading zones...</div>`);
  }
  $$payload.out.push(`<!--]--> <div class="footer svelte-1y1zndm"><button class="print-button svelte-1y1zndm">🖨️ Print This Page</button> <button class="close-button svelte-1y1zndm">Close</button></div></div>`);
  pop();
}
export {
  _page as default
};
