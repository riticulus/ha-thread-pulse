# Contributing to Thread Pulse

Thank you for helping! Bug reports, ideas, translations and pull requests are all welcome. You do **not** need a
Thread network to work on Thread Pulse: the demo mode has invented devices with live traffic.

## Quick start

You need Python 3 and a browser. Node is only needed for formatting, lint and the translation check.

```bash
git clone https://github.com/riticulus/ha-thread-pulse.git
cd ha-thread-pulse
python3 build.py                     # src/ → dist/
python3 -m http.server 8000          # then open http://localhost:8000/dist/thread-pulse.html?demo
```

Useful URL parameters for the demo page:

| Parameter | Effect |
|---|---|
| `?demo` | Invented network with live traffic |
| `?demo=apple` | Only Apple border routers, no OpenThread add-on, no ZHA |
| `&lang=de` | Language (`en`, `de`, `fr`, `it`, `es`, `nl`) |
| `&nowifi` | Hide Matter devices on Wi-Fi |
| `&ambient` | Ambient mode (wall tablets) |
| `&hintdays=3` | Time window of the restart and connection hints |

After every change in `src/`, run `python3 build.py` again and reload the page.

## How the code is organised

```
src/*.js, src/i18n/*.js, styles.css, markup.html  ──build.py──▶  dist/ha-thread-pulse.js  (dashboard card, HACS)
                                                               dist/thread-pulse.html    (standalone page)
```

- **One file per topic** in `src/`, e.g. `whatif.js` (*If this router fails*), `spectrum.js` (radio channels),
  `tabs.js` (network panel), `layout.js` (inspector column and device tabs). The full list is on the
  [Development](https://github.com/riticulus/ha-thread-pulse/wiki/Development) page.
- `core.js` opens one function, `createThreadPulse()`, and declares the **shared state** (`nodeById`, `linksOf`,
  `network`, `T` for the texts …). The topic files are placed inside this function in the order of `PARTS` in
  `build.py`, so they can use that state directly. That is why they are not valid JavaScript on their own.
- **Data flow:** `data.js` loads everything from Home Assistant (or `demo.js` invents it), `graph.js` draws the map,
  `live.js` animates the messages, `panel.js` / `layout.js` show the selected device, `tabs.js` the network panel.
- `card.js` (dashboard card) and `standalone.html` (page) are thin shells around `createThreadPulse()`.

## Adding a feature – the usual recipe

1. **Code:** a new file `src/<topic>.js` (start it with two `//#` lines that say what it is) and add it to `PARTS` in
   `build.py` – or extend an existing file if the topic fits.
2. **Texts:** add them to `src/i18n/en.js`. Other languages are optional; missing ones fall back to English and the
   maintainers complete them before a release.
3. **Test:** add checks to `tests/smoke_test.py` – it drives the demo mode in headless Chrome. If the demo cannot
   show your feature yet, extend `src/demo.js`.
4. **Docs:** user guide pages are in [`docs/wiki/`](docs/wiki) (never edit the wiki directly – it is generated), and
   an entry in `CHANGELOG.md` under *Unreleased*.

## Before you open a pull request

```bash
python3 build.py                                   # commit the generated files in dist/ too
npm install && npm run format && npm run lint      # Prettier and ESLint (once: npm install)
node tests/check-i18n.js                           # translations
pip install -r tests/requirements.txt              # once: websockets, Pillow
python3 tests/smoke_test.py                        # ~2 min, needs Chrome or Chromium
```

Can't run Chrome locally? Open the pull request anyway – GitHub runs all checks, including the browser tests, on
every pull request.

Changes to loading real data (`src/data.js`, the live subscription, border router, Wi-Fi or ZHA data) also need a
test in a real Home Assistant: copy `dist/thread-pulse.html` to `/config/www/` under another name and open it in a
webpage card, or replace the card file of a manual installation.

## Ground rules

- **One topic per pull request.** Pull requests are squash-merged.
- **Privacy:** never show, store or log the Thread network key, dataset TLVs or the Zigbee network key. Anonymised
  exports (image, text report) must not contain device names, rooms or addresses.
- **Read only:** Thread Pulse uses data Home Assistant already has cached and must not wake battery devices or change
  the network. Buttons that act on a device (like *Identify*) are the exception and must say what they do.
- **No new runtime dependencies** without discussing it in an issue first – the card is one file plus the graph
  library.
- **Texts are user-facing:** short, plain words, no jargon without an explanation.

## Where to start

- Issues labelled [`good first issue`](https://github.com/riticulus/ha-thread-pulse/labels/good%20first%20issue) are
  small and well described.
- [Translation corrections](https://github.com/riticulus/ha-thread-pulse/issues/new?template=translation.yml) are
  very welcome – French, Italian, Spanish and Dutch have not been checked by native speakers yet.
- Questions? Open an issue – there are no stupid questions.

By contributing you agree that your contribution is licensed under the [MIT License](LICENSE).
