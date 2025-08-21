import { M as attr, G as attr_class, R as clsx, B as pop, z as push } from "./index2.js";
function Button($$payload, $$props) {
  push();
  let {
    variant = "primary",
    size = "medium",
    disabled = false,
    loading = false,
    type = "button",
    href,
    target,
    class: className = "",
    onclick,
    fullWidth = false,
    children
  } = $$props;
  const baseClasses = [
    "btn",
    `btn-${variant}`,
    `btn-${size}`,
    fullWidth && "btn-full-width",
    className
  ].filter(Boolean).join(" ");
  const finalDisabled = disabled || loading;
  if (href) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<a${attr("href", href)}${attr("target", target)}${attr_class(clsx(baseClasses), "svelte-1aot3tz", { "disabled": finalDisabled })} role="button"${attr("tabindex", finalDisabled ? -1 : 0)}>`);
    if (loading) {
      $$payload.out.push("<!--[-->");
      $$payload.out.push(`<div class="loading-spinner svelte-1aot3tz"></div>`);
    } else {
      $$payload.out.push("<!--[!-->");
    }
    $$payload.out.push(`<!--]--> `);
    children($$payload);
    $$payload.out.push(`<!----></a>`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<button${attr("type", type)}${attr_class(clsx(baseClasses), "svelte-1aot3tz")}${attr("disabled", finalDisabled, true)}>`);
    if (loading) {
      $$payload.out.push("<!--[-->");
      $$payload.out.push(`<div class="loading-spinner svelte-1aot3tz"></div>`);
    } else {
      $$payload.out.push("<!--[!-->");
    }
    $$payload.out.push(`<!--]--> `);
    children($$payload);
    $$payload.out.push(`<!----></button>`);
  }
  $$payload.out.push(`<!--]-->`);
  pop();
}
export {
  Button as B
};
