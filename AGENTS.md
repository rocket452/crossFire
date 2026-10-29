# Crossfire development

The game is in `dist/`; it is a static Three.js/Cannon-es app. Fetch `origin/main` before editing because other project conversations may update it. Preserve existing gameplay and the owner-private Sites audience unless the user requests otherwise.

## Licensed character assets

Read `source/PRIVATE_ASSETS.md` before character conversion, GitHub pushes or Site publication. The user-supplied Explosive LLC FBX/PSD package and its generated geometry/animation files must stay out of the PUBLIC GitHub repository. `dist/city-assets/licensed-characters/` is deliberately ignored in the public checkout. Integration code, conversion scripts, tests and documentation can be public. Do not remove the ignore rule or push a private build branch to GitHub.

The private Site build uses an isolated `site-licensed-assets` branch/worktree containing the app-specific runtime GLB and manifest. Publish that exact private commit/archive to Sites. Public `main` is for code only. On later edits, merge the new public code commit into the private build branch, retain its licensed runtime files, validate there, and push only to the Sites credential remote. See the private-assets guide for locations and commands.

Run checks relevant to the change. Browser suites use installed Chromium/Playwright and a local static server; physical phone FPS/thermal performance has not been measured. `QA/explosive-asset-test.mjs` and character browser checks need the private runtime assets. New character work must verify the real weighted meshes and hand/muzzle attachments, not hidden legacy pose proxies.
