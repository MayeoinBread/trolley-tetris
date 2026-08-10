from dataclasses import dataclass
from itertools import permutations

from src.models.package import Package


@dataclass
class Placement:
    package: Package
    x: float
    y: float
    z: float
    width: float
    length: float
    height: float
    weight: float

    @classmethod
    def from_package(
        cls,
        package: Package,
        x: float,
        y: float,
        z: float,
        dimensions: tuple[float, float, float]
    ):
        width, length, height = dimensions

        return cls(
            package=package,
            x=x, y=y, z=z,
            width=width, length=length, height=height,
            weight=package.measurements.weight.value
        )

    @property
    def dimensions(self) -> tuple[float, float, float]:
        return self.width, self.length, self.height

    def overlaps(self, other: "Placement") -> bool:
        return (
            self.x < other.x + other.width
            and self.x + self.width > other.x
            and self.y < other.y + other.length
            and self.y + self.length > other.y
            and self.z < other.z + other.height
            and self.z + self.height > other.z
        )

    def orientations(self) -> list[tuple[float, float, float]]:
        return list(permutations(self.dimensions))
