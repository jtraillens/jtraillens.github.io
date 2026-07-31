from pathlib import Path
import json

project_root = Path(__file__).parent.parent

image_folder = project_root / "images"
output_file = project_root / "data" / "photos.json"

photos = []

for image in sorted(image_folder.glob("*.webp")):
    photos.append({
        "file": f"images/{image.name}",
        "title": "",
        "caption": "",
        "description": ""
    })

output_file.parent.mkdir(exist_ok=True)

with open(output_file, "w", encoding="utf-8") as f:
    json.dump(photos, f, indent=2)

print(f"Created {output_file}")