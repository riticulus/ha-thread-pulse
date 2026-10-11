# Tests

All tests run against the **demo mode** – no Home Assistant is needed. Changes that touch loading real data
(`src/data.js`, the live subscription, the border router or Wi-Fi data) must still be tested by hand in a real
Home Assistant.

| Test | What it checks | Needs |
|---|---|---|
| `check-i18n.js` | Every language has the same keys as English, text functions work | Node |
| `smoke_test.py` | Clicks through every feature in demo mode and fails on any JavaScript error: list, hints, search, detail panels (device, Wi-Fi), battery forecast, identify button, toolbar buttons, image export (with names and anonymised), sound (with a fake audio engine: tones and rate limit), pause, change log, ambient mode, `?nowifi`, Apple-only network (`?demo=apple`), French texts, error message without Home Assistant | Python, Chrome |
| `visual_test.py` | Pixel checks: mesh centered after normal load, after switching the room view off and after a double-click on empty space; double-click on a router | Python, Chrome, Pillow |

## Run

```bash
python3 build.py                       # the tests use the generated files in dist/
pip install -r tests/requirements.txt  # websockets, Pillow
node tests/check-i18n.js
python3 tests/smoke_test.py            # about 2 minutes; --quick skips the change-log check (45 s)
python3 tests/visual_test.py           # screenshots in tests/output/
```

Chrome or Chromium is found automatically on macOS and Linux; otherwise set `CHROME=/path/to/chrome`.
Every test prints one line per check and exits with code 1 if a check fails.

## Writing tests

`browser.py` serves the repository over HTTP on a free port, starts headless Chrome and talks to it through the
DevTools protocol:

```python
from browser import Browser, Results, search_js

async with Browser(width=1300, height=800, fake_audio=True) as b:
    await b.open("dist/thread-pulse.html?demo&lang=en")
    title = await b.js("document.querySelector('#panel .t')?.textContent")
    await b.click(x, y, count=2)        # mouse events, also b.wheel() and b.drag()
    await b.screenshot("tests/output/x.png")
    print(b.errors)                     # uncaught exceptions and console.error
```

The demo is random (layout and messages), so tests check behaviour and ranges, not exact positions or values.
The internal state of Thread Pulse is not reachable from the page (it lives inside `createThreadPulse()`), so
tests work through the DOM like a user would.
