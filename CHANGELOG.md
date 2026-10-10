# Changelog

All notable changes to Thread Pulse are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Fixed
- Switching the room view off left the mesh off-center and too small: the devices now glide back to their positions from before the room view and the map is fitted afterwards; if the room view was already on when the page was loaded, the layout is calculated completely before fitting ([#22](https://github.com/riticulus/ha-thread-pulse/issues/22))

### Added
- Change log: the network is checked every 5 minutes (map positions are kept) and changes are listed with time stamps – devices new / gone, reachable / not reachable (live), new parent, signal to the parent changing quality, role changes, usable router links appearing / lost; the affected device flashes on the map; the list is kept in the browser ([#7](https://github.com/riticulus/ha-thread-pulse/issues/7))
- Response time per device: time from a command in Home Assistant until the device confirms it (Home Assistant time stamps, matched by context); shown in the detail panel (last / median / number of measurements) and in the live ticker; hint for devices that respond slowly (median ≥ 1 s over at least 3 commands) ([#2](https://github.com/riticulus/ha-thread-pulse/issues/2))
- Room view: button "⌂ Rooms" arranges the devices by Home Assistant area – every room gets its own spot with a coloured area and its name, the border router and devices without an area share one spot; links between rooms stay visible ([#8](https://github.com/riticulus/ha-thread-pulse/issues/8))
- Search box: find devices by name or area (case and accents ignored); matches are selected and zoomed to, the rest fades out; Enter opens the first match, Esc clears ([#9](https://github.com/riticulus/ha-thread-pulse/issues/9))

### Changed
- Releases no longer carry a zip attachment (HACS would download the attachment instead of the card); manual installation uses *Source code (zip)* of the release

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

[Unreleased]: https://github.com/riticulus/ha-thread-pulse/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/riticulus/ha-thread-pulse/compare/v1.0.0...v1.2.0
[1.0.0]: https://github.com/riticulus/ha-thread-pulse/compare/v0.1.0...v1.0.0
[0.1.0]: https://github.com/riticulus/ha-thread-pulse/releases/tag/v0.1.0
