import { D as getContext, E as store_get, F as head, G as attr_class, I as unsubscribe_stores, B as pop, z as push } from "../../chunks/index2.js";
import "@sveltejs/kit/internal";
import "../../chunks/exports.js";
import "../../chunks/utils.js";
import "clsx";
import "../../chunks/state.svelte.js";
const getStores = () => {
  const stores$1 = getContext("__svelte__");
  return {
    /** @type {typeof page} */
    page: {
      subscribe: stores$1.page.subscribe
    },
    /** @type {typeof navigating} */
    navigating: {
      subscribe: stores$1.navigating.subscribe
    },
    /** @type {typeof updated} */
    updated: stores$1.updated
  };
};
const page = {
  subscribe(fn) {
    const store = getStores().page;
    return store.subscribe(fn);
  }
};
function _layout($$payload, $$props) {
  push();
  var $$store_subs;
  let { children } = $$props;
  const pathname = store_get($$store_subs ??= {}, "$page", page)?.url?.pathname || "/";
  head($$payload, ($$payload2) => {
    $$payload2.title = `<title>FarmTrack - Farm Management Platform</title>`;
  });
  $$payload.out.push(`<div class="app svelte-1aihuhl"><header class="header desktop-only svelte-1aihuhl"><div class="header-brand svelte-1aihuhl"><div class="brand-icon svelte-1aihuhl">🚜</div> <h1 class="svelte-1aihuhl">FarmTrack</h1></div> <nav class="nav svelte-1aihuhl"><a href="/fuel"${attr_class("nav-btn svelte-1aihuhl", void 0, { "active": pathname === "/fuel" || pathname === "/" })}>Fuel Management</a> <a href="/fuel/summary"${attr_class("nav-btn svelte-1aihuhl", void 0, { "active": pathname === "/fuel/summary" })}>Fuel Summary</a> <a href="/dashboard"${attr_class("nav-btn svelte-1aihuhl", void 0, { "active": pathname === "/dashboard" })}>Dashboard</a> <a href="/fleet"${attr_class("nav-btn svelte-1aihuhl", void 0, { "active": pathname.startsWith("/fleet") })}>Database</a></nav></header> <main class="main svelte-1aihuhl">`);
  children($$payload);
  $$payload.out.push(`<!----></main> <nav class="mobile-nav svelte-1aihuhl"><a href="/fuel"${attr_class("mobile-nav-btn svelte-1aihuhl", void 0, { "active": pathname === "/fuel" || pathname === "/" })}><span class="nav-icon svelte-1aihuhl">⛽</span> <span class="nav-label svelte-1aihuhl">Fuel</span></a> <a href="/fuel/summary"${attr_class("mobile-nav-btn svelte-1aihuhl", void 0, { "active": pathname === "/fuel/summary" })}><span class="nav-icon svelte-1aihuhl">📋</span> <span class="nav-label svelte-1aihuhl">Summary</span></a> <a href="/dashboard"${attr_class("mobile-nav-btn svelte-1aihuhl", void 0, { "active": pathname === "/dashboard" })}><span class="nav-icon svelte-1aihuhl">📊</span> <span class="nav-label svelte-1aihuhl">Dashboard</span></a></nav></div>`);
  if ($$store_subs) unsubscribe_stores($$store_subs);
  pop();
}
export {
  _layout as default
};
