# Changelog

All notable changes to Thread Pulse are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- **💡 Identify** button in the detail panel of Thread and Wi-Fi devices that have an *identify* button in Home Assistant (Matter Identify cluster): the device blinks, beeps or flashes for a few seconds. Clearly marked as a real command, locked for 4 s after pressing, feedback in the panel; battery devices get a note that they react only when they wake up. The command is animated like any other ([#4](https://github.com/riticulus/ha-thread-pulse/issues/4))
- Automation blueprint *Thread Pulse: device offline notification* (`blueprints/automation/thread-device-offline.yaml`, import button in the README): notifies when a selected Matter device has been unavailable for a delay (default 5 min), optionally when it is back (with the duration) and in the Home Assistant notifications; any notify action, own texts with placeholders. Runs in Home Assistant in the background, unlike the change log ([#42](https://github.com/riticulus/ha-thread-pulse/issues/42))
- Save the map as an image: button **📷 Image** in the toolbar, *with names* or *anonymised* (devices *Device 1, 2 …* numbered by position on the map, rooms *Room A, B …*, no address suffixes). The PNG shows the map as it is on screen (zoom, links, badges, room areas, traffic, messages) on the page background, with a line for version, date and number of devices; file name `thread-pulse-<date>.png` / `…-anonymised.png`. On phones and tablets the share sheet opens where available ([#40](https://github.com/riticulus/ha-thread-pulse/issues/40))

### Changed
- The user guide now lives in the repository (`docs/wiki/`) and is published to the wiki after every release by the GitHub action *Release* (by hand: action *Wiki*), so documentation changes are reviewed in the same pull request as the code and the wiki always describes the latest release. `tools/wiki.py` checks every page link and image (also in CI) and publishes the pages; the wiki shows a note that it is generated ([#54](https://github.com/riticulus/ha-thread-pulse/issues/54))
- Release automation: `tools/release.py` prepares a release (`prepare X.Y.Z`: version, changelog section, links, build), switches back to the development version (`dev`), checks a release (`check`) and writes the release notes (`notes`); the GitHub action *Release* creates the GitHub release when a tag `vX.Y.Z` is pushed – only after checking version, changelog and generated files, and never with attachments. Started by hand it is a dry run ([#53](https://github.com/riticulus/ha-thread-pulse/issues/53))
- Browser tests in the repository (`tests/`): `smoke_test.py` clicks through every feature in demo mode and fails on any JavaScript error, `visual_test.py` checks centering and double-click with pixel analysis, `browser.py` is a small helper for headless Chrome (no Selenium / Playwright); how to run them in `tests/README.md` ([#48](https://github.com/riticulus/ha-thread-pulse/issues/48))
- The standalone page is now generated into `dist/thread-pulse.html`, next to the graph library; the duplicate copies at the top level of the repository are removed. **Manual installation of the standalone page:** take `thread-pulse.html` and `thread-pulse-vis-network.js` from the `dist` folder of *Source code (zip)*. Existing installations are not affected ([#47](https://github.com/riticulus/ha-thread-pulse/issues/47))
- Code tidy-ups without change in behaviour: the device panel uses the shared live rows, `deName()` renamed to `localName()`, icon data moved to `src/icons.js`, colours defined once in `COLORS` (the CSS gets them as variables) ([#51](https://github.com/riticulus/ha-thread-pulse/issues/51))
- Settings remembered by the browser are handled in one place (`src/prefs.js`: keys, types, defaults). Same storage keys and formats as before – existing settings keep working; safe when storage is blocked ([#50](https://github.com/riticulus/ha-thread-pulse/issues/50))

### Fixed
- Pressing a button entity (e.g. *Identify*) no longer shows up as a message from the device and is no longer counted as a response time of about 0 ms – a button's state is the time of the press, set by Home Assistant itself

## [1.4.0] – 2026-10-11

### Added
- Matter devices on Wi-Fi or Ethernet: shown as their own group in a column to the right of the mesh (heading, legend entry, grey-blue), without links and without path animation (their messages are counted); detail panel with live counter, current values, Wi-Fi signal, channel and standard, restarts and device data; found by the search; stay in their column in the room view; hide them with the card option `show_wifi: false` or `?nowifi` ([#43](https://github.com/riticulus/ha-thread-pulse/issues/43))
- Battery forecast in the detail panel, e.g. *empty in about 10 months · based on 46 days, −3.7 % per month*: linear trend of the daily battery level from Home Assistant's long-term statistics (up to 120 days, only since the last battery change); needs at least 14 days and a measurable drop; hint and **i** badge when the battery will probably be empty within 30 days. It is an estimate – many batteries stay almost full for a long time and then drop quickly ([#39](https://github.com/riticulus/ha-thread-pulse/issues/39))
- French, Italian, Spanish and Dutch: all texts, plus translations of common English entity names (e.g. *Active current*, *Voltage*) in the ticker and the detail panel; chosen from the Home Assistant profile, card option `language` (`fr`, `it`, `es`, `nl`) or `?lang=`. The translations have not been checked by native speakers yet – corrections are welcome ([#44](https://github.com/riticulus/ha-thread-pulse/issues/44))
- Detail panel for the border router: Thread network (name, channel, PAN ID, extended PAN ID, routers in the mesh, devices, leader), border router (type, address, border agent ID, known Thread networks), neighbours and children, messages through it; other Thread routers get a panel with their neighbours. The network key is never shown ([#36](https://github.com/riticulus/ha-thread-pulse/issues/36))
- Optional sound: a short, quiet tick for every animated message – high for messages to Home Assistant, low for commands; button "🔇 Sound" in the toolbar and a volume slider, both remembered by the browser; off by default; rate-limited (at least 150 ms apart, at most 5 per second); silent while live is paused ([#12](https://github.com/riticulus/ha-thread-pulse/issues/12))
- Ambient mode for wall tablets: card option `ambient: true` or `?ambient` – only the pulsing mesh on a fixed dark background, no toolbar, legend, list or ticker; slow automatic zoom to a router and back every 25 s (`ambient_motion: false` / `&still` to switch off, paused for 60 s after touching the screen); the detail panel closes by itself after 15 s; asks the browser to keep the screen on where possible ([#11](https://github.com/riticulus/ha-thread-pulse/issues/11))
- Double-click / double-tap: on empty space the whole mesh is centered and fitted to the map area, on a device the map zooms to it (centered in the part not covered by the detail panel); the browser's page zoom no longer triggers inside the map ([#23](https://github.com/riticulus/ha-thread-pulse/issues/23))

### Changed
- Issue forms for bug reports, feature requests and translation corrections, a pull-request template, a *Contributing* section in the README and a clear label scheme (`bug`, `New Feature`, `enhancement`, `documentation`, `translation`) ([#52](https://github.com/riticulus/ha-thread-pulse/issues/52))
- Translations split into one file per language in `src/i18n/`; `build.py` collects all language files automatically; new check `tests/check-i18n.js` (also run in CI) makes sure every language has the same keys as English. No change in behaviour – all texts and translations are identical in content ([#49](https://github.com/riticulus/ha-thread-pulse/issues/49))
- Source split into one file per topic in `src/` (`version.js`, `styles.css`, `markup.html`, `core.js`, one file per feature, `ui.js`, `start.js`); `build.py` assembles them in a fixed order. No change in behaviour – the generated files contain exactly the same lines as before ([#33](https://github.com/riticulus/ha-thread-pulse/issues/33))

## [1.3.0] – 2026-10-10

### Added
- Change log: the network is checked every 5 minutes (map positions are kept) and changes are listed with time stamps – devices new / gone, reachable / not reachable (live), new parent, signal to the parent changing quality, role changes, usable router links appearing / lost; the affected device flashes on the map; the list is kept in the browser ([#7](https://github.com/riticulus/ha-thread-pulse/issues/7))
- Response time per device: time from a command in Home Assistant until the device confirms it (Home Assistant time stamps, matched by context); shown in the detail panel (last / median / number of measurements) and in the live ticker; hint for devices that respond slowly (median ≥ 1 s over at least 3 commands) ([#2](https://github.com/riticulus/ha-thread-pulse/issues/2))
- Room view: button "⌂ Rooms" arranges the devices by Home Assistant area – every room gets its own spot with a coloured area and its name, the border router and devices without an area share one spot; links between rooms stay visible ([#8](https://github.com/riticulus/ha-thread-pulse/issues/8))
- Search box: find devices by name or area (case and accents ignored); matches are selected and zoomed to, the rest fades out; Enter opens the first match, Esc clears ([#9](https://github.com/riticulus/ha-thread-pulse/issues/9))

### Changed
- Releases no longer carry a zip attachment (HACS would download the attachment instead of the card); manual installation uses *Source code (zip)* of the release

### Fixed
- Switching the room view off left the mesh off-center and too small: the devices now glide back to their positions from before the room view and the map is fitted afterwards; if the room view was already on when the page was loaded, the layout is calculated completely before fitting ([#22](https://github.com/riticulus/ha-thread-pulse/issues/22))

## [1.2.0] – 2026-10-10

### Added
- Dashboard card `custom:thread-pulse-card`, installable with HACS (custom repository, type Dashboard) or manually; options `height`, `language`, `demo` in the visual card editor; the graph library is only loaded when a card is shown ([#13](https://github.com/riticulus/ha-thread-pulse/issues/13))
- GitHub action: HACS validation and a check that the generated files match `src/`
- Weak-spot hints: rules of thumb that point out weak parent signals (below −80 dBm), unstable connections with likely causes, routers that probably lose power regularly (≥ 50 restarts, e.g. a bulb on a wall switch) and routers at the edge of the mesh; shown in the detail panel, at the top of the list (count on the list button) and as a small "i" badge on the map ([#10](https://github.com/riticulus/ha-thread-pulse/issues/10))
- Traffic heat: links glow wider and brighter the more messages travelled over them in the last 10 minutes (estimate based on the computed paths); toggle button "≋ Traffic", legend entry, link tooltip with the message count ([#3](https://github.com/riticulus/ha-thread-pulse/issues/3))
- Detail panel of routers shows how many messages they forwarded for other devices (last 10 min / last hour) ([#3](https://github.com/riticulus/ha-thread-pulse/issues/3))

### Changed
- Code moved to `src/` (shared core for page and card); `build.py` generates `thread-pulse.html` and `dist/` ([#13](https://github.com/riticulus/ha-thread-pulse/issues/13))
- Detail panel switches to the bottom-sheet layout based on the width of the map instead of the window
- German translation for "Effective voltage"
- German labels "Letzte Minute" / "Letzte Stunde" capitalised

## [1.0.0] – 2026-10-10

### Added
- Detail panel: tap or click a device to see manufacturer, model, firmware, hardware, area, Thread role, parent and neighbours with signal strength, battery level and type, current values with "last changed", stability counters (restarts, last restart reason, drop-offs, attach attempts, parent changes) and a button to open the device in Home Assistant ([#1](https://github.com/riticulus/ha-thread-pulse/issues/1))
- Badges on the map: battery level on battery devices, warning sign on devices that look unstable (≥ 5 attach attempts or ≥ 3 drop-offs since restart) or have a battery below 20 % ([#1](https://github.com/riticulus/ha-thread-pulse/issues/1))
- Live message counters per device since the page was opened ([#1](https://github.com/riticulus/ha-thread-pulse/issues/1))
- Demo mode shows invented device details, battery levels and current values
- Version number at the end of the status line

### Changed
- Installation instructions point to the release downloads

## [0.1.0] – 2026-10-10

### Added
- Interactive map of the Matter-over-Thread mesh: routers, mains and battery end devices, border router, links coloured by signal strength
- Live animation of messages to and from Home Assistant along the most likely route, with a ticker
- Optional table of battery devices and their parents and of weak router links
- Icons chosen from the device's entities, English and German texts, Home Assistant theme support
- Demo mode (`?demo`) that works without Home Assistant
- Readable (unminified) vis-network build

[Unreleased]: https://github.com/riticulus/ha-thread-pulse/compare/v1.4.0...HEAD
[1.4.0]: https://github.com/riticulus/ha-thread-pulse/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/riticulus/ha-thread-pulse/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/riticulus/ha-thread-pulse/compare/v1.0.0...v1.2.0
[1.0.0]: https://github.com/riticulus/ha-thread-pulse/compare/v0.1.0...v1.0.0
[0.1.0]: https://github.com/riticulus/ha-thread-pulse/releases/tag/v0.1.0
