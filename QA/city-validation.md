# Crossfire validation — 2026-10-27

## Authoring and assets
- Blender 4.3.2 script executed successfully without MCP.
- Asset library: 14 reusable GLB meshes with vertex colors; city layout: 16 buildings.
- Blender source includes city layout, modular columns/slabs/façades, and a vehicle/infantry kit lineup.
- JavaScript syntax and Blender Python compilation passed.

## Physics tests (Node, actual Cannon solver)
- Detached body falls under gravity and rotates.
- Body lands on a static slab and settles rather than passing through it.
- Loss of two support columns queues the upper structure and causes physical collapse.
- Reset restores positions, support state, and counters.
- Active-body cap defers new detachments without freezing airborne debris.
- Full-city 2,668-section local benchmark: 120 physics steps with 14 detached pieces approximately 403 ms total after spatial-index optimization, versus approximately 3,771 ms before it. This is a local CPU benchmark, not phone FPS.

## Browser smoke tests
Chromium, software WebGL:
- Eight tanks, four helicopters, and 36 infantry load.
- Both shell and rocket impacts damage buildings.
- Live battle triggers support failure and queues a multi-floor collapse.
- Example captured state: five impacts, 39 detached sections, 95 queued, one structural collapse.
- Pause freezes simulation while camera movement remains available.
- All four camera presets work; blocked street preset corrected and reviewed.
- Keyboard camera movement works while paused.
- Rebuild resets impact counts, damage, queued fractures, and simulation time.
- 390px phone layout reviewed; no horizontal overflow; both faction labels visible.
- Desktop overview and phone street/collapse screenshots reviewed.
- No JavaScript page errors in the interaction test.

## Limits
Actual iOS/Android GPU performance, thermal behavior, Safari compatibility, and long-duration destruction stress remain unverified. This is modular rigid-body destruction with a simplified support rule, not structural engineering analysis. Armies follow authored routes; infantry fire is visual. No complete tactical AI, casualty model, vehicle armor simulation, or aerodynamic helicopter physics. Physics and effect budgets are documented in dist/city-assets/README.md.
