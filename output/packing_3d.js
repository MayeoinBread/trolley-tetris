"use strict";


// ============================================================
// Data
// ============================================================

const dataElement =
    document.getElementById("packing-data");

if (!dataElement) {
    throw new Error("Packing data was not provided.");
}

const DATA = JSON.parse(dataElement.textContent);


// ============================================================
// DOM
// ============================================================

const canvas = document.getElementById("canvas");

const info = document.getElementById("info");

// ============================================================
// WebGL
// ============================================================

const gl =
    canvas.getContext("webgl", {
        alpha: false,
        antialias: true,
        depth: true
    });


if (!gl) {

    document.body.insertAdjacentHTML(
        "beforeend",
        '<div id="error">' +
        'WebGL is not available in this browser.' +
        '</div>'
    );

    throw new Error(
        "WebGL is not available."
    );
}


// Depth testing is what fixes the z-order problem.

gl.enable(gl.DEPTH_TEST);
gl.depthFunc(gl.LEQUAL);

gl.enable(gl.CULL_FACE);
gl.cullFace(gl.BACK);


// ============================================================
// Shaders
// ============================================================

const vertexShaderSource = `
    attribute vec3 a_position;
    attribute vec3 a_normal;

    uniform mat4 u_projection;
    uniform mat4 u_view;
    uniform mat4 u_model;

    varying vec3 v_normal;

    void main() {

        // Transform the normal into world space.
        v_normal =
            mat3(u_model) *
            a_normal;

        gl_Position =
            u_projection *
            u_view *
            u_model *
            vec4(a_position, 1.0);
    }
`;


const fragmentShaderSource = `
    precision mediump float;

    uniform vec4 u_colour;
    uniform float u_highlight;

    varying vec3 v_normal;

    void main() {

        vec3 normal =
            normalize(v_normal);

        // Fixed directional light.
        vec3 lightDirection =
            normalize(vec3(
                -0.6,
                -0.8,
                1.0
            ));

        float diffuse =
            max(
                dot(normal, lightDirection),
                0.0
            );


        // Keep some light on every face.
        float ambient = 0.30;


        // Directional contribution.
        float lighting =
            ambient +
            diffuse * 0.70;


        lighting =
            clamp(
                lighting,
                0.0,
                1.0
            );

        vec3 finalColour = u_colour.rgb * lighting;

        if (u_highlight > 0.5) {
            finalColour = mix(finalColour, vec3(1.0), 0.35);
        }


        gl_FragColor =
            vec4(
                finalColour,
                u_colour.a
            );
    }
`;


function createShader(type, source) {

    const shader =
        gl.createShader(type);

    gl.shaderSource(
        shader,
        source
    );

    gl.compileShader(shader);


    if (!gl.getShaderParameter(
        shader,
        gl.COMPILE_STATUS
    )) {

        const message =
            gl.getShaderInfoLog(shader);

        gl.deleteShader(shader);

        throw new Error(
            "Shader compilation failed:\\n" +
            message
        );
    }


    return shader;
}


function createProgram(
    vertexSource,
    fragmentSource
) {

    const vertexShader =
        createShader(
            gl.VERTEX_SHADER,
            vertexSource
        );

    const fragmentShader =
        createShader(
            gl.FRAGMENT_SHADER,
            fragmentSource
        );


    const program =
        gl.createProgram();

    gl.attachShader(
        program,
        vertexShader
    );

    gl.attachShader(
        program,
        fragmentShader
    );

    gl.linkProgram(program);


    if (!gl.getProgramParameter(
        program,
        gl.LINK_STATUS
    )) {

        const message =
            gl.getProgramInfoLog(program);

        throw new Error(
            "WebGL program linking failed:\\n" +
            message
        );
    }


    return program;
}


const program =
    createProgram(
        vertexShaderSource,
        fragmentShaderSource
    );


gl.useProgram(program);


// ============================================================
// Shader locations
// ============================================================

const positionLocation =
    gl.getAttribLocation(
        program,
        "a_position"
    );

const normalLocation =
    gl.getAttribLocation(
        program,
        "a_normal"
    );

const highlightLocation =
    gl.getUniformLocation(
        program,
        "u_highlight"
    );

const projectionLocation =
    gl.getUniformLocation(
        program,
        "u_projection"
    );


const viewLocation =
    gl.getUniformLocation(
        program,
        "u_view"
    );


const modelLocation =
    gl.getUniformLocation(
        program,
        "u_model"
    );


const colourLocation =
    gl.getUniformLocation(
        program,
        "u_colour"
    );


gl.enableVertexAttribArray(
    positionLocation
);

gl.enableVertexAttribArray(
    normalLocation
);


// ============================================================
// Matrix helpers
// ============================================================

function identityMatrix() {

    return new Float32Array([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ]);
}


function multiplyMatrices(a, b) {

    const result =
        new Float32Array(16);


    for (let row = 0; row < 4; row++) {

        for (let column = 0; column < 4; column++) {

            result[
                column * 4 + row
            ] =
                a[0 * 4 + row] *
                b[column * 4 + 0] +

                a[1 * 4 + row] *
                b[column * 4 + 1] +

                a[2 * 4 + row] *
                b[column * 4 + 2] +

                a[3 * 4 + row] *
                b[column * 4 + 3];
        }
    }


    return result;
}


function translationMatrix(
    x,
    y,
    z
) {

    const matrix =
        identityMatrix();

    matrix[12] = x;
    matrix[13] = y;
    matrix[14] = z;

    return matrix;
}


function rotationX(angle) {

    const c = Math.cos(angle);
    const s = Math.sin(angle);

    return new Float32Array([
        1, 0, 0, 0,
        0, c, s, 0,
        0, -s, c, 0,
        0, 0, 0, 1
    ]);
}


function rotationZ(angle) {

    const c = Math.cos(angle);
    const s = Math.sin(angle);

    return new Float32Array([
        c, s, 0, 0,
        -s, c, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ]);
}


function orthographic(
    left,
    right,
    bottom,
    top,
    near,
    far
) {

    return new Float32Array([
        2 / (right - left),
        0,
        0,
        0,

        0,
        2 / (top - bottom),
        0,
        0,

        0,
        0,
        -2 / (far - near),
        0,

        -(right + left) /
            (right - left),

        -(top + bottom) /
            (top - bottom),

        -(far + near) /
            (far - near),

        1
    ]);
}

// ============================================================
// Colours
// ============================================================

const colours = [
    [0.302, 0.671, 0.969], // blue
    [1.000, 0.420, 0.420], // red
    [0.318, 0.812, 0.400], // green
    [1.000, 0.831, 0.231], // yellow
    [0.800, 0.365, 0.910], // purple
    [0.125, 0.788, 0.604], // teal
    [1.000, 0.573, 0.169], // orange
    [0.969, 0.502, 0.667], // pink
    [0.400, 0.600, 1.000], // light blue
    [0.600, 0.400, 0.800]  // violet
];


function assignColours() {

    let colourIndex = 0;


    DATA.baskets.forEach(
        function(basket) {

            basket.placements.forEach(
                function(placement) {

                    placement._colour =
                        colours[
                            colourIndex %
                            colours.length
                        ];

                    colourIndex++;
                }
            );
        }
    );


    DATA.unplaced.forEach(
        function(item) {

            item._colour =
                colours[
                    colourIndex %
                    colours.length
                ];

            colourIndex++;
        }
    );
}

function getUnplacedRenderItems() {

    if (
        !Array.isArray(DATA.unplaced) ||
        DATA.unplaced.length === 0
    ) {
        return [];
    }

    return DATA.unplaced.map(
        function(packageItem, index) {

            return {
                x: packageItem._renderX,
                y: packageItem._renderY,
                z: packageItem._renderZ,

                width: packageItem.width,
                length: packageItem.length,
                height: packageItem.height,

                weight: packageItem.weight,

                name:
                    packageItem.name ??
                    "Unnamed package",

                item_number:
                    packageItem.item_number ?? "",

                _colour:
                    colours[
                        index %
                        colours.length
                    ],

                _unplaced: true,

                _source: packageItem
            };
        }
    );
}

// ============================================================
// Geometry
// ============================================================

// ============================================================
// Cube geometry
// ============================================================

const cubePositions = new Float32Array([

    // ========================================================
    // Bottom (-Z)
    // ========================================================

    0, 0, 0,
    1, 1, 0,
    1, 0, 0,

    0, 0, 0,
    0, 1, 0,
    1, 1, 0,


    // ========================================================
    // Top (+Z)
    // ========================================================

    0, 0, 1,
    1, 0, 1,
    1, 1, 1,

    0, 0, 1,
    1, 1, 1,
    0, 1, 1,


    // ========================================================
    // -Y
    // ========================================================

    0, 0, 0,
    1, 0, 0,
    1, 0, 1,

    0, 0, 0,
    1, 0, 1,
    0, 0, 1,


    // ========================================================
    // +Y
    // ========================================================

    0, 1, 0,
    1, 1, 1,
    1, 1, 0,

    0, 1, 0,
    0, 1, 1,
    1, 1, 1,


    // ========================================================
    // -X
    // ========================================================

    0, 0, 0,
    0, 0, 1,
    0, 1, 1,

    0, 0, 0,
    0, 1, 1,
    0, 1, 0,


    // ========================================================
    // +X
    // ========================================================

    1, 0, 0,
    1, 1, 0,
    1, 1, 1,

    1, 0, 0,
    1, 1, 1,
    1, 0, 1
]);


const cubeNormals = new Float32Array([

    // Bottom (-Z)

    0, 0, -1,
    0, 0, -1,
    0, 0, -1,

    0, 0, -1,
    0, 0, -1,
    0, 0, -1,


    // Top (+Z)

    0, 0, 1,
    0, 0, 1,
    0, 0, 1,

    0, 0, 1,
    0, 0, 1,
    0, 0, 1,


    // -Y

    0, -1, 0,
    0, -1, 0,
    0, -1, 0,

    0, -1, 0,
    0, -1, 0,
    0, -1, 0,


    // +Y

    0, 1, 0,
    0, 1, 0,
    0, 1, 0,

    0, 1, 0,
    0, 1, 0,
    0, 1, 0,


    // -X

    -1, 0, 0,
    -1, 0, 0,
    -1, 0, 0,

    -1, 0, 0,
    -1, 0, 0,
    -1, 0, 0,


    // +X

    1, 0, 0,
    1, 0, 0,
    1, 0, 0,

    1, 0, 0,
    1, 0, 0,
    1, 0, 0
]);


const cubePositionBuffer =
    gl.createBuffer();

gl.bindBuffer(
    gl.ARRAY_BUFFER,
    cubePositionBuffer
);

gl.bufferData(
    gl.ARRAY_BUFFER,
    cubePositions,
    gl.STATIC_DRAW
);


const cubeNormalBuffer =
    gl.createBuffer();

gl.bindBuffer(
    gl.ARRAY_BUFFER,
    cubeNormalBuffer
);

gl.bufferData(
    gl.ARRAY_BUFFER,
    cubeNormals,
    gl.STATIC_DRAW
);


const CUBE_VERTEX_COUNT =
    cubePositions.length / 3;


// ============================================================
// Basket dimensions / camera framing
// ============================================================

function getSceneDimensions() {

    let totalWidth = 0;
    let maxLength = 0;
    let maxHeight = 0;


    DATA.baskets.forEach(
        function(basket, index) {

            totalWidth +=
                basket.width;

            if (index > 0) {
                totalWidth +=
                    BASKET_GAP;
            }

            maxLength =
                Math.max(
                    maxLength,
                    basket.length
                );

            maxHeight =
                Math.max(
                    maxHeight,
                    basket.height
                );
        }
    );


    /*
     * Unplaced items are positioned in front
     * of the baskets, so they extend the scene
     * in Y rather than X.
     */

    if (
        DATA.unplaced.length > 0
    ) {

        const unplacedDepth =
            getUnplacedAreaDepth();


        maxLength +=
            UNPLACED_GAP +
            unplacedDepth;
    }


    return {
        width: totalWidth,
        length: maxLength,
        height: maxHeight
    };
}


function resetCamera() {

    cameraAzimuth = DEFAULT_AZIMUTH;

    cameraElevation = DEFAULT_ELEVATION;

    cameraZoom = DEFAULT_ZOOM;

    panX = 0;
    panY = 0;

    const dimensions = getSceneDimensions();
    targetX = dimensions.width / 2;
    targetY = dimensions.length / 2;
    targetZ = dimensions.height / 2;
    return;
}


function calculateBaseScale() {

    const dimensions = getSceneDimensions();
    const width = dimensions.width;
    const length = dimensions.length;
    const height = dimensions.height;

    const largestDimension = Math.max(width, length, height);


    if (largestDimension <= 0) {
        return 1;
    }


    return 1 / largestDimension;
}


// ============================================================
// Camera
// ============================================================

let cameraAzimuth = -Math.PI / 4;
let cameraElevation = Math.PI / 6;
let cameraZoom = 1;

let targetX = 0;
let targetY = 0;
let targetZ = 0;

let panX = 0;
let panY = 0;


const DEFAULT_AZIMUTH =
    -Math.PI / 4;

const DEFAULT_ELEVATION =
    Math.PI / 6;

const DEFAULT_ZOOM = 1;

// ============================================================
// Hover / selection
// ============================================================

let hoveredPlacement = null;

// ============================================================
// Package picking
// ============================================================

const BASKET_GAP = 50;
const UNPLACED_GAP = 50;
const UNPLACED_COLUMN_GAP = 20;
const UNPLACED_ROW_GAP = 20;

function getBasketOffset(index) {
    let x=0;
    for (let i=0; i<index; i++) {
        x += DATA.baskets[i].width;
        x += BASKET_GAP;
    }

    return {
        x: x, y: 0, z: 0
    };
}

function getUnplacedAreaDepth() {

    if (
        !DATA.unplaced ||
        DATA.unplaced.length === 0
    ) {
        return 0;
    }


    let totalDepth = 0;


    DATA.unplaced.forEach(
        function(item) {

            totalDepth =
                Math.max(
                    totalDepth,
                    item.length
                );
        }
    );


    return totalDepth;
}

function getUnplacedPosition(index) {

    const maxBasketLength =
        DATA.baskets.reduce(
            function(max, basket) {
                return Math.max(
                    max,
                    basket.length
                );
            },
            0
        );


    const areaY =
        maxBasketLength +
        UNPLACED_GAP;


    const column =
        index % 2;

    const row =
        Math.floor(index / 2);


    const COLUMN_WIDTH =
        getUnplacedColumnWidth();


    let x =
        column *
        (
            COLUMN_WIDTH +
            UNPLACED_COLUMN_GAP
        );


    let y =
        areaY;


    for (
        let i = 0;
        i < row;
        i++
    ) {

        y +=
            getUnplacedRowHeight(i) +
            UNPLACED_ROW_GAP;
    }


    return {
        x: x,
        y: y,
        z: 0
    };
}

function getUnplacedColumnWidth() {

    return DATA.unplaced.reduce(
        function(max, item) {

            return Math.max(
                max,
                item.width
            );
        },
        0
    );
}

function getUnplacedRowHeight(row) {

    const firstIndex =
        row * 2;

    const secondIndex =
        firstIndex + 1;


    let height =
        DATA.unplaced[
            firstIndex
        ].length;


    if (
        secondIndex <
        DATA.unplaced.length
    ) {

        height =
            Math.max(
                height,
                DATA.unplaced[
                    secondIndex
                ].length
            );
    }


    return height;
}

function getMouseRay(
    mouseX,
    mouseY
) {

    const rect =
        canvas.getBoundingClientRect();


    // --------------------------------------------------------
    // Mouse -> Normalised Device Coordinates
    // --------------------------------------------------------

    const ndcX =
        (
            (mouseX - rect.left) /
            rect.width
        ) * 2 - 1;


    const ndcY =
        1 -
        (
            (mouseY - rect.top) /
            rect.height
        ) * 2;


    // --------------------------------------------------------
    // Match the renderer's orthographic projection
    // --------------------------------------------------------

    const aspect =
        canvas.width /
        canvas.height;

    const size = 1.2;


    /*
     * These are coordinates in camera/view space.
     *
     * The camera looks down -Z.
     */

    const cameraX =
        ndcX *
        size *
        aspect;

    const cameraY =
        ndcY *
        size;


    /*
     * The projection uses:
     *
     * near = -20
     * far  =  20
     *
     * Start at the far side of the
     * viewing volume and travel towards
     * the camera.
     */

    const cameraZ = 20;


    // --------------------------------------------------------
    // Undo camera zoom
    // --------------------------------------------------------

    const zoom =
        cameraZoom;


    let x =
        cameraX /
        zoom;

    let y =
        cameraY /
        zoom;

    let z =
        cameraZ /
        zoom;


    // --------------------------------------------------------
    // Undo scene scale
    // --------------------------------------------------------

    const scale =
        calculateSceneScale();


    x /= scale;
    y /= scale;
    z /= scale;


    // --------------------------------------------------------
    // Undo camera elevation
    // --------------------------------------------------------

    const cosElevation =
        Math.cos(
            cameraElevation
        );

    const sinElevation =
        Math.sin(
            cameraElevation
        );


    let worldY =
        y *
        cosElevation -
        z *
        sinElevation;

    let worldZ =
        y *
        sinElevation +
        z *
        cosElevation;


    y =
        worldY;

    z =
        worldZ;


    // --------------------------------------------------------
    // Undo camera azimuth
    // --------------------------------------------------------

    const cosAzimuth =
        Math.cos(
            cameraAzimuth
        );

    const sinAzimuth =
        Math.sin(
            cameraAzimuth
        );


    let worldX =
        x *
        cosAzimuth -
        y *
        sinAzimuth;

    worldY =
        x *
        sinAzimuth +
        y *
        cosAzimuth;


    x =
        worldX;

    y =
        worldY;


    // --------------------------------------------------------
    // Undo camera target translation
    // --------------------------------------------------------

    x += targetX;
    y += targetY;
    z += targetZ;


    // --------------------------------------------------------
    // Ray direction
    //
    // The orthographic ray always travels along
    // camera-space -Z. Transform that direction
    // through the inverse camera rotations.
    // --------------------------------------------------------

    let directionX = 0;
    let directionY = 0;
    let directionZ = -1;


    // Undo elevation

    worldY =
        directionY *
        cosElevation -
        directionZ *
        sinElevation;

    worldZ =
        directionY *
        sinElevation +
        directionZ *
        cosElevation;


    directionY =
        worldY;

    directionZ =
        worldZ;


    // Undo azimuth

    worldX =
        directionX *
        cosAzimuth -
        directionY *
        sinAzimuth;

    worldY =
        directionX *
        sinAzimuth +
        directionY *
        cosAzimuth;


    directionX =
        worldX;

    directionY =
        worldY;


    return {
        origin: {
            x: x,
            y: y,
            z: z
        },

        direction: {
            x: directionX,
            y: directionY,
            z: directionZ
        }
    };
}


function rayIntersectsBox(
    origin,
    direction,
    box
) {
    let tMin = -Infinity;
    let tMax = Infinity;


    const axes = [
        {
            origin: origin.x,
            direction: direction.x,
            min: box.x,
            max: box.x + box.width
        },

        {
            origin: origin.y,
            direction: direction.y,
            min: box.y,
            max: box.y + box.length
        },

        {
            origin: origin.z,
            direction: direction.z,
            min: box.z,
            max: box.z + box.height
        }
    ];


    for (
        let i = 0;
        i < axes.length;
        i++
    ) {

        const axis =
            axes[i];


        if (
            Math.abs(axis.direction) <
            0.000001
        ) {

            if (
                axis.origin < axis.min ||
                axis.origin > axis.max
            ) {
                return null;
            }

            continue;
        }


        let t1 =
            (
                axis.min -
                axis.origin
            ) /
            axis.direction;


        let t2 =
            (
                axis.max -
                axis.origin
            ) /
            axis.direction;


        if (t1 > t2) {

            const temp = t1;

            t1 = t2;
            t2 = temp;
        }


        tMin =
            Math.max(
                tMin,
                t1
            );

        tMax =
            Math.min(
                tMax,
                t2
            );


        if (tMin > tMax) {
            return null;
        }
    }


    if (tMax < 0) {
        return null;
    }


    return tMin >= 0
        ? tMin
        : tMax;
}


function pickPlacement(
    mouseX,
    mouseY
) {

    const ray =
        getMouseRay(
            mouseX,
            mouseY
        );


    let closest = null;
    let closestDistance = Infinity;


    // --------------------------------------------------------
    // Placed packages
    // --------------------------------------------------------

    DATA.baskets.forEach(
        function(basket, basketIndex) {

            const offset =
                getBasketOffset(
                    basketIndex
                );


            basket.placements.forEach(
                function(placement) {

                    const testBox = {

                        x:
                            placement.x +
                            offset.x,

                        y:
                            placement.y +
                            offset.y,

                        z:
                            placement.z +
                            offset.z,

                        width:
                            placement.width,

                        length:
                            placement.length,

                        height:
                            placement.height
                    };


                    const distance =
                        rayIntersectsBox(
                            ray.origin,
                            ray.direction,
                            testBox
                        );


                    if (
                        distance !== null &&
                        distance >= 0 &&
                        distance < closestDistance
                    ) {

                        closest =
                            placement;

                        closestDistance =
                            distance;
                    }
                }
            );
        }
    );


    // --------------------------------------------------------
    // Unplaced packages
    // --------------------------------------------------------

    if (
        DATA.unplaced &&
        DATA.unplaced.length > 0
    ) {

        DATA.unplaced.forEach(
            function(item) {

                const placement =
                    item._pseudoPlacement;


                if (!placement) {
                    return;
                }


                const distance =
                    rayIntersectsBox(
                        ray.origin,
                        ray.direction,
                        placement
                    );


                if (
                    distance !== null &&
                    distance >= 0 &&
                    distance < closestDistance
                ) {

                    closest =
                        placement;

                    closestDistance =
                        distance;
                }
            }
        );
    }


    return closest;
}

// ============================================================
// Tooltip
// ============================================================

const tooltip =
    document.getElementById(
        "tooltip"
    );


function formatNumber(value) {

    if (
        Number.isInteger(value)
    ) {
        return String(value);
    }


    return Number(
        value.toFixed(2)
    ).toString();
}


function showTooltip(
    placement,
    mouseX,
    mouseY
) {

    if (!placement) {

        tooltip.style.display =
            "none";

        return;
    }


    const name =
        placement.name ??
        "Unnamed package";


    const itemNumber =
        placement.item_number ??
        "";


    tooltip.innerHTML =
        '<div class="tooltip-name">' +
        escapeHtml(name) +
        '</div>' +

        '<div class="tooltip-row">' +
        '<strong>Item:</strong> ' +
        escapeHtml(
            String(itemNumber)
        ) +
        '</div>' +

        '<div class="tooltip-row">' +
        '<strong>Dimensions:</strong> ' +
        formatNumber(
            placement.width
        ) +
        ' × ' +
        formatNumber(
            placement.length
        ) +
        ' × ' +
        formatNumber(
            placement.height
        ) +
        '</div>' +
        '<div class="tooltip-row">' +
        '<strong>Weight:</strong> ' +
        formatNumber(placement.weight) + '</div>';

        // '<div class="tooltip-row">' +
        // '<strong>Position:</strong> ' +
        // formatNumber(
        //     placement.x
        // ) +
        // ', ' +
        // formatNumber(
        //     placement.y
        // ) +
        // ', ' +
        // formatNumber(
        //     placement.z
        // ) +
        // '</div>';


    tooltip.style.left =
        (
            mouseX + 15
        ) + "px";


    tooltip.style.top =
        (
            mouseY + 15
        ) + "px";


    tooltip.style.display =
        "block";
}


function escapeHtml(value) {

    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

// ============================================================
// Matrix helpers
// ============================================================

function identityMatrix() {
    return new Float32Array([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ]);
}


function multiplyMatrices(a, b) {

    const result =
        new Float32Array(16);

    for (let column = 0; column < 4; column++) {
        for (let row = 0; row < 4; row++) {

            result[column * 4 + row] =
                a[0 * 4 + row] *
                b[column * 4 + 0] +

                a[1 * 4 + row] *
                b[column * 4 + 1] +

                a[2 * 4 + row] *
                b[column * 4 + 2] +

                a[3 * 4 + row] *
                b[column * 4 + 3];
        }
    }

    return result;
}


function translationMatrix(x, y, z) {

    const matrix =
        identityMatrix();

    matrix[12] = x;
    matrix[13] = y;
    matrix[14] = z;

    return matrix;
}


function rotationX(angle) {

    const c = Math.cos(angle);
    const s = Math.sin(angle);

    return new Float32Array([
        1, 0, 0, 0,
        0, c, s, 0,
        0, -s, c, 0,
        0, 0, 0, 1
    ]);
}


function rotationZ(angle) {

    const c = Math.cos(angle);
    const s = Math.sin(angle);

    return new Float32Array([
        c, s, 0, 0,
        -s, c, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ]);
}


function orthographic(
    left,
    right,
    bottom,
    top,
    near,
    far
) {

    return new Float32Array([
        2 / (right - left),
        0,
        0,
        0,

        0,
        2 / (top - bottom),
        0,
        0,

        0,
        0,
        -2 / (far - near),
        0,

        -(right + left) /
            (right - left),

        -(top + bottom) /
            (top - bottom),

        -(far + near) /
            (far - near),

        1
    ]);
}


// ============================================================
// Camera
// ============================================================

function resetCamera() {

    cameraAzimuth =
        DEFAULT_AZIMUTH;

    cameraElevation =
        DEFAULT_ELEVATION;

    cameraZoom =
        DEFAULT_ZOOM;

    panX = 0;
    panY = 0;

    const dimensions = getSceneDimensions();


    targetX = dimensions.width / 2;

    targetY = dimensions.length / 2;

    targetZ = dimensions.height / 2;
}


function calculateSceneScale() {

    const dimensions = getSceneDimensions();

    const largest = Math.max(dimensions.width, dimensions.length, dimensions.height);

    if (largest <= 0) {
        return 1;
    }

    return 2 / largest;
}


function getProjectionMatrix() {

    const aspect =
        canvas.width /
        canvas.height;


    const size = 1.2;


    return orthographic(
        -size * aspect,
        size * aspect,
        -size,
        size,
        -20,
        20
    );
}


function getViewMatrix() {

    const scale =
        calculateSceneScale();


    /*
     * Put the basket centre at the origin.
     */

    let view =
        translationMatrix(
            -targetX,
            -targetY,
            -targetZ
        );


    /*
     * Orbit around the centre.
     */

    view =
        multiplyMatrices(
            rotationZ(-cameraAzimuth),
            view
        );


    view =
        multiplyMatrices(
            rotationX(-cameraElevation),
            view
        );


    /*
     * Scale the entire basket into the
     * orthographic viewing volume.
     */

    const scaleMatrix =
        new Float32Array([
            scale, 0, 0, 0,
            0, scale, 0, 0,
            0, 0, scale, 0,
            0, 0, 0, 1
        ]);


    view =
        multiplyMatrices(
            scaleMatrix,
            view
        );


    /*
     * Zoom.

     * This deliberately changes only the
     * camera scale. It does NOT refit the
     * scene after orbiting.
     */

    const zoomMatrix =
        new Float32Array([
            cameraZoom, 0, 0, 0,
            0, cameraZoom, 0, 0,
            0, 0, cameraZoom, 0,
            0, 0, 0, 1
        ]);


    view =
        multiplyMatrices(
            zoomMatrix,
            view
        );


    /*
     * Pan.
     */

    view =
        multiplyMatrices(
            translationMatrix(
                panX,
                panY,
                0
            ),
            view
        );


    return view;
}


// ============================================================
// Model matrix
// ============================================================

function getBoxModel(
    x,
    y,
    z,
    width,
    length,
    height
) {

    return multiplyMatrices(

        translationMatrix(
            x,
            y,
            z
        ),

        new Float32Array([
            width, 0, 0, 0,
            0, length, 0, 0,
            0, 0, height, 0,
            0, 0, 0, 1
        ])
    );
}


// ============================================================
// Draw box
// ============================================================

function drawBox(
    placement,
    basketOffset
) {

    // --------------------------------------------------------
    // Position buffer
    // --------------------------------------------------------

    gl.bindBuffer(
        gl.ARRAY_BUFFER,
        cubePositionBuffer
    );

    gl.vertexAttribPointer(
        positionLocation,
        3,
        gl.FLOAT,
        false,
        0,
        0
    );

    gl.enableVertexAttribArray(
        positionLocation
    );


    // --------------------------------------------------------
    // Normal buffer
    // --------------------------------------------------------

    gl.bindBuffer(
        gl.ARRAY_BUFFER,
        cubeNormalBuffer
    );

    gl.vertexAttribPointer(
        normalLocation,
        3,
        gl.FLOAT,
        false,
        0,
        0
    );

    gl.enableVertexAttribArray(
        normalLocation
    );


    // --------------------------------------------------------
    // Model
    // --------------------------------------------------------

    const model =
        getBoxModel(
            placement.x + basketOffset.x,
            placement.y + basketOffset.y,
            placement.z + basketOffset.z,
            placement.width,
            placement.length,
            placement.height
        );


    gl.uniformMatrix4fv(
        modelLocation,
        false,
        model
    );


    // --------------------------------------------------------
    // Colour
    // --------------------------------------------------------

    const colour =
        placement._colour;


    gl.uniform4f(
        colourLocation,
        colour[0],
        colour[1],
        colour[2],
        1.0
    );

    gl.uniform1f(
        highlightLocation,
        placement === hoveredPlacement ? 1.0 : 0.0
    );


    gl.drawArrays(
        gl.TRIANGLES,
        0,
        CUBE_VERTEX_COUNT
    );
}


// ============================================================
// Basket wireframe
// ============================================================

// ============================================================
// Basket geometry
// ============================================================

const basketBuffer =
    gl.createBuffer();


function updateBasketBuffer(
    width,
    length,
    height
) {
    const vertices = new Float32Array([

        // Bottom

        0, 0, 0,
        width, 0, 0,

        width, 0, 0,
        width, length, 0,

        width, length, 0,
        0, length, 0,

        0, length, 0,
        0, 0, 0,


        // Top

        0, 0, height,
        width, 0, height,

        width, 0, height,
        width, length, height,

        width, length, height,
        0, length, height,

        0, length, height,
        0, 0, height,


        // Vertical edges

        0, 0, 0,
        0, 0, height,

        width, 0, 0,
        width, 0, height,

        width, length, 0,
        width, length, height,

        0, length, 0,
        0, length, height
    ]);


    gl.bindBuffer(
        gl.ARRAY_BUFFER,
        basketBuffer
    );

    gl.bufferData(
        gl.ARRAY_BUFFER,
        vertices,
        gl.STATIC_DRAW
    );


    return vertices.length / 3;
}


function drawBasket() {
    DATA.baskets.forEach(
        function(basket, index) {
            const offset = getBasketOffset(index);
            const vertexCount = updateBasketBuffer(basket.width, basket.length, basket.height);
            
            gl.bindBuffer(gl.ARRAY_BUFFER, basketBuffer);
            gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(positionLocation);

            const model = translationMatrix(offset.x, offset.y, offset.z);

            gl.uniformMatrix4fv(modelLocation, false, model);
            gl.uniform4f(colourLocation, 1, 1, 1, 1);
            gl.drawArrays(gl.LINES, 0, vertexCount);
        }
    );
}

function drawUnplaced() {

    if (
        !DATA.unplaced ||
        DATA.unplaced.length === 0
    ) {
        return;
    }


    DATA.unplaced.forEach(
        function(item, index) {

            const position =
                getUnplacedPosition(index);


            if (!item._pseudoPlacement) {

                item._pseudoPlacement = {

                    x: position.x,
                    y: position.y,
                    z: position.z,

                    width: item.width,
                    length: item.length,
                    height: item.height,

                    weight: item.weight,

                    name: item.name,
                    item_number: item.item_number,

                    _colour: item._colour,

                    _unplaced: true
                };

            } else {

                item._pseudoPlacement.x =
                    position.x;

                item._pseudoPlacement.y =
                    position.y;

                item._pseudoPlacement.z =
                    position.z;
            }


            drawBox(
                item._pseudoPlacement,
                {
                    x: 0,
                    y: 0,
                    z: 0
                }
            );
        }
    );
}


// ============================================================
// Info
// ============================================================

function updateInfo() {

    const packageCount =
        DATA.baskets.reduce(
            function(total, basket) {
                return (
                    total +
                    basket.placements.length
                );
            },
            0
        );
    
    const unplacedCount = DATA.unplaced.length;


    info.textContent =
        DATA.baskets.length +
        " baskets — " +
        packageCount +
        " packages | " + unplacedCount + ' unplaced';
}


// ============================================================
// Resize
// ============================================================

function resizeCanvas() {

    const width =
        window.innerWidth;

    const height =
        window.innerHeight;


    const pixelRatio =
        window.devicePixelRatio ||
        1;


    const displayWidth =
        Math.floor(
            width * pixelRatio
        );

    const displayHeight =
        Math.floor(
            height * pixelRatio
        );


    if (
        canvas.width !== displayWidth ||
        canvas.height !== displayHeight
    ) {

        canvas.width =
            displayWidth;

        canvas.height =
            displayHeight;
    }


    gl.viewport(
        0,
        0,
        canvas.width,
        canvas.height
    );
}


window.addEventListener(
    "resize",
    function() {

        resizeCanvas();

        draw();
    }
);


// ============================================================
// Mouse orbit / pan
// ============================================================

let dragging = false;
let dragButton = 0;

let lastMouseX = 0;
let lastMouseY = 0;


canvas.addEventListener(
    "mousedown",
    function(event) {

        dragging = true;

        dragButton =
            event.button;

        lastMouseX =
            event.clientX;

        lastMouseY =
            event.clientY;

        canvas.style.cursor =
            "grabbing";
    }
);


window.addEventListener(
    "mousemove",
    function(event) {

        if (dragging) {

            const dx =
                event.clientX -
                lastMouseX;

            const dy =
                event.clientY -
                lastMouseY;


            lastMouseX =
                event.clientX;

            lastMouseY =
                event.clientY;


            if (dragButton === 0) {

                cameraAzimuth -=
                    dx * 0.01;

                cameraElevation -=
                    dy * 0.01;


                const limit =
                    Math.PI / 2 - 0.05;


                cameraElevation =
                    Math.max(
                        -limit,
                        Math.min(
                            limit,
                            cameraElevation
                        )
                    );

            } else {

                panX +=
                    dx * 0.002;

                panY -=
                    dy * 0.002;
            }


            draw();

            return;
        }


        // ----------------------------------------------------
        // Hover picking
        // ----------------------------------------------------

        const placement =
            pickPlacement(
                event.clientX,
                event.clientY
            );


        if (
            placement !== hoveredPlacement
        ) {

            hoveredPlacement =
                placement;

            draw();
        }


        showTooltip(
            placement,
            event.clientX,
            event.clientY
        );
    }
);


window.addEventListener(
    "mouseup",
    function() {

        dragging = false;

        canvas.style.cursor =
            "grab";
    }
);


canvas.addEventListener(
    "contextmenu",
    function(event) {

        event.preventDefault();
    }
);


// ============================================================
// Zoom
// ============================================================

canvas.addEventListener(
    "wheel",
    function(event) {

        event.preventDefault();


        cameraZoom *=
            Math.exp(
                -event.deltaY * 0.001
            );


        cameraZoom =
            Math.max(
                0.25,
                Math.min(
                    5,
                    cameraZoom
                )
            );


        draw();
    },
    {
        passive: false
    }
);


// ============================================================
// Reset camera
// ============================================================

canvas.addEventListener(
    "dblclick",
    function() {

        resetCamera();

        draw();
    }
);


// ============================================================
// Rendering
// ============================================================

function draw() {

    resizeCanvas();

    gl.viewport(
        0, 0, canvas.width, canvas.height
    );

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);


    gl.clearColor(
        0.125,
        0.125,
        0.125,
        1
    );


    gl.clear(
        gl.COLOR_BUFFER_BIT |
        gl.DEPTH_BUFFER_BIT
    );

    updateInfo();

    gl.useProgram(program);


    gl.uniformMatrix4fv(
        projectionLocation,
        false,
        getProjectionMatrix()
    );


    gl.uniformMatrix4fv(
        viewLocation,
        false,
        getViewMatrix()
    );

    DATA.baskets.forEach(
        function(basket, basketIndex) {
            const offset = getBasketOffset(basketIndex);
            basket.placements.forEach(
                function(placement) {
                    drawBox(placement, offset);
                }
            );
        }
    );

    // --------------------------------------------------------
    // Basket
    // --------------------------------------------------------

    drawUnplaced();

    drawBasket();
}


// ============================================================
// Initialise
// ============================================================


assignColours();

resetCamera();

resizeCanvas();

draw();