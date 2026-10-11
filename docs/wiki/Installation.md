# Installation

Thread Pulse can be used in three ways. All three show the same map with the same features.

| | A) HACS card | B) Manual card | C) Standalone page |
|---|---|---|---|
| Installation | a few clicks | copy 2 files + add a resource | copy 2 files + add an iframe card |
| Updates | shown and installed by HACS | by hand | by hand |
| Fits into dashboards | like any other card | like any other card | best as a full-screen view |
| Recommended for | most users | users without HACS | special setups, testing |

## Requirements

- Home Assistant with the **Matter** integration set up, and at least one Matter device on **Thread**
- You must be logged in as a user with **administrator** rights. Thread Pulse reads device diagnostics and the entity registry, which Home Assistant only allows for administrators.
- Recommended: the **OpenThread Border Router** add-on. With other border routers (Apple, Google, Amazon …) the map still works, but the live animation may not (see [Limitations](Limitations)).

## A) Dashboard card via HACS (recommended)

1. Open **HACS** in Home Assistant.
2. Click **⋮** (top right) → **Custom repositories**.
3. Enter `https://github.com/riticulus/ha-thread-pulse`, choose the type **Dashboard** and click **Add**.
4. Search for **Thread Pulse** in HACS, open it and click **Download**.
5. **Reload the browser** when HACS asks for it (on phones: close and reopen the Companion app).
6. Edit a dashboard → **Add card** → search for **Thread Pulse**.

HACS registers the card as a dashboard resource automatically. Continue with [Configuration](Configuration).

### Updating with HACS

HACS shows new releases as an update like for any other card. Install it and reload the browser.

> **Note:** If you ever installed the *main* branch instead of a release (e.g. to test something), HACS offers the latest **release** as an "update" – which can be *older* than what you have. Install a release version to get back to normal.

## B) Dashboard card, manual installation

1. Open the [latest release](https://github.com/riticulus/ha-thread-pulse/releases/latest) and download **Source code (zip)**. Unpack it.
2. Copy these two files from the `dist` folder into `/config/www/` of your Home Assistant (for example with the *File editor* or *Samba share* add-on):
   - `ha-thread-pulse.js`
   - `thread-pulse-vis-network.js`

   Both files must be in the **same folder**. If `www` did not exist and you had to create it, restart Home Assistant once.
3. **Settings → Dashboards → ⋮ → Resources → Add resource**
   - URL: `/local/ha-thread-pulse.js`
   - Resource type: **JavaScript module**
4. Reload the browser and add the card as described in A), step 6.

**Updating:** replace both files and reload the browser. If an old version keeps showing, add or raise a version parameter in the resource URL, e.g. `/local/ha-thread-pulse.js?v=2`.

## C) Standalone page in an iframe

1. Download **Source code (zip)** of the [latest release](https://github.com/riticulus/ha-thread-pulse/releases/latest) and unpack it.
2. Copy these two files from the **`dist` folder** into `/config/www/` (up to version 1.4.0 they were in the top folder):
   - `thread-pulse.html`
   - `thread-pulse-vis-network.js`
3. Add a full-screen view with a webpage (iframe) card:

   ```yaml
   views:
     - title: Thread
       path: thread
       type: panel
       cards:
         - type: iframe
           url: /local/thread-pulse.html?v=1
           aspect_ratio: 100%
   ```

   Or in the UI: *Edit dashboard → Add view → View type "Panel (single card)"*, then add a **Webpage** card with the URL `/local/thread-pulse.html?v=1`.

**Updating:** replace both files and raise the number in `?v=1` (e.g. to `?v=2`), so that browsers and the Companion app load the new version.

The page only works inside a Home Assistant dashboard. Opened on its own it shows an error – except in [demo mode](Demo-Mode).

## Which version do I have?

The installed version is shown at the bottom of the **⋯** menu, e.g. *Thread Pulse 1.6.0* (up to version 1.5.2 at the end of the status line above the map, e.g. `v1.3.0`). A version ending in `+dev` is a development state between two releases.

## Uninstalling

- **HACS:** open Thread Pulse in HACS → ⋮ → **Remove**. Then remove the Thread Pulse cards from your dashboards.
- **Manual card:** remove the resource (*Settings → Dashboards → ⋮ → Resources*) and delete the two files from `/config/www/`.
- **Standalone page:** remove the iframe card and delete the two files.

Thread Pulse does not change anything in Home Assistant. The only things it stores are a few settings and the change log in your **browser** (see [How it works](How-It-Works)).
