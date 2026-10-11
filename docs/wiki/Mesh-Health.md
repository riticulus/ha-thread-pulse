# Mesh health

*Available after version 1.5.2.*

One grade from **A** (nothing to check) to **E** (several problems) for the whole Thread network, always shown **together with the reasons behind it**. It is a rule of thumb from the same data as the map, not a measurement. A single letter hides details, so read the factors, not only the grade.

Where it is shown:
- at the top of [the list](The-List), below the change log
- in the [detail panel of the border router](Detail-Panel#border-router-and-other-thread-routers)
- in the [text report](Text-Report)

## The factors

Each factor is **ok** (green), **check** (orange) or **problem** (red). Factors that cannot be judged with the available data are grey.

| Factor | ok | check | problem |
|---|---|---|---|
| **Routers** – routers in the mesh (from the routing tables, like *Routers in the mesh* in the border router panel) | 3 or more | 2 | only 1 (the border router) |
| **Redundancy** – routers with fewer than two good links (−80 dBm or better) to other routers | none | 1, or at most a quarter of the routers | more |
| **Weak signal** – devices with a signal weaker than −80 dBm to their parent | none | 1–2, or at most 15 % | more |
| **Hops** – the longest path from a device to the border router | up to 3 | 4 | 5 or more |
| **Devices per router** – the most devices that use one router as parent | up to 10, spread out | 11–20, or one router carries more than 60 % of them (from 6 devices and 3 routers) | more than 20 |
| **Stability** – devices that are not reachable, have an unstable connection (≥ 5 attach attempts or ≥ 3 drop-offs, as for the [warnings](Hints-and-Warnings)) or routers that restarted 50 times or more | none | 1–2 | 3 or more |

Each factor shows its value (e.g. *2 of 9*) and names the affected devices.

## The grade

**check** counts 1 point, **problem** 2 points:

| Points | 0 | 1 | 2–3 | 4–5 | 6 or more |
|---|---|---|---|---|---|
| Grade | A | B | C | D | E |

When factors cannot be judged, the grade says so, e.g. *A · only 4 of 6 factors judged*. Unknown factors count 0 points, so such a grade looks better than the data allows.

## Limitations

- **Redundancy only for routers:** battery devices only report their parent, not which other routers they could reach.
- **Without a known border router** (e.g. only Apple or Google border routers, no OpenThread Border Router add-on), the hops are unknown. When none of the routers is a Matter device of Home Assistant, redundancy is unknown too.
- The neighbour and routing tables come from the cached Matter diagnostics and can be a few minutes old.
- The thresholds are rules of thumb from real home networks, not values from the Thread specification. How many children a router can hold depends on its firmware.

## In the change log

When the grade changes, the [change log](Change-Log) gets an entry *Mesh health B → C* (green when it gets better, red when it gets worse). To avoid noise from signal values that move around a threshold, a new grade is only logged once two checks in a row (5 minutes apart) agree.
