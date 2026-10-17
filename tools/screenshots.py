#!/usr/bin/env python3
"""Regenerate every documentation image from demo mode, in dark mode (needs Chrome and tests/requirements.txt).

    npm run build && python3 tools/screenshots.py

  docs/screenshots/*.png     the tabs next to the map, full length (for posts; some are copied into the wiki)
  docs/wiki/images/*.png     map, toolbar, search, room view, phone, network panel, radio channels, device card
  docs/detail-view.png       the device panel shown in the README
Not generated: docs/wiki/images/card-editor.png (Home Assistant's card editor) and docs/demo.gif.
Takes about two minutes: the demo is first left running so that the change log has entries.
"""
import asyncio, base64, shutil, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tests"))
from browser import Browser, search_js  # noqa: E402

SHOTS, WIKI = ROOT / "docs/screenshots", ROOT / "docs/wiki/images"
PAGE = "dist/thread-pulse.html?demo&lang=en"
W, H = 1280, 720
# tab images that the wiki uses too (same file name)
TO_WIKI = ["network-1-overview", "network-2-hints", "network-3-devices", "network-4-links", "network-5-changes",
           "battery-device-1-status", "battery-device-2-link", "battery-device-3-device", "router-2-link"]


async def dark(b):
    await b.cmd("Emulation.setEmulatedMedia", features=[{"name": "prefers-color-scheme", "value": "dark"}])


async def save(b, path, clip=None):
    p = {"format": "png"}
    if clip:
        p["clip"] = dict(clip, scale=1)
    Path(path).write_bytes(base64.b64decode((await b.cmd("Page.captureScreenshot", **p))["data"]))
    print("saved", Path(path).relative_to(ROOT))


async def rect(b, el_id):
    return await b.js(f"(() => {{ const r = document.getElementById('{el_id}').getBoundingClientRect(); "
                      "return {x: r.left + 1, y: r.top, width: r.width - 1, height: r.height}; })()")


def open_dev(name):   # a device link in the devices table: opens the panel without moving the map
    return f"[...document.querySelectorAll('#tab-devices a[data-open]')].find(a => a.textContent === {name!r}).click()"


async def tabs(b):
    """Every tab of the network panel and of a battery device and a router, full length."""
    async def tab(name, js):
        await b.js(js)
        await asyncio.sleep(1.0)
        h = await b.js("(() => { const p = document.getElementById('panel'); return (p.hidden ? document.getElementById('info') : p).scrollHeight; })()")
        await b.cmd("Emulation.setDeviceMetricsOverride", width=W, height=max(H, int(h) + 4), deviceScaleFactor=2, mobile=False)
        await asyncio.sleep(0.6)
        await save(b, SHOTS / f"{name}.png", await rect(b, "side"))
        await b.cmd("Emulation.setDeviceMetricsOverride", width=W, height=H, deviceScaleFactor=2, mobile=False)

    for i, t in enumerate(["overview", "hints", "devices", "links", "changes"], 1):
        await tab(f"network-{i}-{t}", f"document.querySelector('[data-tab={t}]').click()")
    for kind, name in (("battery-device", "Front door"), ("router", "Kitchen plug")):
        await b.js("document.querySelector('[data-tab=devices]').click()")
        await b.js(open_dev(name))
        for i, g in enumerate(["status", "link", "device"], 1):
            await tab(f"{kind}-{i}-{g}", f"document.querySelector('[data-devtab={g}]').click()")
        await b.js("document.querySelector('#panel .back').click()")


def trim(path):
    """Cut the empty area below the content of short tabs."""
    from PIL import Image, ImageChops
    im = Image.open(path).convert("RGB")
    bg = Image.new("RGB", im.size, im.getpixel((im.size[0] - 2, im.size[1] - 2)))
    box = ImageChops.difference(im, bg).point(lambda v: 255 if v > 12 else 0).getbbox()
    if box and box[3] + 40 < im.size[1]:
        im = im.crop((0, 0, im.size[0], box[3] + 32))
    im.save(path, optimize=True)


async def main():
    SHOTS.mkdir(parents=True, exist_ok=True)
    async with Browser(width=W, height=H, scale=2) as b:
        await dark(b)
        await b.open(PAGE, wait=48)                       # after the demo's first check: the change log has entries
        await tabs(b)
    for f in SHOTS.glob("*.png"):
        trim(f)
    for name in TO_WIKI:
        shutil.copyfile(SHOTS / f"{name}.png", WIKI / f"{name}.png")
    shutil.copyfile(SHOTS / "battery-device-1-status.png", ROOT / "docs/detail-view.png")   # README

    async with Browser(width=1280, height=787, scale=1.25) as b:     # whole page, for the wiki
        await dark(b)
        await b.open(PAGE, wait=10)
        await save(b, WIKI / "map.png")
        await b.js("document.querySelector('[data-tab=hints]').click()"); await asyncio.sleep(0.5)
        await save(b, WIKI / "list.png")
        await b.js("document.querySelector('[data-tab=links]').click()"); await asyncio.sleep(0.5)
        r = await b.js("""(() => { const p = document.getElementById('tab-links'), h = p.querySelector('h4'), n = p.querySelector('.tnote');
          const a = h.getBoundingClientRect(), z = n.getBoundingClientRect(), s = document.getElementById('side').getBoundingClientRect();
          return {x: s.left + 1, y: a.top - 8, width: s.width - 1, height: z.bottom - a.top + 16}; })()""")
        await save(b, WIKI / "radio-channels.png", r)
        await b.js("document.querySelector('[data-tab=overview]').click(); document.getElementById('morebtn').click()"); await asyncio.sleep(0.5)
        st = await rect(b, "stage")
        await save(b, WIKI / "toolbar.png", {"x": 0, "y": 0, "width": st["width"], "height": 470})
        await b.js("document.getElementById('morebtn').click()")
        await b.js(search_js("Kitchen plug")); await asyncio.sleep(1.5)
        await save(b, WIKI / "search.png")
        await b.js("document.querySelector('#panel [data-act=close]').click()")
        await b.js("(() => { const i = document.getElementById('search'); i.value = ''; i.dispatchEvent(new Event('input')); })()")
        await b.js("document.getElementById('roombtn').click()"); await asyncio.sleep(3)
        await save(b, WIKI / "room-view.png")
        print("errors:", b.errors)
    async with Browser(width=390, height=844, scale=1) as b:
        await dark(b)
        await b.open(PAGE, wait=8)
        await save(b, WIKI / "phone.png")
    async with Browser(width=790, height=250, scale=2) as b:
        await b.open("tests/device-card.html?dark", wait=3)
        await save(b, WIKI / "device-card.png")


asyncio.run(main())
