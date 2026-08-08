from dataclasses import dataclass
from typing import Optional

from .measurement import Measurements

@dataclass
class Package:
    name: Optional[str] = None
    type: Optional[str] = None
    item_number: Optional[str] = None
    article_number: Optional[str] = None
    quantity: int = 1
    measurements: Optional[Measurements] = None
