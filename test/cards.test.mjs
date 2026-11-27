import assert from "node:assert/strict";
import { test } from "node:test";
import { at, makeHass, NOW } from "./hass.mjs";
import { fakeNode, load } from "./load.mjs";

const gs = load({ now: NOW });
const { cards } = gs;
const json = (v) => JSON.parse(JSON.stringify(v));
const settle = () => new Promise((r) => setTimeout(r, 0));

// A card whose shadow root answers every selector with nodes recording their listeners; the calendar fetched
// (callApi) before the test reads it.
const make = async (tag, config, hass = makeHass()) => {
  const card = new cards[tag]();
  card.attachShadow();
  const nodes = {};
  card.shadowRoot.querySelector = (s) => (nodes[s] ||= fakeNode());
  card.setConfig({ type: `custom:${tag}`, ...config });
  card.hass = hass;
  await settle();
  await settle();
  return card;
};

const FULL = {
  entity: "input_boolean.guest_mode",
  end: "input_datetime.guests_until",
  ssid: "Guests",
  password: "welcome-home",
  lock: "lock.front_door",
  code: "4821",
  alarm: "alarm_control_panel.home",
  calendar: "calendar.family",
  tonight: [
    { time: "19:30", text: "Dinner" },
    { time: "20:45", text: "Story and bed" },
  ],
  contacts: [{ name: "Parents", phone: "+33 6 00 00 00 00" }],
};

test("both cards are registered, with their editors and a picker entry", () => {
  for (const tag of ["guest-card", "guest-mini-card"]) {
    assert.ok(gs.customElements.get(tag), tag);
    assert.ok(gs.customElements.get(`${tag}-editor`), `${tag}-editor`);
  }
  assert.deepEqual(json(gs.window.customCards.map((c) => c.type)), ["guest-card", "guest-mini-card"]);
  assert.deepEqual(json(cards["guest-card"].getStubConfig(makeHass())), { entity: "input_boolean.guest_mode", ssid: "Guests", password: "welcome-home" });
});

test("the WIFI: text escapes its reserved characters and knows open and hidden networks", () => {
  assert.equal(gs.gsQrString({ ssid: "My;Net", password: 'a"b\\c', security: "WPA" }), 'WIFI:T:WPA;S:My\\;Net;P:a\\"b\\\\c;;');
  assert.equal(gs.gsQrString({ ssid: "Open", password: "x", security: "nopass", hidden: true }), "WIFI:T:nopass;S:Open;P:;H:true;;");
  assert.equal(gs.gsQrString({ ssid: "Old", password: "k", security: "WEP" }), "WIFI:T:WEP;S:Old;P:k;;");
  const svg = gs.gsQrSvg("WIFI:T:WPA;S:Guests;P:welcome-home;;", 96, "QR");
  // Version 3 (29 modules) for this text, with the 4-module quiet zone.
  assert.match(svg, /viewBox="0 0 37 37"/);
  assert.match(svg, /aria-label="QR"/);
});

test("end of guest mode: a time, an entity, after midnight", () => {
  const hass = makeHass();
  assert.equal(gs.gsEnd(hass, "23:30", NOW), at(23, 30));
  assert.equal(gs.gsEnd(hass, "01:00", NOW), at(1, 0, 28), "after midnight: tomorrow");
  assert.equal(gs.gsEnd(hass, "input_datetime.guests_until", NOW), at(23, 30));
  assert.equal(gs.gsEnd(hass, "sensor.none", NOW), null);
  assert.equal(gs.gsEnd(hass, "", NOW), null);
  assert.equal(gs.gsMinutes("00:30"), 1470, "after midnight counts as the end of the evening");
  assert.equal(gs.gsMinutes("25:00"), null);
});

test("full card: the network, the tiles, the evening and the contacts", async () => {
  const hass = makeHass();
  const card = await make("guest-card", FULL, hass);
  const m = card._items;
  assert.equal(m.state, "active");
  assert.equal(hass.api.length, 1);
  assert.match(hass.api[0][1], /^calendars\/calendar\.family\?start=.+&end=.+/);
  assert.deepEqual(
    json(m.tonight.map((e) => [e.time, e.text])),
    [
      ["19:30", "Dinner"],
      ["20:15", "Bath time"],
      ["20:45", "Story and bed"],
    ],
    "the calendar's events still to come, timed, in order",
  );
  const html = card.shadowRoot.innerHTML;
  assert.match(html, /<ha-card class="st-active">/);
  assert.match(html, /<span class="bpt">Active<\/span>/);
  assert.match(html, /<div class="subt">Until 23:30<\/div>/);
  assert.match(html, /<div class="ssid">Guests<\/div>/);
  // Password and code masked, never in the page until revealed.
  assert.doesNotMatch(html, /welcome-home|4821/);
  assert.match(html, /data-id="lock.front_door"[\s\S]*?<span class="st">Locked<\/span>/);
  assert.match(html, /class="tile tn-ok" data-id="lock.front_door"/);
  assert.match(html, /class="tile tn-idle" data-id="alarm_control_panel.home"/);
  assert.match(html, /<a class="ct" href="tel:\+33600000000"/);
  assert.match(html, /<a class="ct sos" href="tel:112"/);
  assert.match(html, /<button class="mode">End guest mode<\/button>/);
  assert.match(html, /<dialog class="qrd"/);
});

test("revealing the password and the code, masked again after 30 s and when the card leaves", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const card = new cards["guest-card"]();
  card.attachShadow();
  card.shadowRoot.querySelector = () => null;
  card.setConfig({ type: "custom:guest-card", ...FULL, calendar: undefined });
  card.hass = makeHass();
  card._toggleSecret({ stopPropagation() {} }, "pw");
  assert.match(card.shadowRoot.innerHTML, /welcome-home/);
  assert.doesNotMatch(card.shadowRoot.innerHTML, /4821/);
  card._toggleSecret({ stopPropagation() {} }, "code");
  assert.match(card.shadowRoot.innerHTML, /4821/);
  t.mock.timers.tick(30000);
  assert.doesNotMatch(card.shadowRoot.innerHTML, /welcome-home|4821/);
  card._toggleSecret({ stopPropagation() {} }, "pw");
  card.disconnectedCallback();
  assert.doesNotMatch(card.shadowRoot.innerHTML, /welcome-home/);
});

test("ending soon, off, and no switch at all", async () => {
  const soon = makeHass();
  soon.states["input_datetime.guests_until"] = { ...soon.states["input_datetime.guests_until"], state: "19:20:00" };
  const ending = await make("guest-card", FULL, soon);
  assert.equal(ending._items.state, "ending");
  assert.match(ending.shadowRoot.innerHTML, /<ha-card class="st-ending">/);
  const offHass = makeHass();
  offHass.states["input_boolean.guest_mode"] = { ...offHass.states["input_boolean.guest_mode"], state: "off" };
  const off = await make("guest-card", FULL, offHass);
  assert.equal(off._items.state, "off");
  assert.match(off.shadowRoot.innerHTML, /<div class="subt">Guest mode is off<\/div>/);
  assert.match(off.shadowRoot.innerHTML, /<button class="mode start">Start guest mode<\/button>/);
  // Off: the header and the start button only — no QR, network, code, evening or contacts.
  assert.doesNotMatch(off.shadowRoot.innerHTML, /<dialog|class="qr|class="tile|class="box|class="ct/);
  off._toggleMode();
  assert.deepEqual(json(offHass.calls), [["homeassistant", "turn_on", { entity_id: "input_boolean.guest_mode" }]]);
  const kept = await make("guest-card", { ...FULL, show_when_off: true }, offHass);
  assert.match(kept.shadowRoot.innerHTML, /<dialog class="qrd"/, "show_when_off keeps the details");
  const offMini = await make("guest-mini-card", FULL, offHass);
  assert.doesNotMatch(offMini.shadowRoot.innerHTML, /<dialog|class="subt net qr/, "the mini card hides the network too");
  const always = await make("guest-card", { ssid: "Guests", security: "nopass" });
  assert.equal(always._items.state, "active");
  assert.doesNotMatch(always.shadowRoot.innerHTML, /class="mode/, "no switch: no button");
  assert.match(always.shadowRoot.innerHTML, /Open network \(no password\)/);
});

test("network from entities; nothing configured shows no empty block", async () => {
  const card = await make("guest-card", { ssid: "Fallback", ssid_entity: "input_text.guest_ssid" });
  assert.match(card.shadowRoot.innerHTML, /<div class="ssid">Guests-5G<\/div>/);
  const bare = await make("guest-card", { emergency: "" });
  const html = bare.shadowRoot.innerHTML;
  for (const cls of ['class="wifi"', 'class="tiles', 'class="cols', "<dialog"]) assert.ok(!html.includes(cls), cls);
});

test("the tiles open their entity's details", async () => {
  const card = await make("guest-card", FULL);
  const events = [];
  card.dispatchEvent = (e) => events.push(e.detail?.entityId);
  const tile = { dataset: { id: "lock.front_door" }, addEventListener(_type, fn) { this.fn = fn; } };
  card.shadowRoot.querySelectorAll = (s) => (s === ".tile[data-id]" ? [tile] : []);
  card._paint(card._items, "", "");
  tile.fn();
  assert.deepEqual(events, ["lock.front_door"]);
});

test("mini card: the state and the network on two lines, a zoom to the full card", async () => {
  const card = await make("guest-mini-card", FULL);
  const html = card.shadowRoot.innerHTML;
  assert.match(html, /<ha-card class="st-active bn">/);
  assert.match(html, /<button class="subt net qr"[^>]*>Wi-Fi · Guests<\/button>/);
  assert.doesNotMatch(html, /class="tiles/);
  card._zoomed = true;
  card._sig = null;
  card._render();
  assert.match(card.shadowRoot.innerHTML, /class="tiles/);
  card.disconnectedCallback();
  assert.equal(card._zoomed, false, "left: back to the compact view");
});

test("translations: every language has every English key", () => {
  for (const table of [gs.GS_I18N, gs.RC_I18N]) {
    const en = Object.keys(table.en);
    for (const [lang, t] of Object.entries(table)) assert.deepEqual(en.filter((k) => !(k in t)), [], lang);
    assert.equal(Object.keys(table).length, 22);
  }
});

test("the editor labels every field and writes only what differs from the defaults", () => {
  const ed = new (gs.customElements.get("guest-card-editor"))();
  ed.setConfig({ type: "custom:guest-card" });
  ed.hass = makeHass();
  const form = ed.children[0];
  const names = form.schema.flatMap((s) => (s.schema ? s.schema.map((x) => x.name) : [s.name]));
  for (const n of ["entity", "end", "ssid", "password", "security", "lock", "code", "alarm", "calendar", "tonight", "contacts", "language"]) assert.ok(names.includes(n), n);
  for (const n of [...names, "advanced"]) assert.notEqual(form.computeLabel({ name: n }), `ed_${n}`, n);
  let out;
  ed.dispatchEvent = (e) => (out = e.detail.config);
  form.listeners["value-changed"]({ detail: { value: { type: "custom:guest-card", security: "WPA", emergency: "112", ssid: "Guests", lock: "" } } });
  assert.deepEqual(json(out), { type: "custom:guest-card", ssid: "Guests" });
});

test("French", async () => {
  const card = await make("guest-card", { ...FULL, language: "fr" });
  assert.match(card.shadowRoot.innerHTML, /Jusqu&#39;à 23:30/);
  assert.match(card.shadowRoot.innerHTML, /Terminer le mode invité/);
});

test("12-hour clocks drop the leading zero, 24-hour clocks keep it", async () => {
  const twelve = await make("guest-card", { entity: "input_boolean.guest_mode", end: "07:05" }, { ...makeHass(), locale: { language: "en", time_format: "12" } });
  assert.match(twelve.shadowRoot.innerHTML, /<div class="subt">Until 7:05 AM<\/div>/);
  const day = await make("guest-card", { entity: "input_boolean.guest_mode", end: "07:05" });
  assert.match(day.shadowRoot.innerHTML, /<div class="subt">Until 07:05<\/div>/);
});
