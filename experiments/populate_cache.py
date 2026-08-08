from src.sources.ikea.source import IkeaSource
from src.sources.cached_product_source import CachedProductSource


ikea = IkeaSource()
cache = CachedProductSource()

for item_number in (
    "895.212.71",
    "906.083.67",
    '691.759.74',
    '904.507.86'
):
    product = ikea.get_product(item_number)
    cache.save_product(product)

    print(f"Cached {product.name} ({item_number})")