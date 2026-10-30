# Autonomous attack portals — revision 54

Rift Warden now uses a 0.4-second placement gesture when opening an attack or rescue portal, then lowers his arms and returns the real weighted character to Idle. Existing attack portals no longer hold him in the AttackLeft casting animation. Personal teleport retains its short animation. Portal fire has its own existing clock and continues while he teleports, opens rescue portals or stands elsewhere; its world position and five-second lifetime stay independent of the creator. The hero readout labels ongoing portal fire AUTO PORTAL FIRE. Maximum three attack portals, four shots/second, damage and dimensional core effects remain unchanged.

Verification:

- `QA/rift-autonomous-browser.cjs`: desktop and 390px touch viewport. Opens an attack portal, verifies the short gesture and real weighted clip returning to Idle while shots continue, teleports the hero more than 20m while the portal stays fixed, opens a transport pair and rescues civilians while attack shots continue, verifies independent expiry, energy VFX and disable/reset. New portal placement is suppressed in this fixture after the first placement to isolate that portal's behavior.
- Existing Rift integration regression passes three concurrent portals, personal travel, real civilian/tank rescue, guided missile/plasma redirection, default team and reset. Portal energy checks cover core effects and disposal.
- `QA/rift-pair-test.mjs` passes. Browser QA uses software Chromium; physical phone performance has not been measured.
