// Combat Testing only; the city battle and evacuation maps keep their own bounds.
export const COMBAT_ARENA=Object.freeze({
 size:240,
 bounds:{minX:-120,maxX:120,minZ:-120,maxZ:120},
 movementBounds:{minX:-116,maxX:116,minZ:-116,maxZ:116},
 dashBounds:{minX:-115,maxX:115,minZ:-115,maxZ:115},
 enemyCorner:{x:84,z:-84},
 roadLanes:[-96,-72,-48,-24,0,24,48,72,96],
 roadLength:230
});
