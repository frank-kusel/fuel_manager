import { P as ensure_array_like, F as head, J as escape_html, G as attr_class, B as pop, z as push } from "../../../chunks/index2.js";
function _page($$payload, $$props) {
  push();
  let envVars = {};
  const each_array = ensure_array_like(Object.entries(envVars));
  head($$payload, ($$payload2) => {
    $$payload2.title = `<title>Debug - Environment Variables</title>`;
  });
  $$payload.out.push(`<div class="debug-container svelte-1qg9r69"><h1>Environment Debug</h1> <div class="section svelte-1qg9r69"><h2>Environment Variables</h2> <div class="env-vars svelte-1qg9r69"><!--[-->`);
  for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
    let [key, value] = each_array[$$index];
    $$payload.out.push(`<div class="env-var svelte-1qg9r69"><strong>${escape_html(key)}:</strong> <span${attr_class("svelte-1qg9r69", void 0, { "error": value === "NOT_SET" })}>${escape_html(key.includes("KEY") ? value.slice(0, 20) + "..." : value)}</span></div>`);
  }
  $$payload.out.push(`<!--]--></div></div> <div class="section svelte-1qg9r69"><h2>Build Info</h2> <p>Mode: ${escape_html("production")}</p> <p>Dev: ${escape_html(false)}</p> <p>Prod: ${escape_html(true)}</p></div> <div class="section svelte-1qg9r69"><h2>Test Supabase Connection</h2> <button class="svelte-1qg9r69">Test Connection</button> `);
  {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--></div></div>`);
  pop();
}
export {
  _page as default
};
