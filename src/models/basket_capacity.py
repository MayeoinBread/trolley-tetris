from dataclasses import dataclass
from itertools import permutations

from src.models.measurement import Measurements
from src.models.package import Package


@dataclass
class BasketCapacity:
    measurements: Measurements

    def can_fit(self, package: Package) -> bool:
        package_dimensions = package.measurements.dimensions
        basket_dimensions = self.measurements.dimensions

        return any(
            all(p <= b for p, b in zip(orientation, basket_dimensions))
            for orientation in permutations(package_dimensions)
        )
