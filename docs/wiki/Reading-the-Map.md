# Reading the map

![The map](images/map.png)

## Toolbar

![Toolbar](images/toolbar.png)

| Element | Function |
|---|---|
| **↻ Reload** | Load the network data again and redraw the map (also compares with the previous state for the [change log](Change-Log)) |
| **☰ Show list / Hide list** | Show the [list below the map](The-List). The button also shows the number of [hints](Hints-and-Warnings), e.g. *· 3 hints* |
| **⏸ Pause live / ▶ Resume live** | Stop or restart the [live animation](Live-Data-Flow). Counting continues while paused |
| **≋ Traffic / Traffic off** | Switch the [traffic heat](Live-Data-Flow#traffic-heat) on or off |
| **⌂ Rooms / Rooms off** | Switch the [room view](Room-View) on or off |
| **🔇 Sound / 🔊 Sound off** | Switch the [sound](Live-Data-Flow#sound) on or off; while it is on, a volume slider appears next to it *(from version 1.4.0)* |
| **📷 Image** | [Save the map as a PNG image](Saving-an-Image), with names or anonymised *(after version 1.4.0)* |
| **ⓘ Legend** | Show or hide the colour legend |
| **🔍 Find device or room** | [Search](Search) |
| Status line | Time of the last update, number of devices, version |

## Devices (nodes)

Every Matter device on Thread is a round icon. The **icon** shows what the device does (light, plug, window, door, motion, button, thermostat, blinds, lock, fan, valve, leak, smoke, air quality, temperature, speaker …). It is chosen from the device's entities in Home Assistant, not from its name. Devices without a known function get a chip icon.

The **colour** shows the role in the Thread network:

| Colour | Role | Meaning |
|---|---|---|
| Purple, with antenna icon | **Border router** | Connects the Thread network to Home Assistant (e.g. the OpenThread Border Router add-on with a USB stick) |
| Dark blue, large | **Router** | Mains-powered device that forwards messages for others |
| Light blue | **End device on mains** | Mains-powered device that does not forward right now (it can become a router if needed) |
| Green, small | **Battery device** | Sleepy end device; it talks only through its *parent* router |
| Grey | **Not reachable** | Home Assistant currently reports the device as unavailable |
| Grey-blue, in a column on the right *(from version 1.4.0)* | **Matter on Wi-Fi / Ethernet** | A Matter device that is not on Thread. Not part of the mesh, so it has no links; its messages are counted but not animated |
| Grey with router icon | **Other Thread router** | A Thread router that is not a Matter device of Home Assistant, e.g. an Apple TV, a HomePod or a Google Nest device |

Hover a device (desktop) to see its name and role; tap or click it to open the [detail panel](Detail-Panel). From version 1.4.0 this also works for the border router and other Thread routers.

## Links (lines)

| Line | Meaning |
|---|---|
| **Solid line** | Radio link between two routers (or a mains device and a router) |
| **Dashed line** | A battery device and its **parent** – the router it talks through |
| **Green** | Good signal: −65 dBm or better |
| **Orange** | Medium signal: −66 to −80 dBm |
| **Red** | Weak signal: below −80 dBm |

The value is the received signal strength (RSSI). For router-to-router links both directions are averaged. For battery devices the value measured **by the parent router** is used, because sleepy devices report their own measurement unreliably; if only the device's own measurement exists, it is marked *uncertain* in the list.

Hover a line (desktop) to see its signal strength and – with traffic heat on – how many messages it carried in the last 10 minutes.

## Badges on devices

| Badge | Meaning |
|---|---|
| **87%** (grey) | Battery level of a battery device |
| **35%** (orange) | Battery below 40 % |
| **15%** (red) | Battery below 20 % |
| **⚠** (orange triangle) | Warning: unstable connection or battery below 20 % – see [Hints and warnings](Hints-and-Warnings) |
| **i** (blue circle) | Hint: a possible weak spot – see [Hints and warnings](Hints-and-Warnings) |

## Moving around

- **Zoom:** mouse wheel or pinch
- **Move the map:** drag the background
- **Move a device:** drag it (the layout adjusts)
- **Back to the full view:** double-click (or double-tap) on empty space – the whole mesh is centered and fitted to the screen *(from version 1.4.0; in older versions use ↻ Reload)*
- **Zoom to a device:** double-click (or double-tap) it – it is centered in the part of the map that the detail panel does not cover *(from version 1.4.0)*

## Live ticker

The box in the bottom left shows how many messages arrived in the last minute and the three latest messages. See [Live data flow](Live-Data-Flow).

## On a phone

![Phone](images/phone.png)

On narrow screens the toolbar wraps, the legend starts hidden and the [detail panel](Detail-Panel) slides up from the bottom.
