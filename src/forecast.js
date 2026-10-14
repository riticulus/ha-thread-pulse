// Battery forecast from Home Assistant's long-term statistics (issue #39) – shared by the map and the device card.
// Linear trend over up to BF_DAYS days, only since the last battery change (a jump upwards). Shown only with at least
// BF_MIN_DAYS days of data and a measurable drop. It is an estimate: many batteries stay almost full for a long time
// and then drop quickly.
export const BF_DAYS = 120;
const BF_MIN_DAYS = 14,
  BF_MAX = 3 * 365;

// points: [{ t: ms, v: % }] oldest first; current: the level now (optional)
// → { state: "nodata", days } | { state: "nodrop", basis } | { state: "ok", days, perMonth, basis }
export function forecastFrom(points, current) {
  let p = points.filter(x => typeof x.v === "number" && !isNaN(x.v));
  for (let i = p.length - 1; i > 0; i--)
    if (p[i].v - p[i - 1].v >= 10) {
      p = p.slice(i);
      break;
    } // battery changed
  if (!p.length) return { state: "nodata", days: 0 };
  const span = (p[p.length - 1].t - p[0].t) / 86400000;
  if (span < BF_MIN_DAYS || p.length < 5) return { state: "nodata", days: Math.max(1, Math.round(span) + 1) };
  const t0 = p[0].t,
    xs = p.map(x => (x.t - t0) / 86400000),
    ys = p.map(x => x.v);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length,
    my = ys.reduce((a, b) => a + b, 0) / ys.length;
  const sxx = xs.reduce((a, x) => a + (x - mx) ** 2, 0),
    sxy = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0);
  const slope = sxx ? sxy / sxx : 0; // % per day
  const drop = ys[0] - ys[ys.length - 1];
  const basis = Math.round(span);
  if (slope > -0.02 || drop < 2) return { state: "nodrop", basis };
  const now = typeof current === "number" ? current : ys[ys.length - 1];
  const days = now / -slope;
  return {
    state: "ok",
    days: days > BF_MAX ? Infinity : Math.max(1, Math.round(days)),
    perMonth: Math.round(-slope * 30 * 10) / 10,
    basis,
  };
}

// daily means of battery entities from the recorder → { entity_id: [{ t, v }] }
export async function batteryStatistics(hass, entityIds) {
  const res = await hass.callWS({
    type: "recorder/statistics_during_period",
    start_time: new Date(Date.now() - BF_DAYS * 86400000).toISOString(),
    statistic_ids: entityIds,
    period: "day",
    types: ["mean"],
  });
  return Object.fromEntries(
    entityIds.map(id => [
      id,
      (res[id] || []).map(r => ({ t: typeof r.start === "number" ? r.start : Date.parse(r.start), v: r.mean })),
    ]),
  );
}
