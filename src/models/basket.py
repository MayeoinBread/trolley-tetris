from dataclasses import dataclass, field
from itertools import permutations

from src.models.basket_capacity import BasketCapacity
from src.models.package import Package
from src.packing.placement import Placement


@dataclass
class Basket:
    capacity: BasketCapacity
    packages: list[Package] = field(default_factory=list)
    placements: list[Placement] = field(default_factory=list)

    @property
    def weight(self) -> float:
        return sum(
            package.measurements.weight.value
            for package in self.packages
        )

    def can_place(self, placement: Placement) -> bool:
        if (
            placement.x + placement.width > self.capacity.measurements.width.value
            or placement.y + placement.length > self.capacity.measurements.length.value
            or placement.z + placement.height > self.capacity.measurements.height.value
        ):
            return False

        return not any(
            placement.overlaps(existing)
            for existing in self.placements
        )

    def add_placement(self, placement: Placement) -> None:
        if not self.can_place(placement):
            raise ValueError("Package cannot be placed here")

        self.placements.append(placement)

    def candidate_positions(self) -> list[tuple[float, float, float]]:
        positions=[(0, 0, 0)]

        for placement in self.placements:
            positions.extend([
                (placement.x + placement.width,
                 placement.y,
                 placement.z),
                (placement.x,
                 placement.y + placement.length,
                 placement.z),
                (placement.x,
                 placement.y,
                 placement.z + placement.height)
            ])
        
        return positions

    def try_place(self, package: Package) -> bool:
        package_weight = package.measurements.weight.value

        if self.weight + package_weight > self.capacity.measurements.weight.value:
            return False
        
        dimensions = package.measurements.dimensions

        for orientation in permutations(dimensions):
            for x, y, z in self.candidate_positions():
                placement = Placement.from_package(
                    package, x, y, z, orientation
                )

                if self.can_place(placement):
                    self.add_placement(placement)
                    self.packages.append(package)
                    return True
        return False

    def can_add(self, package: Package) -> bool:
        return (
            self.capacity.can_fit(package)
            and self.weight + package.measurements.weight.value <= self.capacity.measurements.weight.value
        )
