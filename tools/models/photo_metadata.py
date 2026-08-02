from dataclasses import dataclass, field
from datetime import datetime

@dataclass
class PhotoMetadata:
    file_name: str
    date_taken: datetime
    latitude: float | None = None
    longitude: float | None = None
    altitude: float | None = None

    title: str = ""
    caption: str = ""
    description: str = ""
    location_name: str = ""
    tags: list[str] = field(default_factory=list)

    favorite: bool = False
    hidden: bool = False

    last_updated: datetime = field(default_factory=datetime.now)