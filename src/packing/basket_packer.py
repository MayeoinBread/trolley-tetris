from dataclasses import dataclass

from src.models.basket import Basket
from src.models.basket_capacity import BasketCapacity
from src.models.package import Package

# [x] 1 - Weight constraint — don't exceed basket maximum weight.
# [x] 2 - Basic dimensional fit — can an individual package physically fit?
# [ ] 3 - Rotation — allow packages to be oriented in different ways.
# [ ] 4 - 2D/3D placement — actually arrange packages in available space.
# [ ] 5 - Multiple baskets — open another basket when one is full.
# [ ] 6 - Optimisation — minimise the number of baskets / wasted space.

class BasketPacker:
    def pack(self, packages: list[Package], capacity: BasketCapacity) -> PackingResult:
        baskets: list[Basket] = []
        unplaced: list[Package] = []

        baskets.append(Basket(capacity=capacity))

        for package in packages:
            for basket in baskets:
                if basket.try_place(package):
                    break
                else:
                    if capacity.can_fit(package):
                        basket = Basket(capacity=capacity)
                        if basket.try_place(package):
                            baskets.append(basket)
                    else:
                        unplaced.append(package)

                # if basket.can_add(package):
                #     basket.packages.append(package)
                #     break
                # elif basket.capacity.can_fit(package):
                #     basket = Basket(capacity=capacity)
                #     basket.packages.append(package)
                #     baskets.append(basket)
                # else:
                #     unplaced.append(package)

        return PackingResult(baskets=baskets, unplaced=unplaced)

@dataclass
class PackingResult:
    baskets: list[Basket]
    unplaced: list[Package]
