import json
import re

from src.models.product import Product
from src.sources.ikea.client import IkeaClient
from src.sources.ikea.parser import IkeaParser

def normalise_item_number(value) -> str:
        return re.sub(r"\D", "", str(value))

def format_article_number(value) -> str:
    value = normalise_item_number(value)
    return f"{value[:3]}.{value[3:6]}.{value[6:]}" if len(value) == 8 else value

def get_product_data(article_number: str) -> dict:

    client = IkeaClient()
    parser = IkeaParser()

    article_number = format_article_number(article_number)
    item_no = normalise_item_number(article_number)

    html = client.get_product_data(article_number)

    hydration = parser.extract_hydration_json(html)

    with open('hydration.json', 'w') as m_file:
        json.dump(hydration, m_file)

    product = next(x for x in hydration if isinstance(x, dict) and "product" in x)["product"]

    if product is None:
        raise RuntimeError(
            f"Could not find product {article_number} in hydration"
        )

    packages = parser.package_records(product)

    return Product(
        name=product.get('name'),
        type=product.get('typeName'),
        item_number=item_no,
        article_number=article_number,
        price=product.get('price'),
        description=product.get('description'),
        packages=packages
    )

# ------------------------------------------------------------
# OUTPUT
# ------------------------------------------------------------

def print_product(product: Product):
    print()
    print("=" * 60)
    print("PRODUCT")
    print("=" * 60)

    print(f"Name: {product.name}")
    print(f"Type: {product.type}")
    print(f"Item No: {product.item_number}")
    print(f"Article No: {product.article_number}")
    print(f"Price: {product.price}")
    print(f"Description: {product.description}")

    print(f"\nPackages: {len(product.packages)}")

    for i, package in enumerate(product.packages, 1):
        print(f"\nPackage {i}")
        print("-" * 40)

        print(f"Name:       {package.name}")
        print(f"Type:       {package.type}")
        print(f"Item No:    {package.item_number}")
        print(f"Article No: {package.article_number}")
        print(f"Quantity:   {package.quantity}")

        print('Width: ', str(package.measurements.width))
        print('Height: ', str(package.measurements.height))
        print('Length: ', str(package.measurements.length))
        print('Diameter: ', str(package.measurements.diameter))
        print('Weight: ', str(package.measurements.weight))
        print('Volume: ', str(package.measurements.volume))

if __name__ == "__main__":
    print_product(
        get_product_data("895.212.71")
        # get_product_data("906.083.67")
    )