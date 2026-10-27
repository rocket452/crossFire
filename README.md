# Wizard Atelier / Moonkeeper

A Blender-authored skinned wizard in a mobile-friendly Three.js grove.

- Main app: dist/index.html
- Prior 2D style comparison: dist/styles.html
- Blender generator: source/build_wizard.py
- Character and source downloads: dist/assets/
- Runtime dependencies are vendored locally in dist/vendor/.

## Rebuild the wizard
`blender -b -t 4 --python source/build_wizard.py`

Requires Blender 4.3.2 or compatible bpy/glTF exporter. Uses CPU Cycles for the preview render. Does not require Blender MCP or downloaded character assets.

## Preview
`python -m http.server 8765 --directory dist`

Open http://localhost:8765. Module files require HTTP rather than file://.

## Scope
A stylized animated prototype. See dist/assets/README.md for import guidance and known limitations. The original four-pipeline proposal remains a specification, not a claim that all four pipelines were completed.
