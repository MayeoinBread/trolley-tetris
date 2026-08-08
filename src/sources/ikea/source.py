import re

from experiments.ikea_api_test import normalise_item_number
from src.models.product import Product
from src.sources.ikea.client import IkeaClient
from src.sources.ikea.parser import IkeaParser
from src.sources.product_source import ProductSource


class IkeaSource(ProductSource):

    def _normalise_item_number(self, value) -> str:
        return re.sub(r"\D", "", str(value))

    def _format_article_number(self, value) -> str:
        value = self._normalise_item_number(value)
        return f"{value[:3]}.{value[3:6]}.{value[6:]}" if len(value) == 8 else value

    def __init__(self):
        self.client = IkeaClient()
        self.parser = IkeaParser()

    def get_product(self, article_number) -> Product:

        article_number = self._format_article_number(article_number)
        item_no = self._normalise_item_number(article_number)

        html = self.client.get_product_data(article_number)

        hydration = self.parser.extract_hydration_json(html)

        product = next(x for x in hydration if isinstance(x, dict) and "product" in x)["product"]

        if product is None:
            raise RuntimeError(
                f"Could not find product {article_number} in hydration"
            )

        packages = self.parser.package_records(product)

        return Product(
            name=product.get('name'),
            type=product.get('typeName'),
            item_number=item_no,
            article_number=article_number,
            price=product.get('price'),
            description=product.get('description'),
            packages=packages
        )