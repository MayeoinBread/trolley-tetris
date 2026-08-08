import json
from pathlib import Path

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
                    "item_number": package.item_number
                }
                for i, package in enumerate(result.unplaced, 1)
            ]
        }

        json_data = json.dumps(data, ensure_ascii=False)

        html = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Trolley Tetris - 3D</title>

        <style>
            html, body {
                margin: 0;
                width: 100%;
                height: 100%;
                overflow: hidden;
                background: #202020;
            }

            canvas {
                display: block;
                width: 100%;
                height: 100%;
            }

            #info {
                position: absolute;
                top: 15px;
                left: 15px;
                z-index: 10;
                padding: 10px 14px;
                color: white;
                background: rgba(0, 0, 0, 0.7);
                font-family: Arial, sans-serif;
            }

            #controls {
                position: absolute;
                top: 15px;
                left: 15px;
                z-index: 10;
                font-family: Arial, sans-serif;
            }

            #viewSelect {
                padding: 8px 12px;
                font-size: 15px;
                color: white;
                background: #303030;
                border: 1px solid #666;
                border-radius: 4px;
            }

            #info {
                position: absolute;
                top: 60px;
                left: 15px;
                z-index: 10;
                padding: 10px 14px;
                color: white;
                background: rgba(0, 0, 0, 0.7);
                font-family: Arial, sans-serif;
                max-width: 400px;
            }
        </style>
    </head>

    <body>

    <div id="controls">
        <select id="viewSelect"></select>
    </div>

    <div id="info">Loading...</div>
    <canvas id="canvas"></canvas>

    <script>
    const DATA = __DATA__;

    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");

    let currentView = {
        type: "basket",
        index: 0
    };

    const viewSelect = document.getElementById("viewSelect");
    const info = document.getElementById("info");

    function getCurrentBasket() {
        return DATA.baskets[currentView.index];
    }


    function updateViewSelector() {
        viewSelect.innerHTML = "";

        DATA.baskets.forEach(function(basket, index) {
            const option = document.createElement("option");

            option.value = index;
            option.textContent =
                "Basket " +
                basket.number +
                " (" +
                basket.placements.length +
                " packages)";

            viewSelect.appendChild(option);
        });


        if (DATA.unplaced.length > 0) {
            const option = document.createElement("option");

            option.value = "unplaced";
            option.textContent =
                "Unplaced (" +
                DATA.unplaced.length +
                " items)";

            viewSelect.appendChild(option);
        }


        viewSelect.value =
            currentView.type === "unplaced"
                ? "unplaced"
                : String(currentView.index);
    }


    viewSelect.addEventListener("change", function() {

        if (this.value === "unplaced") {
            currentView = {
                type: "unplaced",
                index: -1
            };
        } else {
            currentView = {
                type: "basket",
                index: Number(this.value)
            };
            cameraAzimuth = -Math.PI / 4;
            cameraElevation = Math.PI / 6;
            cameraDistance = 1;

            calculateView();
        }

        draw();
    });


    updateViewSelector();


    // ============================================================
    // 3D Camera / Orbit
    // ============================================================

    const MARGIN = 100;

    let SCALE = 1;
    let OFFSET_X = 0;
    let OFFSET_Y = 0;


    // Camera angles.
    //
    // azimuth:
    //     rotation around the Z axis
    //
    // elevation:
    //     angle above/below the XY plane
    //
    let cameraAzimuth = -Math.PI / 4;
    let cameraElevation = Math.PI / 6;

    let cameraDistance = 1;


    // Camera target in world coordinates.
    // This gets centred on the currently selected basket.
    let targetX = 0;
    let targetY = 0;
    let targetZ = 0;


    // ------------------------------------------------------------
    // Raw projection
    // ------------------------------------------------------------

    function projectRaw(x, y, z) {

        // Translate world position relative to camera target.

        let dx = x - targetX;
        let dy = y - targetY;
        let dz = z - targetZ;


        // --------------------------------------------------------
        // Orbit around Z
        // --------------------------------------------------------

        const cosA = Math.cos(cameraAzimuth);
        const sinA = Math.sin(cameraAzimuth);

        const rotatedX =
            dx * cosA -
            dy * sinA;

        const rotatedY =
            dx * sinA +
            dy * cosA;


        // --------------------------------------------------------
        // Elevation
        // --------------------------------------------------------

        const cosE = Math.cos(cameraElevation);
        const sinE = Math.sin(cameraElevation);

        const cameraX = rotatedX;

        const cameraY =
            rotatedY * cosE -
            dz * sinE;

        const cameraZ =
            rotatedY * sinE +
            dz * cosE;


        return {
            x: cameraX,
            y: -cameraY,
            depth: cameraZ
        };
    }


    function project(x, y, z) {

        const raw = projectRaw(x, y, z);

        return {
            x: OFFSET_X + raw.x * SCALE,
            y: OFFSET_Y + raw.y * SCALE
        };
    }


    function calculateView() {

        const basket = getCurrentBasket();

        targetX = basket.width / 2;
        targetY = basket.length / 2;
        targetZ = basket.height / 2;


        const points = [
            projectRaw(0, 0, 0),
            projectRaw(basket.width, 0, 0),
            projectRaw(0, basket.length, 0),
            projectRaw(basket.width, basket.length, 0),

            projectRaw(0, 0, basket.height),
            projectRaw(basket.width, 0, basket.height),
            projectRaw(0, basket.length, basket.height),
            projectRaw(
                basket.width,
                basket.length,
                basket.height
            )
        ];


        const minX = Math.min(...points.map(p => p.x));
        const maxX = Math.max(...points.map(p => p.x));

        const minY = Math.min(...points.map(p => p.y));
        const maxY = Math.max(...points.map(p => p.y));


        const sceneWidth = maxX - minX;
        const sceneHeight = maxY - minY;


        // Initial framing only.
        //
        // This function should NOT be called during normal
        // orbiting/zooming.

        SCALE = Math.min(
            (canvas.width - MARGIN * 2) / sceneWidth,
            (canvas.height - MARGIN * 2) / sceneHeight
        );


        OFFSET_X =
            (canvas.width - sceneWidth * SCALE) / 2 -
            minX * SCALE;

        OFFSET_Y =
            (canvas.height - sceneHeight * SCALE) / 2 -
            minY * SCALE;
    }


    function resize() {

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;


        if (currentView.type === "basket") {
            calculateView();
        }


        draw();
    }

    window.addEventListener("resize", resize);

    // ============================================================
    // Orbit Controls
    // ============================================================

    let dragging = false;

    let dragButton = 0;

    let lastMouseX = 0;
    let lastMouseY = 0;


    // ------------------------------------------------------------
    // Mouse down
    // ------------------------------------------------------------

    canvas.addEventListener("mousedown", function(event) {

        dragging = true;

        dragButton = event.button;

        lastMouseX = event.clientX;
        lastMouseY = event.clientY;

        canvas.style.cursor = "grabbing";
    });


    // ------------------------------------------------------------
    // Mouse move
    // ------------------------------------------------------------

    window.addEventListener("mousemove", function(event) {

        if (!dragging) {
            return;
        }


        const dx =
            event.clientX - lastMouseX;

        const dy =
            event.clientY - lastMouseY;


        lastMouseX = event.clientX;
        lastMouseY = event.clientY;


        // --------------------------------------------------------
        // Left mouse = orbit
        // --------------------------------------------------------

        if (dragButton === 0) {

            cameraAzimuth -= dx * 0.01;

            cameraElevation += dy * 0.01;


            // Don't allow the camera to flip upside down.

            const limit =
                Math.PI / 2 - 0.05;

            cameraElevation = Math.max(
                -limit,
                Math.min(
                    limit,
                    cameraElevation
                )
            );
        }


        // --------------------------------------------------------
        // Middle/right mouse = pan
        // --------------------------------------------------------

        else {

            const panSpeed =
                1 / Math.max(SCALE, 0.0001);


            // Approximate screen-space panning.

            targetX -=
                dx *
                panSpeed *
                0.5;

            targetY +=
                dy *
                panSpeed *
                0.5;
        }


        draw();
    });


    // ------------------------------------------------------------
    // Mouse up
    // ------------------------------------------------------------

    window.addEventListener("mouseup", function() {

        dragging = false;

        canvas.style.cursor = "grab";
    });


    // ------------------------------------------------------------
    // Prevent context menu
    // ------------------------------------------------------------

    canvas.addEventListener(
        "contextmenu",
        function(event) {
            event.preventDefault();
        }
    );


    // ------------------------------------------------------------
    // Wheel = zoom
    // ------------------------------------------------------------

    canvas.addEventListener(
        "wheel",
        function(event) {

            event.preventDefault();


            const zoomFactor =
                Math.exp(-event.deltaY * 0.001);


            cameraDistance *= zoomFactor;


            cameraDistance = Math.max(
                0.2,
                Math.min(
                    8,
                    cameraDistance
                )
            );


            draw();
        },
        { passive: false }
    );


    // ------------------------------------------------------------
    // Double click = reset
    // ------------------------------------------------------------

    canvas.addEventListener(
        "dblclick",
        function() {

            cameraAzimuth = -Math.PI / 4;

            cameraElevation = Math.PI / 6;

            cameraDistance = 1;

            if (currentView.type === "basket") {
                calculateView();
            }

            draw();
        }
    );


    canvas.style.cursor = "grab";


    // ============================================================
    // Lines
    // ============================================================

    function drawLine(a, b) {
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
    }


    // ============================================================
    // Package rendering
    // ============================================================

    function drawBox(
        x,
        y,
        z,
        width,
        length,
        height,
        colour
    ) {
        const p000 = project(x, y, z);

        const p100 = project(
            x + width,
            y,
            z
        );

        const p010 = project(
            x,
            y + length,
            z
        );

        const p110 = project(
            x + width,
            y + length,
            z
        );

        const p001 = project(
            x,
            y,
            z + height
        );

        const p101 = project(
            x + width,
            y,
            z + height
        );

        const p011 = project(
            x,
            y + length,
            z + height
        );

        const p111 = project(
            x + width,
            y + length,
            z + height
        );


        function face(points, alpha) {
            ctx.beginPath();

            ctx.moveTo(
                points[0].x,
                points[0].y
            );

            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(
                    points[i].x,
                    points[i].y
                );
            }

            ctx.closePath();

            ctx.globalAlpha = alpha;
            ctx.fillStyle = colour;
            ctx.fill();

            ctx.globalAlpha = 1;

            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 1;
            ctx.stroke();
        }


        // Bottom

        face(
            [
                p000,
                p100,
                p110,
                p010
            ],
            0.35
        );


        // XZ @ -Y

        face(
            [
                p000,
                p100,
                p101,
                p001
            ],
            0.75
        );


        // YZ @ +X

        face(
            [
                p100,
                p110,
                p111,
                p101
            ],
            0.65
        );


        // XZ @ +Y

        face(
            [
                p010,
                p110,
                p111,
                p011
            ],
            0.45
        );


        // YZ @ -X

        face(
            [
                p000,
                p010,
                p011,
                p001
            ],
            0.55
        );


        // Top

        face(
            [
                p001,
                p101,
                p111,
                p011
            ],
            0.9
        );
    }


    // ============================================================
    // Basket vertices
    // ============================================================

    function getBasketPoints() {
        const basket = getCurrentBasket();
        return {
            p000: project(0, 0, 0),

            p100: project(
                basket.width,
                0,
                0
            ),

            p010: project(
                0,
                basket.length,
                0
            ),

            p110: project(
                basket.width,
                basket.length,
                0
            ),

            p001: project(
                0,
                0,
                basket.height
            ),

            p101: project(
                basket.width,
                0,
                basket.height
            ),

            p011: project(
                0,
                basket.length,
                basket.height
            ),

            p111: project(
                basket.width,
                basket.length,
                basket.height
            )
        };
    }


    // ============================================================
    // Basket BACK edges
    //
    // These are NOT part of:
    //
    //     YZ @ -X
    //     XZ @ -Y
    //     XY @ +Z
    //
    // Therefore they are drawn BEFORE the packages.
    //
    //     p100 -> p110
    //     p010 -> p110
    //     p110 -> p111
    // ============================================================

    function drawBasketBackEdges() {

        const p = getBasketPoints();

        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.globalAlpha = 1;

        // --------------------------------------------------------
        // XZ @ +Y
        //
        // p000 -> p010
        // p010 -> p011
        // p011 -> p001
        // p001 -> p000
        // --------------------------------------------------------

        drawLine(p.p000, p.p010);
        drawLine(p.p010, p.p011);
        drawLine(p.p011, p.p001);
        drawLine(p.p001, p.p000);

        // --------------------------------------------------------
        // YZ @ +X
        //
        // p000 -> p100
        // p100 -> p101
        // p101 -> p001
        //
        // p001 -> p000 already drawn above.
        // --------------------------------------------------------

        drawLine(p.p000, p.p100);
        drawLine(p.p100, p.p101);
        drawLine(p.p101, p.p001);

        // Duplicate, ignore em cos fucking ChatGPT doesn't know shit
        //drawLine(p.p000, p.p010);
        //drawLine(p.p010, p.p011);
        //drawLine(p.p011, p.p001);
        //drawLine(p.p001, p.p000);
    }


    // ============================================================
    // Basket FOREGROUND edges
    //
    // EXACTLY the edges belonging to:
    //
    //     YZ @ -X
    //     XZ @ -Y
    //     XY @ +Z
    //
    // Shared edges are drawn once.
    // ============================================================

    function drawBasketFrontEdges() {
        const p = getBasketPoints();

        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.globalAlpha = 1;


        // --------------------------------------------------------
        // XY @ +Z
        //
        // p001 -> p101
        // p101 -> p111
        // p111 -> p011
        //
        // p011 -> p001 already drawn above.
        // --------------------------------------------------------

        drawLine(p.p001, p.p101);
        drawLine(p.p101, p.p111);
        drawLine(p.p111, p.p011);

        // --------------------------------------------------------
        // XZ @ -Y
        // bottom, 
        // --------------------------------------------------------
        drawLine(p.p100, p.p110);

        // --------------------------------------------------------
        // YZ @ -X
        // bottom, right
        // --------------------------------------------------------
        drawLine(p.p010, p.p110);
        drawLine(p.p110, p.p111);
    }


    // ============================================================
    // XYZ reference
    // ============================================================

    function drawAxes() {
        const origin = {
            x: 100,
            y: canvas.height - 100
        };

        const scale = 60;

        const axes = [
            {
                name: "X",
                x: scale,
                y: -scale * 0.5
            },
            {
                name: "Y",
                x: -scale,
                y: -scale * 0.5
            },
            {
                name: "Z",
                x: 0,
                y: -scale
            }
        ];


        ctx.save();

        ctx.lineWidth = 3;
        ctx.font = "bold 18px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";


        axes.forEach(function(axis) {
            const end = {
                x: origin.x + axis.x,
                y: origin.y + axis.y
            };

            ctx.beginPath();

            ctx.moveTo(
                origin.x,
                origin.y
            );

            ctx.lineTo(
                end.x,
                end.y
            );

            ctx.stroke();


            const angle = Math.atan2(
                axis.y,
                axis.x
            );

            const arrowSize = 12;


            ctx.beginPath();

            ctx.moveTo(
                end.x,
                end.y
            );

            ctx.lineTo(
                end.x -
                    arrowSize *
                    Math.cos(angle - Math.PI / 6),

                end.y -
                    arrowSize *
                    Math.sin(angle - Math.PI / 6)
            );

            ctx.lineTo(
                end.x -
                    arrowSize *
                    Math.cos(angle + Math.PI / 6),

                end.y -
                    arrowSize *
                    Math.sin(angle + Math.PI / 6)
            );

            ctx.closePath();

            ctx.fill();


            ctx.fillText(
                axis.name,
                end.x + Math.cos(angle) * 20,
                end.y + Math.sin(angle) * 20
            );
        });


        ctx.beginPath();

        ctx.arc(
            origin.x,
            origin.y,
            4,
            0,
            Math.PI * 2
        );

        ctx.fill();

        ctx.restore();
    }


    // ============================================================
    // Main rendering
    // ============================================================

    function updateInfo() {

        if (currentView.type === "unplaced") {
            info.textContent =
                "Unplaced — " +
                DATA.unplaced.length +
                " items";

            return;
        }


        const basket = getCurrentBasket();

        info.textContent =
            "Basket " +
            basket.number +
            " — " +
            basket.placements.length +
            " packages";
    }


    function drawUnplaced() {

        info.textContent =
            "Unplaced — " +
            DATA.unplaced.length +
            " items";


        ctx.save();

        ctx.fillStyle = "#ffffff";
        ctx.font = "20px Arial";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";


        let y = 100;

        DATA.unplaced.forEach(function(item, index) {

            const number =
                item.item_number !== undefined
                    ? item.item_number
                    : "";

            const name =
                item.name !== undefined
                    ? item.name
                    : "Unnamed item";

            ctx.fillText(
                number + " — " + name,
                60,
                y
            );

            y += 32;
        });


        if (DATA.unplaced.length === 0) {

            ctx.fillText(
                "No unplaced items.",
                60,
                y
            );
        }


        ctx.restore();
    }

    function getCameraDepth(x, y, z) {
        return projectRaw(x, y, z).depth;
    }

    function getBoxFaces(
        x,
        y,
        z,
        width,
        length,
        height,
        colour
    ) {
        // Screen-space points used for drawing.
        const p000 = project(x, y, z);
        const p100 = project(x + width, y, z);
        const p010 = project(x, y + length, z);
        const p110 = project(
            x + width,
            y + length,
            z
        );

        const p001 = project(x, y, z + height);
        const p101 = project(
            x + width,
            y,
            z + height
        );

        const p011 = project(
            x,
            y + length,
            z + height
        );

        const p111 = project(
            x + width,
            y + length,
            z + height
        );


        // Camera-space points used ONLY for depth ordering.
        const d000 = projectRaw(x, y, z);
        const d100 = projectRaw(x + width, y, z);
        const d010 = projectRaw(x, y + length, z);
        const d110 = projectRaw(
            x + width,
            y + length,
            z
        );

        const d001 = projectRaw(x, y, z + height);
        const d101 = projectRaw(
            x + width,
            y,
            z + height
        );

        const d011 = projectRaw(
            x,
            y + length,
            z + height
        );

        const d111 = projectRaw(
            x + width,
            y + length,
            z + height
        );


        return [
            {
                points: [p000, p100, p110, p010],
                depths: [d000, d100, d110, d010],
                alpha: 0.35
            },

            {
                points: [p000, p100, p101, p001],
                depths: [d000, d100, d101, d001],
                alpha: 0.75
            },

            {
                points: [p100, p110, p111, p101],
                depths: [d100, d110, d111, d101],
                alpha: 0.65
            },

            {
                points: [p010, p110, p111, p011],
                depths: [d010, d110, d111, d011],
                alpha: 0.45
            },

            {
                points: [p000, p010, p011, p001],
                depths: [d000, d010, d011, d001],
                alpha: 0.55
            },

            {
                points: [p001, p101, p111, p011],
                depths: [d001, d101, d111, d011],
                alpha: 0.9
            }
        ].map(function(face) {

            face.colour = colour;

            face.depth =
                face.depths.reduce(
                    function(sum, point) {
                        return sum + point.depth;
                    },
                    0
                ) / face.depths.length;

            delete face.depths;

            return face;
        });
    }


    function drawFace(face) {

        ctx.beginPath();

        ctx.moveTo(
            face.points[0].x,
            face.points[0].y
        );

        for (let i = 1; i < face.points.length; i++) {
            ctx.lineTo(
                face.points[i].x,
                face.points[i].y
            );
        }

        ctx.closePath();

        ctx.globalAlpha = face.alpha;
        ctx.fillStyle = face.colour;
        ctx.fill();

        ctx.globalAlpha = 1;

        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    function draw() {
        ctx.clearRect(
            0,
            0,
            canvas.width,
            canvas.height
        );

        if (currentView.type === "unplaced") {
            drawUnplaced();
            return;
        }

        const basket = getCurrentBasket();
        updateInfo();


        // ========================================================
        // 1. BACK BASKET EDGES
        // ========================================================

        drawBasketBackEdges();



        // ========================================================
        // 2. PACKAGES
        // ========================================================

        const colours = [
            "#4dabf7",
            "#ff6b6b",
            "#51cf66",
            "#ffd43b",
            "#cc5de8",
            "#20c997",
            "#ff922b"
        ];


        function getPlacementColour(placement) {

            const key =
                String(placement.item_number) +
                "|" +
                String(placement.name);


            let hash = 0;


            for (let i = 0; i < key.length; i++) {
                hash =
                    ((hash << 5) - hash) +
                    key.charCodeAt(i);

                hash |= 0;
            }


            const index =
                Math.abs(hash) % colours.length;


            return colours[index];
        }


        const faces = [];

        basket.placements.forEach(function(placement) {

            const colour =
                getPlacementColour(placement);

            const boxFaces = getBoxFaces(
                placement.x,
                placement.y,
                placement.z,
                placement.width,
                placement.length,
                placement.height,
                colour
            );

            boxFaces.forEach(function(face) {
                faces.push(face);
            });
        });


        faces.sort(function(a, b) {
            return a.depth - b.depth;
        });


        faces.forEach(function(face) {
            drawFace(face);
        });


        // ========================================================
        // 3. FRONT / SIDE / TOP BASKET EDGES
        //
        // YZ @ -X
        // XZ @ -Y
        // XY @ +Z
        // ========================================================

        drawBasketFrontEdges();


        // ========================================================
        // 4. XYZ AXES
        // ========================================================

        drawAxes();
    }


    resize();
    </script>

    </body>
    </html>
    """

        output.write_text(
            html.replace("__DATA__", json_data),
            encoding="utf-8",
        )