# Live data flow and traffic heat

## Animated messages

Whenever a Matter device and Home Assistant exchange a message, a dot travels along the route on the map:

| Dot | Meaning | Example |
|---|---|---|
| **Cyan** | A device reports something **to Home Assistant** | a power reading, a window opening, a button press, a light that changed |
| **Magenta** | Home Assistant sends a **command** to a device | `light.turn_on`, `switch.toggle`, `cover.open_cover` |

A ring flashes around the sender. The dot moves hop by hop (about half a second per hop) from the device via its parent and further routers to the border router – or the other way round for commands.

### Which route is shown?

The route is the **most likely** one, calculated from the routing tables the routers last reported:

1. A battery device or end device talks to its **parent** router.
2. A router with a usable direct link to the border router (link quality 2 or 3) sends directly.
3. Otherwise the message follows the **next hop** from the router's routing table, until it reaches the border router.

Thread chooses routes itself and can change them at any time. The animation is therefore an **estimate**, not a recording of radio packets.

### What is not shown

- Thread's own background traffic: routers exchanging status about every 30 seconds, battery devices polling their parent, retransmissions, acknowledgements
- Traffic of devices that are not Matter devices in Home Assistant
- Messages between devices that do not involve Home Assistant

Seeing real radio traffic would need a second Thread radio as a sniffer, Wireshark and the network key.

### Several messages at once

A single radio message often updates several entities in Home Assistant (e.g. power, current and voltage of a plug). Thread Pulse shows them as **one** dot when they arrive within 0.4 seconds.

## Live ticker

The box in the bottom left of the map shows:

- **Live · 41 messages in the last minute**
- the three latest messages with time, device, what changed and – for confirmations of a command – the [response time](Response-Time), e.g. *Plug → HA: state off · 96 ms*

## Pausing

**⏸ Pause live** stops the animation (useful when the map gets busy). The counters for each device and the traffic heat keep counting in the background. **▶ Resume live** starts the animation again.

## Sound

*Available from version 1.4.0.*

**🔇 Sound** (in the **⋯** menu after version 1.5.2, before in the toolbar) plays a short, quiet tick for every animated message:

- **high** tone – a message to Home Assistant
- **low** tone – a command from Home Assistant

While sound is on, a **volume slider** appears next to the button (moving it plays a preview tick). Both settings are remembered by the browser.

- Sound is **off by default**.
- Browsers only allow sound after you clicked or tapped the page. If you left sound on, it starts with your first tap after opening the page.
- To keep it pleasant in a busy network, there are at least 0.15 seconds between two ticks and at most 5 ticks per second – not every message gets its own tick.
- While live is paused, there is no sound.
- The ambient mode has no toolbar and therefore no sound.

## Traffic heat

With **≋ Traffic** on (default), every link glows **wider and brighter** the more messages travelled over it in the **last 10 minutes**. The glow is drawn underneath the link, so the signal colour stays visible. Busy routes of your mesh stand out immediately – typically the links between the border router and the devices that report most often (plugs with power metering).

- Hover a link to see the number of messages, e.g. *41 messages in the last 10 min*.
- In the [detail panel](Detail-Panel) of a router, *Forwarded for others* shows how many messages it passed on for other devices.
- Switch it off with **≋ Traffic off**; the choice is remembered.

The heat is based on the same calculated routes as the animation, so it shows where traffic **most likely** flows.
