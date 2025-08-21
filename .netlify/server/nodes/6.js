import * as server from '../entries/pages/fleet/activities/_id_/_page.server.ts.js';

export const index = 6;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/fleet/activities/_id_/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/fleet/activities/[id]/+page.server.ts";
export const imports = ["_app/immutable/nodes/6.DqwZibR4.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/dwEtV9xH.js","_app/immutable/chunks/B3LP5smr.js","_app/immutable/chunks/CX9VYhNw.js","_app/immutable/chunks/CGsj9omu.js","_app/immutable/chunks/GfSQSV87.js","_app/immutable/chunks/X5Sv9yWS.js","_app/immutable/chunks/lS_Crnyk.js","_app/immutable/chunks/CTKUkxTe.js","_app/immutable/chunks/DkB2oqxZ.js","_app/immutable/chunks/BjRBroEh.js","_app/immutable/chunks/CZJFLeIk.js","_app/immutable/chunks/DPxYDTTD.js","_app/immutable/chunks/CFqjM9C_.js"];
export const stylesheets = [];
export const fonts = [];
