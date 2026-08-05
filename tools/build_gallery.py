from pathlib import Path
import json

from models.photo_metadata import PhotoMetadata
from convert_images import convert_images


def load_metadata(metadata_file: Path) -> list[PhotoMetadata]:
    with open(metadata_file, "r", encoding="utf-8") as file:
        data = json.load(file)

    return [
        PhotoMetadata(
            file_name=photo["fileName"],
            date_taken=photo.get("dateTaken"),
            latitude=photo.get("latitude"),
            longitude=photo.get("longitude"),
            taxon_id=photo.get("taxonId"),
            title=photo.get("title"),
            caption=photo.get("caption"),
            description=photo.get("description"),
            location_name=photo.get("locationName"),
            tags=photo.get("tags", []),
            favorite=photo.get("favorite", False),
            public=photo.get("public", False),
        )
        for photo in data["photos"]
    ]


def build_gallery_json(
    photos: list[PhotoMetadata],
    output_file: Path,
    image_output_dir: Path,
):
    gallery_data = []

    for photo in photos:
        image_file = (
            image_output_dir / Path(photo.file_name).with_suffix(".webp")
        )
        taxon_url = (
            f"https://www.inaturalist.org/taxa/{photo.taxon_id}"
            if photo.taxon_id is not None
            else None            
        )

        gallery_data.append(
            {
                "fileName": image_file.as_posix(),
                "dateTaken": photo.date_taken,
                "title": photo.title,
                "caption": "",
                "locationName": photo.location_name,
                "tags": photo.tags,
                "taxonUrl": taxon_url
            }
        )

    with open(output_file, "w", encoding="utf-8") as file:
        json.dump(
            gallery_data,
            file,
            indent=2,
        )


def build_gallery(
    metadata_file: Path,
    source_dir: Path,
    image_output_dir: Path,
    gallery_output_file: Path,
):
    photos = load_metadata(metadata_file)

    public_photos = [
        photo
        for photo in photos
        if photo.public
    ]

    converted, skipped = convert_images(
        photos=public_photos,
        source_dir=source_dir,
        destination_dir=image_output_dir
    )

    print(f"Converted images: {converted}")
    print(f"Skipped images: {skipped}")

    build_gallery_json(
        photos=public_photos,
        output_file=gallery_output_file,
        image_output_dir=image_output_dir,
    )

    print(f"Created: {gallery_output_file}")



if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Build photo gallery"
    )

    parser.add_argument(
        "--metadata",
        required=True,
        help="Path to metadata.json"
    )

    parser.add_argument(
        "--source",
        required=True,
        help="Folder containing HEIC files"
    )

    parser.add_argument(
        "--images",
        required=True,
        help="Output folder for WebP images"
    )

    parser.add_argument(
        "--gallery",
        required=True,
        help="Output gallery json file"
    )

    args = parser.parse_args()

    build_gallery(
        metadata_file=Path(args.metadata),
        source_dir=Path(args.source),
        image_output_dir=Path(args.images),
        gallery_output_file=Path(args.gallery),
    )