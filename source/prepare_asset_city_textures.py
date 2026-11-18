"""Build the private Asset City texture set from the creator's FreeSample.zip."""
import argparse
from pathlib import Path
from zipfile import ZipFile

from PIL import Image

# Keep diffuse detail on the buildings and the small lettering on signs.
# A 1K window mask retains the window shapes at the scale of the test map.
TEXTURES = [
    ("T_Buildings_002Diffuse- 4K.png", "building-color.webp", 2048, False),
    ("BAKE_Buildings_002Emissive- 4K.png", "building-glow.webp", 1024, True),
    ("T_PropsDiffuse- 4K.png", "sign-color.webp", 2048, False),
    ("BAKE_PropsEmissive- 4K.png", "sign-glow.webp", 2048, True),
]


def prepare(archive, output):
    output.mkdir(exist_ok=True, parents=True)
    with ZipFile(archive) as pack:
        names = {Path(entry).name: entry for entry in pack.namelist()}
        for source, target, size, is_mask in TEXTURES:
            with pack.open(names[source]) as entry, Image.open(entry) as image:
                atlas = image.convert("RGB").resize((size, size), Image.Resampling.BOX)
                atlas.save(output / target, format="WEBP", lossless=is_mask, quality=92, method=6)
            print(target, size, (output / target).stat().st_size)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    prepare(args.archive, args.output)
