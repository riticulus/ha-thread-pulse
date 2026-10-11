"""Visual checks in demo mode that need pixel analysis (requires Pillow): the mesh is centered and fitted
after switching the room view off (#22) and after a double-click on empty space (#23); a double-click on a
router zooms to it.

    python3 tests/visual_test.py

Screenshots are written to tests/output/. Exit code 1 if a check fails.
"""
import asyncio, io, os
from pathlib import Path
from PIL import Image
from browser import Browser, Results

OUT = Path(__file__).resolve().parent / "output"
PAGE = os.environ.get("TP_PAGE", "dist/thread-pulse.html") + "?demo&lang=en"   # TP_PAGE: test another build
W, H, TOP = 1300, 800, 100                 # viewport and height of the toolbar area to ignore


def bbox(png):
    """Center offset and filled share of the drawn mesh inside the map area (the live ticker is ignored)."""
    im = Image.open(io.BytesIO(png)).convert("RGB")
    px = im.load(); w, h = im.size
    bg = px[5, TOP + 5]
    xs, ys = [], []
    for y in range(TOP, h, 2):
        for x in range(0, w, 2):
            if y > h - 100 and x < 340:
                continue
            p = px[x, y]
            if abs(p[0] - bg[0]) + abs(p[1] - bg[1]) + abs(p[2] - bg[2]) > 60:
                xs.append(x); ys.append(y)
    mw, mh = w, h - TOP
    return {"dx": (min(xs) + max(xs)) / 2 - w / 2, "dy": (min(ys) + max(ys)) / 2 - (TOP + mh / 2),
            "fill_w": (max(xs) - min(xs)) / mw, "fill_h": (max(ys) - min(ys)) / mh}


def router_center(png):
    """Center of a router icon (blue disc) – small blue hint badges are skipped by size."""
    im = Image.open(io.BytesIO(png)).convert("RGB"); px = im.load(); w, h = im.size
    blue = lambda x, y: (lambda r, g, b: abs(r - 30) < 20 and abs(g - 136) < 20 and abs(b - 229) < 20)(*px[x, y])
    for y in range(TOP + 30, h - 140, 6):
        for x in range(380, w - 440, 6):
            if not blue(x, y):
                continue
            pts = [(xx, yy) for yy in range(y - 4, y + 45) for xx in range(x - 25, x + 26) if 0 <= xx < w and 0 <= yy < h and blue(xx, yy)]
            if len(pts) > 700:
                return sum(p[0] for p in pts) // len(pts), sum(p[1] for p in pts) // len(pts)
    return None


def centered(b, base, tol=40):
    return abs(b["dx"]) < tol and abs(b["dy"]) < tol and b["fill_h"] > base["fill_h"] - 0.12


async def main():
    r = Results()
    async with Browser(width=W, height=H) as br:
        await br.open(PAGE, wait=12)
        base = bbox(await br.screenshot(OUT / "base.png"))
        r.check("normal load: mesh centered", abs(base["dx"]) < 40 and abs(base["dy"]) < 40, str(base))

        await br.js("document.getElementById('roombtn').click()"); await asyncio.sleep(3)
        await br.js("document.getElementById('roombtn').click()"); await asyncio.sleep(3)
        after = bbox(await br.screenshot(OUT / "rooms-off.png"))
        r.check("room view off: mesh centered and fitted (#22)", centered(after, base), str(after))

        await br.wheel(500, 500, -300); await br.drag(700, 600, 350, 750); await asyncio.sleep(1)
        moved = bbox(await br.screenshot(OUT / "moved.png"))
        await br.click(W - 40, TOP + 40, count=2); await asyncio.sleep(1.2)
        fit = bbox(await br.screenshot(OUT / "dblclick-fit.png"))
        r.check("double-click on empty space: centered and fitted again (#23)", centered(fit, base), f"before {moved}, after {fit}")

        pos = router_center(await br.screenshot())
        r.check("a router icon is found", pos is not None)
        if pos:
            await br.click(*pos, count=2); await asyncio.sleep(1.5)
            await br.screenshot(OUT / "dblclick-router.png")
            title = await br.js("document.getElementById('panel').hidden ? null : document.querySelector('#panel .s').textContent")
            r.check("double-click on a router opens its panel", bool(title) and "Router" in title, str(title))
        r.errors("visual test", br.errors)
    r.done()

if __name__ == "__main__":
    asyncio.run(main())
