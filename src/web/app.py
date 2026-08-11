from flask import Flask, jsonify, render_template, request

from sources.ikea.source import IkeaSource
from src.packing.capacities import *
from src.models.trolley import Trolley
from src.packing.basket_packer import BasketPacker
from src.sources.product_source import ProductSource
from src.sources.cached_product_source import CachedProductSource

app = Flask(__name__)


# ------------------------------------------------------------
# Application setup
# ------------------------------------------------------------

# source: ProductSource = CachedProductSource()
source: ProductSource = IkeaSource()

packer = BasketPacker()

trolley = Trolley(source)


# ------------------------------------------------------------
# Main page
# ------------------------------------------------------------

@app.get("/")
def index():
    return render_template(
        "index.html",
    )

@app.get('/api/vehicles')
def get_vehicles():
    return {
        "small_car": {
            "name": "Small car",
            "width": SMALL_CAR.measurements.width.value,
            "length": SMALL_CAR.measurements.length.value,
            "height": SMALL_CAR.measurements.height.value,
            "weight": SMALL_CAR.measurements.weight.value,
        },
        "family_car": {
            "name":  "Family car",
            "width":  FAMILY_CAR.measurements.width.value,
            "length": FAMILY_CAR.measurements.length.value,
            "height": FAMILY_CAR.measurements.height.value,
            "weight": FAMILY_CAR.measurements.weight.value,
        },
        "small_van": {
            "name":  "Small van",
            "width":  SMALL_VAN.measurements.width.value,
            "length": SMALL_VAN.measurements.length.value,
            "height": SMALL_VAN.measurements.height.value,
            "weight": SMALL_VAN.measurements.weight.value,
        },
        "large_van": {
            "name":  "Large van",
            "width":  LARGE_VAN.measurements.width.value,
            "length": LARGE_VAN.measurements.length.value,
            "height": LARGE_VAN.measurements.height.value,
            "weight": LARGE_VAN.measurements.weight.value,
        }
    }

# ------------------------------------------------------------
# Trolley
# ------------------------------------------------------------

@app.get("/api/trolley")
def get_trolley():
    return jsonify({
        "products": [
            {
                "item_number": product.item_number,
                "name": product.name,
                "type": product.type,
                "quantity": product.quantity,
            }
            for product in trolley.products
        ]
    })


@app.post("/api/trolley/products")
def add_product():
    data = request.get_json()

    item_number = str(
        data["item_number"]
    ).strip()

    quantity = int(
        data.get("quantity", 1)
    )

    if not item_number:
        return jsonify({
            "error": "Item number is required."
        }), 400

    if quantity < 1:
        return jsonify({
            "error": "Quantity must be at least 1."
        }), 400

    try:
        product = trolley.add_product(
            item_number,
        )
        product.quantity = quantity

    except Exception as exc:
        return jsonify({
            "error": str(exc)
        }), 400

    return jsonify({
        "success": True,
    })


@app.delete("/api/trolley/products/<item_number>")
def remove_product(item_number):
    try:
        trolley.remove_product(
            item_number,
        )

    except Exception as exc:
        return jsonify({
            "error": str(exc)
        }), 400

    return jsonify({
        "success": True,
    })


# ------------------------------------------------------------
# Packing
# ------------------------------------------------------------

@app.post("/api/pack")
def pack_trolley():
    data = request.get_json()

    basket_type = data.get(
        "basket_type",
        "family_car",
    )

    width = float(data['width'])
    length = float(data['length'])
    height = float(data['height'])
    weight = float(data['weight'])

    # match basket_type:
    #     case "small_car":
    #         cap = SMALL_CAR
    #     case "small_van":
    #         cap = SMALL_VAN
    #     case "large_van":
    #         cap = LARGE_VAN
    #     case _:
    #         cap = FAMILY_CAR

    try:
        result = packer.pack(
            trolley.packages,
            capacity=BasketCapacity(
                measurements=Measurements(
                    width=MeasurementValue(width, 'cm'),
                    length=MeasurementValue(length, 'cm'),
                    height=MeasurementValue(height, 'cm'),
                    weight=MeasurementValue(weight, 'kg')
                )
            )
        )
    except Exception as exc:
        return jsonify({
            "error": str(exc)
        }), 400

    return jsonify(
        packing_result_to_json(result)
    )


# ------------------------------------------------------------
# Result serialisation
# ------------------------------------------------------------

def packing_result_to_json(result):
    return {
        "baskets": [
            {
                "number": index + 1,

                "capacity": {
                    "width": basket.capacity.measurements.width.value,
                    "length": basket.capacity.measurements.length.value,
                    "height": basket.capacity.measurements.height.value,
                    "weight": basket.capacity.measurements.weight.value,
                },

                "packages": [
                    {
                        "name": package.name,
                        "item_number": package.item_number,
                    }
                    for package in basket.packages
                ],

                "placements": [
                    {
                        "x": placement.x,
                        "y": placement.y,
                        "z": placement.z,

                        "width": placement.width,
                        "length": placement.length,
                        "height": placement.height,

                        "weight": placement.weight,

                        "name": placement.package.name,
                        "item_number": placement.package.item_number,
                    }
                    for placement in basket.placements
                ],
            }
            for index, basket in enumerate(result.baskets)
        ],

        "unplaced": [
            {
                "name": package.name,
                "item_number": package.item_number,
                "width": package.measurements.dimensions[0],
                "length": package.measurements.dimensions[1],
                "height": package.measurements.dimensions[2],
                "weight": package.measurements.weight.value
            }
            for package in result.unplaced
        ],
    }


if __name__ == "__main__":
    app.run(
        debug=True,
        host='0.0.0.0',
        port=5000
    )