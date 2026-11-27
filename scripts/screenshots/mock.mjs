// The mock home of the screenshots and animations: a guest mode helper, a made-up guest network, a front door lock,
// an alarm, a family calendar with the evening's bath, and neutral contacts. The clock is fixed, so that a capture
// only changes when the card does: 27 November 2026 at 19:00 (active), 23:10 (ending soon) or with guest mode off.
const st = (entity_id, state, attributes = {}) => ({ entity_id, state, attributes, last_changed: "2026-11-01T00:00:00Z" });
const at = (h, m = 0) => new Date(2026, 10, 27, h, m).getTime();

// `scene`: active (guest mode on until 23:30), ending (23:10, twenty minutes left), off (guest mode off).
const SCENES = {
  active: { now: at(19), mode: "on", alarm: "disarmed" },
  ending: { now: at(23, 10), mode: "on", alarm: "armed_night" },
  off: { now: at(19), mode: "off", alarm: "armed_away" },
};

// The page's clock, the calendar's events and Home Assistant's translated states, as script source: window.Date fixed
// at the scene's time, window.__api answering the calendar requests, window.__format the states' texts.
export const pageScript = (scene) => `(() => {
  const N = ${SCENES[scene].now};
  const R = Date;
  window.Date = class extends R {
    constructor(...a) { super(...(a.length ? a : [N])); }
    static now() { return N; }
  };
  const iso = (h, m) => new R(2026, 10, 27, h, m).toISOString();
  window.__api = async () => [{ summary: "Bath time", start: { dateTime: iso(20, 15) }, end: { dateTime: iso(20, 45) } }];
  const TEXTS = { locked: "Locked", unlocked: "Unlocked", disarmed: "Disarmed", armed_night: "Armed night", armed_away: "Armed away" };
  window.__format = (s) => TEXTS[s.state] || s.state;
})();`;

export const setup = (s) => {
  const v = SCENES[s.scene];
  return {
    hass: {
      language: "en",
      locale: { language: "en", time_format: "12" },
      states: {
        "input_boolean.guest_mode": st("input_boolean.guest_mode", v.mode, { friendly_name: "Guest mode" }),
        "lock.front_door": st("lock.front_door", "locked", { friendly_name: "Front door" }),
        "alarm_control_panel.home": st("alarm_control_panel.home", v.alarm, { friendly_name: "Alarm" }),
        "calendar.family": st("calendar.family", "off", { friendly_name: "Family" }),
      },
    },
    config: {
      entity: "input_boolean.guest_mode",
      end: "23:30",
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
      contacts: [
        { name: "Parents", phone: "+33 6 00 00 00 00" },
        { name: "Neighbour", phone: "+33 6 11 11 11 11" },
      ],
      ...s.config,
    },
    open: s.open,
  };
};
