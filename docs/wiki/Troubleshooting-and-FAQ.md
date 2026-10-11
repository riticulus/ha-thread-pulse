# Troubleshooting & FAQ

## Error messages

### "Home Assistant refused the request. Thread Pulse needs a user with administrator rights."

You are logged in as a user without administrator rights. Log in as an administrator, or give the user administrator rights (*Settings → People → user → Administrator*).

### "The Matter integration is not set up in this Home Assistant."

Thread Pulse only shows Matter devices. Set up the Matter integration first.

### "No Matter devices on Thread were found."

The Matter integration exists, but none of its devices uses Thread (e.g. only Wi-Fi Matter devices).

### "No connection to Home Assistant …"

The standalone page was opened outside a Home Assistant dashboard (e.g. directly in a browser tab). Open it in an iframe card, or add `?demo` for the demo.

### "Thread Pulse: could not load …/thread-pulse-vis-network.js"

The card file was found, but the graph library next to it was not. With a manual installation, both files (`ha-thread-pulse.js` and `thread-pulse-vis-network.js`) must be in the same folder. With HACS, download Thread Pulse again.

### "Cannot add item: item with id … already exists"

Two devices report the same hardware address (e.g. two Aqara P2 motion sensors). Up to version 1.5.1 this stopped the whole map – update to 1.5.2 or later. The affected devices then show a [hint](Hints-and-Warnings#same-hardware-address-as-another-device).

## The card does not appear

- **"Custom element doesn't exist: thread-pulse-card"** – the browser still has the old list of resources. Reload the page; in the Companion app, close and reopen it or use *Settings → Companion app → Debugging → Reset frontend cache*.
- **Manual installation:** check that the resource `/local/ha-thread-pulse.js` exists with the type *JavaScript module*.

## I still see the old version after an update

- **HACS:** reload the browser after the update.
- **Manual card / standalone page:** browsers cache files. Raise the version parameter (`?v=2`, `?v=3` …) in the resource or iframe URL.
- The status line shows the version that is actually running.

## HACS offers an "update" to an older version

You installed the *main* branch (a development state) through HACS. HACS then offers the latest **release** as an update, even if it is older. Install a release version to get back to normal.

## The map loads, but no dots move

- **Live is paused** – click **▶ Resume live**.
- **The border router could not be identified** – this happens without the OpenThread Border Router add-on, e.g. if only an Apple, Google or Amazon border router is used. If exactly one unknown Thread router is found in the neighbour tables, Thread Pulse assumes it is the border router. Otherwise messages are animated only from the device to its parent router (the parent appears as *other Thread router*, also when the mesh has no Matter router at all). In versions up to 1.4.0 nothing moved in this case.
- **Nothing happens in the network** – at night there may be few messages. Plugs with power metering usually report every few seconds.

## A device is grey

Home Assistant reports it as unavailable. Check the device in Home Assistant; battery devices may need a new battery, mains devices power.

## A device is missing on the map

- Only **Matter** devices that use **Thread** are shown. Thread devices paired with HomeKit or another ecosystem only appear as *other Thread router* – and only if they route.
- Click **↻ Reload** – newly added devices appear after the next load.

## The values look old

Thread data (neighbours, signal, counters) is what the device **last reported**. Some devices report these values rarely. See [How it works](How-It-Works#no-live-queries-to-devices).

## Why does a battery device show "own measurement, unreliable"?

The parent router did not report this child in its table, so only the value measured by the sleepy device itself is available. Such values are often implausible (e.g. −5 dBm).

## Why do hints stay after I fixed the problem?

Some hints use counters that do not go back down – see [Hints and warnings](Hints-and-Warnings#known-limitation) and [issue #24](https://github.com/riticulus/ha-thread-pulse/issues/24).

## Does Thread Pulse slow down my network or drain batteries?

No. It does not query devices; it only reads what Home Assistant already has and listens to Home Assistant events.

## Can I use it on a phone?

Yes. The card and the page adapt to narrow screens; the detail panel slides up from the bottom. The room view is cramped on small screens.

## Something else is wrong

Open an [issue](https://github.com/riticulus/ha-thread-pulse/issues) with your Home Assistant version, the Thread Pulse version (status line), the type of border router and the number of Thread devices. A screenshot of the browser console (F12 → Console) helps.
