from dataclasses import dataclass, field

from src.models.basket import Basket
from src.models.package import Package
from src.models.product import Product
from src.sources.product_source import ProductSource

@dataclass
class Trolley:
    source: ProductSource
    products: list[Product] = field(default_factory=list)
    baskets: list[Basket] = field(default_factory=list)
    
    def add_product(self, item_number: str) -> Product:
        for product in self.products:
            if product.item_number == item_number:
                product.quantity += 1
                return product

        product = self.source.get_product(item_number)
        self.products.append(product)
        return product
        # product = self.source.get_product(item_number)
        # self.products.append(product)
        # return product

    def remove_product(self, item_number: str) -> Product:
        for product in self.products:
            if product.item_number == item_number:
                product.quantity -= 1

                if product.quantity <= 0:
                    self.products.remove(product)

                return product

        raise ValueError(
            f"Product {item_number!r} is not in the trolley."
        )

    @property
    def packages(self) -> list[Package]:
        return [
            package
            for product in self.products
            for package in product.packages
            for _ in range(product.quantity)
        ]
