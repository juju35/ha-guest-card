// ── Guest mode: its end and the evening ─────────────────────────────────────
// Minutes after midnight of "HH:MM" (a time before 6:00 counts as the end of the evening: after 23:59), else null.
export const gsMinutes = (s) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(s ?? "").trim());
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return null;
  const n = Number(m[1]) * 60 + Number(m[2]);
  return n < 360 ? n + 1440 : n;
};

// The end of guest mode (ms) from `end`: a time "HH:MM" (tonight, or after midnight), or an entity — a time-only
// input_datetime, a date / time one, a timestamp sensor. Null when there is none.
export const gsEnd = (hass, end, now) => {
  if (!end) return null;
  let value = end;
  if (/^[a-z_]+\.[\w-]+$/.test(end)) {
    const st = hass.states[end];
    if (!st || ["unknown", "unavailable", ""].includes(st.state)) return null;
    value = st.state;
  }
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(value)) {
    const [h, m] = value.split(":").map(Number);
    const d = new Date(now);
    d.setHours(h, m, 0, 0);
    // Already passed by more than 6 hours: it is the next one (23:00 seen at 6:00 is tonight's).
    if (d.getTime() < now - 6 * 3600 * 1000) d.setDate(d.getDate() + 1);
    return d.getTime();
  }
  const t = new Date(String(value).replace(" ", "T")).getTime();
  return Number.isNaN(t) ? null : t;
};

// The evening's calendar events still to come: { minutes, time, text } from the REST API's list.
export const gsFromCalendar = (list, now) =>
  (list || [])
    .filter((ev) => ev.start?.dateTime && new Date(ev.end?.dateTime || ev.start.dateTime).getTime() > now)
    .map((ev) => {
      const d = new Date(ev.start.dateTime);
      const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      return { minutes: gsMinutes(time), time, text: ev.summary || "" };
    });
