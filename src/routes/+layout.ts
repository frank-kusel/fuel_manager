// Fuel Manager runs in the browser only: every read is made as the signed-in
// farm member (the session lives on the device), so there is nothing to render
// on the server.
export const ssr = false;
