# Combat arena outer blocks — revision 190

Added eight destructible buildings to Combat Testing only, for twelve total. The original four 12-storey towers at (±36, ±36) remain. New outer-block buildings sit at (±84, ±36) and (±36, ±84), with six, eight or ten storeys. Existing street lanes remain between blocks, and no new buildings are placed in the central fighting area. The enemy spawn at (0,0) and hero start at (0,104) remain clear. Arena bounds, enemy formations, roads, and City Battle/Evacuation layouts are unchanged.

Positions and optional floor counts are configured in `dist/combat-arena-config.js`. `battle.js` respects each arena building's floor override, falling back to the existing 12 storeys. Existing assets, building destruction, traversal, minimap and enemy visibility/navigation use the new layout normally.

`QA/arena-center-browser.cjs` passes desktop/touch: all twelve positions, eight outer additions/floor ranges, all seven hero edge starts and resets, centered Walker/Bastion/drone formations, clear starting space and entering Kage control. Overview screenshots were inspected. Physical-phone frame rate has not been measured.
