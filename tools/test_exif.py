from pathlib import Path
from PIL import Image
import pillow_heif
from PIL.ExifTags import TAGS, GPSTAGS

pillow_heif.register_heif_opener()

image_path = Path(r"C:\Users\jppmu\Downloads\garb\AmazonPhotos_20260802\2026-07-10_11-50-49_444.heic")

with Image.open(image_path) as image:
    exif = image.getexif();

    for key, value in exif.items():
        print(TAGS.get(key, key), value)

    gps_info = exif.get_ifd(34853)

    print("\nGPS:")
    for key, value in gps_info.items():
        print(GPSTAGS.get(key, key), value)