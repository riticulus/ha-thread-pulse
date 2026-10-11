# How it works

Thread Pulse runs completely **in your browser**, inside your Home Assistant dashboard. There is no integration, no add-on and no server part.

## Data sources

| What | Source |
|---|---|
| Matter devices, names, areas | Home Assistant device, entity and area registry |
| Thread role, neighbours, signal strength, routes, stability counters | *Thread Network Diagnostics* cluster of each Matter device, taken from Home Assistant's **cached** Matter diagnostics |
| Manufacturer, model, firmware, hardware | *Basic Information* cluster (same source) |
| Restarts, last restart reason | *General Diagnostics* cluster (same source) |
| Battery type | *Power Source* cluster (same source) |
| Battery level, current values | Entity states in Home Assistant |
| Border router | `otbr/info` of the OpenThread Border Router integration |
| Live messages and commands | Home Assistant events `state_changed` and `call_service` |

### No live queries to devices

Thread Pulse only reads data that Home Assistant **already has**. It never asks a device directly. This keeps the page fast and – important for battery devices – it does **not wake them up** and does not cost battery.

The flip side: Thread data is the state the devices **last reported**. Some values (e.g. packet counters, uptime) are reported rarely; uptime is therefore not shown at all.

### Admin rights

Device diagnostics, the entity registry and the area registry are only available to administrators in Home Assistant. That is why Thread Pulse needs an administrator login.

## Route calculation

Thread routers keep a routing table with the next hop towards every other router. Thread Pulse uses these tables to calculate the **most likely** path from a device to the border router – details in [Live data flow](Live-Data-Flow#which-route-is-shown). The real route can differ, because Thread adapts its routes continuously.

## What is stored, and where

| What | Where | Shared? |
|---|---|---|
| List shown, legend shown, traffic heat, room view | `localStorage` of your browser | no – per browser |
| Change log (max. 100 entries) | `localStorage` of your browser | no – per browser |
| Live counters, response times, traffic heat values | memory of the open page | lost on reload |

Nothing is written to Home Assistant.

## Privacy

- The page uses the session of the logged-in Home Assistant user and only talks to **your** Home Assistant.
- No data is sent anywhere else. No external scripts, fonts or images are loaded – the graph library is shipped with Thread Pulse.

## Performance

- The dashboard card file is small (about 75 kB). The graph library (about 1.6 MB, readable source) is loaded **only when a Thread Pulse card is shown**, so other dashboards are not slowed down.
- Loading the map takes a few seconds for about 20 devices.
- Every 5 minutes the data is loaded again for the [change log](Change-Log).

## Third-party components

- [vis-network](https://github.com/visjs/vis-network) 9.1.9 for drawing the network (MIT / Apache 2.0)
- [Material Design Icons](https://pictogrammers.com/library/mdi/) for the device icons (Apache 2.0)
