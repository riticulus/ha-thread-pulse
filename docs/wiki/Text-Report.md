# Text report

*Available from version 1.6.0.*

**⋯ → 📝 Text report for forums …** writes a short summary of your Thread network as Markdown, ready to paste into a forum post or a GitHub issue. When you ask for help, a table is often more useful than a screenshot: the other person can see models, firmware, roles and signal values at a glance.

The report opens in a window over the map. You see the full text **before** you copy it.

| Control | What it does |
|---|---|
| **Anonymised (Device 1, Room A …)** | On by default. Off: real device and room names |
| **Copy** | Copies the text to the clipboard |
| **×** or **Esc** | Closes the window |

## What it contains

- **Header:** Thread Pulse version, Home Assistant version, date and time, *anonymised* if it is
- **Overview:** number of Thread devices by role (routers, mains end devices, battery devices), devices that are not reachable, border routers, other Thread routers that are not in Home Assistant, the Thread channel, number of Matter devices on Wi-Fi or Ethernet
- **Devices:** one row per Thread device – name, area, model (manufacturer and product), firmware, role, and the connection:
  - routers: number of links to other routers and the best signal
  - other devices: the parent router (*talks through*) and the signal; *(own measurement, unreliable)* when only the device itself reported it
- **Mesh health:** the [grade](Mesh-Health) in the overview, and every factor with its value and explanation
- **Weak links between routers** (below −80 dBm), as in the [network panel](The-List)
- **Warnings and hints** for each device, as in the [detail panel](Detail-Panel) – see [Hints and warnings](Hints-and-Warnings)

The report is written in the language of the dashboard. Paste it into a forum or GitHub as it is: the tables are Markdown.

## Never included

Not even in the version with names:

- the network key, network name, PAN ID and extended PAN ID
- hardware addresses of devices and routers (also not the *…7114* suffix shown on the map)

## Anonymised reports

- Devices are called *Device 1, 2, …* and rooms *Room A, B, …* – the **same numbering as the [anonymised image](Saving-an-Image)**, as long as the map has not moved in between. You can post both, and they match.
- Border routers of other systems show their model only (or *Border router*), never their own name such as *HomePod Living Room*. When the same label occurs more than once, they are numbered (*Border router 1, 2 …*).
- Still included: models, firmware versions, roles and signal values – that is what the report is for.

Read the report before you share it. Model names and the number of devices also say something about a home.

## Copying

Browsers allow the clipboard only on secure pages (`https://`). If Home Assistant is opened via `http://` in the home network and copying is refused, the text is selected instead: copy it with **Ctrl+C** / **⌘C** or the context menu.
