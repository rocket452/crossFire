# Combat arena outer blocks — revision 190

Added eight destructible buildings to Combat Testing only, for twelve total. The original four 12-storey towers at (±36, ±36) remain. New outer-block buildings sit at (±84, ±36) and (±36, ±84), with six, eight or ten storeys. Existing street lanes remain between blocks, and no new buildings are placed in the central fighting area. The enemy spawn at (0,0) and hero start at (0,104) remain clear. Arena bounds, enemy formations, roads, and City Battle/Evacuation layouts are unchanged.

Positions and optional floor counts are configured in `dist/combat-arena-config.js`. `battle.js` respects each arena building's floor override, falling back to the existing 12 storeys. Existing assets, building destruction, traversal, minimap and enemy visibility/navigation use the new layout normally.

`QA/arena-center-browser.cjs` passes desktop/touch: all twelve positions, eight outer additions/floor ranges, all seven hero edge starts and resets, centered Walker/Bastion/drone formations, clear starting space and entering Kage control. Overview screenshots were inspected. Physical-phone frame rate has not been measured.

## Revision 191 — five Mireguard squads

Replaced the three-Mireguard dropdown choice with **5 squads of 4 Mireguards (20)**. Its existing `mireguard-3` value/URL is retained for compatibility. The single-Mireguard option is unchanged. Four squads occupy the outer districts at (±72, ±72); the fifth starts on the northern street at (0,-48). Each uses an eight-metre-spaced 2×2 formation. All twenty have unique IDs, clear building geometry and normal AI; rebuilding restores these same five formations. Centers/spacing live in `COMBAT_ARENA.mireguardSquads` / `mireguardSquadSpacing`.

Static pieces sharing an attachment and material are merged without changing the rig, collision or damage: Mireguard remains 2,280 triangles, with render meshes reduced from 71 to 35 per enemy. The existing bundled geometry utility uses a relative Three.js import so both browser and Node checks use the same local dependency.

`QA/mireguard-squads-browser.cjs` passes desktop/touch: twenty unique enemies, five exact groups of four, unobstructed placement, separated squads, live five-second combat, exact reset, batched models and switching back to the single enemy. Existing Mireguard lifecycle/animation, search and Kage hit-count Node suites pass. The existing desktop/touch Mireguard browser suite also passes with the replacement preset. Physical-phone FPS for twenty enemies is not measured.
