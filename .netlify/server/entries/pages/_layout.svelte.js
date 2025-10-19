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
  $$payload.out.push(`<div class="app svelte-12qhfyh"><header class="header desktop-only svelte-12qhfyh"><div class="header-brand svelte-12qhfyh"><div class="brand-icon svelte-12qhfyh">🚜</div> <h1 class="svelte-12qhfyh">FarmTrack</h1></div> <nav class="nav svelte-12qhfyh"><a href="/fuel"${attr_class("nav-btn svelte-12qhfyh", void 0, { "active": pathname === "/fuel" || pathname === "/" })}>Fuel Management</a> <a href="/summary"${attr_class("nav-btn svelte-12qhfyh", void 0, { "active": pathname === "/summary" })}>Fuel Summary</a> <a href="/dashboard"${attr_class("nav-btn svelte-12qhfyh", void 0, { "active": pathname === "/dashboard" })}>Dashboard</a> <a href="/tools"${attr_class("nav-btn svelte-12qhfyh", void 0, { "active": pathname.startsWith("/tools") })}>Tools</a></nav></header> <main class="main svelte-12qhfyh">`);
  children($$payload);
  $$payload.out.push(`<!----></main> <nav class="mobile-nav svelte-12qhfyh"><a href="/fuel"${attr_class("mobile-nav-btn svelte-12qhfyh", void 0, { "active": pathname === "/fuel" || pathname === "/" })}><svg class="nav-icon svelte-12qhfyh" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 11h1.5a2.5 2.5 0 0 0 0-5h-11a2.5 2.5 0 0 0 0 5H4"></path><path d="M14 11v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V11"></path><path d="M14 4a2 2 0 0 0-2-2h-1a2 2 0 0 0-2 2"></path></svg> <span class="nav-label svelte-12qhfyh">Fuel</span></a> <a href="/summary"${attr_class("mobile-nav-btn svelte-12qhfyh", void 0, { "active": pathname === "/summary" })}><svg class="nav-icon svelte-12qhfyh" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg> <span class="nav-label svelte-12qhfyh">Summary</span></a> <a href="/dashboard"${attr_class("mobile-nav-btn svelte-12qhfyh", void 0, { "active": pathname === "/dashboard" })}><svg class="nav-icon svelte-12qhfyh" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V10"></path><path d="M18 20V4"></path><path d="M6 20V16"></path></svg> <span class="nav-label svelte-12qhfyh">Dashboard</span></a> <a href="/tools"${attr_class("mobile-nav-btn svelte-12qhfyh", void 0, { "active": pathname.startsWith("/tools") })}><svg class="nav-icon svelte-12qhfyh" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg> <span class="nav-label svelte-12qhfyh">Tools</span></a></nav></div>`);
  if ($$store_subs) unsubscribe_stores($$store_subs);
  pop();
}
export {
  _layout as default
};
