# Automatic controls — revision 59

`dist/input-mode.js` chooses input layout from pointer capabilities and actual input, independently of viewport width. Fine-pointer desktops start in desktop mode; coarse-pointer phones/tablets start in touch mode. Touch or pen selects touch controls; mouse or gameplay keyboard input selects desktop controls. Media-query capability changes are observed. Switching modes clears the active player controller's held inputs without cancelling CPU hero behavior. Window blur, touch cancellation, hero exit and mouse-capture loss also release input.

## Volt Rush (currently the playable hero)

| Action | Desktop | Touch |
| --- | --- | --- |
| Move | WASD / arrow keys | Existing left movement stick |
| Jump | Space | JUMP |
| Primary lightning | Left-click for one complete instant shot; hold for repeated shots. F remains an alternative. | Existing FIRE hold/drag |
| Defense | Right-click rescue dash; E remains an alternative | DASH |
| Boost | Hold Shift | BOOST toggle |
| Overload stun | Q; existing 50 charge / 15 s cooldown | STUN |
| Aim | Click scene to capture mouse, then move mouse. If capture is unavailable, drag while firing. | Drag open scene or FIRE |
| Release / exit | Escape releases capture or exits hero; Exit hero button also works | Exit hero |

Right-click reuses the existing ten-metre, five-second-cooldown rescue dash, including nearby ally/civilian carrying. It creates no new defensive power and preserves ground/clearance restrictions. The desktop RMB reminder shows dash cooldown or ground-only status. The other roster heroes retain their existing CPU control.

Desktop hides movement sticks, gameplay action buttons and observer altitude buttons. Compact key reminders replace the hero controls, and the helicopter retains its keyboard/mouse instructions with hidden flight stick/buttons. Settings/fullscreen/exit controls remain available. A narrow desktop window stays in desktop mode; a large tablet retains touch controls. A tablet keyboard/mouse can switch the layout back, and the next touch restores touch controls.

An ordinary desktop primary click starts the full 0.4-second beam immediately, with no wind-up. Energy cost (25), attack recovery (1.5 seconds), weak-point collision and damage are unchanged. Mouse aiming no longer cancels a held desktop primary attack. Touch scene drags only aim. Paused/menu input cannot queue primary fire or a rescue dash. Browser mouse capture uses the standard Pointer Lock API when available, with a drag fallback on denial; no dependency was added.

Changed runtime files: `input-mode.js`, `speedster.js`, `helicopter-pilot.js`, `battle.js`, `battle.css`, `index.html`. Relevant tests: `QA/device-controls-browser.cjs`, updated touch activation in weak-point/hero-power regressions, and the existing left-control suite updated to expect hidden desktop controls. See `QA/device-controls-validation.md`.

## Lightning wave update (revision 62)

Right-click / E / DASH now transforms Volt and carried ground allies into electricity. Soldiers, tanks and civilians touched along the route join the wave and reform near its endpoint. Movement input chooses dash direction without snapping the camera; otherwise the dash follows the view. It travels 10 metres in about 0.28 seconds, has the existing five-second cooldown and costs no charge. A short landing input buffer and explicit blocked/cooldown feedback improve manual activation. See `QA/runner-wave-validation.md` for behavior, tuning, changed files and checks.

## Instant lightning update (revision 63)

Left-click, F, or touch FIRE starts lightning on the next gameplay update, with no charge-up animation. A brief press queues one complete 0.4-second burst; holding repeats after the existing 1.5-second recovery (1.9 seconds between starts). Each shot immediately spends 25 stored running charge. Running, boosting, strafing and steering continue while firing; the weighted run animation continues underneath the aiming arm. Running still builds the resource, and an empty meter still prevents attacks. The electric rescue wave keeps its existing behavior and cannot fire during transit.

See `QA/instant-lightning-validation.md` and `QA/instant-lightning-browser.cjs` for real desktop/mobile input, movement parity, animation, cooldown and combat verification.
