// Chattiest devices: messages per device in the last hour (issue #80).
// Installed by createThreadPulse() (core.js); shared state and functions are on tp.

export default function install(tp) {
  const { DEMO, counts, esc, nameOf } = tp;
  Object.assign(tp, { chattyHint, chattyHtml, loadMsgHistory, msgsLastHour });
  // ---------- chattiest devices (issue #80) ----------
  // Reports to Home Assistant: the hour before the page was opened from Home Assistant's history (each state change of
  // a device's entities; changes within 400 ms count as one radio message, like the live counter), afterwards live.
  // Commands from Home Assistant are not in the history, so they only count since the page was opened.
  // Battery devices that report 60 times an hour or more get a hint (normal: a few to ~20 an hour).
  const CHAT_H = 3600000,
    CHATTY_BATT = 60,
    CHATTY_MIN_OBS = 30 * 60000,
    PAGE_START = Date.now();
  let msgHist = {},
    histLoaded = false,
    histLoading = false; // node id → timestamps of reports before the page was opened
  async function loadMsgHistory(hass) {
    if (DEMO || !hass || histLoaded || histLoading) return;
    const ents = Object.keys(tp.entToNode).filter(e => !/^(button|update)\./.test(e));
    if (!ents.length) return;
    histLoading = true;
    const start = PAGE_START - CHAT_H;
    try {
      const r = await hass.callWS({
        type: "history/history_during_period",
        start_time: new Date(start).toISOString(),
        end_time: new Date(PAGE_START).toISOString(),
        entity_ids: ents,
        minimal_response: true,
        no_attributes: true,
        significant_changes_only: false,
      });
      const per = {};
      for (const [e, list] of Object.entries(r || {})) {
        const id = tp.entToNode[e];
        if (!id) continue;
        for (const x of list || []) {
          const t = (x.lu || x.lc || 0) * 1000;
          if (t > start && t < PAGE_START) (per[id] = per[id] || []).push(t);
        }
      }
      msgHist = {};
      for (const [id, ts] of Object.entries(per)) {
        ts.sort((a, b) => a - b);
        const out = [];
        for (const t of ts) if (!out.length || t - out[out.length - 1] >= 400) out.push(t);
        msgHist[id] = out;
      }
      histLoaded = true;
      tp.renderList();
    } catch (e) {
      console.warn("Thread Pulse: message history", e);
    }
    histLoading = false;
  }
  function msgsLastHour(id) {
    const cut = Date.now() - CHAT_H,
      c = counts[id] || { up: [], down: [] };
    const up = (msgHist[id] || []).filter(t => t > cut).length + c.up.filter(t => t > cut).length;
    return { up, down: c.down.filter(t => t > cut).length };
  }
  const chatObservedMs = () => (histLoaded ? CHAT_H : Math.min(CHAT_H, Date.now() - PAGE_START));
  function chattyHint(n) {
    // for computeHints: battery devices that report unusually often
    if (n.type !== "sleepy_end_device" || chatObservedMs() < CHATTY_MIN_OBS) return null;
    const up = Math.round((msgsLastHour(n.id).up * CHAT_H) / chatObservedMs());
    return up >= CHATTY_BATT ? tp.T.hChatty(up) : null;
  }
  function chattyHtml() {
    // top 10 in the "Devices" tab of the network panel
    const rows = [...Object.values(tp.nodeById), ...Object.values(tp.wifiById)]
      .map(n => ({ id: n.id, ...msgsLastHour(n.id) }))
      .filter(r => r.up + r.down)
      .sort((a, b) => b.up + b.down - (a.up + a.down))
      .slice(0, 10);
    const mins = Math.round(chatObservedMs() / 60000);
    let h = `<h4>${tp.T.chatHead}</h4>`;
    if (!rows.length) return h + `<div class="tnote">${tp.T.chatNone}</div>`;
    const max = rows[0].up + rows[0].down;
    h +=
      `<table class="chat">` +
      rows
        .map(
          r =>
            `<tr><td style="white-space:nowrap"><a href="#" data-open="${esc(r.id)}">${esc(nameOf(r.id))}</a></td>` +
            `<td style="width:40%"><span class="cbar"><span style="width:${Math.max(2, Math.round(((r.up + r.down) / max) * 100))}%"></span></span></td>` +
            `<td style="white-space:nowrap;text-align:right"><b>${r.up + r.down}</b> <span class="tnote" style="display:inline">↑ ${r.up} · ↓ ${r.down}</span></td></tr>`,
        )
        .join("") +
      `</table>`;
    return (
      h +
      `<div class="tnote">${histLoaded ? tp.T.chatNoteHist(Math.round((Date.now() - PAGE_START) / 60000)) : tp.T.chatNoteLive(mins)}</div>`
    );
  }
}
