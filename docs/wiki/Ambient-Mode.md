# Ambient mode

*Available from version 1.4.0.*

The ambient mode turns Thread Pulse into a calm, always-on display for a **wall tablet**: only the pulsing mesh, on a dark background – no toolbar, legend, list or ticker.

## How to switch it on

| Where | How |
|---|---|
| Dashboard card | `ambient: true` (visual editor: *Ambient mode for wall tablets*) |
| Standalone page | `/local/thread-pulse.html?ambient` |

```yaml
type: custom:thread-pulse-card
ambient: true
height: 100vh
```

For a real wall display, put the card alone in a **panel view** and hide Home Assistant's header and sidebar (e.g. with the kiosk mode of your tablet app or a kiosk add-on). The live animation and the traffic heat run as usual.

## Slow automatic zoom

To avoid burn-in on tablet screens, the view moves slowly by itself: every 25 seconds it glides (over 8 seconds) to a random router, the next time back to the whole mesh.

- It **pauses for 60 seconds** after the screen was touched, and while a detail panel is open.
- Switch it off with `ambient_motion: false` (card) or `?ambient&still` (page).

## Touching the screen

- Tapping a device opens its [detail panel](Detail-Panel); in ambient mode it **closes by itself after 15 seconds**.
- Double-tap on empty space fits the whole mesh again.

## Screen stays on

Thread Pulse asks the browser to keep the screen on (*Screen Wake Lock*). Browsers only allow this on **HTTPS** connections. If your Home Assistant is opened via plain `http://`, the request is ignored – use the *keep screen on* setting of your tablet app (e.g. the Home Assistant Companion app or a kiosk browser) instead.

## Colours

The ambient mode always uses its own dark colours, independent of your Home Assistant theme. Device colours, link colours and badges are the same as on the normal map – see [Reading the map](Reading-the-Map).

## Errors

If the map cannot be loaded (e.g. no administrator rights), the error message is shown even in ambient mode – see [Troubleshooting & FAQ](Troubleshooting-and-FAQ).
