// Renders the guest cards with the mock home and saves the README screenshots.
// Usage: npm install && npm run build && node scripts/screenshots/guest.mjs
// Renders, each with its -dark twin: gs-active, gs-ending, gs-off, gs-revealed, gs-narrow, gs-wifi, gs-mini-active,
// gs-mini-zoom, gs-mini-off (.png).
import { pair, shoot } from "./harness.mjs";
import { pageScript, setup } from "./mock.mjs";

// Stills: animations: false stops the porch light and the bushes, so a capture only changes when the card does.
const still = (file, s) => pair(file, { ...s, config: { animations: false, ...s.config } });
for (const scene of ["active", "ending", "off"]) {
  await shoot({ prefix: "gs", tag: "guest-card", shots: still(scene, { scene }), setup, ws: pageScript(scene) });
}
// A password revealed, and the card at a phone's width.
await shoot({ prefix: "gs", tag: "guest-card", shots: still("revealed", { scene: "active", open: ".pw .eye" }), setup, ws: pageScript("active") });
await shoot({ prefix: "gs", tag: "guest-card", shots: still("narrow", { scene: "active", width: 300 }), setup, ws: pageScript("active") });
// The Wi-Fi alone: an open network, no switch, no tiles.
await shoot({
  prefix: "gs",
  tag: "guest-card",
  shots: still("wifi", { scene: "active", config: { entity: null, end: null, lock: null, code: null, alarm: null, calendar: null, tonight: null, contacts: null, emergency: "", security: "nopass" } }),
  setup,
  ws: pageScript("active"),
});
await shoot({ prefix: "gs-mini", tag: "guest-mini-card", shots: [...still("active", { scene: "active" }), ...still("zoom", { scene: "active", open: ".zoom" })], setup, ws: pageScript("active") });
await shoot({ prefix: "gs-mini", tag: "guest-mini-card", shots: still("off", { scene: "off" }), setup, ws: pageScript("off") });
