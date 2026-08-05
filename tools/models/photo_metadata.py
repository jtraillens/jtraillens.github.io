from dataclasses import dataclass, field
from datetime import datetime

@dataclass
class PhotoMetadata:
    file_name: str
    date_taken: datetime

    latitude: float | None = None
    longitude: float | None = None
    altitude: float | None = None

    taxon_id: int | None = None  # iNaturalist ID

    title: str = ""
    caption: str | None = None
    description: str | None = None
    location_name: str | None = None
    tags: list[str] = field(default_factory=list)

    favorite: bool = False
    public: bool = False

    last_updated: datetime = field(default_factory=datetime.now)