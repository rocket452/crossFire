# FORGE mecha robot assets

| File | What it is |
| --- | --- |
| `titan-06-original.glb` | TITAN / 06, unmodified, from [RamonLinares/atlas-09](https://github.com/RamonLinares/atlas-09) `public/models/titan-06.glb` at commit `1b8fb9d54160215c071c5a29a49b1c36dc01f0df`. SHA-256 `853daa4c4d8b6c1e3b867244ca1400de585cd4ba8f587e4bc03020259eb36bf1`. Do not overwrite. |
| `titan-06-lowpoly.glb` | Low-poly conversion built by `source/forge-mecha/build_lowpoly.sh titan-06`. The runtime copy is `dist/city-assets/forge-mecha/titan-06-lowpoly.glb`. |

**Licence:** the seven FORGE mecha (ATLAS / 09, AETHER / 02, SERAPH / 03, RONIN / 04, SCORPIO / 05, TITAN / 06, VANGUARD / 07) are released by Ramon Linares under **CC0 1.0 Universal**. That covers their meshes, textures, rigs and baked animations (see the upstream `ASSET-LICENSE.md` and `public/models/LICENSE.txt`). No attribution is required; this note records provenance.

## Conversion (`source/forge-mecha/`)

1. `decimate_mecha.py` (headless Blender 4.0) runs two passes:
   - **Planar dissolve at 5°**, delimited by material, UV seam, sharp edge and seam.
   - **Collapse decimate** down to 45% of the original triangle count.

   The FORGE rigs are rigid: every vertex follows one bone. Seam splits are welded only within a bone's part, and edges joining two bones are marked as seams, so neither pass joins two bones' faces.
2. `transplant_mesh.py` (Python 3 + Pillow) copies the original GLB and replaces only the mesh primitives' vertex data. The nodes, skin, inverse bind matrices, all animations and the materials stay byte-identical. Textures larger than 1024 px are downscaled.
3. `verify-lowpoly.mjs` checks, from the files themselves:
   - triangles, bone names and order, clip names and texture sizes;
   - that every animation sampler is byte-identical;
   - that every low-poly vertex lies on its own bone's part of the original and moves rigidly with it in 13 samples of every clip.

The game gives only this model's materials `flatShading` (`dist/forge-mecha.js`), which produces the faceted look. To view it, open `?scene=testing&mecha=titan-06&clip=Run` (any clip name). This is an asset check only; the mech is not in enemy AI or gameplay.

## TITAN / 06 results

| | Original | Low-poly |
| --- | ---: | ---: |
| Triangles | 27,579 | 12,410 (45.0%) |
| Bones | 16 | 16 (same names and order) |
| Clips | Backflip, ChestBeam, KneelFire, RocketPunch, Run, Sentinel | identical (288 samplers byte-identical) |
| Textures | BaseColor 2048², Normal 1024², ORM 1024² | all 1024² |
| File size | 5,978,432 B | 4,292,592 B |

- The planar pass alone removed 3% (27,579 → 26,741). This is curved retopology with UV islands, so planar dissolve stalls at 71% even at 30°. The collapse pass makes up the rest.
- Skinning check: low-poly vertices lie a median 2.4 cm (maximum 0.34 m) from their own bone's original vertices on the 19 m frame. Across all clips their pose-to-pose change versus the original is at most 3×10⁻⁷ m.

For the other six mecha, place `<name>-original.glb` here and run `source/forge-mecha/build_lowpoly.sh <name>`.
