from dataclasses import dataclass

from src.models.basket import Basket
from src.models.basket_capacity import BasketCapacity
from src.models.package import Package

class BasketPacker:
    def pack(self, packages: list[Package], capacity: BasketCapacity) -> PackingResult:

        packages = sorted(
            packages,
            key=self.package_sort_key,
            reverse=True
        )

        baskets: list[Basket] = [
            Basket(capacity=capacity)
        ]
        unplaced: list[Package] = []

        for package in packages:
            placed = False
            for basket in baskets:
                if basket.try_place(package):
                    placed = True
                    break

            if placed:
                continue

            if not capacity.can_fit(package):
                unplaced.append(package)
                continue

            new_basket = Basket(capacity=capacity)
            if new_basket.try_place(package):
                baskets.append(new_basket)
            else:
                unplaced.append(package)

        return PackingResult(baskets=baskets, unplaced=unplaced)

    def package_sort_key(self, package: Package):
        return (
            package.measurements.footprint,
            package.measurements.volume.value,
            package.measurements.max_dimension
        )

@dataclass
class PackingResult:
    baskets: list[Basket]
    unplaced: list[Package]
