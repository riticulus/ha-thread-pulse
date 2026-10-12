# Network panel (below the map)

**📊 Network** in the toolbar opens a panel below the map with everything about the network, in **tabs**. The blue number on the button is the number of warnings and hints. The panel is hidden by default to leave more room for the map; whether it is open and which tab you chose is remembered by the browser.

*After version 1.5.2.* Up to version 1.5.2 the button is called **☰ Show list** and the panel is one long list with all sections below each other.

![Network panel](images/list.png)

## Overview

- The **[mesh health](Mesh-Health)** grade as a large card. Only the factors that need checking (orange, red) are shown; the others are folded into one line, e.g. *4 factors ok* – tap it to see them.
- **Most important:** the first three warnings and hints, warnings first, with *All n hints →* to the hints tab.
- A footnote: number of Thread devices and where the data comes from.

## Hints

All [warnings and hints](Hints-and-Warnings) of all devices: **⚠ warnings first** (red), then **ℹ hints** (blue) – the same as in the [detail panels](Detail-Panel). The tab shows how many there are. Device names are links to their detail panel.

## Devices

One table with every device:

| Column | Content |
|---|---|
| Device | Name – a link to the [detail panel](Detail-Panel) |
| Role | Router, end device (mains), battery device, Matter over Wi-Fi / Ethernet; *NOT REACHABLE* when Home Assistant reports it as unavailable |
| Connection | The parent router a device talks through; for routers the number of links to other routers |
| Signal | Signal to the parent; for routers the best link to another router. Colours as on the map; **\*** = measured only by the device itself, unreliable |
| Firmware | Installed version; **→ 1.4.0** in orange when an update is available or being installed |

- **Sort:** tap a column header (tap again to reverse).
- **Filter:** *All*, *Routers*, *Mains*, *Battery*, *Wi-Fi* – with the number of devices.
- Below the table: the **firmware** overview – devices with an update (available, skipped or being installed) and models whose devices run **different firmware versions**, e.g. *MYGGBETT door/window sensor: 1.0.9 (4) · 1.1.4 (Front door)*.

## Links

- **Weak links between routers** (below −80 dBm), weakest first
- **Weak signal to the parent** (below −80 dBm)

**Routers the mesh depends on** *(after version 1.5.2)*: every router with the number of devices that would lose their parent or be cut off if it failed, and how many of them have **no known alternative** – most important first. Tap a router to show the affected devices. Details: [If this router fails](Detail-Panel#if-this-router-fails).

**Tap a link** to show both devices on the map: all other devices fade out, as with the [search](Search). A small note on the map (*2 marked · Show all*) ends it; so does **Esc** or a new search. *No weak links* when all links are −80 dBm or better.

## Changes

The [change log](Change-Log): latest changes with time, device and what changed. *Clear list* empties it. The tab shows how many entries are **new since you last looked** at it.

## Marking devices on the map

In the overview, **tap a factor** of the mesh health (e.g. *Stability*) to show the devices it names on the map. In the links tab, tap a link. The marking stays after the automatic refresh; *Show all* ends it.

## Error messages

If the map cannot be loaded, the panel opens automatically and shows the error – see [Troubleshooting & FAQ](Troubleshooting-and-FAQ).
