from src.models.trolley import Trolley
from src.packing.basket_packer import BasketPacker
from src.packing.capacities import *
from src.sources.cached_product_source import CachedProductSource
from src.sources.product_source import ProductSource
from src.sources.ikea.source import IkeaSource
from src.visualisation.basket_visualiser import BasketVisualiser

def main():
    # source: ProductSource = IkeaSource()
    source: ProductSource = CachedProductSource()

    trolley = Trolley(source)

    # Bathroom sink
    trolley.add_product('895.212.71')
    # Duvet
    trolley.add_product('906.083.67')
    # Double bed
    trolley.add_product('691.759.74')
    # Mattress
    trolley.add_product('904.507.86')

    # trolley.products[0].quantity = 2

    packer = BasketPacker()

    results = packer.pack(trolley.packages, SMALL_CAR)
    trolley.baskets = results.baskets

    for i, basket in enumerate(trolley.baskets, 1):
        print(f"Basket {i}: {basket.weight} kg")

    print(f"Unplaced: {len(results.unplaced)}")

    visualiser = BasketVisualiser()
    visualiser.render2D(results)
    visualiser.render_3d(results)

if __name__ == '__main__':
    main()
