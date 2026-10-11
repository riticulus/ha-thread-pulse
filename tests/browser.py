"""Small helper for browser tests of Thread Pulse: serves the repository over HTTP, starts headless Chrome and
drives it through the Chrome DevTools protocol (no Selenium / Playwright needed).

    async with Browser(width=1300, height=800, fake_audio=True) as b:
        await b.open("dist/thread-pulse.html?demo&lang=en")
        print(await b.js("document.getElementById('status').textContent"))

Collected JavaScript errors are in b.errors (uncaught exceptions and console.error).
Chrome is found automatically (macOS, Linux) or via the environment variable CHROME.
"""
import asyncio, base64, contextlib, functools, http.server, json, os, shutil, socket, subprocess, tempfile, threading, time, urllib.request
from pathlib import Path

import websockets

ROOT = Path(__file__).resolve().parent.parent

# Replaces the Web Audio API with a fake that records every tick (time, frequency) in window.__ticks.
FAKE_AUDIO = """window.__ticks = [];
class FakeParam { setValueAtTime(v) { this.v = v; } exponentialRampToValueAtTime() {} }
window.AudioContext = class { constructor() { this.state = 'running'; this.currentTime = 0; this.destination = {}; }
  resume() { return Promise.resolve(); }
  createOscillator() { const o = { frequency: new FakeParam(), connect: g => g, start: () => window.__ticks.push({ t: performance.now(), f: o.frequency.v }), stop() {} }; return o; }
  createGain() { return { gain: new FakeParam(), connect: d => d }; } };"""


def find_chrome():
    if os.environ.get("CHROME"):
        return os.environ["CHROME"]
    for c in ("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Chromium.app/Contents/MacOS/Chromium"):
        if os.path.exists(c):
            return c
    for name in ("google-chrome", "google-chrome-stable", "chromium", "chromium-browser"):
        if shutil.which(name):
            return shutil.which(name)
    raise SystemExit("Chrome/Chromium not found – set the environment variable CHROME")


def free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


class _QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


class _Server:
    """Static file server for the repository root, in a background thread."""
    def __init__(self):
        handler = functools.partial(_QuietHandler, directory=str(ROOT))
        self.httpd = http.server.ThreadingHTTPServer(("127.0.0.1", free_port()), handler)
        self.port = self.httpd.server_address[1]
        threading.Thread(target=self.httpd.serve_forever, daemon=True).start()

    def close(self):
        self.httpd.shutdown()


class Browser:
    def __init__(self, width=1300, height=800, fake_audio=False, init_script=None, scale=1):
        self.width, self.height, self.scale = width, height, scale
        self.scripts = ([FAKE_AUDIO] if fake_audio else []) + ([init_script] if init_script else [])
        self.errors = []

    async def __aenter__(self):
        self.server = _Server()
        self.profile = tempfile.mkdtemp(prefix="tp-test-")
        port = free_port()
        self.proc = subprocess.Popen([find_chrome(), "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
                                      f"--remote-debugging-port={port}", f"--user-data-dir={self.profile}", "about:blank"],
                                     stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        tabs = None
        for _ in range(100):
            try:
                tabs = json.loads(urllib.request.urlopen(f"http://127.0.0.1:{port}/json", timeout=1).read())
                break
            except Exception:
                time.sleep(0.2)
        if not tabs:
            raise SystemExit("Chrome did not start")
        self.ws = await websockets.connect(next(t["webSocketDebuggerUrl"] for t in tabs if t["type"] == "page"), max_size=None)
        self._n, self._pending = 0, {}
        self._reader = asyncio.create_task(self._read())
        for attempt in range(3):                   # a freshly started Chrome sometimes misses the very first command
            try:
                await self.cmd("Runtime.enable", timeout=10)
                break
            except asyncio.TimeoutError:
                if attempt == 2:
                    raise
        await self.cmd("Page.enable")
        for s in self.scripts:
            await self.cmd("Page.addScriptToEvaluateOnNewDocument", source=s)
        await self.cmd("Emulation.setDeviceMetricsOverride", width=self.width, height=self.height, deviceScaleFactor=self.scale, mobile=False)
        return self

    async def __aexit__(self, *exc):
        self._reader.cancel()
        with contextlib.suppress(Exception):
            await self.ws.close()
        self.proc.terminate()
        with contextlib.suppress(Exception):
            self.proc.wait(timeout=10)
        shutil.rmtree(self.profile, ignore_errors=True)
        self.server.close()

    async def _read(self):
        while True:
            m = json.loads(await self.ws.recv())
            if m.get("method") == "Runtime.exceptionThrown":
                d = m["params"]["exceptionDetails"]
                self.errors.append((d.get("exception") or {}).get("description") or d.get("text", "?"))
            elif m.get("method") == "Runtime.consoleAPICalled" and m["params"]["type"] == "error":
                self.errors.append("console.error: " + " ".join(str(a.get("value", a.get("description", ""))) for a in m["params"]["args"]))
            elif "id" in m and m["id"] in self._pending:
                self._pending.pop(m["id"]).set_result(m.get("result") or {})

    async def cmd(self, method, timeout=30, **params):
        self._n += 1
        fut = asyncio.get_event_loop().create_future()
        self._pending[self._n] = fut
        await self.ws.send(json.dumps({"id": self._n, "method": method, "params": params}))
        return await asyncio.wait_for(fut, timeout)

    async def open(self, path, wait=9):
        """Open a path relative to the repository root, e.g. 'dist/thread-pulse.html?demo'."""
        await self.cmd("Page.navigate", url=f"http://127.0.0.1:{self.server.port}/{path}")
        await asyncio.sleep(wait)

    async def js(self, expression):
        r = await self.cmd("Runtime.evaluate", expression=expression, awaitPromise=True, returnByValue=True)
        if "exceptionDetails" in r:
            raise AssertionError("JavaScript in test failed: " + str(r["exceptionDetails"].get("exception", {}).get("description", r["exceptionDetails"])))
        return (r.get("result") or {}).get("value")

    async def screenshot(self, path=None):
        img = base64.b64decode((await self.cmd("Page.captureScreenshot", format="png"))["data"])
        if path:
            Path(path).parent.mkdir(parents=True, exist_ok=True)
            Path(path).write_bytes(img)
        return img

    async def click(self, x, y, count=1):
        for c in range(1, count + 1):
            await self.cmd("Input.dispatchMouseEvent", type="mousePressed", x=x, y=y, button="left", clickCount=c)
            await self.cmd("Input.dispatchMouseEvent", type="mouseReleased", x=x, y=y, button="left", clickCount=c)

    async def wheel(self, x, y, dy, steps=6):
        for _ in range(steps):
            await self.cmd("Input.dispatchMouseEvent", type="mouseWheel", x=x, y=y, deltaX=0, deltaY=dy)
            await asyncio.sleep(0.05)

    async def drag(self, x0, y0, x1, y1, steps=10):
        await self.cmd("Input.dispatchMouseEvent", type="mousePressed", x=x0, y=y0, button="left", clickCount=1)
        for s in range(1, steps + 1):
            await self.cmd("Input.dispatchMouseEvent", type="mouseMoved", x=x0 + (x1 - x0) * s / steps, y=y0 + (y1 - y0) * s / steps, button="left")
            await asyncio.sleep(0.02)
        await self.cmd("Input.dispatchMouseEvent", type="mouseReleased", x=x1, y=y1, button="left", clickCount=1)


# ---------- small helpers shared by the tests ----------
def search_js(text, enter=True):
    """JavaScript that types into the search field and (optionally) presses Enter."""
    t = json.dumps(text)
    return ("(() => { const i = document.getElementById('search'); i.value = %s; i.dispatchEvent(new Event('input'));" % t
            + (" setTimeout(() => i.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter'})), 300);" if enter else "")
            + " return true; })()")


class Results:
    """Collects check results and prints a summary; exit code 1 on any failure."""
    def __init__(self):
        self.failed = 0

    def check(self, name, ok, detail=""):
        print(("  ok    " if ok else "  FAIL  ") + name + (f"  ({detail})" if detail and not ok else ""))
        self.failed += 0 if ok else 1

    def errors(self, name, errors):
        self.check(f"{name}: no JavaScript errors", not errors, "; ".join(e[:120] for e in errors))

    def done(self):
        print(("\nall checks passed" if not self.failed else f"\n{self.failed} check(s) failed"))
        raise SystemExit(1 if self.failed else 0)
