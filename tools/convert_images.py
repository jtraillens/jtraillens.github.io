from pathlib import Path
from PIL import Image
import pillow_heif
import sys

# Enable HEIC support in Pillow
pillow_heif.register_heif_opener()

QUALITY = 80
MAX_SIZE = 2000

if len(sys.argv) < 2:
    print("Usage: python convert_images.py <source_folder>")
    sys.exit(1)

source_folder = Path(sys.argv[1])

# Get the project root (one folder above "tools")
project_root = Path(__file__).parent.parent
output_folder = project_root / "images"

output_folder.mkdir(exist_ok=True)

for heic_file in source_folder.glob("*.heic"):
    output_file = output_folder / f"{heic_file.stem}.webp"
    print(f"Converting {heic_file.name}...")

    with Image.open(heic_file) as img:
        if max(img.size) > MAX_SIZE:
            img.thumbnail((MAX_SIZE, MAX_SIZE))

        img.save(output_file,
                 "WEBP",
                 quality=QUALITY,
                 method=6)

print("Finished!")


