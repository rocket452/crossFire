# Manual hero camera — revision 270

`HERO_CAMERA` in `dist/hero-camera-config.js` sets `heightMultiplier: 1.2` and `defaultPitch: -0.18` radians (10.3 degrees downward). This applies to the currently playable Volt Rush and Kage controllers on desktop and touch. Taking control starts at the downward pitch; normal mouse/touch input can still look freely upward or downward. The camera and attack aiming share that pitch, avoiding a reticle/weapon mismatch.

The multiplier applies to total height above the hero's feet, including the tracking target offset: Volt's ground/roof/air camera rises from 2.70m to 3.24m, his wall camera from 1.68m to 2.016m, and Kage's camera from 2.94m to 3.528m. Follow distances, lateral offsets, FOV, smoothing and obstacle/terrain clearance remain unchanged. Collisions can still shorten the camera placement where necessary. Free observation, CPU follow views and cinematic cameras are separate.

Browser verification checked both heroes on desktop and emulated touch, exact unobstructed heights, the default view direction, Volt's wall elevation and ability to aim upward. Screenshots were inspected. No movement or combat tuning changed.
