// A mock Home Assistant with a guest mode helper, a lock, an alarm and a calendar (answered by callApi). The time is
// fixed by the tests (NOW): 27 November 2026, 19:00 local time.
export const st = (entity_id, state, attributes = {}) => ({ entity_id, state, attributes, last_changed: "2026-01-01T00:00:00Z" });

export const NOW = new Date(2026, 10, 27, 19, 0).getTime();
export const at = (h, m = 0, d = 27) => new Date(2026, 10, d, h, m).getTime();
const iso = (h, m = 0) => new Date(at(h, m)).toISOString();

const TEXTS = { on: "On", off: "Off", locked: "Locked", unlocked: "Unlocked", disarmed: "Disarmed", armed_night: "Armed night" };

export const makeHass = ({ calendar = true, ...overrides } = {}) => {
  const hass = {
    language: "en",
    locale: { language: "en", time_format: "24" },
    themes: { darkMode: false },
    states: {
      "input_boolean.guest_mode": st("input_boolean.guest_mode", "on", { friendly_name: "Guest mode" }),
      "lock.front_door": st("lock.front_door", "locked", { friendly_name: "Front door" }),
      "alarm_control_panel.home": st("alarm_control_panel.home", "disarmed", { friendly_name: "Alarm" }),
      "input_datetime.guests_until": st("input_datetime.guests_until", "23:30:00", { has_date: false, has_time: true }),
      "input_text.guest_ssid": st("input_text.guest_ssid", "Guests-5G"),
      "calendar.family": st("calendar.family", "off", { friendly_name: "Family" }),
    },
    formatEntityState: (s) => TEXTS[s.state] ?? s.state,
    api: [],
    calls: [],
    callService(domain, service, data) {
      hass.calls.push([domain, service, data]);
      return Promise.resolve();
    },
    ...overrides,
  };
  if (calendar)
    hass.callApi = async (method, path) => {
      hass.api.push([method, path]);
      return [
        { summary: "Bath time", start: { dateTime: iso(20, 15) }, end: { dateTime: iso(20, 45) } },
        { summary: "Already over", start: { dateTime: iso(17) }, end: { dateTime: iso(18) } },
        { summary: "All day", start: { date: "2026-11-27" }, end: { date: "2026-11-28" } },
      ];
    };
  return hass;
};
