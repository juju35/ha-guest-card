/**
 * guest-card / guest-mini-card: what a guest or a babysitter needs — the guest Wi-Fi as a QR code to scan, the door
 * code and the password behind a button, the front door and the alarm, the evening's plan and who to call — under a
 * guest mode switched on and off from the card.
 * https://github.com/juju35/ha-guest-card
 */

// Colour of each state of the card: guest mode on, ending within GS_ENDING_MS, off.
const GS_COLORS = { active: "#1e8e5a", ending: "#c77700", off: "#8a929c" };
const GS_ENDING_MS = 30 * 60 * 1000;
// A revealed password or door code is masked again after this delay (and when the card leaves the page).
const GS_REVEAL_MS = 30 * 1000;
// How often the calendar is asked again for the evening's events (ms).
const GS_REFRESH = 15 * 60 * 1000;
// One loop of the banner's animations (s): the porch light breathes, the bushes sway.
const GS_LOOP = 3;
// What a masked password or code shows: always the same length, so that it tells nothing.
const GS_MASK = "••••••••";
// The tones of a lock's and an alarm's states.
const GS_LOCK_TONES = { locked: "ok", unlocked: "info", open: "info", opening: "warn", locking: "warn", unlocking: "warn", jammed: "alert" };
const GS_ALARM_TONES = { disarmed: "idle", pending: "warn", arming: "warn", triggered: "alert" };

// ── Banner ───────────────────────────────────────────────────────────────────
// The illustrated header's scene: 200 × 80, drawn to the banner's right edge. A house front: guest mode on, its door is
// open on a warm hall, the porch light breathes and the bushes sway; off, the door is closed. By night (the dark theme),
// the sky darkens, stars come out and the windows are lit. `mini`: the door alone, at the right.
const gsScene = ({ night, on, animate, mini }) => {
  const wall = night ? "#2a3833" : "#ffffff";
  const edge = night ? "#3a4c45" : "#c9e3d4";
  const leaf = night ? "#237a52" : "#2e9e6a";
  const bush = night ? "#2f6b4e" : "#7cc39a";
  const lit = night ? "#ffd77a" : "#d6ecf5";
  const sway = (cx, delay) =>
    animate && on ? `<animateTransform attributeName="transform" type="rotate" values="-3 ${cx} 80;3 ${cx} 80;-3 ${cx} 80" dur="${GS_LOOP}s" begin="${delay}s" repeatCount="indefinite"/>` : "";
  const win = (x) =>
    `<rect x="${x}" y="24" width="22" height="20" rx="2" fill="${lit}" stroke="${edge}" stroke-width="2"/><path d="M${x + 11} 24v20M${x} 34h22" stroke="${edge}" stroke-width="1.5"/>`;
  const door = on
    ? `<rect x="107" y="33" width="26" height="47" fill="${night ? "#ffcf6b" : "#ffe3a3"}"/><path d="M107 33 L116 36 L116 77 L107 80 Z" fill="${leaf}"/><circle cx="114" cy="58" r="1.6" fill="#fff"/>`
    : `<rect x="107" y="33" width="26" height="47" fill="${leaf}"/><circle cx="128" cy="58" r="1.8" fill="#fff"/><rect x="112" y="38" width="16" height="10" rx="1.5" fill="none" stroke="rgba(255,255,255,.35)"/>`;
  const glow = on
    ? `<circle cx="146" cy="40" r="11" fill="#ffd25e" opacity=".35">${animate ? `<animate attributeName="opacity" values=".18;.5;.18" dur="${GS_LOOP}s" repeatCount="indefinite"/>` : ""}</circle>`
    : "";
  const stars =
    night && !mini
      ? [
          [12, 12],
          [30, 24],
          [20, 44],
          [44, 10],
        ]
          .map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="1.2" fill="#fff" opacity=".8">${animate ? `<animate attributeName="opacity" values=".3;.9;.3" dur="${GS_LOOP}s" begin="${(i * GS_LOOP) / 4}s" repeatCount="indefinite"/>` : ""}</circle>`)
          .join("")
      : "";
  const cloud = !night && !mini ? `<g fill="#fff" opacity=".9"><ellipse cx="24" cy="20" rx="14" ry="6"/><ellipse cx="32" cy="16" rx="9" ry="6"/></g>` : "";
  const front = `<rect x="54" y="6" width="136" height="6" rx="2" fill="${night ? "#2f453d" : "#9cc9b0"}"/>
    <rect x="58" y="12" width="128" height="68" fill="${wall}" stroke="${edge}" stroke-width="1.5"/>
    ${mini ? "" : `${win(68)}${win(156)}`}
    <rect x="104" y="30" width="32" height="50" rx="2" fill="${edge}"/>${door}
    <rect x="144" y="34" width="4" height="3" fill="${edge}"/>${glow}<circle cx="146" cy="40" r="3" fill="${on || night ? "#ffd25e" : "#e8e3cf"}"/>
    <path d="M100 80 L105 76 H135 L140 80 Z" fill="${night ? "#8a7050" : "#c9a77a"}"/>`;
  const bushes = mini
    ? `<g><circle cx="180" cy="73" r="8" fill="${bush}"/>${sway(180, GS_LOOP / 2)}</g>`
    : `<g><circle cx="44" cy="72" r="10" fill="${bush}"/><circle cx="34" cy="75" r="7" fill="${bush}"/>${sway(40, 0)}</g><g><circle cx="194" cy="73" r="9" fill="${bush}"/>${sway(194, GS_LOOP / 2)}</g>`;
  return `${stars}${cloud}${mini ? `<g transform="translate(44 0)">${front}</g>` : front}${bushes}`;
};

// The status pill's place, decided by measurement after each render and each new width (the same rule on every
// card): on the title row, right after the title, only when the whole title and the pill's whole label fit there;
// otherwise on its own line under the subtitle. When the label is still cut there, or the text block leaves the
// banner or runs over its ground strip, the pill keeps its dot alone, on the title row (its label stays in title and
// aria-label). A card of 200 px or less shows the dot alone anyway (CSS).
const gsPlacePill = (head, row, ground) => {
  if (!head) return;
  head.removeAttribute("data-wrap");
  head.removeAttribute("data-dot");
  const pill = row.querySelector(":scope > .bpill, :scope > .pill");
  const text = pill?.querySelector(".bpt, .pt");
  if (!text?.getBoundingClientRect || text.getBoundingClientRect().width <= 1) return;
  const name = row.querySelector(".title");
  const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
  const title = name ? (name.scrollWidth > name.clientWidth ? name.scrollWidth : name.getBoundingClientRect().width) + gap : 0;
  if (title + pill.getBoundingClientRect().width <= row.getBoundingClientRect().width + 0.5) return;
  head.setAttribute("data-wrap", "");
  const box = row.parentElement.getBoundingClientRect();
  const frame = head.getBoundingClientRect();
  const out = ground && (box.bottom > ground.getBoundingClientRect().top + 0.5 || box.top < frame.top - 0.5);
  if (text.scrollWidth > text.clientWidth + 0.5 || out) {
    head.removeAttribute("data-wrap");
    head.setAttribute("data-dot", "");
  }
};

// ── Card ─────────────────────────────────────────────────────────────────────
class GuestCard extends RcCard {
  static tag = "guest-card";
  static i18n = GS_I18N;
  static defaults = { illustration: true, illustration_theme: "auto", show_subtitle: true, show_when_off: false, animations: true, security: "WPA", emergency: "112" };

  // A guest mode helper of the home when there is one (an input_boolean named guest…), and a network to show.
  static getStubConfig(hass) {
    const entity = Object.keys(hass?.states ?? {}).find((id) => /^input_boolean\..*(guest|invit|gast)/.test(id));
    return { ...(entity ? { entity } : {}), ssid: "Guests", password: "welcome-home" };
  }

  connectedCallback() {
    this._timer ??= setInterval(() => this._fetch(), GS_REFRESH);
    // A new width: the status pill is fitted again (in the next frame, and only for a new width).
    if (typeof ResizeObserver !== "function") return;
    this._resize ??= new ResizeObserver((entries) => {
      const w = Math.round(entries.at(-1).contentRect.width);
      if (w === this._fitWidth) return;
      this._fitWidth = w;
      cancelAnimationFrame(this._fitFrame);
      this._fitFrame = requestAnimationFrame(() => this._fitPill());
    });
    this._resize.observe(this);
  }

  // Left (another dashboard view, a conditional card hidden): the full screen QR code closes, what was revealed is
  // masked again.
  disconnectedCallback() {
    super.disconnectedCallback();
    clearInterval(this._timer);
    this._timer = undefined;
    this._resize?.disconnect();
    this._fitWidth = undefined;
    if (this._fitFrame) cancelAnimationFrame(this._fitFrame);
    this._qrOpen = false;
    this.shadowRoot?.querySelector?.("dialog")?.close?.();
    this._mask();
  }

  getCardSize() {
    return 6;
  }

  // The calendar's events from now to the end of the evening (midnight, or the end of guest mode when later).
  async _fetch() {
    const h = this._hass;
    const id = this._config.calendar;
    if (!h?.callApi || !id || this._busy) return;
    this._busy = true;
    const now = Date.now();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const until = Math.max(midnight.getTime(), gsEnd(h, this._config.end, now) ?? 0);
    try {
      const list = await Promise.resolve(h.callApi("GET", `calendars/${id}?start=${encodeURIComponent(new Date(now).toISOString())}&end=${encodeURIComponent(new Date(until).toISOString())}`)).catch(() => []);
      this._cal = { id, day: midnight.getTime(), list };
    } finally {
      this._busy = false;
    }
    this._sig = null;
    this._render();
  }

  // The text state of an entity, from Home Assistant (translated, with its units), else its raw state.
  _stateText(st) {
    try {
      return this._hass.formatEntityState?.(st) ?? st.state;
    } catch {
      return st.state;
    }
  }

  // A tile for an entity: { id, name, text, tone }, or null without one.
  _entityTile(id, tones, fallback) {
    if (!id) return null;
    const st = this._hass.states[id];
    if (!st) return { id, name: id, text: this._t("unavailable"), tone: "na" };
    const na = ["unavailable", "unknown"].includes(st.state);
    return { id, name: st.attributes?.friendly_name || id, text: na ? this._t("unavailable") : this._stateText(st), tone: na ? "na" : (tones[st.state] ?? fallback) };
  }

  // A time of day, in the 12 or 24 hour clock of the user's profile (else the language's).
  _time(t) {
    const f = this._hass.locale?.time_format;
    const h12 = f === "12" || f === "24" ? { hour12: f === "12" } : {};
    try {
      // 12-hour clocks drop the leading zero (7:20 PM), 24-hour ones keep it (07:20), like Home Assistant.
      const am = new Intl.DateTimeFormat(this._lang(), { hour: "numeric", ...h12 }).resolvedOptions().hour12;
      return new Intl.DateTimeFormat(this._lang(), { hour: am ? "numeric" : "2-digit", minute: "2-digit", ...h12 }).format(new Date(t));
    } catch {
      return new Date(t).toTimeString().slice(0, 5);
    }
  }

  // The network, the door, the alarm, the evening and the contacts, and the state of guest mode.
  _collect() {
    const h = this._hass;
    const c = this._config;
    const now = Date.now();
    const mode = c.entity ? h.states[c.entity] : null;
    const on = c.entity ? mode?.state === "on" : true;
    const end = on ? gsEnd(h, c.end, now) : null;
    const state = !on ? "off" : end != null && end - now <= GS_ENDING_MS ? "ending" : "active";
    const entityValue = (id) => {
      const v = id ? h.states[id]?.state : null;
      return v == null || ["", "unknown", "unavailable"].includes(v) ? null : String(v);
    };
    const ssid = entityValue(c.ssid_entity) ?? (c.ssid ? String(c.ssid) : null);
    const wifi = ssid ? { ssid, password: entityValue(c.password_entity) ?? (c.password != null ? String(c.password) : ""), security: c.security, hidden: !!c.hidden } : null;
    // The calendar: fetched at first, every GS_REFRESH and at each new day.
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    if (c.calendar && h.callApi && !this._busy && (!this._cal || this._cal.id !== c.calendar || this._cal.day !== midnight.getTime())) this._fetch();
    const tonight = [
      ...(Array.isArray(c.tonight) ? c.tonight : [])
        .filter((e) => e && (e.text || e.name))
        .map((e) => ({ minutes: gsMinutes(e.time), time: e.time ? String(e.time) : "", text: String(e.text || e.name) })),
      ...(c.calendar && this._cal?.id === c.calendar ? gsFromCalendar(this._cal.list, now) : []),
    ].sort((a, b) => (a.minutes ?? 9999) - (b.minutes ?? 9999));
    const contacts = (Array.isArray(c.contacts) ? c.contacts : []).filter((p) => p?.name && p?.phone).map((p) => ({ name: String(p.name), phone: String(p.phone) }));
    // Guest mode off: only the header and the start button, nothing private on a shared dashboard (show_when_off keeps it all).
    if (!on && !c.show_when_off) {
      return { on, state, end, canToggle: !!c.entity && !!mode, closed: true, wifi: null, lock: null, alarm: null, code: null, tonight: [], showTonight: false, contacts: [], emergency: "", name: c.title || this._t("title") };
    }
    return {
      on,
      state,
      end,
      canToggle: !!c.entity && !!mode,
      wifi,
      lock: this._entityTile(c.lock, GS_LOCK_TONES, "idle"),
      alarm: this._entityTile(c.alarm, GS_ALARM_TONES, "ok"),
      code: c.code != null && c.code !== "" ? String(c.code) : null,
      tonight,
      showTonight: !!c.calendar || Array.isArray(c.tonight),
      contacts,
      emergency: c.emergency ? String(c.emergency) : "",
      name: c.title || this._t("title"),
    };
  }

  _night() {
    const theme = this._config.illustration_theme;
    if (theme === "night" || theme === "day") return theme === "night";
    return this._dark();
  }

  _dark() {
    return !!this._hass.themes?.darkMode;
  }

  _animate() {
    if (this._config.animations === false) return false;
    try {
      return !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    } catch {
      return true;
    }
  }

  _status(m) {
    return this._t(`st_${m.state}`);
  }

  // Under the title: until when, else whether guest mode is on.
  _subText(m) {
    if (m.end != null) return this._t("until", { time: this._time(m.end) });
    return this._t(m.on ? "sub_on" : "sub_off");
  }

  // The illustrated header: the badge, the title, `sub` and the pill on the left, the house at the right, a 10 px
  // garden strip edge to edge. `scene`: the drawing (the mini card draws the door alone).
  _banner(m, sub, scene) {
    const c = this._config;
    const nav = c.navigation_path;
    const night = this._night();
    const pill = this._status(m);
    return `
      <div class="banner${night ? " night" : ""}">
        <div class="head${nav ? " nav" : ""}"${nav ? ' role="link" tabindex="0"' : ""}>
          <div class="badge"><ha-icon icon="mdi:account-heart"></ha-icon></div>
          <div class="tt"><div class="trow"><div class="title">${rcEsc(m.name)}</div><span class="bpill" title="${rcEsc(pill)}" aria-label="${rcEsc(pill)}"><span class="bdot"></span><span class="bpt">${rcEsc(pill)}</span></span></div>${sub}</div>
        </div>
        <svg class="room" viewBox="0 0 200 80" preserveAspectRatio="xMaxYMax slice" aria-hidden="true">${scene}</svg>
        <div class="ground"></div>
      </div>`;
  }

  // The classic header (illustration: false): the badge, the title and the pill, the subtitle.
  _classic(m, sub) {
    const nav = this._config.navigation_path;
    const pill = this._status(m);
    return `<div class="head${nav ? " nav" : ""}"${nav ? ' role="link" tabindex="0"' : ""}>
        <div class="badge"><ha-icon icon="mdi:account-heart"></ha-icon></div>
        <div class="tt"><div class="trow"><div class="title">${rcEsc(m.name)}</div><span class="pill" title="${rcEsc(pill)}"><span class="pt">${rcEsc(pill)}</span></span></div>${sub}</div>
      </div>`;
  }

  // The status pill's place, on the banner and on the classic header (see gsPlacePill).
  _fitPill() {
    for (const row of this.shadowRoot?.querySelectorAll?.(".trow") || []) {
      const banner = row.closest(".banner");
      gsPlacePill(banner || row.closest(".head"), row, banner?.querySelector(".ground"));
    }
  }

  // The QR code of the network (8 mask trials), kept per text and size: a re-render (a revealed password, a new state
  // of the lock) does not build it again.
  _qr(wifi, size) {
    const text = gsQrString(wifi);
    const key = `${size}|${text}|${this._lang()}`;
    this._qrCache ||= new Map();
    if (!this._qrCache.has(key)) {
      if (this._qrCache.size >= 4) this._qrCache.delete(this._qrCache.keys().next().value);
      this._qrCache.set(key, gsQrSvg(text, size, rcEsc(this._t("qr_code"))));
    }
    return this._qrCache.get(key);
  }

  // A masked value and its eye button: `k` is "pw" or "code".
  _secret(k, value) {
    const shown = !!this._reveal?.[k];
    const label = this._t(`${shown ? "hide" : "show"}_${k}`);
    return `<span class="sv${shown ? " shown" : ""}">${rcEsc(shown ? value : GS_MASK)}</span><button class="eye" data-k="${k}" title="${rcEsc(label)}" aria-label="${rcEsc(label)}" aria-pressed="${shown}"><ha-icon icon="${shown ? "mdi:eye-off" : "mdi:eye"}"></ha-icon></button>`;
  }

  _wifiBlock(w) {
    const open = w.security === "nopass";
    return `<div class="wifi">
        <button class="qr" title="${rcEsc(this._t("qr_open"))}" aria-label="${rcEsc(this._t("qr_open"))}">${this._qr(w, 96)}</button>
        <div class="wt">
          <div class="wl">${rcEsc(this._t("wifi"))}</div>
          <div class="ssid">${rcEsc(w.ssid)}</div>
          ${open ? `<div class="wo">${rcEsc(this._t("open_network"))}</div>` : `<div class="pw">${this._secret("pw", w.password)}</div>`}
          <div class="scan">${rcEsc(this._t("scan"))}</div>
        </div>
      </div>`;
  }

  _tile({ id, name, text, tone, icon, extra = "" }) {
    const tag = id ? "button" : "div";
    return `<${tag} class="tile tn-${tone}"${id ? ` data-id="${rcEsc(id)}"` : ""}>
        <span class="ic"><ha-icon icon="${rcEsc(icon)}"></ha-icon></span>
        <span class="tx"><span class="nm">${rcEsc(name)}</span><span class="st">${extra || rcEsc(text)}</span></span>
        <span class="dot"></span>
      </${tag}>`;
  }

  _tiles(m) {
    const tiles = [];
    if (m.lock) tiles.push(this._tile({ ...m.lock, icon: m.lock.tone === "ok" ? "mdi:lock" : "mdi:lock-open-variant" }));
    if (m.code) tiles.push(this._tile({ name: this._t("door_code"), tone: "info", icon: "mdi:dialpad", extra: this._secret("code", m.code) }));
    if (m.alarm) tiles.push(this._tile({ ...m.alarm, icon: "mdi:shield-home" }));
    return tiles.length ? `<div class="tiles${tiles.length === 1 ? " one" : ""}">${tiles.join("")}</div>` : "";
  }

  _lists(m) {
    const boxes = [];
    if (m.showTonight) {
      const rows = m.tonight.length
        ? m.tonight
            .slice(0, 6)
            .map((e) => `<div class="ev"><b>${rcEsc(e.time)}</b><span>${rcEsc(e.text)}</span></div>`)
            .join("")
        : `<div class="none">${rcEsc(this._t("nothing_tonight"))}</div>`;
      boxes.push(`<div class="box"><div class="bh">${rcEsc(this._t("tonight"))}</div>${rows}</div>`);
    }
    if (m.contacts.length || m.emergency) {
      const tel = (phone) => `tel:${rcEsc(phone.replace(/[^\d+]/g, ""))}`;
      const rows = [
        ...m.contacts.map(
          (p) =>
            `<a class="ct" href="${tel(p.phone)}" aria-label="${rcEsc(this._t("call", { name: p.name }))}"><ha-icon icon="mdi:phone"></ha-icon><span class="cn"><b>${rcEsc(p.name)}</b><span class="num">${rcEsc(p.phone)}</span></span></a>`,
        ),
        m.emergency
          ? `<a class="ct sos" href="${tel(m.emergency)}" aria-label="${rcEsc(this._t("call", { name: this._t("emergency") }))}"><ha-icon icon="mdi:phone-alert"></ha-icon><span class="cn"><b>${rcEsc(this._t("emergency"))}</b><span class="num">${rcEsc(m.emergency)}</span></span></a>`
          : "",
      ].join("");
      boxes.push(`<div class="box"><div class="bh">${rcEsc(this._t("contacts"))}</div>${rows}</div>`);
    }
    return boxes.length ? `<div class="cols${boxes.length === 1 ? " one" : ""}">${boxes.join("")}</div>` : "";
  }

  _sub(m) {
    return this._config.show_subtitle === false ? "" : `<div class="subt">${rcEsc(this._subText(m))}</div>`;
  }

  _draw(m) {
    const c = this._config;
    const dark = this._dark();
    const night = this._night();
    if (!this._changed([m, dark, night, this._reveal])) return;
    const scene = gsScene({ night, on: m.on, animate: this._animate(), mini: false });
    const head = c.illustration !== false ? this._banner(m, this._sub(m), scene) : this._classic(m, this._sub(m));
    const mode = m.canToggle
      ? `<div class="actions"><button class="mode${m.on ? "" : " start"}">${rcEsc(this._t(m.on ? "end_mode" : "start_mode"))}</button></div>`
      : "";
    const content = m.closed ? mode : `${m.wifi ? this._wifiBlock(m.wifi) : ""}${this._tiles(m)}${this._lists(m)}${mode}`;
    // Closed and nothing to start it with: the card ends on the header's ground bar.
    const body = content ? `<div class="body">${content}</div>` : "";
    this._paint(m, head + body, "");
  }

  // Writes the card (its <ha-card> class from the state; `cls`: the mini card's), then wires it.
  _paint(m, html, cls) {
    const dark = this._dark();
    this.shadowRoot.innerHTML = `<style>${RC_BASE_STYLES}${this.constructor.styles}</style>
      <ha-card class="st-${m.state}${dark ? " dk" : ""}${cls}">${html}${m.wifi ? `<dialog class="qrd" aria-label="${rcEsc(this._t("qr_code"))}">${this._qr(m.wifi, 320)}</dialog>` : ""}</ha-card>`;
    const root = this.shadowRoot;
    if (this._config.navigation_path) rcBindNav(root.querySelector(".head"), this._config.navigation_path);
    const dlg = root.querySelector("dialog");
    // The QR code opens full screen, centred; a click anywhere on it (or Escape) closes it.
    for (const b of root.querySelectorAll(".qr")) b.addEventListener("click", () => this._openQr());
    if (dlg) {
      dlg.addEventListener("click", () => dlg.close());
      dlg.addEventListener("close", () => {
        this._qrOpen = false;
      });
      // Redrawn while open (a new state of the lock): open again.
      if (this._qrOpen && !dlg.open) dlg.showModal?.();
    }
    for (const b of root.querySelectorAll(".eye")) b.addEventListener("click", (ev) => this._toggleSecret(ev, b.dataset.k));
    for (const t of root.querySelectorAll(".tile[data-id]")) t.addEventListener("click", () => rcMoreInfo(this, t.dataset.id));
    root.querySelector(".mode")?.addEventListener("click", () => this._toggleMode());
    this._fitPill();
  }

  _openQr() {
    const dlg = this.shadowRoot.querySelector("dialog");
    if (!dlg || dlg.open) return;
    this._qrOpen = true;
    dlg.showModal?.();
  }

  // Shows or hides a password or a code; shown, it is masked again after GS_REVEAL_MS.
  _toggleSecret(ev, k) {
    ev.stopPropagation();
    this._reveal = { ...this._reveal, [k]: !this._reveal?.[k] };
    clearTimeout(this._maskTimer);
    if (Object.values(this._reveal).some(Boolean)) this._maskTimer = setTimeout(() => this._mask(), GS_REVEAL_MS);
    this._sig = null;
    this._render();
    // From the keyboard (no click count), the focus stays on the eye button that replaced this one.
    if (ev.detail === 0) this.shadowRoot.querySelector(`.eye[data-k="${k}"]`)?.focus?.({ preventScroll: true });
  }

  _mask() {
    clearTimeout(this._maskTimer);
    if (!this._reveal || !Object.values(this._reveal).some(Boolean)) return;
    this._reveal = {};
    this._sig = null;
    this._render();
  }

  // Ends guest mode, or starts it again.
  _toggleMode() {
    const on = this._items?.on;
    rcCall(this._hass, "homeassistant", on ? "turn_off" : "turn_on", { entity_id: this._config.entity });
  }

  static styles = `
    ha-card { --c: ${GS_COLORS.active}; padding: 12px; }
    ha-card.st-ending { --c: ${GS_COLORS.ending}; } ha-card.st-off { --c: ${GS_COLORS.off}; }
    .tn-ok { --t: var(--rc-ok); } .tn-info { --t: #2f6fde; } .tn-warn { --t: var(--rc-warn); } .tn-alert { --t: var(--rc-alert); }
    .tn-idle, .tn-na { --t: var(--rc-idle); }
    .tt { flex: 1 1 0; min-width: 5ch; display: flex; flex-direction: column; }
    .subt { font-size: 12px; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    :host([hide-title]) .head .tt .title { visibility: hidden; }
    .body { display: flex; flex-direction: column; gap: 10px; margin-top: 12px; }
    .wifi { display: flex; align-items: center; gap: 14px; padding: 12px; border-radius: 12px; background: var(--secondary-background-color, rgba(127,127,127,.08)); }
    .qr { all: unset; flex: none; cursor: zoom-in; line-height: 0; padding: 6px; border-radius: 8px; background: #fff; box-shadow: inset 0 0 0 1px rgba(0,0,0,.06); }
    .qr:focus-visible, .eye:focus-visible, .tile:focus-visible, .mode:focus-visible, .ct:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
    .qr svg { display: block; width: 96px; height: 96px; }
    .wt { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
    .wl { font-size: 12px; color: var(--secondary-text-color); }
    .ssid { font-size: 16px; font-weight: 700; color: var(--primary-text-color); overflow-wrap: anywhere; }
    .wo { font-size: 13px; color: var(--secondary-text-color); }
    .pw, .st { display: flex; align-items: center; gap: 6px; min-width: 0; }
    .sv { font-size: 14px; letter-spacing: .12em; color: var(--primary-text-color); overflow-wrap: anywhere; }
    .sv.shown { letter-spacing: .02em; font-family: ui-monospace, Menlo, Consolas, monospace; }
    .eye { all: unset; flex: none; cursor: pointer; width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center;
           color: var(--secondary-text-color); box-shadow: inset 0 0 0 1px var(--divider-color, rgba(127,127,127,.25)); }
    .eye ha-icon { --mdc-icon-size: 16px; }
    .eye:hover { color: var(--primary-text-color); background: color-mix(in srgb, var(--rc-idle) 14%, transparent); }
    .scan { font-size: 12px; font-weight: 600; color: color-mix(in srgb, var(--c) 70%, var(--primary-text-color, #212121)); }
    .tiles { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
    .tiles.one { grid-template-columns: minmax(0, 1fr); }
    .tile { all: unset; box-sizing: border-box; position: relative; display: flex; align-items: center; gap: 10px; min-width: 0;
            padding: 10px 12px; border-radius: 12px; background: var(--secondary-background-color, rgba(127,127,127,.08)); }
    button.tile { cursor: pointer; }
    button.tile:hover { background: color-mix(in srgb, var(--t) 8%, var(--secondary-background-color, transparent)); }
    .ic { flex: none; width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; color: var(--t);
          background: color-mix(in srgb, var(--t) 16%, transparent); }
    .ic ha-icon { --mdc-icon-size: 20px; }
    .tx { display: flex; flex-direction: column; gap: 1px; min-width: 0; padding-right: 10px; }
    .nm { font-size: 13.5px; font-weight: 600; color: var(--primary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .st { font-size: 12px; font-weight: 600; color: color-mix(in srgb, var(--t) 70%, var(--primary-text-color, #212121)); }
    .st .sv { font-size: 13px; color: var(--primary-text-color); }
    .st .eye { width: 28px; height: 28px; margin: -4px 0; }
    .dot { position: absolute; top: 8px; right: 8px; width: 8px; height: 8px; border-radius: 50%; background: var(--t); }
    .cols { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
    .cols.one { grid-template-columns: minmax(0, 1fr); }
    .box { border: 1px solid var(--divider-color, rgba(127,127,127,.2)); border-radius: 12px; padding: 10px 12px; min-width: 0; }
    .bh { font-size: 11.5px; font-weight: 600; letter-spacing: .05em; text-transform: uppercase; color: var(--secondary-text-color); margin-bottom: 6px; }
    .ev { display: grid; grid-template-columns: 44px minmax(0, 1fr); gap: 6px; font-size: 13px; line-height: 1.6; color: var(--primary-text-color); }
    .ev span { overflow-wrap: anywhere; }
    .none { font-size: 13px; color: var(--secondary-text-color); }
    .ct { display: flex; align-items: center; gap: 8px; min-height: 30px; font-size: 13px; color: var(--primary-text-color); text-decoration: none; border-radius: 6px; }
    .ct ha-icon { --mdc-icon-size: 16px; color: var(--rc-ok); flex: none; }
    .cn { display: flex; flex-direction: column; min-width: 0; line-height: 1.3; padding: 3px 0; }
    .ct .num { font-size: 12px; color: var(--secondary-text-color); overflow-wrap: anywhere; }
    .ct.sos ha-icon, .ct.sos b { color: var(--rc-alert); }
    .ct:hover b { text-decoration: underline; }
    .actions { display: flex; justify-content: flex-end; }
    .mode { all: unset; cursor: pointer; box-sizing: border-box; min-height: 36px; padding: 7px 14px; border-radius: 999px; font-size: 13px; font-weight: 600;
            color: var(--primary-text-color); box-shadow: inset 0 0 0 1px var(--divider-color, rgba(127,127,127,.3)); }
    .mode.start { color: color-mix(in srgb, ${GS_COLORS.active} 70%, var(--primary-text-color, #212121)); box-shadow: inset 0 0 0 1px color-mix(in srgb, ${GS_COLORS.active} 45%, transparent); }
    .mode:hover { background: color-mix(in srgb, var(--rc-idle) 12%, transparent); }
    ha-card.dk .st { color: color-mix(in srgb, var(--t) 55%, #fff); }
    ha-card.dk .scan { color: color-mix(in srgb, var(--c) 55%, #fff); }
    /* The full screen QR code: centred on the screen, on a dark backdrop; a click (or Escape) closes it. */
    dialog { border: none; padding: 16px; margin: auto; background: #fff; border-radius: 16px; line-height: 0; overflow: hidden; cursor: zoom-out; }
    dialog:focus, dialog:focus-visible { outline: none; }
    dialog::backdrop { background: rgba(0,0,0,.85); }
    dialog svg { width: min(80vw, 80vh); height: auto; display: block; }
    @container (max-width: 340px) {
      .tiles, .cols { grid-template-columns: minmax(0, 1fr); }
      .wifi { gap: 10px; padding: 10px; }
      .qr svg { width: 80px; height: 80px; }
    }
    /* Illustrated header (banner): 90 px, edge to edge, the title on a mint wall, the house at the right, a 10 px garden
       strip at the bottom. The badge's icon is in the state's colour, by day and night. */
    .banner { position: relative; display: flex; height: 90px; margin: -12px -12px 0; overflow: hidden;
              background: linear-gradient(180deg, #eef9f2 0%, #dcefe4 100%);
              --bt: #0d2a45; --bs: #3b5b78; --ic: color-mix(in srgb, var(--c) 85%, #10283f); --sw: min(200px, 56%); }
    .banner.night { background: linear-gradient(180deg, #14231e 0%, #1c302a 100%); --bt: #fff; --bs: rgba(255,255,255,.78); --ic: color-mix(in srgb, var(--c) 72%, #fff); }
    .banner .head { position: relative; z-index: 1; flex: 1; min-width: 0; height: 80px; box-sizing: border-box; padding: 0 calc(var(--sw) + 4px) 0 14px; }
    .banner .badge { position: relative; color: var(--ic); background: rgba(255,255,255,.7); box-shadow: inset 0 0 0 1px rgba(13,42,69,.12); }
    .banner.night .badge { background: rgba(255,255,255,.12); box-shadow: inset 0 0 0 1px rgba(255,255,255,.14); }
    .banner .title { color: var(--bt); }
    .banner .subt { color: var(--bs); font-size: 13px; }
    .banner .room { position: absolute; right: 0; bottom: 10px; width: var(--sw); height: calc(80px * var(--sk, 1)); }
    .banner .ground { position: absolute; left: 0; right: 0; bottom: 0; height: 10px; background: repeating-linear-gradient(90deg, #8cc49f 0 22px, #9fd0ae 22px 44px); }
    .banner.night .ground { background: repeating-linear-gradient(90deg, #23483a 0 22px, #2b5545 22px 44px); }
    /* The mini card's expand / collapse button: 24 px, frosted, 5 px from the banner's top right corner. */
    .banner .zoom { position: absolute; z-index: 2; top: 5px; right: 5px; width: 24px; height: 24px; margin: 0; color: #33506b;
                    background: rgba(255,255,255,.55); box-shadow: inset 0 0 0 1px rgba(255,255,255,.7); backdrop-filter: blur(4px); }
    .banner.night .zoom { color: #fff; background: rgba(255,255,255,.12); box-shadow: inset 0 0 0 1px rgba(255,255,255,.2); }
    .banner .zoom:hover { background: rgba(255,255,255,.75); color: #33506b; }
    .banner.night .zoom:hover { background: rgba(255,255,255,.22); color: #fff; }
    /* Status pill right after the title (see gsPlacePill). */
    .trow { display: flex; align-items: center; gap: 8px; min-width: 0; }
    .trow > .title { flex: 0 1 auto; min-width: 0; }
    .trow > .bpill, .trow > .pill { flex: none; max-width: none; }
    .bpill { display: inline-flex; align-items: center; gap: 4px; min-width: 0; box-sizing: border-box; overflow: hidden;
             white-space: nowrap; padding: 1px 8px; border-radius: 12px; font-size: 11px; font-weight: 500; line-height: 16px;
             background: color-mix(in srgb, var(--c) 18%, rgba(255,255,255,.78)); color: color-mix(in srgb, var(--c) 45%, #0d2a45); }
    .banner.night .bpill { background: color-mix(in srgb, var(--c) 30%, rgba(8,18,38,.55)); color: color-mix(in srgb, var(--c) 35%, #ffffff); }
    .bdot { width: 7px; height: 7px; border-radius: 50%; background: var(--c); flex: none; }
    .bpt { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
    [data-wrap] .trow { display: contents; }
    [data-wrap] .trow > .bpill, [data-wrap] .trow > .pill { order: 9; align-self: flex-start; max-width: 100%; margin-top: 3px; }
    .banner[data-wrap] .trow > .bpill { max-width: calc(100cqw - 80px); }
    [data-dot] .bpill { padding: 0; background: none; }
    [data-dot] .bpt, [data-dot] .trow > .pill .pt { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
    [data-dot] .trow > .pill { padding: 0; width: 18px; height: 18px; justify-content: center; background: none; }
    [data-dot] .trow > .pill::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: var(--c); }
    @container (max-width: 200px) {
      .bpill { padding: 0; background: none; }
      .bpt, .trow > .pill .pt { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
      .trow > .pill { padding: 0; width: 18px; height: 18px; justify-content: center; background: none; }
      .trow > .pill::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: var(--c); }
    }
    /* Narrower cards: the house is drawn smaller (75 %, 62 %, then 50 % of its height, its left part cropped). */
    @container (max-width: 420px) { .banner { --sw: 150px; --sk: .75; } }
    @container (max-width: 340px) { .banner { --sw: 112px; --sk: .62; } }
    @container (max-width: 260px) { .banner { --sw: 70px; --sk: .5; } }
    /* The mini card: the banner alone, the network as its second line, the door at the right clear of the zoom button. */
    ha-card.bn { padding: 0; }
    ha-card.bn > .banner { margin: 0; --sw: 72px; --sk: 1; }
    ha-card.bn > .banner .room { right: 30px; }
    @container (max-width: 300px) { ha-card.bn > .banner .room { display: none; } ha-card.bn > .banner .head { padding-right: 34px; } }
    .banner .net { all: unset; display: block; min-width: 0; color: var(--bs); font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: zoom-in; }
    .banner .net:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; border-radius: 4px; }
  `;
}

// ── Editor ───────────────────────────────────────────────────────────────────
const gsSchema = (booleans) => (lang) => [
  { name: "title", selector: { text: {} } },
  { name: "navigation_path", selector: { navigation: {} } },
  { name: "entity", selector: { entity: { domain: ["input_boolean", "switch"] } } },
  { name: "end", selector: { text: {} } },
  { name: "ssid", selector: { text: {} } },
  { name: "password", selector: { text: { type: "password" } } },
  {
    name: "security",
    selector: { select: { mode: "dropdown", options: ["WPA", "WEP", "nopass"].map((value) => ({ value, label: rcT(GS_I18N, lang, `ed_sec_${value}`) })) } },
  },
  { name: "hidden", selector: { boolean: {} } },
  { name: "ssid_entity", selector: { entity: { domain: ["input_text", "sensor"] } } },
  { name: "password_entity", selector: { entity: { domain: ["input_text", "sensor"] } } },
  { name: "lock", selector: { entity: { domain: "lock" } } },
  { name: "code", selector: { text: { type: "password" } } },
  { name: "alarm", selector: { entity: { domain: "alarm_control_panel" } } },
  { name: "calendar", selector: { entity: { domain: "calendar" } } },
  { name: "emergency", selector: { text: { type: "tel" } } },
  ...rcBooleans(...booleans),
  {
    name: "illustration_theme",
    selector: { select: { mode: "dropdown", options: ["auto", "day", "night"].map((value) => ({ value, label: rcT(GS_I18N, lang, `ed_theme_${value}`) })) } },
  },
  ...rcAdvanced(GS_I18N, lang, "tonight", "contacts", "language"),
];

const GS_HELPERS = ["title", "entity", "end", "ssid_entity", "password_entity", "code", "calendar", "emergency", "tonight", "contacts", "zoom", "language"];

const GuestCardEditor = rcEditor({
  card: GuestCard,
  helpers: GS_HELPERS,
  schema: gsSchema(["show_title", "show_subtitle", "show_when_off", "illustration", "animations"]),
});

rcRegister(GuestCard, GuestCardEditor, "Guest Card", "A guest or babysitter card: the guest Wi-Fi QR code, the door code, the lock and the alarm, the evening and who to call");

// ── Mini card ────────────────────────────────────────────────────────────────
// Guest mode on two lines: the title and its state, the network (a tap shows its QR code full screen), the door at the
// right of the banner; the zoom button opens the full card in place.
class GuestMiniCard extends rcMini(GuestCard, "guest-mini-card") {
  _drawMini(m) {
    const night = this._night();
    const dark = this._dark();
    if (!this._changed(["mini", m, night, dark])) return;
    const line = m.wifi
      ? `<button class="subt net qr" title="${rcEsc(this._t("qr_open"))}">${rcEsc(this._t("wifi_line", { ssid: m.wifi.ssid }))}</button>`
      : this._config.show_subtitle === false
        ? ""
        : `<div class="subt">${rcEsc(this._subText(m))}</div>`;
    const scene = gsScene({ night, on: m.on, animate: this._animate(), mini: true });
    this._paint(m, this._banner(m, line, scene), " bn");
  }
}

const GuestMiniCardEditor = rcEditor({
  card: GuestMiniCard,
  helpers: GS_HELPERS,
  schema: gsSchema(["show_title", "show_subtitle", "show_when_off", "illustration", "animations", "zoom"]),
});

rcRegister(GuestMiniCard, GuestMiniCardEditor, "Guest Mini Card", "Guest mode on two lines: its state and the guest Wi-Fi, whose QR code opens full screen, with a zoom to the full card");
