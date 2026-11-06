# Bastion rescue cinematic — revision 230

Verified with Chromium/Playwright and real licensed runtime meshes:

- Touchdown starts one 12-second camera sequence in Civilian Evacuation only.
- Controlled Volt on desktop/touch and Kage on desktop retain their controller and original world position afterward. Native modal input blocking and cleared held inputs prevent movement/fire while the sequence runs.
- Real animation frames leave mission time, civilian time and Bastion attack time unchanged during playback. The carrier continues its departure.
- Both real cannon muzzle hierarchies recoil/fire; cosmetic rounds terminate at Violet's animated shield and register visible pooled impacts. The scene calls no gameplay damage.
- Violet flying entrance, Rift's portal/step-out, both subtitle cues, and final group framing inspected in desktop/portrait screenshots.
- Finish and Skip restore camera/input/UI, add both CPU helpers without changing the saved roster, and do not repeat the sequence. Rebuild during playback cancels cleanly and restores roster selection; later touchdown can replay it.
- Existing dropship browser test updated for cinematic time; passed desktop/touch, including boss defeat and replay. Existing arena Bastion weak-point browser checks passed desktop/touch.
- Walker defeat tests (all four final-weapon orders), helicopter missile-strike routing, dropship lifecycle unit checks, permanent Bastion part damage checks and Bruiser wave cancellation checks passed.
- Syntax checks and `git diff --check` passed. Private weighted asset validation passed.

Commands: `node QA/evacuation-cinematic-browser.cjs`, `CINEMATIC_HERO=ninja node QA/evacuation-cinematic-browser.cjs`, `node QA/evacuation-dropship-browser.cjs`, `node QA/bastion-permanent-weakpoints-browser.cjs`, `node QA/walker-defeat-condition-test.mjs`, `node QA/evacuation-helicopter-strike-test.mjs`, `node QA/evacuation-dropship-test.mjs`, `node QA/bastion-permanent-weakpoints-test.mjs`, `node QA/evac-raider-waves-test.mjs`.

The browser tests explicitly release pointer lock before clicking out-of-canvas rebuild controls, as a player would with Escape. Test keyboard input can switch touch emulation to desktop input mode, so lock release is checked on both layouts.

Known limits: subtitle dialogue, no recorded voice acting; primitive portal/energy VFX; camera stage temporarily poses the player in the open street then restores their position; guests are mission-only and do not change hero selection. Audio tones require the existing unlocked audio context and respect the sound preference. Phone emulation verifies layout/input behavior; physical-device performance is unmeasured. Screenshots remain in `/tmp/cinematic230-{shield,rift}-{false,true}.png` outside Git.
