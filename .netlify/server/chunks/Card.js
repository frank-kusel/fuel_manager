import { G as attr_class, R as clsx, B as pop, z as push } from "./index2.js";
function Card($$payload, $$props) {
  push();
  let {
    class: className = "",
    padding = "medium",
    shadow = true,
    hover = false,
    children
  } = $$props;
  const classes = [
    "card",
    `card-padding-${padding}`,
    shadow && "card-shadow",
    hover && "card-hover",
    className
  ].filter(Boolean).join(" ");
  $$payload.out.push(`<div${attr_class(clsx(classes), "svelte-1v5uc5n")}>`);
  children($$payload);
  $$payload.out.push(`<!----></div>`);
  pop();
}
export {
  Card as C
};
