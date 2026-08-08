from abc import ABC, abstractmethod

from src.models.product import Product

class ProductSource(ABC):
    @abstractmethod
    def get_product(self, item_number: str) -> Product:
        pass
