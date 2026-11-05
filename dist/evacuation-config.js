// Simulation seconds and world metres. Subway waves deliberately remain fixed at 30 seconds.
export const EVACUATION_CONFIG=Object.freeze({spawnWarningSeconds:5,spawnWarningHz:2.5,arrivalInterval:8,boardingDuration:30,minimumBoarding:2,capacity:16,helicopterHealth:600,flightSpeed:20,landingSpeed:5,cruiseAltitude:26,civilianSpeed:3.8,landingX:0,landingZ:24,escapeZ:132,airThreatChance:.25,targetAltitude:15});
export const CIVILIAN_SPAWN_INTERVAL=30;

// One exposed east-to-west evacuation lane; buildings behind the Walker remain.
export const EVACUATION_ENTRANCES=Object.freeze([Object.freeze({x:48,z:48,label:"east"})]);
export const evacuationBuildingAllowed=b=>b.z<0&&!['B06','B07'].includes(b.id);

// Scene layout override; preserve legacy transport defaults used by unrelated enemy fixtures.
export const EVACUATION_LANDING=Object.freeze({x:-48,z:48});
