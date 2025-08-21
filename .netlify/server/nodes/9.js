import * as server from '../entries/pages/fleet/vehicles/_id_/_page.server.ts.js';

export const index = 9;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/fleet/vehicles/_id_/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/fleet/vehicles/[id]/+page.server.ts";
export const imports = ["_app/immutable/nodes/9._7xBZi_N.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/D6cbYCli.js","_app/immutable/chunks/BmneS3Po.js","_app/immutable/chunks/BneLVwPG.js","_app/immutable/chunks/Dp72FNzO.js","_app/immutable/chunks/X5Sv9yWS.js","_app/immutable/chunks/nXdQvSCr.js","_app/immutable/chunks/5P4c1mN1.js","_app/immutable/chunks/CSIOR0MX.js","_app/immutable/chunks/Do4TXmzf.js","_app/immutable/chunks/D0Cdm3ct.js","_app/immutable/chunks/DcOV7W_e.js","_app/immutable/chunks/DQ2vU5C0.js","_app/immutable/chunks/hw9sEPVb.js"];
export const stylesheets = [];
export const fonts = [];
