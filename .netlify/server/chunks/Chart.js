import { O as attr_style, B as pop, z as push, P as stringify } from "./index2.js";
function formatDate(date, format = "full") {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) {
    return "Invalid date";
  }
  switch (format) {
    case "short":
      return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short"
      });
    case "time":
      return d.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit"
      });
    case "full":
    default:
      return d.toLocaleDateString("en-GB", {
        year: "numeric",
        month: "short",
        day: "numeric"
      });
  }
}
function formatNumber(value, decimals = 0) {
  if (value === null || value === void 0) {
    return "0";
  }
  return value.toLocaleString("en-GB", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}
function Chart($$payload, $$props) {
  push();
  let { type, data, options = {}, height = "300px" } = $$props;
  $$payload.out.push(`<div class="relative"${attr_style(`height: ${stringify(
    // Redraw when data changes
    height
  )}`)}><canvas width="600" height="300" class="w-full h-full"></canvas> `);
  if (!data.datasets?.[0]?.data?.length) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="absolute inset-0 flex items-center justify-center"><p class="text-gray-500">No data available</p></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--></div>`);
  pop();
}
export {
  Chart as C,
  formatDate as a,
  formatNumber as f
};
