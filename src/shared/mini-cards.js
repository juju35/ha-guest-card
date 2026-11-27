// ── Mini card, editor and registration ───────────────────────────────────────
// A mini card shows what its full card (`Base`) shows on two lines, in the banner. Its zoom button (top right,
// `zoom: false` removes it) switches it to the full card and back; a click anywhere else brings it back too.
// The subclass implements `_drawMini(model)`.
import { pickerDefine } from "./card-picker.js";
import { RC_VERSION } from "./core.js";
import { rcOutside, rcUnzoom, rcZoomClick, rcZoomIcon, watchOutside } from "./overviews.js";
import { rcLang, rcMemo, rcT } from "./helpers.js";
import { RC_ZOOM_STYLES } from "./common-styles.js";

export const rcMini = (Base, tag) =>
  class extends Base {
    static tag = tag;
    static defaults = { ...Base.defaults, zoom: true };
    static styles = `${Base.styles}${RC_ZOOM_STYLES}`;

    constructor() {
      super();
      // A click anywhere else brings the card back to its compact view.
      this._onUnzoom = (ev) => {
        if (rcOutside(this, ev)) rcUnzoom(this);
      };
    }

    connectedCallback() {
      super.connectedCallback?.();
      this._unzoom ??= watchOutside(this, this._onUnzoom);
      this._unzoom.on();
    }

    disconnectedCallback() {
      super.disconnectedCallback?.();
      this._unzoom?.off();
      // Left (another dashboard view, a conditional card hidden): back to the compact view.
      rcUnzoom(this);
    }

    getCardSize() {
      return this._zoomed ? super.getCardSize() : 1;
    }

    _draw(m) {
      if (this._zoomed) super._draw(m);
      else this._drawMini(m);
      this._addZoom();
    }

    // Zoom button at the end of the header, top right in both views, added once per render. Its click is the
    // overviews' (rcZoomClick): stop the tap on the title (navigation_path), toggle, keep the keyboard focus.
    _addZoom() {
      const head = this._config.zoom && this.shadowRoot.querySelector(".head");
      if (!head || head.querySelector(".zoom")) return;
      const button = document.createElement("button");
      button.className = "zoom";
      button.title = this._t(this._zoomed ? "zoom_out" : "zoom_in");
      button.innerHTML = `<ha-icon icon="${rcZoomIcon(this)}"></ha-icon>`;
      button.addEventListener("click", (ev) => rcZoomClick(this, ev));
      head.appendChild(button);
    }
  };

export const rcBooleans = (...names) => names.map((name) => ({ name, selector: { boolean: {} } }));

export const rcAdvanced = (i18n, lang, ...names) => [
  {
    name: "advanced",
    type: "expandable",
    flatten: true,
    schema: names.map((name) =>
      name === "language"
        ? {
            name,
            selector: {
              select: {
                mode: "dropdown",
                options: [
                  { value: "", label: rcT(i18n, lang, "ed_language_auto") },
                  { value: "en", label: "English" },
                  { value: "fr", label: "Français" },
                  { value: "de", label: "Deutsch" },
                  { value: "es", label: "Español" },
                  { value: "sr", label: "Српски" },
                  { value: "sr-Latn", label: "Srpski (latinica)" },
                  { value: "it", label: "Italiano" },
                  { value: "nl", label: "Nederlands" },
                  { value: "pt", label: "Português (Portugal)" },
                  { value: "pl", label: "Polski" },
                  { value: "ro", label: "Română" },
                  { value: "da", label: "Dansk" },
                  { value: "sv", label: "Svenska" },
                  { value: "bg", label: "Български" },
                  { value: "ru", label: "Русский" },
                  { value: "uk", label: "Українська" },
                  { value: "hu", label: "Magyar" },
                  { value: "sk", label: "Slovenčina" },
                  { value: "cs", label: "Čeština" },
                  { value: "sl", label: "Slovenščina" },
                  { value: "lv", label: "Latviešu" },
                  { value: "el", label: "Ελληνικά" },
                ],
              },
            },
          }
        : { name, selector: { object: {} } },
    ),
  },
];

// `schema(lang, hass, config)` lists the fields; options left at the card's default are not written to the YAML.
export const rcEditor = ({ card, helpers, schema }) => {
  const i18n = card.i18n;
  const defaults = { show_title: true, ...card.defaults };
  return class extends HTMLElement {
    setConfig(config) {
      this._config = config;
      this._update();
    }

    set hass(hass) {
      this._hass = hass;
      this._update();
    }

    _update() {
      if (!this._hass || !this._config) return;
      const lang = rcLang(i18n, this._hass, this._config);
      // Read by the label and helper callbacks, set once on the form: a language change must reach them too.
      this._lang = lang;
      if (!this._form) {
        this._form = document.createElement("ha-form");
        this._form.computeLabel = (s) => rcT(i18n, this._lang, `ed_${s.name}`);
        this._form.computeHelper = (s) => (helpers.includes(s.name) ? rcT(i18n, this._lang, `ed_${s.name}_helper`) : undefined);
        this._form.addEventListener("value-changed", (ev) => {
          const config = { ...ev.detail.value };
          for (const k of Object.keys(config)) {
            const v = config[k];
            if (v === "" || v == null || (Array.isArray(v) && !v.length) || defaults[k] === v) delete config[k];
          }
          this.dispatchEvent(new CustomEvent("config-changed", { detail: { config }, bubbles: true, composed: true }));
        });
        this.appendChild(this._form);
      }
      this._form.hass = this._hass;
      // A new data or schema object re-renders the whole form: both only change with the config or the language.
      const memo = (this._memo ||= {});
      this._form.data = rcMemo(memo, "data", [this._config], () => ({ ...defaults, ...this._config }));
      this._form.schema = rcMemo(memo, "schema", [lang, this._config], () => schema(lang, this._hass, this._config));
    }
  };
};

export const rcRegister = (card, editor, name, description) => {
  if (customElements.get(card.tag)) return;
  pickerDefine(card.tag, card);
  pickerDefine(`${card.tag}-editor`, editor);
  window.customCards = window.customCards || [];
  window.customCards.push({
    type: card.tag,
    name,
    description,
    preview: true,
    documentationURL: "https://github.com/juju35/ha-guest-card",
  });
};

if (!customElements.get("guest-card")) {
  console.info(`%c HA-GUEST-CARD %c v${RC_VERSION} `, "background:#1e8e5a;color:#fff;font-weight:700", "");
}
