# Offline notification (blueprint)

*Available from version 1.5.0.*

The [change log](Change-Log) only sees what happens while a Thread Pulse page is open. For a message on your phone when a device drops off the network – also at night or on holiday – the repository contains an **automation blueprint** that runs in Home Assistant in the background.

[![Open your Home Assistant instance and show the blueprint import dialog with this blueprint pre-filled.](https://my.home-assistant.io/badges/blueprint_import.svg)](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2Friticulus%2Fha-thread-pulse%2Fblob%2Fmain%2Fblueprints%2Fautomation%2Fthread-device-offline.yaml)

The button opens the import dialog of your Home Assistant. Without it: *Settings → Automations & scenes → Blueprints → Import blueprint* and paste
`https://github.com/riticulus/ha-thread-pulse/blob/main/blueprints/automation/thread-device-offline.yaml`.

## What it does

- Sends a message when a device has been **unreachable** (*unavailable* in Home Assistant) for longer than the delay.
- Optionally a second message when it is **reachable again**, with how long it was gone – only if it was gone at least as long as the delay.
- Optionally a notification in Home Assistant (bell icon) that disappears by itself when the device is back.

## Settings

| Setting | Default | Meaning |
|---|---|---|
| **Devices** | – | **One entity per device** to watch (only Matter entities can be selected), e.g. the light, the switch or the contact sensor of a device. When a Matter device loses its connection, all its entities become unavailable at the same time – several entities of the same device would send several messages |
| **Delay** | 5 min | Only notify after this many minutes. Short drop-outs are normal, e.g. while a router restarts |
| **Notify action** | empty | The action that sends the message, e.g. `notify.mobile_app_my_phone` for the Home Assistant app. You find the name under *Developer tools → Actions* (search for *notify*). Any notify action works, e.g. Telegram. Empty = only the notification in Home Assistant |
| **Notification in Home Assistant** | on | Also show the message under the bell icon |
| **Notify when back** | on | Second message when the device is reachable again |
| **Titles and messages** | English | Your own texts; placeholders `{{ device }}`, `{{ area }}`, `{{ minutes }}` and, for the "back" message, `{{ duration }}` |

Example in German:

| Field | Text |
|---|---|
| Title (unreachable) | `Thread: {{ device }} nicht erreichbar` |
| Message (unreachable) | `{{ device }} ist seit {{ minutes }} Minuten nicht erreichbar.` |
| Title (back) | `Thread: {{ device }} wieder da` |
| Message (back) | `{{ device }} ist nach {{ duration }} wieder erreichbar.` |

The device name is the name in Home Assistant (your own name if you renamed it). The room is added in brackets unless it is already part of the device name.

## Good to know

- **Which devices are on Thread?** Home Assistant does not show this in the entity list; the [map](Reading-the-Map) does. Matter devices on Wi-Fi can be watched the same way.
- **Restarts of Home Assistant:** while Home Assistant starts, Matter entities are unavailable for a short time. This does not trigger a message (it is shorter than the delay), and there is no "back" message for it either. A device that is already unreachable when Home Assistant starts is not reported again.
- **Battery devices** that sleep for a long time are not *unavailable* while they sleep – they only become unavailable when they really lost the connection.
- **Changing the list later:** *Settings → Automations & scenes* → the automation → add or remove devices.
