import { M as ensure_array_like, F as head, J as escape_html, G as attr_class, B as pop, z as push } from "../../../chunks/index2.js";
function _page($$payload, $$props) {
  push();
  let envStatus = {};
  const each_array = ensure_array_like(Object.entries(envStatus));
  head($$payload, ($$payload2) => {
    $$payload2.title = `<title>Debug - Environment Status</title>`;
  });
  $$payload.out.push(`<div class="debug-container svelte-1cmtigg"><h1>Environment Debug</h1> <div class="section svelte-1cmtigg"><h2>Environment Variables Status</h2> <div class="env-vars svelte-1cmtigg"><!--[-->`);
  for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
    let [key, isSet] = each_array[$$index];
    $$payload.out.push(`<div class="env-var svelte-1cmtigg"><strong>${escape_html(key)}:</strong> <span${attr_class("svelte-1cmtigg", void 0, { "error": !isSet })}>${escape_html(isSet ? "✅ Set" : "❌ Missing")}</span></div>`);
  }
  $$payload.out.push(`<!--]--></div></div> <div class="section svelte-1cmtigg"><h2>Build Info</h2> <p>Mode: ${escape_html("production")}</p> <p>Dev: ${escape_html(false)}</p> <p>Prod: ${escape_html(true)}</p></div> <div class="section svelte-1cmtigg"><h2>Test Supabase Connection</h2> <button class="svelte-1cmtigg">Test Connection</button> `);
  {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--></div></div>`);
  pop();
}
export {
  _page as default
};
