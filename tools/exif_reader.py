from pathlib import Path
from datetime import datetime

from PIL import Image
import pillow_heif
from PIL.ExifTags import TAGS, GPSTAGS

pillow_heif.register_heif_opener()



def convert_to_decimal(value):
    degrees = float(value[0])
    minutes = float(value[1])
    seconds = float(value[2])

    return degrees + (minutes / 60) + (seconds / 3600)



def read_coordinates(gps: dict):
    latitude = None
    longitude = None

    if "GPSLatitude" in gps and "GPSLatitudeRef" in gps:
        latitude = convert_to_decimal(gps["GPSLatitude"])
        if gps["GPSLatitudeRef"] == "S":
            latitude *= -1

    if "GPSLongitude" in gps and "GPSLongitudeRef" in gps:
        longitude = convert_to_decimal(gps["GPSLongitude"])
        if gps["GPSLongitudeRef"] == "W":
            longitude *= -1

    return latitude, longitude

    

def read_exif(image_path: Path) -> dict:
    with Image.open(image_path) as image:
        exif = image.getexif();
        result = {}

        for key, value in exif.items():
            result[TAGS.get(key, key)] = value

        result["GPS"] = read_gps(exif)

        return result


def read_gps(exif) -> dict:
    gps_data = exif.get_ifd(34853)
    result = {}

    for key, value in gps_data.items():
        result[GPSTAGS.get(key, key)] = value

    return result


# if __name__ == "__main__":
#     test_file = Path(r"C:\Users\jppmu\Downloads\garb\AmazonPhotos_20260802\2026-07-10_11-50-49_444.heic")

#     metadata = read_exif(test_file)

#     for key, value in metadata.items():
#         print(key, value)