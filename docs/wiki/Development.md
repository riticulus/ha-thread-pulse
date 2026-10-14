# Development

## Code layout

All source code is in `src/`, one file per topic. `build.py` assembles the files in a fixed order – there is no bundler and no dependency besides Python.

| File | Content |
|---|---|
| `src/version.js` | Version number (`VERSION`) |
| `src/i18n/<lang>.js` | Texts, one file per language (`TEXT_XX`, and `NAMES_XX` for translations of common English entity names); `build.py` collects all files and builds `TEXT` and `LOCAL_NAMES` |
| `src/icons.js` | Device icons: path data of Material Design Icons (top level) |
| `src/styles.css` | Styles – becomes the constant `TP_CSS`; semantic colours come from `COLORS` as CSS variables (`--c-good`, `--c-medium`, `--c-weak`, `--c-warn`, `--c-hint`) |
| `src/markup.html` | HTML skeleton – becomes the constant `TP_HTML` |
| `src/core.js` | Start of `createThreadPulse(root, opts, host)` and the state shared by all parts |
| `src/prefs.js` | Settings remembered by the browser: one table of keys, types and defaults; `prefs.get / set / remove` (first of the parts) |
| `src/helpers.js` | `COLORS` (all colours in one place), signal quality, icon images, theme, connection to Home Assistant, language |
| `src/data.js` | Loading the data from Home Assistant (registries, cached Matter diagnostics, border router) |
| `src/graph.js` | Building and drawing the map |
| `src/tabs.js` | Network panel (tabs) |
| `src/layout.js` | Inspector column: tabbed device panel with key numbers, sheet below the map on narrow cards |
| `src/routers.js` | Names of other border routers from Home Assistant's border router discovery |
| `src/live.js` | Routing tables, path calculation, animated messages, ticker, subscription to Home Assistant events |
| `src/heat.js` | Traffic heat |
| `src/chatty.js` | Chattiest devices (messages per hour) |
| `src/rooms.js` | Room view |
| `src/panel.js` | Badges and detail panel |
| `src/identify.js` | Identify button in the detail panel |
| `src/hints.js` | Weak-spot hints |
| `src/stability.js` | Stability counters over a time window, hints marked as done |
| `src/health.js` | Mesh health grade and its factors |
| `src/whatif.js` | What if a router fails |
| `src/spectrum.js` | Radio channels: Thread, Zigbee and Wi-Fi on one frequency axis, overlaps |
| `src/search.js` | Search |
| `src/changes.js` | Change log |
| `src/response.js` | Response time |
| `src/battery.js` | Battery forecast |
| `src/trends.js` | Trends (signal and battery, 7 days) |
| `src/firmware.js` | Firmware overview and update badge |
| `src/fabrics.js` | Connected systems (Matter fabrics) |
| `src/wifi.js` | Matter devices on Wi-Fi / Ethernet |
| `src/sound.js` | Optional sound |
| `src/export.js` | Saving the map as an image |
| `src/report.js` | Text report for forums |
| `src/demo.js` | Demo mode |
| `src/ui.js` | List and legend, errors, loading, keyboard and click handling |
| `src/ambient.js` | Ambient mode |
| `src/start.js` | Start-up and the public API (`destroy`, `theme`) |
| `src/standalone.html` | Shell of the standalone page (iframe): reads URL parameters |
| `src/card.js` | Shell of the dashboard card `custom:thread-pulse-card`: options, visual editor, loading the graph library |

### How the parts fit together

- `version.js`, the language files in `i18n/` and `icons.js` are top-level code.
- `core.js` opens the function `createThreadPulse()`. The files from `prefs.js` to `ambient.js` and finally `start.js` are placed **inside** this function, in the order listed in `build.py`; `build.py` adds the closing brace. That is why the feature files are not valid JavaScript on their own – they use the shared state (`network`, `nodeById`, `T` …) declared in `core.js` and the other parts.
- Function declarations can be anywhere in these files. Code that runs immediately during start-up (not inside a function) must only use variables declared in an earlier file.
- Lines starting with `//#` at the top of a file are notes for developers and are not copied into the output.
- The shells (`standalone.html`, `card.js`) call `createThreadPulse()` with a *host* object that tells the core how to reach Home Assistant, where the theme colours come from and how to open a page in Home Assistant.

### Generated files

| File | Content |
|---|---|
| `dist/thread-pulse.html` | Standalone page |
| `dist/ha-thread-pulse.js` | Dashboard card (HACS file) |
| `dist/thread-pulse-vis-network.js` | Graph library (vis-network 9.1.9, unmodified, readable build) – **not generated**, the only copy in the repository; the card and the page load it from the same folder |

Never edit the generated files by hand.

## Building

```bash
python3 build.py
```

Edit only the files in `src/`; never edit the generated files by hand.

## Trying changes

- Open `dist/thread-pulse.html?demo` in a browser (served from a local web server, e.g. `python3 -m http.server`) – no Home Assistant needed.
- In Home Assistant: copy `thread-pulse.html` to `/config/www/` under another name and open it in an iframe card, or replace the card file of a manual installation.

## Tests

Browser tests run against the demo mode in headless Chrome – no Home Assistant needed. Details in [`tests/README.md`](https://github.com/riticulus/ha-thread-pulse/blob/main/tests/README.md).

```bash
python3 build.py
pip install -r tests/requirements.txt      # websockets, Pillow
node tests/check-i18n.js                   # translations complete
python3 tests/smoke_test.py                # every feature, fails on JavaScript errors (~2 min, --quick ~1 min)
python3 tests/visual_test.py               # centering after room view and double-click (pixel checks)
```

Changes to loading real data (`src/data.js`, the live subscription, border router or Wi-Fi data) still need a manual test in a real Home Assistant.

## Checks

A GitHub action runs on every pull request:

- **HACS validation** of the repository
- **Build check:** `build.py` is run and the generated files must match `src/`
- **Translations complete:** `node tests/check-i18n.js` – every language has the same keys as English
- **Syntax check** of the card and the page
- **User guide:** `python3 tools/wiki.py check` – every page link and image in `docs/wiki/` exists

## Workflow

- One branch and one pull request per issue (`feature/<number>-<name>`, `fix/<number>-<name>`); pull requests are squash-merged.
- New entries go to `CHANGELOG.md` under *Unreleased*.
- Documentation changes are part of the same pull request (see [User guide](#user-guide)).
- Between releases the version is `<last release>+dev`.
- `main` and the hotfix branches `release/<major>.<minor>.x` are **protected** (repository rule set): changes only through a pull request, the checks *Build output is up to date* and *HACS validation* must pass, no force push, no deletion. Administrators can merge a pull request without the checks in an emergency; direct pushes are refused for everyone.

## User guide

This wiki is generated from the folder [`docs/wiki`](https://github.com/riticulus/ha-thread-pulse/tree/main/docs/wiki) of the repository – one Markdown file per page, `_Sidebar.md`, `_Footer.md` and the screenshots in `docs/wiki/images/`. **Edit the files there, never in the wiki**: the next publish overwrites the wiki.

- A pull request that changes behaviour also updates the pages in `docs/wiki/`. Between releases they describe the development version; the wiki keeps showing the latest release.
- Links between pages are written as in the wiki: `[Room view](Room-View)`, `[Sound](Live-Data-Flow#sound)`, images as `images/<name>.png`. On GitHub's file view these links do not work – that is expected.
- `{{VERSION}}` is replaced when publishing: *version X.Y.Z* for a release, *the development version after X.Y.Z* otherwise.
- `python3 tools/wiki.py check` checks that every linked page and image exists and that every image is used.
- **Publishing:** after every release the action *Release* publishes `docs/wiki/` of the release tag to the wiki (`python3 tools/wiki.py publish`). By hand: *Actions → Wiki → Run workflow* (empty = the latest release, or a tag or branch).

## Releasing

`tools/release.py` does the mechanical steps; the GitHub action *Release* creates the release.

1. **Prepare:** on a branch `release/X.Y.Z` run `python3 tools/release.py prepare X.Y.Z` – sets `VERSION` in `src/version.js`, turns *Unreleased* into `[X.Y.Z] – <today>`, updates the compare links and builds. Open a pull request and merge it.
2. **Tag:** `git tag -a vX.Y.Z <merge commit> -m "Thread Pulse X.Y.Z"` and `git push origin vX.Y.Z`. The action *Release* checks version, changelog and generated files (`tools/release.py check`) and the translations, then creates the GitHub release with the changelog section as notes (`tools/release.py notes`) – **never with attachments**, because HACS would download an attachment instead of `dist/`.
   After the release the action publishes the user guide from the tag to the wiki.
3. **Back to development:** on a branch `chore/post-X.Y.Z` run `python3 tools/release.py dev` (`X.Y.Z+dev`), pull request, merge.

Started by hand (*Actions → Release → Run workflow*), the action is a **dry run** by default: it checks and shows the release notes without creating anything.

### Hotfix releases

When `main` already contains unreleased features and a bug needs a quick release (e.g. 1.5.2):

1. Branch `release/X.Y.x` from the last release tag (once per minor version; it stays for later hotfixes): `git checkout -b release/1.5.x v1.5.1^{commit}` and push it.
2. Fix on a branch from `release/X.Y.x`, pull request **into `release/X.Y.x`**, merge.
3. Branch `release/X.Y.Z` from `release/X.Y.x`, `python3 tools/release.py prepare X.Y.Z`, pull request into `release/X.Y.x`, merge, tag the merge commit `vX.Y.Z` – the action *Release* creates the release and publishes the wiki from that tag.
4. Bring the fix into `main` with a pull request: cherry-pick the fix, add the `[X.Y.Z]` changelog section and its compare link, set the version to `X.Y.Z+dev`, rebuild.

Do not open a pull request from `release/X.Y.x` into `main` – the changes are already there (step 4).

## Adding a language

1. Copy `src/i18n/en.js` to `src/i18n/<code>.js` (two-letter code, e.g. `pt.js`) and rename `TEXT_EN` to `TEXT_PT`.
2. Translate all values; optionally add `NAMES_PT` with translations of common English entity names (see `de.js`).
3. Run `node tests/check-i18n.js` and `python3 build.py`.
4. Add the language to the list in `src/card.js` (visual editor).

## Contributing

Issues and pull requests are welcome. GitHub offers forms that ask for the details needed:

| Form | Label | For |
|---|---|---|
| [Bug report](https://github.com/riticulus/ha-thread-pulse/issues/new?template=bug_report.yml) | `bug` | Something does not work – asks for Thread Pulse and Home Assistant version, installation, border router, number of devices, browser, console errors |
| [Feature request](https://github.com/riticulus/ha-thread-pulse/issues/new?template=feature_request.yml) | `New Feature` | New functionality |
| [Translation correction](https://github.com/riticulus/ha-thread-pulse/issues/new?template=translation.yml) | `translation` | Wrong or unnatural texts in a language |

Further labels: `enhancement` (restructuring, maintenance, improvements of existing parts) and `documentation`.

Pull requests get a template with a short checklist: build, translation check, demo mode, real Home Assistant, changelog entry, documentation.
