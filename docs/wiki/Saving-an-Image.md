# Saving an image

*Available from version 1.5.0.*

**📤 Export** in the toolbar saves the map as a PNG file, e.g. to document your network or to ask for help in a forum. Up to version 1.5.2 the button is called **📷 Image**.

The same menu also has a [text report](Text-Report) – a Markdown summary with models, firmware and signal values, anonymised the same way.

| Choice | Result |
|---|---|
| **Save image (with names)** | The map exactly as shown, with device and room names – `thread-pulse-<date>.png` |
| **Save anonymised image (no names)** | The same map, but devices are called *Device 1, 2, …* and rooms *Room A, B, …* – `thread-pulse-<date>-anonymised.png` |

The image contains what the map shows at that moment: the current zoom and position, links and their colours, badges (battery, ℹ, ⚠), the room areas of the [room view](Room-View), the [traffic heat](Live-Data-Flow#traffic-heat) and messages in flight. A line at the bottom shows the version, date and time and the number of devices. The toolbar, legend, live ticker, detail panel and list are not part of the image.

## Anonymised images

- Devices are numbered by their **position on the map** (top left to bottom right), not by name, so the numbers do not hint at the real names.
- The suffix of the address of *other Thread routers* is removed. The border router keeps its label.
- Still visible: the **icons** (what kind of device it is), battery levels, signal colours and the structure of the mesh – that is what the image is for.
- The names are replaced only for the moment the image is drawn; the map on the screen keeps the real names.

Check the image before you post it – especially when you use the version **with names**: device and room names often say a lot about a home.

## On phones and tablets

On a touch device the share sheet opens, so you can save the image to your photos or send it directly. Where sharing is not available (e.g. some versions of the Home Assistant app), the image is downloaded like a file; if nothing happens, open the dashboard in the phone's browser.

Tip: zoom and move the map first (or double-click on empty space to fit the whole mesh) – the image shows exactly that part.
