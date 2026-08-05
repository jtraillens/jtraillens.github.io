from pathlib import Path
import argparse
import json
from datetime import datetime

from models.photo_metadata import PhotoMetadata
from exif_reader import read_exif, read_coordinates


def parse_args():
    parser = argparse.ArgumentParser(
        description="Generate or update metadata.json"
    )

    parser.add_argument(
        "image_folder",
        help="Folder containing HEIC images"
    )

    return parser.parse_args()


def photo_to_json(photo: PhotoMetadata) -> dict:
    return {
        "fileName": photo.file_name,
        "dateTaken": photo.date_taken.isoformat(),
        "latitude": photo.latitude,
        "longitude": photo.longitude,
        "altitude": photo.altitude,
        "title": photo.title,
        "caption": photo.caption,
        "description": photo.description,
        "locationName": photo.location_name,
        "tags": photo.tags,
        "favorite": photo.favorite,
        "public": photo.public,
        "lastUpdated": photo.last_updated.isoformat()        
    }


def json_to_photo(data: dict) -> PhotoMetadata:
    return PhotoMetadata(
        file_name=data["fileName"],
        date_taken=datetime.fromisoformat(data["dateTaken"]),
        latitude=data.get("latitude"),
        longitude=data.get("longitude"),
        altitude=data.get("altitude"),
        title=data.get("title", ""),
        caption=data.get("caption", ""),
        description=data.get("description", ""),
        location_name=data.get("locationName", ""),
        tags=data.get("tags", []),
        favorite=data.get("favorite", False),
        public=data.get("public", False),
        last_updated=datetime.fromisoformat(data["lastUpdated"])
    )


def load_metadata(path: Path) -> list[PhotoMetadata]:
    if path.exists():
        with path.open("r", encoding="utf-8") as file:
            data = json.load(file)

            return [
                json_to_photo(photo)
                for photo in data["photos"]
            ]
        
    return []

def save_metadata(path: Path, photos: list[PhotoMetadata]):
    data = {
        "photos": [
            photo_to_json(photo)
            for photo in photos
        ]
    }

    with path.open("w", encoding="utf-8") as file:
        json.dump(
            data,
            file,
            indent=4
        )


def create_photo_metadata(image: Path) -> PhotoMetadata:
    exif = read_exif(image)

    date_taken = datetime.now()

    if "DateTimeOriginal" in exif:
        date_taken = datetime.strptime(
            exif["DateTimeOriginal"],
            "%Y:%m:%d %H:%M:%S"
        )
    elif "DateTime" in exif:
        date_taken = datetime.strptime(
            exif["DateTime"],
            "%Y:%m:%d %H:%M:%S"
        )

    latitude = None
    longitude = None

    if "GPS" in exif:
        latitude, longitude = read_coordinates(exif["GPS"])

    return PhotoMetadata(
        file_name=image.name,
        date_taken=date_taken,
        latitude=latitude,
        longitude=longitude
    )


def main():
    args = parse_args()
    image_folder = Path(args.image_folder)

    if not image_folder.exists():
        print(f"Folder not found: {image_folder}")
    print(f"Found folder: {image_folder}")

    heic_files = sorted(
        file for file in image_folder.iterdir()
        if file.is_file() and file.suffix.lower() == ".heic"
    )
    print(f"Found {len(heic_files)} HEIC files")

    for file in heic_files:
        print(file.name)

    metadata_path = Path("data") / "metadata.json"
    print(f"Metadata file: {metadata_path}")

    metadata_path.parent.mkdir(exist_ok=True)

    photos = load_metadata(metadata_path)
    existing_photos = {
        photo.file_name: photo
        for photo in photos
    }

    for image in heic_files:
        if image.name in existing_photos:
            print(f"Already exists: {image.name}")
            continue
        photo = create_photo_metadata(image)
        photos.append(photo)

    save_metadata(metadata_path, photos)


if __name__ == "__main__":
    main()