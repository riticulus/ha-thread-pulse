"""Smoke test of all features in demo mode (no Home Assistant needed).

    python3 tests/smoke_test.py            # all checks (about 2 minutes)
    python3 tests/smoke_test.py --quick    # without the change-log check (waits 45 s for a demo change)

Builds nothing – run `python3 build.py` first. Exit code 1 if a check fails or a JavaScript error occurs.
"""
import asyncio, json, sys
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
EXPORT = "(act => { document.getElementById('exportbtn').click(); window.__texts = []; window.__rec = true; document.querySelector(`[data-act=${act}]`).click(); window.__rec = false; const t = window.__texts; return t.slice(0, t.indexOf('__COPY__')); })"
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
        await b.js(f"{G}('toggle').click()")
        r.check("list opens", await b.js(f"!{G}('info').classList.contains('hidden')"))
        hints = await b.js("document.querySelectorAll('#info table')[0] ? document.querySelectorAll('#info table')[0].rows.length : 0")
        r.check("hints listed", hints >= 2, f"{hints} hint rows")
        r.check("list button shows hint count", "hint" in await b.js(f"{G}('toggle').textContent"))

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
        await b.js(CLOSE); await asyncio.sleep(0.3)
        r.check("Esc / × close panel and clear search", await b.js(f"{G}('panel').hidden && {G}('search').value === ''"))

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
        await b.js(CLOSE)

        # image export (anonymised: no device or room names drawn)
        await b.js(f"{G}('exportbtn').click()")
        r.check("image button opens its menu", await b.js(f"!{G}('exportmenu').hidden"))
        plain = await b.js(EXPORT + "('export')")
        anon = await b.js(EXPORT + "('exportanon')")
        await asyncio.sleep(1)
        names = await b.js("window.__downloads.map(d => d.name)")
        r.check("image is saved as PNG with the date", len(names) == 2 and all(n.startswith("thread-pulse-20") and n.endswith(".png") for n in names) and names[1].endswith("-anonymised.png"), str(names))
        shown = [t for t in plain if t in DEMO_NAMES]           # only the labels in view are drawn – the map may be zoomed in
        r.check("image with names shows device names", len(shown) >= 2, str(shown))
        leaked = [t for t in anon if t in DEMO_NAMES or t in DEMO_ROOMS]
        r.check("anonymised image shows no device or room names", not leaked and any(t.startswith("Device ") for t in anon), str(leaked or anon[:6]))
        r.check("map shows the real names again after the export", set(shown) <= set(await b.js("(() => { window.__texts = []; window.__rec = true; document.getElementById('heatbtn').click(); document.getElementById('heatbtn').click(); window.__rec = false; return window.__texts; })()")))
        r.check("menu closes after saving", await b.js(f"{G}('exportmenu').hidden"))

        # toolbar toggles
        for btn, on, off in (("roombtn", "⌂ Rooms off", "⌂ Rooms"), ("heatbtn", "≋ Traffic", "≋ Traffic off"), ("livebtn", "▶ Resume live", "⏸ Pause live"),
                             ("soundbtn", "🔊 Sound off", "🔇 Sound")):
            await b.js(f"{G}('{btn}').click()"); await asyncio.sleep(2.2 if btn == "roombtn" else 0.2)
            first = await b.js(f"{G}('{btn}').textContent")
            if btn == "soundbtn":
                await asyncio.sleep(15)        # let some messages arrive with sound on
                ticks = await b.js("window.__ticks.length")
                freqs = await b.js("[...new Set(window.__ticks.map(t => t.f))]")
                r.check("sound plays ticks", ticks > 0, f"{ticks} ticks")
                r.check("sound ticks use the expected tones", set(freqs) <= {440, 880}, str(freqs))
                gaps = await b.js("window.__ticks.slice(1).map((t, i) => t.t - window.__ticks[i].t)")
                r.check("sound rate limit (≥ 150 ms apart)", all(g >= 149 for g in gaps), str(min(gaps) if gaps else None))
            await b.js(f"{G}('{btn}').click()"); await asyncio.sleep(2.2 if btn == "roombtn" else 0.2)
            second = await b.js(f"{G}('{btn}').textContent")
            r.check(f"toolbar button {btn} toggles", (first, second) == (on, off), f"{first!r} / {second!r}")
        await b.js(f"{G}('livebtn').click(); window.__p = window.__ticks.length; {G}('soundbtn').click()")
        await asyncio.sleep(6)
        r.check("no sound while live is paused", await b.js("window.__ticks.length === window.__p"))

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
        ticker = await b.js(f"{G}('live').textContent")
        r.check("without known border router messages are animated to the parent router", "→ HA" in ticker, ticker[:80])
        r.errors("Apple-only demo", b.errors)
    async with Browser() as b:                # two devices reporting the same hardware address (issue #98)
        await b.open("dist/thread-pulse.html?demo=dupaddr&lang=en", wait=10)
        r.check("same hardware address on two devices: map is drawn", "14 devices" in await b.js(f"{G}('status').textContent") and await b.js("!document.getElementById('err')"))
        await b.js(search_js("Leak sensor")); await asyncio.sleep(1.5)
        r.check("same hardware address: hint in the panel", "same hardware address as Bedroom climate" in await b.js(f"{G}('panel').textContent"))
        r.errors("same hardware address", b.errors)
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
