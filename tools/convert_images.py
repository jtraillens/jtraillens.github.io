from pathlib import Path
from PIL import Image
from pillow_heif import register_heif_opener

from models.photo_metadata import PhotoMetadata


register_heif_opener()


def convert_image(
    source_file: Path,
    destination_file: Path,
    quality: int = 80,
) -> bool:
    """
    Convert a single HEIC image to WebP.

    Returns:
        True if the image was converted.
        False if it was skipped.
    """

    if destination_file.exists():
        return False

    destination_file.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    with Image.open(source_file) as image:
        image.save(
            destination_file,
            "WEBP",
            quality=quality
        )

    return True


def convert_images(
    photos: list[PhotoMetadata],
    source_dir: Path,
    destination_dir: Path,
    quality: int = 80
) -> tuple [int, int]:
    """
    Convert a collection of photos to WebP.

    Returns:
        Tuple containing:
        - number of converted images
        - number of skipped images
    """

    converted_count = 0
    skipped_count = 0

    for photo in photos:
        source_file = source_dir / photo.file_name

        destination_file = (
            destination_dir /
            Path(photo.file_name).with_suffix(".webp")
        )

        if convert_image(
            source_file,
            destination_file,
            quality=quality,
        ):
            converted_count += 1
        else:
            skipped_count += 1

    return converted_count, skipped_count



def main():
    import argparse

    parser = argparse.ArgumentParser(
        description="Convert HEIC images to WebP"
    )

    parser.add_argument(
        "--source",
        required=True,
        help="Source directory containing HEIC files",
    )

    parser.add_argument(
        "--dest",
        required=True,
        help="Destination directory for WebP files"
    )

    args = parser.parse_args()

    # Standalone execution would load photos here.
    # When called from build script, the PhotoMetadata 
    # list is passed directly into convert_images()

    print (
        "convert_images.py is intended to be called from the build pipeline"
    )



if __name__ == "__main__":
    main()