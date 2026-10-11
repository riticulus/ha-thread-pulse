# Change log

Thread Pulse notices when something changes in your Thread network and lists it with a time stamp.

![Change log in the list](images/list.png)

## What is detected

| Change | Colour | How it is detected |
|---|---|---|
| Device **not reachable** / **reachable again** | red / green | **Live**, as soon as Home Assistant marks the device's main entities as unavailable or available again |
| Device **new in the network** / **no longer in the network** | green / red | at the next check |
| **New parent** of a battery or end device, e.g. *new parent: Hallway light → Blinds (−58 dBm)* | purple | at the next check |
| **Signal to the parent** changes quality (good / medium / weak) | orange | at the next check |
| **Role** changes, e.g. router → end device | purple | at the next check |
| A usable **link between two routers** appears or is lost | orange | at the next check; only links of −80 dBm or better are watched, to avoid noise |

The affected device **flashes** three times on the map.

## When it is checked

- **Every 5 minutes** while a Thread Pulse page is open. The data is loaded again and compared with the previous state. The map keeps its positions and zoom; only devices whose data changed move.
- When you click **↻ Reload**.
- Reachability changes are logged **immediately**.

## The list

The section **Changes in the network** at the top of the [list](The-List) shows the latest 30 entries: time, coloured dot, device (a link to its [detail panel](Detail-Panel)) and the change. **Clear list** empties it.

The list is stored in your **browser** (up to 100 entries) and survives a reload. Another browser or device has its own list.

## Limitations

- Parent, role and link changes only appear once the devices **report** them to Home Assistant, which can take a while.
- Changes that happen while **no** Thread Pulse page is open are not seen (except that the next comparison shows the new state).
- In [demo mode](Demo-Mode) an invented change happens every 40 seconds; the demo list is not stored.
