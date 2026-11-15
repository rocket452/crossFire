# Manual hero camera — revision 274

`HERO_CAMERA` in `dist/hero-camera-config.js` sets `heightMultiplier: 1.44`, `defaultPitch: -0.44` radians (25.2 degrees downward), and `lateralOffset: 0`. The height compounds the earlier 20% increase with another 20% (1.2 × 1.2). This applies to currently playable Volt Rush and Kage on desktop and touch. Taking control starts with centered, downward framing; mouse/touch input can still look freely up and down. Camera and attack aiming share the same pitch.

The multiplier applies to total height above the hero's feet, including the tracking-target offset: Volt's ground/roof/air height rises from 3.24m to 3.888m, his wall camera from 2.016m to 2.4192m, and Kage's from 3.528m to 4.2336m. The former 0.85m sideways shoulder offset is removed. At the default pitch, the hero's body center projects within 0.25% of the viewport's vertical center, with no horizontal offset. Free aiming can move that framing normally.

Follow distances, FOV, smoothing and obstacle/terrain clearance are unchanged. Collisions can shorten camera placement where necessary; wall clearance remains in place. Free observation, CPU follow views and cinematic cameras are separate.

Browser verification checked both heroes on desktop and emulated touch, exact unobstructed heights, screen projection of the body center, default view direction, Volt's wall elevation and ability to aim upward. Screenshots were inspected. No movement or combat tuning changed.
