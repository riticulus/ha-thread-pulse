//# Layout: map with one inspector column (issue #130) – the tabbed device panel and the bottom sheet on narrow cards.
//# Part of createThreadPulse() – placed inside that function by build.py, uses the shared state declared in core.js.
  // ---------- inspector column (issue #130) ----------
  // One column next to the map: the network panel (tabs overview … changes), or the panel of the selected device.
  // The device panel starts with its warnings and key numbers, the sections are grouped in three tabs. All tabs are
  // rendered and only the chosen one is shown (the panel is rebuilt every 5 s; switching needs no rebuild).
  // Narrow cards and phones (< 700 px): the column is a sheet below the map; the handle makes it tall or low again.
  const DEV_TABS = ["status", "link", "device"];
  let devTab = "status";
  const backHtml = () => `<button class="back" data-act="close">‹ ${esc(T.backNet)}</button>`;
  function keyStats(n) {                             // the key numbers at the top of the device panel
    const l = linksOf[n.id] || [], par = l.find(x => x.kind === "parent"), rl = l.filter(x => x.kind === "neighbour");
    const best = par ? par.rssi : rl.length ? Math.max(...rl.map(x => x.rssi)) : null;
    const m = msgsLastHour(n.id), s = stabilityOf(n), b = battOf[n.id];
    const cells = [[T.kSignal, best === null ? "–" : String(best), best === null ? "" : QUAL(best)[1]], [T.kMsgs, String(m.up + m.down), ""]];
    if (b !== undefined) cells.push([T.kBattery, b + " %", b < 20 ? "r" : b < 40 ? "o" : ""]);
    else if (typeof s.reboots === "number") cells.push([T.kRestarts, String(s.reboots), powerCutOf(n) ? "o" : ""]);
    if (n.type === "routing_end_device") cells.push([T.kChildren, String(l.filter(x => x.kind === "child").length), ""]);
    return `<div class="keys">` + cells.map(([k, v, c]) => `<div><span>${esc(k)}</span><b${c ? ` class="${c}"` : ""}>${esc(v)}</b></div>`).join("") + `</div>`;
  }
  function panelLayout(n, sec) {                     // sec: [[group, html], …] – group top (header, warnings), status, link, device
    const has = DEV_TABS.filter(g => sec.some(s => s[0] === g));
    if (!has.includes(devTab)) devTab = has[0];
    const top = sec.filter(s => s[0] === "top").map(s => s[1]).join("");
    return backHtml() + top + keyStats(n) +
      `<div class="dtabs" role="tablist">` + has.map(g => `<button role="tab" data-devtab="${g}" aria-selected="${g === devTab}"${g === devTab ? ' class="on"' : ""}>${esc(T.devTabs[g])}</button>`).join("") + `</div>` +
      has.map(g => `<div class="dtab" role="tabpanel" data-g="${g}"${g === devTab ? "" : " hidden"}>${sec.filter(s => s[0] === g).map(s => s[1]).join("")}</div>`).join("");
  }
  function setDevTab(g) {
    devTab = g;
    for (const b of root.querySelectorAll("#panel [data-devtab]")) { const on = b.dataset.devtab === g; b.classList.toggle("on", on); b.setAttribute("aria-selected", String(on)); }
    for (const d of root.querySelectorAll("#panel .dtab")) d.hidden = d.dataset.g !== g;
  }
  function setSheet(tall) {                          // narrow cards: the column below the map, low or tall
    $("wrap").classList.toggle("sheet-tall", tall);
    $("sheetbtn").setAttribute("aria-expanded", String(tall));
    const t = tall ? T.sheetLow : T.sheetTall; $("sheetbtn").title = t; $("sheetbtn").setAttribute("aria-label", t);
    if (network) setTimeout(() => { if (network) network.redraw(); }, 50);
  }
  if (typeof ResizeObserver !== "undefined") {
    let wasNarrow = null;
    const ro = new ResizeObserver(() => {
      if (destroyed) return ro.disconnect();
      const narrow = $("wrap").clientWidth < 700; if (narrow === wasNarrow) return;
      wasNarrow = narrow; $("wrap").classList.toggle("narrow", narrow);
      if (network) setTimeout(() => { if (network) { network.redraw(); network.fit(); } }, 50);
    });
    ro.observe($("wrap"));
  }
  $("sheetbtn").onclick = () => setSheet(!$("wrap").classList.contains("sheet-tall"));
  root.addEventListener("click", e => {
    const t = e.target.closest && e.target.closest("[data-devtab]"); if (!t) return;
    e.preventDefault(); setDevTab(t.dataset.devtab);
  });
