import json
from pathlib import Path

from src.models.product import Product
from src.models.package import Package
from src.models.measurement import Measurements, MeasurementValue
from src.sources.product_source import ProductSource


class CachedProductSource(ProductSource):
    def __init__(self, directory: str | Path = "data/products"):
        self.directory = Path(directory)
        self.directory.mkdir(parents=True, exist_ok=True)

    def get_product(self, item_number: str) -> Product:
        norm_number = item_number.replace('.', '')
        path = self.directory / f"{norm_number}.json"

        if not path.exists():
            raise FileNotFoundError(
                f"No cached product found for {item_number}"
            )

        with path.open("r", encoding="utf-8") as file:
            data = json.load(file)

        return self._product_from_dict(data)

    def save_product(self, product: Product) -> None:
        path = self.directory / f"{product.item_number}.json"

        with path.open("w", encoding="utf-8") as file:
            json.dump(
                self._product_to_dict(product),
                file,
                indent=2,
                ensure_ascii=False,
            )

    def _product_to_dict(self, product: Product) -> dict:
        return {
            "name": product.name,
            "type": product.type,
            "item_number": product.item_number,
            "article_number": product.article_number,
            "price": product.price,
            "description": product.description,
            "packages": [
                self._package_to_dict(package)
                for package in product.packages
            ],
        }

    def _package_to_dict(self, package: Package) -> dict:
        return {
            "name": package.name,
            "type": package.type,
            "item_number": package.item_number,
            "article_number": package.article_number,
            "quantity": package.quantity,
            "measurements": {
                "width": self._measurement_to_dict(
                    package.measurements.width
                ),
                "height": self._measurement_to_dict(
                    package.measurements.height
                ),
                "length": self._measurement_to_dict(
                    package.measurements.length
                ),
                "diameter": self._measurement_to_dict(
                    package.measurements.diameter
                ),
                "weight": self._measurement_to_dict(
                    package.measurements.weight
                ),
                "volume": self._measurement_to_dict(
                    package.measurements.volume
                ),
            },
        }

    def _measurement_to_dict(self, value) -> dict | None:
        if value is None:
            return None

        return {
            "value": value.value,
            "unit": value.unit,
        }

    def _product_from_dict(self, data: dict) -> Product:
        return Product(
            name=data.get("name"),
            type=data.get("type"),
            item_number=data.get("item_number"),
            article_number=data.get("article_number"),
            price=data.get("price"),
            description=data.get("description"),
            packages=[
                self._package_from_dict(package)
                for package in data.get("packages", [])
            ],
        )

    def _package_from_dict(self, data: dict) -> Package:
        measurements = data.get("measurements", {})

        return Package(
            name=data.get("name"),
            type=data.get("type"),
            item_number=data.get("item_number"),
            article_number=data.get("article_number"),
            quantity=data.get("quantity", 1),
            measurements=Measurements(
                width=self._measurement_from_dict(
                    measurements.get("width")
                ),
                height=self._measurement_from_dict(
                    measurements.get("height")
                ),
                length=self._measurement_from_dict(
                    measurements.get("length")
                ),
                diameter=self._measurement_from_dict(
                    measurements.get("diameter")
                ),
                weight=self._measurement_from_dict(
                    measurements.get("weight")
                ),
                volume=self._measurement_from_dict(
                    measurements.get("volume")
                ),
            ),
        )

    def _measurement_from_dict(
        self,
        data: dict | None,
    ) -> MeasurementValue | None:
        if data is None:
            return None

        return MeasurementValue(
            value=data["value"],
            unit=data["unit"],
        )