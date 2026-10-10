# Changelog

All notable changes to Thread Pulse are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

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

[Unreleased]: https://github.com/riticulus/ha-thread-pulse/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/riticulus/ha-thread-pulse/compare/v0.1.0...v1.0.0
[0.1.0]: https://github.com/riticulus/ha-thread-pulse/releases/tag/v0.1.0
