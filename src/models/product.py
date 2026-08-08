from dataclasses import dataclass, field
from typing import Optional

from .package import Package

@dataclass
class Product:
    name: Optional[str] = None
    type: Optional[str] = None
    item_number: Optional[str] = None
    article_number: Optional[str] = None
    price: Optional[str] = None
    description: Optional[str] = None
    quantity: int = 1
    packages: list[Package] = field(default_factory=list)
