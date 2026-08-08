import json
from pathlib import Path
import shutil

from src.packing.basket_packer import PackingResult


class BasketVisualiser:
    def render2D(
        self,
        result: PackingResult,
        output: str | Path = "output/packing.html",
    ) -> None:
        output = Path(output)
        output.parent.mkdir(parents=True, exist_ok=True)

        data = {
            "baskets": [
                {
                    "number": i,
                    "width": basket.capacity.measurements.width.value,
                    "length": basket.capacity.measurements.length.value,
                    "height": basket.capacity.measurements.height.value,
                    "placements": [
                        {
                            "x": p.x,
                            "y": p.y,
                            "z": p.z,
                            "width": p.width,
                            "length": p.length,
                            "height": p.height,
                            "name": p.package.name,
                            "item_number": p.package.item_number,
                        }
                        for p in basket.placements
                    ],
                }
                for i, basket in enumerate(result.baskets, 1)
            ],
            "unplaced": [
                {
                    "name": p.name,
                    "item_number": p.item_number,
                    "width": (
                        p.measurements.width.value
                        if p.measurements.width
                        else p.measurements.diameter.value
                    ),
                    "length": p.measurements.length.value,
                    "height": (
                        p.measurements.height.value
                        if p.measurements.height
                        else p.measurements.diameter.value
                    ),
                }
                for p in result.unplaced
            ],
        }

        output.write_text(
            self._html(data),
            encoding="utf-8",
        )

    def _html(self, data: dict) -> str:
        json_data = json.dumps(data, ensure_ascii=False)

        return """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Trolley Tetris</title>

        <style>
            html, body {
                margin: 0;
                padding: 0;
                width: 100%;
                min-height: 100%;
                background: #202020;
                color: white;
                font-family: Arial, sans-serif;
            }

            body {
                padding: 30px;
            }

            h1 {
                margin-top: 0;
            }

            .basket {
                position: relative;
                border: 3px solid white;
                background: #333;
                margin-bottom: 40px;
            }

            .package {
                position: absolute;
                border: 1px solid white;
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
                font-size: 11px;
                text-align: center;
            }

            .unplaced {
                margin-top: 30px;
            }

            .unplaced-item {
                padding: 8px;
                margin: 4px 0;
                background: #552222;
            }
        </style>
    </head>

    <body>

    <h1>Trolley Tetris</h1>

    <div id="content"></div>

    <script>
    const DATA = __DATA__;

    const content = document.getElementById("content");

    const SCALE = 6;

    DATA.baskets.forEach(function(basket) {

        const heading = document.createElement("h2");

        heading.textContent =
            "Basket " + basket.number +
            " — " +
            basket.width + " × " +
            basket.length + " × " +
            basket.height + " cm";

        content.appendChild(heading);

        const basketElement = document.createElement("div");

        basketElement.className = "basket";

        basketElement.style.width =
            (basket.width * SCALE) + "px";

        basketElement.style.height =
            (basket.length * SCALE) + "px";

        basket.placements.forEach(function(placement, index) {

            const element = document.createElement("div");

            element.className = "package";

            element.style.left =
                (placement.x * SCALE) + "px";

            element.style.top =
                (placement.y * SCALE) + "px";

            element.style.width =
                (placement.width * SCALE) + "px";

            element.style.height =
                (placement.length * SCALE) + "px";

            element.style.background =
                "hsl(" + ((index * 55) % 360) + ", 60%, 45%)";

            element.textContent =
                placement.name;

            element.title =
                placement.name +
                " (" +
                placement.item_number +
                ")\\n" +
                placement.width + " × " +
                placement.length + " × " +
                placement.height + " cm";

            basketElement.appendChild(element);
        });

        content.appendChild(basketElement);
    });

    const unplacedHeading = document.createElement("h2");

    unplacedHeading.textContent = "Unplaced";

    content.appendChild(unplacedHeading);

    if (DATA.unplaced.length === 0) {

        const empty = document.createElement("div");

        empty.textContent = "None";

        content.appendChild(empty);

    } else {

        DATA.unplaced.forEach(function(package) {

            const element = document.createElement("div");

            element.className = "unplaced-item";

            element.textContent =
                package.name +
                " (" +
                package.item_number +
                ") — " +
                package.width +
                " × " +
                package.length +
                " × " +
                package.height +
                " cm";

            content.appendChild(element);
        });
    }
    </script>

    </body>
    </html>
    """.replace("__DATA__", json_data)


    def render_3d(
        self,
        result: PackingResult,
        output: str | Path = "output/packing_3d.html",
    ) -> None:
        output = Path(output)
        output.parent.mkdir(parents=True, exist_ok=True)

        data = {
            "baskets": [
                {
                    "number": i,
                    "width": basket.capacity.measurements.width.value,
                    "length": basket.capacity.measurements.length.value,
                    "height": basket.capacity.measurements.height.value,
                    "placements": [
                        {
                            "x": placement.x,
                            "y": placement.y,
                            "z": placement.z,
                            "width": placement.width,
                            "length": placement.length,
                            "height": placement.height,
                            "weight": placement.package.measurements.weight.value,
                            "name": placement.package.name,
                            "item_number": placement.package.item_number,
                        }
                        for placement in basket.placements
                    ],
                }
                for i, basket in enumerate(result.baskets, 1)
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

        json_data = json.dumps(
            data,
            ensure_ascii=False,
        )

        renderer_dir = (
            Path(__file__).parent
        )

        html_template = (
            renderer_dir
            / "packing_3d.html"
        )

        css_source = (
            renderer_dir
            / "packing_3d.css"
        )

        js_source = (
            renderer_dir
            / "packing_3d.js"
        )

        html = html_template.read_text(
            encoding="utf-8"
        )

        html = html.replace(
            "__PACKING_DATA__",
            json_data,
        )

        output.write_text(
            html,
            encoding="utf-8",
        )

        shutil.copy2(
            css_source,
            output.parent / "packing_3d.css",
        )

        shutil.copy2(
            js_source,
            output.parent / "packing_3d.js",
        )