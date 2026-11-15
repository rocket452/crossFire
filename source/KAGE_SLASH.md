# Kage aimed slash

The R / touch Slash attack captures the existing mouse/look aim point when activated. Its 180-degree fan and vertical thickness rotate into that aim frame, so looking down from a jump hits enemies below and looking up reaches enemies above. The visual arc and hand sweep use that same captured frame. Moving the camera during an active swing does not redirect its already-applied damage.

Range (9m), cooldown (1s), damage (160 with existing Mireguard melee rules), arc (180 degrees), height (1.2m), effect lifetime (.24s), and fan thickness (`verticalReach=2.8`) remain in `ninja-shuriken-config.json`. Thickness is measured perpendicular to the aimed swing plane. Building occlusion, missile hits, direct damage callbacks, movement and other attacks are preserved.

`QA/kage-attacks-test.mjs` covers forward/up/down/vertical hits, miss regions, floor/wall cover, cooldown, locked aim and reset alongside kunai regression. `QA/kage-aimed-slash-browser.cjs` stages a controlled airborne Kage above an actual Bruiser and uses desktop R / touch Slash input; it verifies damage below, visual/damage alignment and finite weighted animation, with screenshots on both layouts.
