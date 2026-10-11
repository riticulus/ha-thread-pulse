# Limitations

Please read this before relying on what the map shows.

## What the map shows – and what it does not

- **Messages to and from Home Assistant, not radio packets.** Thread's own traffic (status messages between routers, battery devices polling their parent, retransmissions) is not visible.
- **Calculated paths.** The route of an animated message is the most likely one according to the routing tables the routers last reported. Thread can use another route at any time.
- **Traffic heat** is based on the same calculated paths – an estimate of where traffic flows.
- **Snapshots.** Neighbours, signal strengths and counters are what the devices last reported, which can be minutes or longer ago.

## Setup

- **Matter devices on Wi-Fi / Ethernet** are shown as a separate group *(from version 1.4.0)*; their reachability is not part of the change log yet.
- **Matter devices only.** Thread devices paired via HomeKit or other ecosystems appear at most as *other Thread router*; their traffic is not shown.
- **Administrator rights** are required.
- **Border router:** without the OpenThread Border Router add-on the border router can often not be identified, and messages are not animated. With several border routers (e.g. Home Assistant plus an Apple TV), messages may leave the mesh through another border router than the one shown.
- **Not an official API.** Thread Pulse relies on Home Assistant's Matter diagnostics format. A future Home Assistant or Matter server update may break it.

## Features

- **Live counters, response times and traffic heat** start at zero when the page is opened and are lost on reload.
- **Response time** is only measured for commands to entities that change their state.
- **Change log** only sees changes while a Thread Pulse page is open; parent, role and link changes appear once the devices report them.
- **Hints** are rules of thumb. Two of them can stay after the problem is gone – see [Hints and warnings](Hints-and-Warnings#known-limitation).
- **Room view** is cramped on phones.

## Tested with

Home Assistant 2026.10, OpenThread Border Router add-on with a SONOFF Dongle Plus MG24, about 20 Matter-over-Thread devices (IKEA, Aqara), desktop browsers and phone-sized browser windows. Other setups are untested – feedback is welcome in the [issues](https://github.com/riticulus/ha-thread-pulse/issues).
