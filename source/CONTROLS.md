# Automatic controls — revision 59

`dist/input-mode.js` chooses input layout from pointer capabilities and actual input, independently of viewport width. Fine-pointer desktops start in desktop mode; coarse-pointer phones/tablets start in touch mode. Touch or pen selects touch controls; mouse or gameplay keyboard input selects desktop controls. Media-query capability changes are observed. Switching modes clears the active player controller's held inputs without cancelling CPU hero behavior. Window blur, touch cancellation, hero exit and mouse-capture loss also release input.

## Volt Rush (currently the playable hero)

| Action | Desktop | Touch |
| --- | --- | --- |
| Move | WASD / arrow keys | Existing left movement stick |
| Jump | Space | JUMP |
| Primary lightning | Left-click for one complete charged shot; hold for repeated shots. F remains an alternative. | Existing FIRE hold/drag |
| Defense | Right-click rescue dash; E remains an alternative | DASH |
| Boost | Hold Shift | BOOST toggle |
| Overload stun | Q; existing 50 charge / 15 s cooldown | STUN |
| Aim | Click scene to capture mouse, then move mouse. If capture is unavailable, drag while firing. | Drag open scene or FIRE |
| Release / exit | Escape releases capture or exits hero; Exit hero button also works | Exit hero |

Right-click reuses the existing ten-metre, five-second-cooldown rescue dash, including nearby ally/civilian carrying. It creates no new defensive power and preserves ground/clearance restrictions. The desktop RMB reminder shows dash cooldown or ground-only status. The other roster heroes retain their existing CPU control.

Desktop hides movement sticks, gameplay action buttons and observer altitude buttons. Compact key reminders replace the hero controls, and the helicopter retains its keyboard/mouse instructions with hidden flight stick/buttons. Settings/fullscreen/exit controls remain available. A narrow desktop window stays in desktop mode; a large tablet retains touch controls. A tablet keyboard/mouse can switch the layout back, and the next touch restores touch controls.

An ordinary desktop primary click queues the existing 0.5-second wind-up plus the full 0.4-second beam. Energy cost (25), attack recovery (1.5 seconds), weak-point collision and damage are unchanged. Mouse aiming no longer cancels a held desktop primary attack. Touch scene drags only aim. Paused/menu input cannot queue primary fire or a rescue dash. Browser mouse capture uses the standard Pointer Lock API when available, with a drag fallback on denial; no dependency was added.

Changed runtime files: `input-mode.js`, `speedster.js`, `helicopter-pilot.js`, `battle.js`, `battle.css`, `index.html`. Relevant tests: `QA/device-controls-browser.cjs`, updated touch activation in weak-point/hero-power regressions, and the existing left-control suite updated to expect hidden desktop controls. See `QA/device-controls-validation.md`.
