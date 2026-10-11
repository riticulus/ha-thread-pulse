# Response time

Thread Pulse measures how long a device takes to **confirm a command** from Home Assistant.

## How it is measured

1. Home Assistant sends a command to an entity of the device, e.g. `switch.turn_off` (event `call_service`).
2. The device carries it out and reports its new state; Home Assistant updates the entity (event `state_changed`).
3. The response time is the difference between the two **time stamps from Home Assistant**. The connection between your browser and Home Assistant does not affect the result.

The confirmation is matched to the command by Home Assistant's *context id* (everything a command causes carries the same id). If that is not available, the first state report of the same entity within 10 seconds is used.

## Where you see it

- **Detail panel → Live:** *96 ms last · median 95 ms (6 measurements)*. The last 20 measurements per device are kept.
- **Live ticker:** confirmations show the time, e.g. *Plug → HA: state off · 96 ms*.
- **Hint** and **i** badge if the median is 1 second or more over at least 3 commands – see [Hints and warnings](Hints-and-Warnings#responds-slowly).

For devices that can be switched (lights, switches, covers, locks, fans, climate, valves, media players) the panel shows *not measured yet* until the first command arrives.

## What to expect

Matter over Thread usually confirms commands in well under a second. In a real network with the OpenThread Border Router add-on, a plug confirmed on/off commands in about **95 ms**.

## Limitations

- Measured only **while a Thread Pulse page is open**; values are lost on reload.
- Commands that change nothing (e.g. *turn on* for a light that is already on) produce no state report and are **not counted**.
- Commands sent to a whole **device or area** (instead of an entity) are animated but not measured.
- The time includes Home Assistant and the Matter server, not only the radio hop.
