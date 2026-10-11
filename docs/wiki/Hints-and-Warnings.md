# Hints and warnings

Thread Pulse points out devices that may need attention. There are two levels:

| | Badge on the map | In the detail panel | Meaning |
|---|---|---|---|
| **Warning** | orange **⚠** | orange box | Something is not right at the moment |
| **Hint** | blue **i** | blue box with 💡 | A possible weak spot, with a suggestion |

A device shows the **i** badge only if it has no warning. All hints are also listed at the top of the [list below the map](The-List); the list button shows how many there are.

> Hints are **rules of thumb** based on the data the devices report. They are suggestions, not measurements.

## Warnings

| Warning | Condition |
|---|---|
| Unstable connection | **5 or more attach attempts** since the device's last restart |
| Dropped off the network | **3 or more** times since the device's last restart |
| Battery low | Battery level **below 20 %** |

The thresholds come from a real network of about 20 devices, where healthy devices showed 0–2 attach attempts and 1–2 drop-offs.

## Hints

### Weak signal to the parent

**When:** a battery device or end device receives its parent with less than **−80 dBm**.

**Suggestion:** a mains-powered Thread device that can act as a router (a plug or a bulb) placed closer to this device could improve the connection. If the value was measured by the device itself (not by the router), the hint says so – such values are less reliable.

### Unstable connection – possible causes

**When:** the warning *unstable connection* or *dropped off the network* applies.

**Lists the likely causes:** weak signal to the parent, the parent lost power, radio interference (Wi-Fi or other 2.4 GHz devices nearby) or a weak battery.

### Router probably loses power

**When:** a router has restarted **50 times or more** in total.

**Meaning:** it probably loses power from time to time – typically a bulb on a wall switch, or a plug that gets unplugged. While it is off, it cannot forward messages, and battery devices using it as their parent (named in the hint) have to find a new one.

**Suggestion:** leave it powered and switch it via Home Assistant.

> Switching a smart **plug off** does *not* stop it from routing – only its socket is switched off, the plug itself stays powered. That is why this is not a reason for a hint.

### Router at the edge of the mesh

**When:** the best link of a router to any other router is weaker than **−80 dBm**.

**Suggestion:** another router in between would connect it better.

### Battery will soon be empty

*From version 1.4.0.*

**When:** the [battery forecast](Detail-Panel#battery) says the battery will probably be empty within **30 days**.

**Suggestion:** keep a replacement ready. It is an estimate based on the trend of the last weeks.

### Responds slowly

**When:** the [response time](Response-Time) median is **1 second or more** over at least **3 commands**.

**Possible causes:** weak signal, many hops, a busy or restarting router, or the device itself.

### Same hardware address as another device

*From version 1.5.2.*

Some devices report the same hardware address as another device – for example several Aqara P2 motion sensors. It is a firmware quirk: the devices work normally, because inside the Thread network they use different addresses. Thread Pulse identifies devices on the map by this address, so it keeps them apart by adding their Home Assistant device ID and shows this hint. Links that other devices report for them cannot be matched, so their connections on the map may be incomplete; the link to their parent (from their own data) is shown.

Up to version 1.5.1 such devices stopped the whole map with the error *Cannot add item: item with id … already exists*.

## Known limitation

The hints *unstable connection* and *router probably loses power* are based on counters that do not go back down:

- attach attempts and drop-offs count **since the device's last restart**,
- restarts count over the device's **whole lifetime**.

So these hints can stay visible after the problem is gone – until the device restarts (e.g. after a battery change) or, for the restart count, practically forever. Showing only recent increases and a *Done* button are planned: [issue #24](https://github.com/riticulus/ha-thread-pulse/issues/24).
