"""Smoke test of all features in demo mode (no Home Assistant needed).

    python3 tests/smoke_test.py            # all checks (about 2 minutes)
    python3 tests/smoke_test.py --quick    # without the change-log check (waits 45 s for a demo change)

Builds nothing – run `npm run build` first. Exit code 1 if a check fails or a JavaScript error occurs.
"""
import asyncio, re, json, sys
from browser import Browser, Results, search_js

PAGE = "dist/thread-pulse.html?demo&lang=en"
G = "document.getElementById"
PANEL_TITLE = "document.getElementById('panel').hidden ? null : document.querySelector('#panel .t').textContent"
PANEL_SECTIONS = "[...document.querySelectorAll('#panel h4')].map(h => h.textContent)"
# image export: keep downloads in the page instead of saving them, and record the text drawn on canvases
CAPTURE = r"""
window.__downloads = []; window.__texts = []; window.__rec = false;
const P = CanvasRenderingContext2D.prototype, ft = P.fillText, di = P.drawImage;
P.fillText = function (t, ...a) { if (window.__rec) window.__texts.push(String(t)); return ft.call(this, t, ...a); };
P.drawImage = function (img, ...a) { if (window.__rec && img instanceof HTMLCanvasElement && img.isConnected) window.__texts.push('__COPY__'); return di.call(this, img, ...a); };
const ck = HTMLAnchorElement.prototype.click;
HTMLAnchorElement.prototype.click = function () { if (this.download) { window.__downloads.push({ name: this.download, href: this.href }); return; } return ck.call(this); };
"""
# text drawn for the exported picture (before the map canvas is copied)
EXPORT = "(act => { document.getElementById('morebtn').click(); window.__texts = []; window.__rec = true; document.querySelector(`[data-act=${act}]`).click(); window.__rec = false; const t = window.__texts; return t.slice(0, t.indexOf('__COPY__')); })"
DEMO_NAMES = {"Air purifier", "Air quality monitor", "Bathroom window", "Bedroom climate", "Bedside button", "Blinds", "Floor lamp", "Front door",
              "Hallway light", "Hallway motion", "Kitchen plug", "Leak sensor", "Office plug", "Speaker", "TV", "Thermostat"}
DEMO_ROOMS = {"BATHROOM", "BEDROOM", "HALLWAY", "KITCHEN", "LIVING ROOM", "OFFICE"}
CLOSE = "(() => { const x = document.querySelector('#panel [data-act=close]'); if (x) x.click(); const i = document.getElementById('search'); i.value = ''; i.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'})); return true; })()"


async def main_page(r, quick):
    async with Browser(fake_audio=True, init_script=CAPTURE) as b:
        await b.open(PAGE)
        status = await b.js(f"{G}('status').textContent")
        r.check("demo loads (status line)", status.startswith("DEMO") and "14 devices" in status, status)
        r.check("map is drawn", await b.js("!!document.querySelector('#net canvas')"))
        r.check("legend shows Wi-Fi entry (demo has Wi-Fi devices)", await b.js(f"!{G}('lgwifi').hidden"))

        # list and hints
        # layout (issue #130): network panel in the column next to the map
        r.check("network panel shown in the column next to the map", await b.js(f"getComputedStyle({G}('info')).display !== 'none' && {G}('side').getBoundingClientRect().left > {G}('stage').getBoundingClientRect().right - 2"))
        hints = await b.js("document.querySelectorAll('#info table')[0] ? document.querySelectorAll('#info table')[0].rows.length : 0")
        r.check("hints listed", hints >= 2, f"{hints} hint rows")
        r.check("status line is short (version in the menu)", "1.5" not in status and "v1." not in status, status)
        await b.js(f"{G}('legbtn').click()")
        r.check("? on the map opens the legend", await b.js(f"!{G}('legend').classList.contains('hidden') && {G}('legbtn').getAttribute('aria-expanded') === 'true'"))
        await b.js(f"{G}('legbtn').click()")
        r.check("? closes the legend again", await b.js(f"{G}('legend').classList.contains('hidden')"))
        ov = await b.js(f"{G}('tab-overview').textContent")
        grade = await b.js("(document.querySelector('#tab-overview .hgrade') || {}).textContent || ''")
        r.check("overview: mesh health grade and all six factors (ok ones folded)", grade in "ABCDE" and len(grade) == 1 and ov.count("●") == 6 and "rule of thumb" in ov and await b.js("!!document.querySelector('#tab-overview details.okf')"), ov[:80])

        # panel below the map: tabs (issue #108)
        tabs = await b.js("[...document.querySelectorAll('#tabbar [data-tab]')].map(t => t.dataset.tab)")
        r.check("five tabs", tabs == ["overview", "hints", "devices", "links", "changes"], str(tabs))
        badge = await b.js("Number(document.querySelector('#tabbar [data-tab=hints] .cnt').textContent)")
        await b.js("document.querySelector('[data-tab=hints]').click()")
        rows = await b.js("document.querySelectorAll('#tab-hints table.hints tr').length")
        r.check("hints tab: one row per hint, same count as the tab, warnings first", rows == badge and await b.js("!document.getElementById('tab-hints').hidden && document.getElementById('tab-overview').hidden")
                and await b.js("document.querySelector('#tab-hints td').textContent === '⚠'"), f"{rows} rows, badge {badge}")
        await b.js("document.querySelector('[data-tab=devices]').click()")
        n_all = await b.js("document.querySelectorAll('#tab-devices table.devs tr').length - 1")
        await b.js("document.querySelector('[data-filter=routers]').click()")
        n_rt = await b.js("document.querySelectorAll('#tab-devices table.devs tr').length - 1")
        r.check("devices tab: all devices incl. Wi-Fi, filter by role", n_all == 16 and n_rt == 6, f"{n_all} / {n_rt}")
        await b.js("document.querySelector('[data-filter=all]').click(); document.querySelector('[data-sort=rssi]').click()")
        sig = await b.js("[...document.querySelectorAll('#tab-devices table.devs tr td:nth-child(4)')].map(td => parseInt(td.textContent)).filter(x => !isNaN(x))")
        r.check("devices tab: sort by signal", sig == sorted(sig) and len(sig) >= 10, str(sig[:6]))
        # radio channels (#78, #120): demo has Thread 15, ZHA 20 and a Matter device on Wi-Fi 9 – Zigbee lies inside that Wi-Fi
        lk = await b.js(f"{G}('tab-links').textContent")
        bars = await b.js("[...document.querySelectorAll('#tab-links svg.spec .slbl')].map(t => t.textContent + (t.classList.contains('hot') ? '!' : ''))")
        r.check("links tab: radio channel diagram, overlapping networks marked", bars == ["Thread 15", "Zigbee 20!", "Wi-Fi 9!"], str(bars))
        r.check("links tab: overlap explained with clear Zigbee channels", "Zigbee channel 20 (2450 MHz) lies within Wi-Fi channel 9 (2442–2462 MHz), used by Air quality monitor" in lk and "clear of this Wi-Fi: 25, 26" in lk, lk[:200])
        r.check("hints tab: the overlap is listed as a hint", "Radio channels (2.4 GHz)" in await b.js(f"{G}('tab-hints').textContent"))
        # hints over a time window (#24)
        await b.js("document.querySelector('[data-tab=hints]').click()")
        ht = await b.js(f"{G}('tab-hints').textContent")
        r.check("hints count the last 7 days (#24)", "Restarted 10 times in the last 7 days" in ht and "8 attach attempts in the last 7 days" in ht, ht[:120])
        r.check("router with old restarts but stable now has no hint (#24)", "60 times" not in ht)
        await b.js("document.querySelector('#tab-hints [data-dismiss$=power]').click()"); await asyncio.sleep(0.3)
        ht = await b.js(f"{G}('tab-hints').textContent")
        r.check("'Done' hides the hint and lists it as done", "Restarted 10 times" not in ht and "Marked as done (1)" in ht)
        await b.js("document.querySelector('#tab-hints [data-undismiss]').click()"); await asyncio.sleep(0.3)
        r.check("'Show again' brings it back", "Restarted 10 times" in await b.js(f"{G}('tab-hints').textContent"))
        await b.js("document.querySelector('[data-tab=devices]').click()")
        r.check("devices tab: firmware overview below the table", "Same model, different firmware" in await b.js(f"{G}('tab-devices').textContent"))
        await b.js("document.querySelector('[data-tab=overview]').click(); document.querySelector('[data-tab=devices]').click()")   # re-render with current counts
        chat = await b.js("[...document.querySelectorAll('#tab-devices table.chat tr')].map(r => r.innerText)")
        r.check("devices tab: chattiest devices (#80) with up/down split", len(chat) >= 3 and all("↑" in x and "↓" in x for x in chat), str(chat[:2]))
        await b.js("document.querySelector('[data-sort=msgs]').click(); document.querySelector('[data-sort=msgs]').click()")
        m = await b.js("[...document.querySelectorAll('#tab-devices table.devs tr td:nth-child(5)')].map(td => parseInt(td.textContent) || 0)")
        r.check("devices tab: sort by messages per hour", m == sorted(m, reverse=True) and m[0] > 0, str(m[:6]))
        await b.js("document.querySelector('[data-tab=links]').click()")
        await b.js("document.querySelector('#tab-links tr.mark').click()"); await asyncio.sleep(0.6)
        r.check("links tab: tapping a link marks both devices on the map", await b.js(f"!{G}('markchip').hidden && {G}('markchip').textContent.startsWith('2 marked')"))
        await b.js("document.querySelector('#markchip [data-act=unmark]').click()"); await asyncio.sleep(0.3)
        r.check("'Show all' ends the marking", await b.js(f"{G}('markchip').hidden"))
        dep = await b.js("[...document.querySelectorAll('#tab-links table.lk')].pop().rows.length - 1")
        r.check("links tab: routers the mesh depends on (#77)", dep >= 3, f"{dep} routers")
        await b.js("document.querySelector('[data-tab=overview]').click()")
        # what if a router fails (issue #77)
        await b.js(search_js("Hallway light")); await asyncio.sleep(1.5)
        wi = await b.js(f"{G}('panel').textContent")
        # which devices use it as parent depends on the demo's random signals – check the structure, not the names
        r.check("router panel: what if it fails – devices using it as parent", "If this router fails" in wi and bool(re.search(r"devices? uses? it as parent", wi))
                and ("can switch to" in wi or "not reported" in wi), wi[wi.find("If this"):][:160])
        marked = await b.js("document.querySelector('#panel [data-mark]').dataset.mark.split(',').length")
        await b.js("document.querySelector('#panel [data-mark]').click()"); await asyncio.sleep(0.6)
        r.check("router panel: affected devices marked on the map", await b.js(f"{G}('markchip').textContent.startsWith('{marked} marked')"), str(marked))
        await b.js("document.querySelector('#markchip [data-act=unmark]').click()"); await b.js(CLOSE); await asyncio.sleep(0.3)

        # search + panel
        await b.js(search_js("plug", enter=False)); await asyncio.sleep(0.6)
        r.check("search finds plugs", (await b.js(f"{G}('hits').textContent")).endswith("found"))
        await b.js(search_js("Front door")); await asyncio.sleep(1.2)
        r.check("Enter opens the detail panel", await b.js(PANEL_TITLE) == "Front door")
        sections = await b.js(PANEL_SECTIONS)
        for s in ("Hints", "Live (since this page was opened)", "Battery", "Thread", "Stability", "Device"):
            r.check(f"device panel has section '{s}'", s in sections, str(sections))
        r.check("battery forecast row", await b.js("[...document.querySelectorAll('#panel dt')].some(d => d.textContent === 'Forecast')"))
        r.check("warning box shown (unstable demo device)", await b.js("!!document.querySelector('#panel .warn')"))
        r.check("diagnosis names the low battery as likely cause (#123)", "Likely: battery low (15 %)" in await b.js(f"{G}('panel').textContent"))
        # device panel (issue #130): key numbers, three tabs, network panel hidden while a device is shown
        r.check("device panel: key numbers on top", await b.js("document.querySelectorAll('#panel .keys > div').length") >= 3)
        r.check("device panel: three tabs, Status shown first", await b.js("[...document.querySelectorAll('#panel [data-devtab]')].map(t => t.dataset.devtab).join()") == "status,link,device"
                and await b.js("[...document.querySelectorAll('#panel .dtab')].filter(d => !d.hidden).map(d => d.dataset.g).join()") == "status")
        r.check("device panel replaces the network panel in the column", await b.js(f"getComputedStyle({G}('info')).display === 'none'"))
        await b.js("document.querySelector('[data-devtab=link]').click()")
        r.check("device panel: tab switch shows the Thread section", await b.js("[...document.querySelectorAll('#panel .dtab:not([hidden]) h4')].map(h => h.textContent).includes('Thread')"))
        # trends (issue #38): battery and signal, 7 days, value on tap
        charts = await b.js("[...document.querySelectorAll('#panel svg[data-trend]')].map(x => x.dataset.trend.split(':')[0])")
        r.check("trends: battery and signal chart in the panel", sorted(charts) == ["b", "s"], str(charts))
        reads = await b.js("[...document.querySelectorAll('#panel .tread')].map(x => x.textContent)")
        r.check("trends: latest value shown under each chart", len(reads) == 2 and "%" in reads[0] and "dBm" in reads[1], str(reads))
        r.check("trends: note says how many hours are covered", "of 168 hours" in await b.js(f"{G}('panel').textContent"))
        before = reads[1]
        await b.js("(() => { const s = document.querySelector('#panel svg[data-trend^=s]'); const r = s.getBoundingClientRect(); s.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true, clientX: r.left + r.width * 0.3, clientY: r.top + 10})); })()")
        after = await b.js("document.querySelectorAll('#panel .tread')[1].textContent")
        r.check("trends: tapping the chart shows that hour", after != before and "dBm" in after, f"{before} → {after}")
        await b.js(CLOSE); await asyncio.sleep(0.3)
        r.check("Esc / ‹ Network close panel and clear search", await b.js(f"{G}('panel').hidden && {G}('search').value === ''"))
        r.check("network panel back after closing the device", await b.js(f"getComputedStyle({G}('info')).display !== 'none'"))

        # Wi-Fi device
        await b.js(search_js("Air quality")); await asyncio.sleep(1.2)
        r.check("Wi-Fi device panel opens", await b.js(PANEL_TITLE) == "Air quality monitor")
        r.check("Wi-Fi panel has Wi-Fi section", "Wi-Fi" in await b.js(PANEL_SECTIONS))
        await b.js(CLOSE)

        # identify (demo: animated command, feedback, button locked for a few seconds)
        await b.js(search_js("Kitchen plug")); await asyncio.sleep(1.2)
        r.check("identify button in the device panel", await b.js("!!document.querySelector('#panel [data-identify]')"))
        await b.js("document.querySelector('#panel [data-identify]').click()"); await asyncio.sleep(0.5)
        r.check("identify gives feedback and locks the button", await b.js("(() => { const x = document.querySelector('#panel [data-identify]'); return x.disabled && /sent/.test(x.parentElement.textContent); })()"))
        r.check("identify command appears in the live ticker", "button.press" in await b.js(f"{G}('live').textContent"))
        await asyncio.sleep(4.5)
        r.check("identify button usable again after the lock", await b.js("!document.querySelector('#panel [data-identify]').disabled"))
        await b.js(CLOSE)
        await asyncio.sleep(0.3)
        for _ in range(2):                     # the demo reloads its data every 40 s – that can swallow one search
            await b.js(search_js("Bedside button")); await asyncio.sleep(1.2)      # the unreachable demo device
            if await b.js(PANEL_TITLE) == "Bedside button": break
            await asyncio.sleep(2)
        r.check("no identify button on an unreachable device", await b.js(PANEL_TITLE) == "Bedside button" and await b.js("!document.querySelector('#panel [data-identify]')"))
        dg = await b.js(f"{G}('panel').textContent")
        r.check("diagnosis for an unreachable device (#123)", "Diagnosis" in dg and "Not reachable right now" in dg and ("Likely:" in dg or "Possible:" in dg) and "rule-of-thumb" in dg, dg[dg.find("Diagnosis"):][:160])
        await b.js(CLOSE)

        # connected systems (demo: Floor lamp is also in Google Home)
        await b.js(search_js("Floor lamp")); await asyncio.sleep(1.2)
        fab = await b.js(f"{G}('panel').textContent")
        r.check("connected systems in the panel", "Connected systems" in fab and "Google LLC" in fab and "this Home Assistant" in fab)
        await b.js(CLOSE); await asyncio.sleep(0.3)
        # firmware (demo: Kitchen plug has an update, Office plug skipped it, Bedroom climate installs one)
        await b.js(search_js("Kitchen plug")); await asyncio.sleep(1.2)
        r.check("firmware update shown in the panel", "1.4.0 available" in await b.js(f"{G}('panel').textContent"))
        await b.js(CLOSE); await asyncio.sleep(0.3)
        fw = await b.js(f"{G}('info').textContent")
        r.check("firmware section in the list", "Same model, different firmware" in fw and "skipped" in fw and "installing 2.1.0" in fw)

        # image export (anonymised: no device or room names drawn)
        # toolbar menu (issue #107): reload, sound, export, version
        await b.js(f"{G}('morebtn').click()")
        menu = await b.js(f"{G}('moremenu').innerText")
        r.check("⋯ opens the menu with reload, sound, export and version", await b.js(f"!{G}('moremenu').hidden") and all(t in menu for t in ("Reload", "Sound", "Save image", "Text report", "Thread Pulse 1.")), menu.replace("\n", " | ")[:160])
        await b.js("document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}))")
        r.check("Escape closes the menu", await b.js(f"{G}('moremenu').hidden"))
        plain = await b.js(EXPORT + "('export')")
        anon = await b.js(EXPORT + "('exportanon')")
        await asyncio.sleep(1)
        names = await b.js("window.__downloads.map(d => d.name)")      # toBlob is asynchronous: the order is not fixed
        r.check("image is saved as PNG with the date", len(names) == 2 and all(n.startswith("thread-pulse-20") and n.endswith(".png") for n in names) and sum(n.endswith("-anonymised.png") for n in names) == 1, str(names))
        shown = [t for t in plain if t in DEMO_NAMES]           # only the labels in view are drawn – the map may be zoomed in
        r.check("image with names shows device names", len(shown) >= 2, str(shown))
        leaked = [t for t in anon if t in DEMO_NAMES or t in DEMO_ROOMS]
        r.check("anonymised image shows no device or room names", not leaked and any(t.startswith("Device ") for t in anon), str(leaked or anon[:6]))
        r.check("map shows the real names again after the export", set(shown) <= set(await b.js("(() => { window.__texts = []; window.__rec = true; document.getElementById('heatbtn').click(); document.getElementById('heatbtn').click(); window.__rec = false; return window.__texts; })()")))
        r.check("menu closes after saving", await b.js(f"{G}('moremenu').hidden"))

        # text report (anonymised by default; never addresses or network identifiers)
        await b.js(f"{G}('morebtn').click(); document.querySelector('[data-act=report]').click()")
        anon = await b.js(f"{G}('reporttext').value")
        r.check("text report opens anonymised", not await b.js(f"{G}('report').hidden") and anon.startswith("### Thread network") and "anonymised" in anon.split("\n")[1])
        rows = [l.split(" | ") for l in anon.splitlines() if re.match(r"\| Device \d+ \|", l)]
        shown = [c.strip("| ") for row in rows for c in row[:2]] + re.findall(r"talks through (.+?) ·", anon) + re.findall(r"\*\*(.+?)\*\*:", anon)
        leaked = [t for t in shown if t in DEMO_NAMES or t.upper() in DEMO_ROOMS]
        r.check("anonymised report has a row per device and no device or room names", len(rows) == 14 and not leaked, str(leaked or len(rows)))
        r.check("report contains no addresses or network identifiers", not re.search(r"[0-9a-f]{12}|dead00beef|MyHome|PAN", anon, re.I))
        weak = await b.js("(document.getElementById('tab-links') || {}).textContent || ''")      # the demo draws random signals: weak links are not always there
        r.check("report lists hints and weak links", "Restarted 10 times in the last 7 days" in anon and (("Weak links between routers" in anon) == ("Weak links between routers" in weak)))
        r.check("report: other radio channels and the overlap, Wi-Fi device anonymised (#120)", "| Other radio channels | Zigbee 20 · Wi-Fi 9 |" in anon
                and "Zigbee channel 20 (2450 MHz) lies within Wi-Fi channel 9" in anon and "Air quality monitor" not in anon)
        r.check("report contains the mesh health with its factors", bool(re.search(r"\*\*Mesh health: [A-E]\*\*", anon)) and "· Stability:" in anon)
        await b.js(f"{G}('reportanon').click()")
        named = await b.js(f"{G}('reporttext').value")
        r.check("report with names", "| Floor lamp |" in named and "anonymised" not in named.split("\n")[1] and not re.search(r"[0-9a-f]{12}", named))
        await b.js("document.querySelector('[data-act=reportcopy]').click()"); await asyncio.sleep(0.3)
        r.check("copy gives feedback", bool(await b.js(f"{G}('reportmsg').textContent")))
        await b.js("document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}))")
        r.check("Escape closes the report", await b.js(f"{G}('report').hidden"))

        # toolbar toggles
        for btn, on, off in (("roombtn", "⌂ Rooms off", "⌂ Rooms"), ("heatbtn", "≋ Traffic", "≋ Traffic off"), ("livebtn", "▶ Resume live", "⏸ Pause live"),
                             ("soundbtn", "🔊 Sound off", "🔇 Sound")):
            await b.js(f"{G}('{btn}').click()"); await asyncio.sleep(2.2 if btn == "roombtn" else 0.2)
            first = await b.js(f"{G}('{btn}').getAttribute('aria-label') || {G}('{btn}').textContent")
            if btn == "soundbtn":
                await asyncio.sleep(15)        # let some messages arrive with sound on
                ticks = await b.js("window.__ticks.length")
                freqs = await b.js("[...new Set(window.__ticks.map(t => t.f))]")
                r.check("sound plays ticks", ticks > 0, f"{ticks} ticks")
                r.check("sound ticks use the expected tones", set(freqs) <= {440, 880}, str(freqs))
                gaps = await b.js("window.__ticks.slice(1).map((t, i) => t.t - window.__ticks[i].t)")
                r.check("sound rate limit (≥ 150 ms apart)", all(g >= 149 for g in gaps), str(min(gaps) if gaps else None))
            await b.js(f"{G}('{btn}').click()"); await asyncio.sleep(2.2 if btn == "roombtn" else 0.2)
            second = await b.js(f"{G}('{btn}').getAttribute('aria-label') || {G}('{btn}').textContent")
            r.check(f"toolbar button {btn} toggles", (first, second) == (on, off), f"{first!r} / {second!r}")
        r.check("active features are marked as pressed", await b.js(f"{G}('heatbtn').getAttribute('aria-pressed') === 'true' && {G}('roombtn').getAttribute('aria-pressed') === 'false'"))
        await b.js(f"{G}('livebtn').click(); window.__p = window.__ticks.length; {G}('soundbtn').click()")
        await asyncio.sleep(6)
        r.check("no sound while live is paused", await b.js("window.__ticks.length === window.__p"))
        await b.js(f"{G}('livebtn').click()")          # live on again
        # response times on the map (issue #89)
        await b.js(f"{G}('respbtn').click()")
        r.check("response-time view: menu entry toggles and legend shows the scale", "Hide response times" in await b.js(f"{G}('respbtn').textContent")
                and await b.js("[...document.querySelectorAll('.lgresp')].every(x => !x.hidden)"))
        drawn = await b.js("(() => { window.__texts = []; window.__rec = true; document.getElementById('heatbtn').click(); document.getElementById('heatbtn').click(); window.__rec = false; return window.__texts; })()")
        rt = [t for t in drawn if re.fullmatch(r"\d+ ms|\d+(\.\d)? s", t)]
        r.check("response-time view: measured devices get their value on the map", len(rt) >= 1, str(rt[:5]))
        await b.js(f"{G}('respbtn').click()")
        drawn = await b.js("(() => { window.__texts = []; window.__rec = true; document.getElementById('heatbtn').click(); document.getElementById('heatbtn').click(); window.__rec = false; return window.__texts; })()")
        r.check("response-time view off: no values drawn", not [t for t in drawn if re.fullmatch(r"\d+ ms|\d+(\.\d)? s", t)] and await b.js("[...document.querySelectorAll('.lgresp')].every(x => x.hidden)"))

        if not quick:
            await b.js(f"{G}('livebtn').click()")
            await asyncio.sleep(45)               # the demo invents a change every 40 seconds
            entries = await b.js("document.querySelectorAll('#changes table tr').length")
            r.check("change log records a demo change", entries >= 1, f"{entries} entries")
        r.errors("main page", b.errors)


async def other_pages(r):
    async with Browser() as b:
        await b.open("dist/thread-pulse.html?demo&ambient&lang=de", wait=7)
        r.check("ambient mode hides the toolbar", await b.js(f"getComputedStyle({G}('bar')).display") == "none")
        r.check("ambient mode uses its dark background", await b.js(f"getComputedStyle({G}('wrap')).backgroundColor") == "rgb(5, 7, 10)")
        r.errors("ambient mode", b.errors)
    async with Browser() as b:
        await b.open("dist/thread-pulse.html?demo&nowifi&lang=fr", wait=7)
        r.check("?nowifi hides the Wi-Fi group", await b.js(f"{G}('lgwifi').hidden"))
        r.check("French texts", (await b.js(f"{G}('reload').textContent")) == "↻ Recharger")
        r.errors("nowifi / French", b.errors)
    async with Browser(init_script=CAPTURE) as b:     # Apple border routers only, battery devices only (issues #71, #37)
        await b.open("dist/thread-pulse.html?demo=apple&lang=en", wait=14)
        labels = await b.js("(() => { window.__texts = []; window.__rec = true; document.getElementById('heatbtn').click(); document.getElementById('heatbtn').click(); window.__rec = false; return window.__texts; })()")
        r.check("border routers are named on the map (instance name, not the generic Apple model)", "HomePod Living Room" in labels and "Border router …7114" in labels and "BorderRouter" not in labels,
                str([t for t in labels if "router" in t.lower() or "Home" in t][:4]))
        r.check("names that arrive after the map is drawn also reach the list", "HomePod Living Room …7114" in await b.js(f"{G}('info').textContent"))
        r.check("Apple-only demo loads", "4 devices" in await b.js(f"{G}('status').textContent"))
        sp = await b.js(f"{G}('tab-links').textContent")
        r.check("radio channels without ZHA: no overlap, Zigbee unknown", "No overlaps between the known networks" in sp and "No Zigbee channel" in sp and "Radio channels" not in await b.js(f"{G}('tab-hints').textContent"))
        await b.js(f"{G}('morebtn').click(); document.querySelector('[data-act=report]').click()")
        rep = await b.js(f"{G}('reporttext').value")
        r.check("anonymised report hides the names of other border routers", "HomePod" not in rep and "AppleTV" not in rep and "Border router 1" in rep, rep[:200])
        h = await b.js(f"{G}('tab-overview').textContent")
        r.check("mesh health says when factors are unknown (Apple-only)", "only 4 of 6 factors judged" in h and "Not judged" in h, h[:120])
        ticker = await b.js(f"{G}('live').textContent")
        r.check("without known border router messages are animated to the parent router", "→ HA" in ticker, ticker[:80])
        r.errors("Apple-only demo", b.errors)
    async with Browser() as b:                # two devices reporting the same hardware address (issue #98)
        await b.open("dist/thread-pulse.html?demo=dupaddr&lang=en", wait=10)
        r.check("same hardware address on two devices: map is drawn", "14 devices" in await b.js(f"{G}('status').textContent") and await b.js("!document.getElementById('err')"))
        await b.js(search_js("Leak sensor")); await asyncio.sleep(1.5)
        r.check("same hardware address: hint in the panel", "same hardware address as Bedroom climate" in await b.js(f"{G}('panel').textContent"))
        r.errors("same hardware address", b.errors)
    async with Browser() as b:                # time window from the URL / card option (#24)
        await b.open("dist/thread-pulse.html?demo&lang=en&hintdays=3", wait=8)
        await b.js("document.querySelector('[data-tab=hints]').click()")
        r.check("hint time window configurable (3 days)", "Restarted 4 times in the last 3 days" in await b.js(f"{G}('tab-hints').textContent"))
        r.errors("time window", b.errors)
    async with Browser(width=390, height=760) as b:     # phone: toolbar in one row of icons (issue #107)
        await b.open("dist/thread-pulse.html?demo&lang=en", wait=5)
        bar = await b.js("document.getElementById('bar').getBoundingClientRect().height")
        lbl = await b.js("getComputedStyle(document.querySelector('#livebtn .lb')).display")
        r.check("phone: toolbar buttons show icons only, toolbar ≤ 2 rows", lbl == "none" and bar < 80, f"{bar:.0f} px, label {lbl}")
        r.check("phone: search collapsed to an icon", await b.js("document.getElementById('search').getBoundingClientRect().width < 50"))
        await b.js("document.getElementById('search').focus()")
        r.check("phone: search widens when used", await b.js("document.getElementById('search').getBoundingClientRect().width > 300"))
        await b.js("document.getElementById('search').blur()")
        # phone (issue #130): the column is a sheet below the map, the handle makes it tall or low
        side = await b.js("(() => { const s = document.getElementById('side').getBoundingClientRect(), m = document.getElementById('stage').getBoundingClientRect(); return [s.top >= m.bottom - 2, Math.round(s.height)]; })()")
        r.check("phone: network panel is a sheet below the map", side[0] and 200 < side[1] < 400, str(side))
        await b.js("document.getElementById('sheetbtn').click()")
        tall = await b.js("document.getElementById('side').getBoundingClientRect().height")
        r.check("phone: sheet handle makes the panel taller", tall > side[1] + 150 and await b.js("document.getElementById('sheetbtn').getAttribute('aria-expanded') === 'true'"), f"{side[1]} → {tall:.0f}")
        r.errors("phone width", b.errors)
    async with Browser() as b:                # device card (#126): demo battery device and router
        await b.open("tests/device-card.html", wait=3)
        bat = await b.js("document.getElementById('battery').shadowRoot.textContent")
        rt = await b.js("document.getElementById('router').shadowRoot.textContent")
        r.check("device card: battery device with parent, signal, battery forecast and 7-day chart", "Front door" in bat and "Kitchen plug · -73 dBm · medium" in bat
                and "15 %" in bat and "empty in about 3 weeks" in bat and "Signal to the parent · 7 days" in bat
                and await b.js("!!document.getElementById('battery').shadowRoot.querySelector('svg path.line')"), bat[-200:])
        r.check("device card: router with its router links", "6 routers · -50 dBm · good" in rt and "Best router link" in rt, rt[-160:])
        r.check("device card: the card is one button (keyboard, screen reader)", await b.js("document.getElementById('battery').shadowRoot.querySelector('button.tp').getAttribute('aria-label')") == "Front door – open on the map")
        r.errors("device card", b.errors)
    async with Browser() as b:                # link from a device card: ?device= opens the device on the map (#126)
        await b.open("dist/thread-pulse.html?demo&lang=en&device=f2a0c0de00001001", wait=8)
        r.check("map opens the device given in the link", await b.js(PANEL_TITLE) == "Kitchen plug", str(await b.js(PANEL_TITLE)))
        r.errors("device link", b.errors)
    async with Browser() as b:                # the card file itself (what HACS installs), demo mode, in a shadow root
        await b.open("tests/card.html", wait=8)
        S = "document.getElementById('card').shadowRoot"
        r.check("card file: loads as a module and draws the demo map", await b.js(f"!!{S} && !!{S}.querySelector('#net canvas') && {S}.getElementById('status').textContent.startsWith('DEMO')"))
        r.check("card file: network panel in the column", "Mesh health" in await b.js(f"{S}.getElementById('info').textContent"))
        r.errors("card file", b.errors)
    async with Browser() as b:
        await b.open("dist/thread-pulse.html?lang=en", wait=3)
        err = await b.js("document.getElementById('err') ? document.getElementById('err').textContent : ''")
        r.check("without Home Assistant an error message is shown", err.startswith("No connection to Home Assistant"), err[:60])


async def main():
    quick = "--quick" in sys.argv
    r = Results()
    print("main page (demo):"); await main_page(r, quick)
    print("other modes:"); await other_pages(r)
    r.done()

if __name__ == "__main__":
    asyncio.run(main())
