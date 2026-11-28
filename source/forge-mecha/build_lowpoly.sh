#!/usr/bin/env bash
# Builds the low-poly runtime version of a FORGE mecha from its untouched original GLB.
#   source/forge-mecha/build_lowpoly.sh titan-06 [planar_angle_degrees=5] [target_ratio=0.45]
# Input:  assets/robots/<name>-original.glb   (never modified)
# Output: assets/robots/<name>-lowpoly.glb    and the runtime copy dist/city-assets/forge-mecha/<name>-lowpoly.glb
# Needs Blender 4.x (headless), Python 3 with Pillow, and Node 22.
set -euo pipefail
name=${1:?usage: build_lowpoly.sh <name> [angle] [ratio]}
angle=${2:-5}; ratio=${3:-0.45}
root=$(cd "$(dirname "$0")/../.." && pwd)
original="$root/assets/robots/$name-original.glb"
output="$root/assets/robots/$name-lowpoly.glb"
runtime="$root/dist/city-assets/forge-mecha/$name-lowpoly.glb"
work=$(mktemp -d); trap 'rm -rf "$work"' EXIT
test -f "$original" || { echo "missing $original" >&2; exit 1; }
blender -b -P "$root/source/forge-mecha/decimate_mecha.py" -- "$original" "$work/decimated.glb" "$angle" "$ratio" | grep DECIMATE_RESULT
python3 "$root/source/forge-mecha/transplant_mesh.py" "$original" "$work/decimated.glb" "$output" --max-texture 1024 > "$work/transplant.json"
mkdir -p "$(dirname "$runtime")"; cp "$output" "$runtime"
node "$root/source/forge-mecha/verify-lowpoly.mjs" "$original" "$output"
