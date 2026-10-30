# Twelve-person civilian formations — revision 52

Each subway wave contains 12 civilians. One shared route, center, waypoint and smoothed heading drive a three-column/four-row formation (0.85m lateral and 0.9m row spacing). The group turns together, stays within 1.6m of its center, and waits together at the landing zone. Individual collision/health and running poses remain available for combat and rescues.

The Chinook boards the entire surviving group if it fits its 16 seats. Departure threshold is 12 passengers; surviving partial loads depart after the existing 12-second boarding pause. A full group cannot split between flights. Entrances still alternate every 30 simulation seconds, and the raider still spawns with wave two. The instanced render pool supports 72 people/432 parts; a new wave is deferred when all 12 would exceed the cap.

A civilian moved through a portal is detached from the old formation and gets a new shared-route object at the rescue destination. This preserves their rescue instead of snapping them back to the original group. Casualties and boarded civilians are removed from formation membership. Rebuild clears all formations.

Verification:

- `QA/civilian-cohorts-browser.cjs` passes desktop and 390px touch view: exact wave size, constant formation radius through corners, 30-second entrance alternation, all 12 boarding together, two full safe flights, casualty accounting/11 survivors boarding and departing, portal relocation without snapping back, 72-person bound and reset. Screenshot inspected.
- Existing Rift browser suite passes for natural civilian rescues, tank/civilian transport, projectile redirection and reset.
- Evacuation targeting and raider unit checks pass; raider browser regression covers wave-two timing, hero damage/stun, defeat and scene isolation.
- Browser QA uses software Chromium, not physical phone performance measurements.
