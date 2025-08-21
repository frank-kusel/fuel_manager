import { F as head, B as pop, z as push } from "../../chunks/index2.js";
import "@sveltejs/kit/internal";
import "../../chunks/exports.js";
import "../../chunks/utils.js";
import "clsx";
import "../../chunks/state.svelte.js";
function _page($$payload, $$props) {
  push();
  head($$payload, ($$payload2) => {
    $$payload2.title = `<title>FarmTrack - Loading...</title>`;
  });
  $$payload.out.push(`<div class="loading-container svelte-1w1qui2"><div class="loading-spinner svelte-1w1qui2"><div class="brand-icon svelte-1w1qui2">🚜</div> <h2 class="svelte-1w1qui2">Loading FarmTrack...</h2> <p class="svelte-1w1qui2">Redirecting to fuel management...</p></div></div>`);
  pop();
}
export {
  _page as default
};
