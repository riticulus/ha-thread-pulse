// Radio spectrum: Thread, Zigbee and Wi-Fi channels in the 2.4 GHz band and where they overlap (issues #78, #120).
// Installed by createThreadPulse() (core.js); shared state and functions are on tp.

export default function install(tp) {
  const { COLORS, esc, nameOf } = tp;
  Object.assign(tp, { spectrumIssues, spectrumNets, spectrumSection, threadChannel });
  // ---------- radio spectrum (issues #78, #120) ----------
  // Thread and Zigbee (both IEEE 802.15.4) use 2 MHz wide channels 11–26 at 2405 + 5 × (n − 11) MHz; 2.4 GHz Wi-Fi
  // channels 1–13 are about 20 MHz wide around 2407 + 5 × k MHz (14: 2484 MHz). A Thread or Zigbee channel whose
  // centre lies less than 11 MHz from a Wi-Fi centre is inside that Wi-Fi channel.
  // Known: the Thread channel, the Wi-Fi channels of Matter devices on Wi-Fi (0/54/3 – 5 GHz channels are ignored)
  // and the ZHA channel (zha/network/settings – only the channel is kept, never the network key). Unknown: the access
  // point's other channels, neighbouring networks, a Hue bridge.
  const f154 = c => 2405 + 5 * (c - 11);
  const fWifi = k => (k === 14 ? 2484 : 2407 + 5 * k);
  const WIFI_HALF = 10,
    IN_WIFI = 11,
    CLEAR_WIFI = 12,
    COMMON_WIFI = [1, 6, 11];
  tp.zigbeeInfo = null; // { channel } from ZHA, set by render()
  function threadChannel() {
    // OpenThread add-on, else the preferred dataset, else what most devices report
    const ds = ((tp.threadInfo && tp.threadInfo.datasets) || []).find(d => d.preferred);
    const chs = Object.values(tp.nodeById)
      .map(n => ((n.info || {}).net || {}).channel)
      .filter(c => typeof c === "number");
    return (
      (tp.threadInfo && tp.threadInfo.otbr && tp.threadInfo.otbr.channel) ||
      (ds && ds.channel) ||
      chs.sort((a, b) => chs.filter(c => c === b).length - chs.filter(c => c === a).length)[0] ||
      null
    );
  }
  function spectrumNets() {
    const nets = [],
      t = threadChannel(),
      z = tp.zigbeeInfo && tp.zigbeeInfo.channel;
    if (t >= 11 && t <= 26) nets.push({ kind: "thread", ch: t, f: f154(t) });
    if (z >= 11 && z <= 26) nets.push({ kind: "zigbee", ch: z, f: f154(z) });
    const wifi = {};
    for (const w of Object.values(tp.wifiById)) {
      const k = (w.info || {}).channel;
      if (w.kind === "wifi" && k >= 1 && k <= 14) (wifi[k] = wifi[k] || []).push(w.id);
    }
    for (const [k, ids] of Object.entries(wifi).sort((a, b) => a[0] - b[0]))
      nets.push({ kind: "wifi", ch: Number(k), f: fWifi(Number(k)), ids });
    return nets;
  }
  const chTxt = n =>
    n.kind === "wifi"
      ? tp.T.spWifiCh(n.ch, n.f - WIFI_HALF, n.f + WIFI_HALF)
      : tp.T.spCh(tp.T.spNames[n.kind], n.ch, n.f);
  function clearChannels(avoid, wifiKnown) {
    // 802.15.4 channels away from the known Wi-Fi (and from 1/6/11 if possible)
    const free = set =>
      [...Array(16).keys()]
        .map(i => i + 11)
        .filter(c => c !== avoid && set.every(k => Math.abs(f154(c) - fWifi(k)) >= CLEAR_WIFI));
    const best = free([...new Set(wifiKnown.concat(COMMON_WIFI))]);
    return (best.length ? best : free(wifiKnown)).slice(0, 4);
  }
  // overlaps as texts – nm: name function (the text report passes the anonymised one)
  function spectrumIssues(nm = nameOf) {
    const nets = spectrumNets(),
      wifi = nets.filter(n => n.kind === "wifi"),
      out = [];
    const th = nets.find(n => n.kind === "thread"),
      zb = nets.find(n => n.kind === "zigbee");
    for (const n of [th, zb].filter(Boolean))
      for (const w of wifi)
        if (Math.abs(n.f - w.f) < IN_WIFI) {
          const fix =
            n.kind === "zigbee"
              ? tp.T.spZigbeeFix(
                  clearChannels(
                    th ? th.ch : null,
                    wifi.map(x => x.ch),
                  ).join(", "),
                )
              : tp.T.spThreadFix(
                  COMMON_WIFI.filter(k =>
                    [th, zb].filter(Boolean).every(x => Math.abs(x.f - fWifi(k)) >= IN_WIFI),
                  ).join(", ") || "–",
                );
          const what = tp.T.spInside(chTxt(n), chTxt(w), w.ids.map(nm).join(", "));
          out.push({ what, fix, text: what + " " + fix, kinds: [n.kind, "wifi"], ch: [n.ch, w.ch] });
        }
    if (th && zb && th.ch === zb.ch)
      out.push({
        what: tp.T.spSame(th.ch),
        fix: "",
        text: tp.T.spSame(th.ch),
        kinds: ["thread", "zigbee"],
        ch: [th.ch],
      });
    return out;
  }
  // diagram: frequency axis 2400–2485 MHz, one row per network, the overlapping ones in red
  function spectrumHtml() {
    const nets = spectrumNets();
    if (!nets.find(n => n.kind !== "wifi")) return "";
    const bad = new Set(
      spectrumIssues().flatMap(x => x.kinds.map((k, i) => k + ":" + x.ch[Math.min(i, x.ch.length - 1)])),
    );
    const W = 340,
      L = 16,
      R = 324,
      x = f => L + ((f - 2400) / 85) * (R - L),
      rowH = 22,
      top = 6,
      H = top + nets.length * rowH + 22;
    const color = { thread: COLORS.br, zigbee: COLORS.zigbee, wifi: COLORS.wifi };
    let s = `<svg class="spec" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(tp.T.secSpectrum)}">`;
    for (let f = 2400; f <= 2480; f += 20)
      s += `<line class="sgrid" x1="${x(f)}" x2="${x(f)}" y1="${top}" y2="${H - 18}"/><text class="saxis" x="${x(f)}" y="${H - 5}">${f}</text>`;
    nets.forEach((n, i) => {
      const y = top + i * rowH,
        half = n.kind === "wifi" ? WIFI_HALF : 1,
        hot = bad.has(n.kind + ":" + n.ch);
      const x0 = x(n.f - half),
        w = Math.max(4, x(n.f + half) - x0),
        lbl = n.kind === "wifi" ? `${tp.T.spNames.wifi} ${n.ch}` : `${tp.T.spNames[n.kind]} ${n.ch}`;
      s +=
        `<rect x="${x0}" y="${y + 3}" width="${w}" height="${rowH - 8}" rx="3" fill="${hot ? COLORS.weak : color[n.kind]}" fill-opacity="${n.kind === "wifi" ? 0.35 : 1}"` +
        `${hot && n.kind === "wifi" ? ` stroke="${COLORS.weak}"` : ""}/>`;
      const right = x0 + w + 4 + lbl.length * 6.2 < R;
      s += `<text class="slbl${hot ? " hot" : ""}" x="${right ? x0 + w + 4 : x0 - 4}" y="${y + rowH / 2 + 2}" text-anchor="${right ? "start" : "end"}">${esc(lbl)}</text>`;
    });
    return s + `</svg>`;
  }
  function spectrumSection() {
    // network panel (tab Links) and the border router panel
    const nets = spectrumNets();
    if (!nets.find(n => n.kind !== "wifi")) return "";
    const issues = spectrumIssues();
    return (
      `<h4>${tp.T.secSpectrum}</h4>` +
      spectrumHtml() +
      (issues.length
        ? issues.map(x => `<div class="spi"><span class="r">${esc(x.what)}</span> ${esc(x.fix)}</div>`).join("")
        : `<div class="spi g">${tp.T.spOk}</div>`) +
      `<div class="tnote">${nets.some(n => n.kind === "wifi") ? "" : tp.T.spNoWifi + " "}${tp.zigbeeInfo ? "" : tp.T.spNoZigbee + " "}${tp.T.spNote}</div>`
    );
  }
}
