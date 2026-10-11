# Demo mode

The demo mode shows **invented devices** and **simulated traffic**. It is useful to try Thread Pulse before installing it, to take screenshots without showing your own network, or to explain the map to someone.

## How to start it

| Where | How |
|---|---|
| Dashboard card | Card option `demo: true` (or *Demo mode* in the visual editor) |
| Standalone page in Home Assistant | `/local/thread-pulse.html?demo` |
| Without Home Assistant | Open `dist/thread-pulse.html?demo` from the release download (*Source code (zip)*) in a browser – the file `thread-pulse-vis-network.js` is next to it in the same folder (up to version 1.4.0 both were in the top folder) |

Add `&lang=de` (page) or `language: de` (card) for German.

## What the demo contains

- 14 devices: 6 routers (lights, plugs, blinds, thermostat), 2 mains end devices and 6 battery devices, plus a border router
- Signal strengths, battery levels, firmware versions, areas and current values – all invented
- A battery device with an unstable connection and a low battery (warnings), a bulb with many restarts and a device with a weak parent signal (hints)
- Messages every 0.6–2.4 seconds and commands from "Home Assistant" with simulated confirmations; the demo blinds respond slowly on purpose
- An invented change in the network every 40 seconds (new parent, device dropping out or coming back)

### Apple-only network

`?demo=apple` (standalone page only) shows a network without OpenThread add-on and without Matter routers: four battery devices whose parents are three Apple border routers, shown with their (invented) names, e.g. *HomePod Living Room · Border router …7114* – the names appear a few seconds after the map, like in a real network. Messages are animated from the device to its parent only – what you would see in such a network *(from version 1.5.0)*.

Nothing in demo mode touches your Home Assistant; the demo change log is not stored.
