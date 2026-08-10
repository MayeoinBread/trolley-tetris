"use strict";

console.log("packing_3d.js loaded");

let DATA = {
    baskets: [],
    unplaced: []
};

let canvas = null;
let info = null;
let gl = null;
let initialised = false;

// ============================================================
// WebGL
// ============================================================

function initialiseWebGL() {
    gl = canvas.getContext("webgl", {
            alpha: false,
            antialias: true,
            depth: true
        });
    
        if (!gl) {
            throw new Error("WebGL is not available");
        }
    
    // Depth testing is what fixes the z-order problem.

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
}


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


const labelVertexShaderSource = `
    attribute vec3 a_position;
    attribute vec2 a_texcoord;

    uniform mat4 u_projection;
    uniform mat4 u_view;
    uniform mat4 u_model;

    varying vec2 v_texcoord;

    void main() {
        gl_Position =
            u_projection *
            u_view *
            u_model *
            vec4(a_position, 1.0);
        v_texcoord = a_texcoord;
    }
`;


const labelFragmentShaderSource = `
    precision mediump float;

    uniform sampler2D u_texture;
    uniform vec4 u_colour;

    varying vec2 v_texcoord;

    void main() {
        vec4 texColor = texture2D(
            u_texture,
            v_texcoord
        );

        gl_FragColor = texColor * u_colour;
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


    const program = gl.createProgram();

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

let program = null;
let positionLocation;
let normalLocation;
let highlightLocation;
let projectionLocation;
let viewLocation;
let modelLocation;
let colourLocation;

let labelProgram = null;
let labelPositionLocation;
let labelTexcoordLocation;
let labelProjectionLocation;
let labelViewLocation;
let labelModelLocation;
let labelTextureLocation;
let labelColourLocation;

let labelPositionBuffer = null;
let labelTexcoordBuffer = null;
let borderBuffer = null;
let borderNormalBuffer = null;

const labelTextureCache = new Map();

function initialiseShaders() {
    program = createProgram(
        vertexShaderSource,
        fragmentShaderSource
    );

    gl.useProgram(program);

    // ============================================================
    // Shader locations
    // ============================================================

    positionLocation =
        gl.getAttribLocation(
            program,
            "a_position"
        );

    normalLocation =
        gl.getAttribLocation(
            program,
            "a_normal"
        );

    highlightLocation =
        gl.getUniformLocation(
            program,
            "u_highlight"
        );

    projectionLocation =
        gl.getUniformLocation(
            program,
            "u_projection"
        );


    viewLocation =
        gl.getUniformLocation(
            program,
            "u_view"
        );


    modelLocation =
        gl.getUniformLocation(
            program,
            "u_model"
        );


    colourLocation =
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

    labelProgram = createProgram(
        labelVertexShaderSource,
        labelFragmentShaderSource
    );

    gl.useProgram(labelProgram);

    labelPositionLocation =
        gl.getAttribLocation(
            labelProgram,
            "a_position"
        );

    labelTexcoordLocation =
        gl.getAttribLocation(
            labelProgram,
            "a_texcoord"
        );

    labelProjectionLocation =
        gl.getUniformLocation(
            labelProgram,
            "u_projection"
        );

    labelViewLocation =
        gl.getUniformLocation(
            labelProgram,
            "u_view"
        );

    labelModelLocation =
        gl.getUniformLocation(
            labelProgram,
            "u_model"
        );

    labelTextureLocation =
        gl.getUniformLocation(
            labelProgram,
            "u_texture"
        );

    labelColourLocation =
        gl.getUniformLocation(
            labelProgram,
            "u_colour"
        );

    gl.enableVertexAttribArray(
        labelPositionLocation
    );

    gl.enableVertexAttribArray(
        labelTexcoordLocation
    );
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

const LABEL_TEXT_HEIGHT = 24;
const LABEL_MAX_WIDTH = 140;

function createLabelTexture(text) {
    if (labelTextureCache.has(text)) {
        return labelTextureCache.get(text);
    }

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    const padding = 16;
    const fontSize = 24;
    const font = `${fontSize}px sans-serif`;

    context.font = font;
    const metrics = context.measureText(text);
    const textWidth = Math.ceil(metrics.width);
    const textHeight = fontSize;

    canvas.width = textWidth + padding * 2;
    canvas.height = textHeight + padding * 2;

    context.font = font;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "rgba(255, 255, 255, 1)";
    context.fillText(
        text,
        canvas.width / 2,
        canvas.height / 2
    );

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        canvas
    );
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

    const labelData = {
        texture,
        width: canvas.width,
        height: canvas.height
    };

    labelTextureCache.set(text, labelData);

    return labelData;
}

function drawLabelQuad(x, y, z, width, length, texture) {
    const positions = new Float32Array([
        0, 0, 0,
        1, 0, 0,
        1, 1, 0,
        0, 0, 0,
        1, 1, 0,
        0, 1, 0
    ]);

    const texcoords = new Float32Array([
        0, 0,
        1, 0,
        1, 1,
        0, 0,
        1, 1,
        0, 1
    ]);

    gl.bindBuffer(gl.ARRAY_BUFFER, labelPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    gl.vertexAttribPointer(
        labelPositionLocation,
        3,
        gl.FLOAT,
        false,
        0,
        0
    );
    gl.enableVertexAttribArray(labelPositionLocation);

    gl.bindBuffer(gl.ARRAY_BUFFER, labelTexcoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, texcoords, gl.STATIC_DRAW);
    gl.vertexAttribPointer(
        labelTexcoordLocation,
        2,
        gl.FLOAT,
        false,
        0,
        0
    );
    gl.enableVertexAttribArray(labelTexcoordLocation);

    const model = multiplyMatrices(
        translationMatrix(x, y, z),
        new Float32Array([
            width, 0, 0, 0,
            0, length, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ])
    );

    gl.uniformMatrix4fv(labelModelLocation, false, model);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(labelTextureLocation, 0);
    gl.uniform4f(labelColourLocation, 1, 1, 1, 1);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
}

function drawTextLabel(text, centerX, y, z, maxWidth, maxHeight) {
    if (!text || maxWidth <= 0 || maxHeight <= 0) {
        return;
    }

    const labelData = createLabelTexture(text);
    const aspect = labelData.width / labelData.height;
    const width = Math.min(maxWidth, maxHeight * aspect);
    const height = Math.max(8, Math.min(maxHeight, width / aspect));
    const x = centerX - width / 2;

    gl.useProgram(labelProgram);
    gl.uniformMatrix4fv(
        labelProjectionLocation,
        false,
        getProjectionMatrix()
    );
    gl.uniformMatrix4fv(
        labelViewLocation,
        false,
        getViewMatrix()
    );

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(false);

    drawLabelQuad(x, y, z, width, height, labelData.texture);

    gl.depthMask(true);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.disable(gl.BLEND);
    gl.useProgram(program);
}

function getUnplacedAreaBounds() {

    if (!DATA.unplaced || DATA.unplaced.length === 0) {
        return null;
    }

    const rows = getUnplacedRows();

    const maxBasketWidth =
        DATA.baskets.reduce(
            function(max, basket) {
                return Math.max(max, basket.capacity.width);
            },
            0
        );

    const maxBasketLength =
        DATA.baskets.reduce(
            function(max, basket) {
                return Math.max(max, basket.capacity.length);
            },
            0
        );

    let length = 0;

    rows.forEach(
        function(row, index) {

            if (index > 0) {
                length += UNPLACED_ROW_GAP;
            }

            length += row.length;
        }
    );

    return {
        x: 0,
        y: maxBasketLength + UNPLACED_GAP,
        z: 0,
        width: maxBasketWidth,
        length: length
    };
}

function drawUnplacedAreaBorder(bounds) {
    const vertices = new Float32Array([
        bounds.x, bounds.y, bounds.z + 0.025,
        bounds.x + bounds.width, bounds.y, bounds.z + 0.025,
        bounds.x + bounds.width, bounds.y + bounds.length, bounds.z + 0.025,
        bounds.x, bounds.y + bounds.length, bounds.z + 0.025,
        bounds.x, bounds.y, bounds.z + 0.025
    ]);

    const normals = new Float32Array([
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,
        0, 0, 1
    ]);

    gl.bindBuffer(gl.ARRAY_BUFFER, borderBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, borderNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, borderBuffer);
    gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionLocation);

    gl.bindBuffer(gl.ARRAY_BUFFER, borderNormalBuffer);
    gl.vertexAttribPointer(normalLocation, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(normalLocation);

    gl.uniformMatrix4fv(modelLocation, false, identityMatrix());
    gl.uniform4f(colourLocation, 1, 1, 1, 1);
    gl.uniform1f(highlightLocation, 0);

    gl.drawArrays(gl.LINE_STRIP, 0, 5);
}

function drawUnplacedAreaGround() {
    const bounds = getUnplacedAreaBounds();
    if (!bounds) {
        return;
    }

    drawUnplacedAreaBorder(bounds);
    drawTextLabel(
        "Unplaced items",
        bounds.x + bounds.width / 2,
        bounds.y + bounds.length + 12,
        0.03,
        Math.min(bounds.width * 0.5, LABEL_MAX_WIDTH),
        LABEL_TEXT_HEIGHT
    );
}

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

let cubePositionBuffer = null;
let cubeNormalBuffer = null;
let basketBuffer = null;

function initialiseGeometry() {
    cubePositionBuffer = gl.createBuffer();

    gl.bindBuffer(
        gl.ARRAY_BUFFER,
        cubePositionBuffer
    );

    gl.bufferData(
        gl.ARRAY_BUFFER,
        cubePositions,
        gl.STATIC_DRAW
    );


    cubeNormalBuffer = gl.createBuffer();

    gl.bindBuffer(
        gl.ARRAY_BUFFER,
        cubeNormalBuffer
    );

    gl.bufferData(
        gl.ARRAY_BUFFER,
        cubeNormals,
        gl.STATIC_DRAW
    );

    basketBuffer = gl.createBuffer();
    labelPositionBuffer = gl.createBuffer();
    labelTexcoordBuffer = gl.createBuffer();
    borderBuffer = gl.createBuffer();
    borderNormalBuffer = gl.createBuffer();
}


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

            totalWidth += basket.capacity.width;
            
            if (index > 0) {
                totalWidth += BASKET_GAP;
            }

            maxLength = Math.max(maxLength, basket.capacity.length);
            maxHeight = Math.max(maxHeight, basket.capacity.height);
        }
    );

    /*
     * Unplaced items are positioned in front
     * of the baskets, so they extend the scene
     * in Y rather than X.
     */

    if (DATA.unplaced.length > 0) {
        const unplacedDepth = getUnplacedAreaDepth();
        maxLength += UNPLACED_GAP + unplacedDepth;
    }

    return {
        width: totalWidth,
        length: maxLength,
        height: maxHeight
    };
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


const DEFAULT_AZIMUTH = -Math.PI / 4;

const DEFAULT_ELEVATION = Math.PI / 6;

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
const UNPLACED_PACKAGE_GAP = 20;
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

    if (!DATA.unplaced || DATA.unplaced.length === 0) {
        return 0;
    }

    let totalDepth = 0;

    DATA.unplaced.forEach(
        function(item) {
            totalDepth = Math.max(totalDepth, item.length);
        }
    );

    return totalDepth;
}

function getUnplacedPosition(index) {

    const rows = getUnplacedRows();

    const maxBasketLength =
        DATA.baskets.reduce(
            function(max, basket) {
                return Math.max(max, basket.capacity.length);
            },
            0
        );

    const areaY =
        maxBasketLength + UNPLACED_GAP;

    let y = areaY;

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {

        const row = rows[rowIndex];

        let x = 0;

        for (let itemIndex = 0; itemIndex < row.items.length; itemIndex++) {

            const item = row.items[itemIndex];

            if (item === DATA.unplaced[index]) {
                return {
                    x: x,
                    y: y,
                    z: 0
                };
            }

            x += item.width;

            if (itemIndex < row.items.length - 1) {
                x += UNPLACED_PACKAGE_GAP;
            }
        }

        y += row.length + UNPLACED_ROW_GAP;
    }

    return {
        x: 0,
        y: y,
        z: 0
    };
}

function getUnplacedRows() {

    if (!DATA.unplaced || DATA.unplaced.length === 0) {
        return [];
    }

    const maxBasketWidth =
        DATA.baskets.reduce(
            function(max, basket) {
                return Math.max(max, basket.capacity.width);
            },
            0
        );

    const rows = [];

    let row = {
        items: [],
        width: 0,
        length: 0
    };

    DATA.unplaced.forEach(
        function(item) {

            const gap =
                row.items.length > 0
                    ? UNPLACED_PACKAGE_GAP
                    : 0;

            const requiredWidth =
                row.width +
                gap +
                item.width;

            /*
             * If it fits, put it on the current row.
             */
            if (
                row.items.length === 0 ||
                requiredWidth <= maxBasketWidth
            ) {
                row.items.push(item);
                row.width = requiredWidth;
                row.length = Math.max(
                    row.length,
                    item.length
                );

                return;
            }

            /*
             * Otherwise finish the current row
             * and start a new one.
             */
            rows.push(row);

            row = {
                items: [item],
                width: item.width,
                length: item.length
            };
        }
    );

    /*
     * Add the final row.
     */
    if (row.items.length > 0) {
        rows.push(row);
    }

    return rows;
}

function getMouseRay(mouseX, mouseY) {

    const rect = canvas.getBoundingClientRect();

    // --------------------------------------------------------
    // Mouse -> Normalised Device Coordinates
    // --------------------------------------------------------
    const ndcX = ((mouseX - rect.left) / rect.width) * 2 - 1;
    const ndcY = 1 - ((mouseY - rect.top) / rect.height) * 2;

    // --------------------------------------------------------
    // Match the renderer's orthographic projection
    // --------------------------------------------------------
    const aspect = canvas.width / canvas.height;
    const size = 1.2;

    /*
     * These are coordinates in camera/view space.
     *
     * The camera looks down -Z.
     */
    const cameraX = ndcX * size * aspect;
    const cameraY = ndcY * size;

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
    const zoom = cameraZoom;

    let x = cameraX / zoom;
    let y = cameraY / zoom;
    let z = cameraZ / zoom;

    // --------------------------------------------------------
    // Undo scene scale
    // --------------------------------------------------------
    const scale = calculateSceneScale();

    x /= scale;
    y /= scale;
    z /= scale;

    // --------------------------------------------------------
    // Undo camera elevation
    // --------------------------------------------------------
    const cosElevation = Math.cos(cameraElevation);
    const sinElevation = Math.sin(cameraElevation);

    let worldY = y * cosElevation - z * sinElevation;
    let worldZ = y * sinElevation + z * cosElevation;

    y = worldY;
    z = worldZ;

    // --------------------------------------------------------
    // Undo camera azimuth
    // --------------------------------------------------------
    const cosAzimuth = Math.cos(cameraAzimuth);
    const sinAzimuth = Math.sin(cameraAzimuth);

    let worldX = x * cosAzimuth - y * sinAzimuth;
    worldY = x * sinAzimuth + y * cosAzimuth;

    x = worldX;
    y = worldY;

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
    worldY = directionY * cosElevation - directionZ * sinElevation;
    worldZ = directionY * sinElevation + directionZ * cosElevation;

    directionY = worldY;
    directionZ = worldZ;

    // Undo azimuth
    worldX = directionX * cosAzimuth - directionY * sinAzimuth;
    worldY = directionX * sinAzimuth + directionY * cosAzimuth;
    directionX = worldX;
    directionY = worldY;

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


function pickPlacement(mouseX, mouseY) {

    const ray = getMouseRay(mouseX, mouseY);

    let closest = null;
    let closestDistance = Infinity;

    // --------------------------------------------------------
    // Placed packages
    // --------------------------------------------------------

    DATA.baskets.forEach(
        function(basket, basketIndex) {

            const offset = getBasketOffset(basketIndex);

            basket.placements.forEach(
                function(placement) {

                    const testBox = {
                        x: placement.x + offset.x,
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

let tooltip = null;

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
        tooltip.style.display = "none";
        return;
    }


    const name = placement.name ?? "Unnamed package";

    const itemNumber = placement.item_number ?? "";

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

    cameraAzimuth = DEFAULT_AZIMUTH;

    cameraElevation = DEFAULT_ELEVATION;

    cameraZoom = DEFAULT_ZOOM;

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

    const scale = calculateSceneScale();

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

    const colour = placement._colour;


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
    console.log("drawBasket", DATA.baskets);
    DATA.baskets.forEach(
        function(basket, index) {
            const offset = getBasketOffset(index);
            const vertexCount = updateBasketBuffer(basket.capacity.width, basket.capacity.length, basket.capacity.height);

            gl.bindBuffer(gl.ARRAY_BUFFER, basketBuffer);
            gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(positionLocation);
            
            // gl.disableVertexAttribArray(normalLocation);

            gl.bindBuffer(gl.ARRAY_BUFFER, cubeNormalBuffer);
            gl.vertexAttribPointer(normalLocation, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(normalLocation);

            const model = translationMatrix(offset.x, offset.y, offset.z);

            gl.uniformMatrix4fv(modelLocation, false, model);
            gl.uniform4f(colourLocation, 1, 1, 1, 1);
            gl.uniform1f(highlightLocation, 0);

            gl.drawArrays(gl.LINES, 0, vertexCount);
        }
    );
}

function drawLabelPlane(
    x,
    y,
    z,
    width,
    length,
    colour,
    label
) {

    const model =
        getBoxModel(
            x,
            y,
            z,
            width,
            length,
            0.02
        );


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


    gl.uniformMatrix4fv(
        modelLocation,
        false,
        model
    );

    gl.uniform4f(
        colourLocation,
        colour[0],
        colour[1],
        colour[2],
        1.0
    );

    gl.uniform1f(
        highlightLocation,
        0.0
    );


    gl.drawArrays(
        gl.TRIANGLES,
        0,
        CUBE_VERTEX_COUNT
    );
}

function drawUnplaced() {

    if (!DATA.unplaced || DATA.unplaced.length === 0) {
        return;
    }

    DATA.unplaced.forEach(
        function(item, index) {

            const position = getUnplacedPosition(index);

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
                item._pseudoPlacement.x = position.x;
                item._pseudoPlacement.y = position.y;
                item._pseudoPlacement.z = position.z;
            }


            drawBox(item._pseudoPlacement,
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

    const rect = canvas.getBoundingClientRect();

    const pixelRatio = window.devicePixelRatio || 1;

    const displayWidth = Math.floor(rect.width * pixelRatio);
    const displayHeight = Math.floor(rect.height * pixelRatio);

    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
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

function initialiseInteraction() {

    // ============================================================
    // Pointer / touch state
    // ============================================================

    const activePointers = new Map();

    let lastPinchDistance = null;

    let pointerDownX = 0;
    let pointerDownY = 0;
    let pointerDownTime = 0;
    let multiTouch = false;

    function getPointerDistance() {
        const pointers = Array.from(activePointers.values());

        if (pointers.length < 2) {
            return null;
        }

        const dx =
            pointers[0].clientX -
            pointers[1].clientX;

        const dy =
            pointers[0].clientY -
            pointers[1].clientY;

        return Math.sqrt(dx * dx + dy * dy);
    }


    function getPointerCentre() {
        const pointers =
            Array.from(activePointers.values());

        if (pointers.length < 2) {
            return null;
        }

        return {
            x:
                (
                    pointers[0].clientX +
                    pointers[1].clientX
                ) / 2,

            y:
                (
                    pointers[0].clientY +
                    pointers[1].clientY
                ) / 2,
        };
    }


    // ============================================================
    // Pointer down
    // ============================================================

    canvas.addEventListener(
        "pointerdown",
        function(event) {

            event.preventDefault();

            activePointers.set(
                event.pointerId,
                {
                    clientX: event.clientX,
                    clientY: event.clientY
                }
            );


            try {
                canvas.setPointerCapture(
                    event.pointerId
                );
            } catch (error) {
                // Pointer capture not available in every environment
            }


            // Record the initial position/time so we can
            // distinguish a tap from a drag.
            if (activePointers.size === 1) {

                pointerDownX =
                    event.clientX;

                pointerDownY =
                    event.clientY;

                pointerDownTime =
                    Date.now();
            }


            // First pointer
            if (activePointers.size === 1) {

                dragging = true;

                dragButton =
                    event.button;

                lastMouseX =
                    event.clientX;

                lastMouseY =
                    event.clientY;

                canvas.style.cursor =
                    "grabbing";

                return;
            }


            if (activePointers.size === 2) {

                multiTouch = true;

                dragging = false;

                lastPinchDistance =
                    getPointerDistance();

                canvas.style.cursor =
                    "grabbing";
            }
        },
        {
            passive: false
        }
    );


    // ============================================================
    // Pointer move
    // ============================================================

    canvas.addEventListener(
        "pointermove",
        function(event) {

            event.preventDefault();


            if (!activePointers.has(event.pointerId)) {

                // Mouse hover picking
                const placement =
                    pickPlacement(
                        event.clientX,
                        event.clientY
                    );


                if (placement !== hoveredPlacement) {

                    hoveredPlacement =
                        placement;

                    draw();
                }


                showTooltip(
                    placement,
                    event.clientX,
                    event.clientY
                );

                return;
            }


            activePointers.set(
                event.pointerId,
                {
                    clientX: event.clientX,
                    clientY: event.clientY
                }
            );


            // ====================================================
            // Two-finger interaction
            // ====================================================

            if (activePointers.size >= 2) {

                const distance =
                    getPointerDistance();

                const centre =
                    getPointerCentre();


                // Pinch zoom

                if (
                    distance !== null &&
                    lastPinchDistance !== null
                ) {

                    const zoomFactor =
                        distance /
                        lastPinchDistance;


                    cameraZoom *=
                        zoomFactor;


                    cameraZoom =
                        Math.max(
                            0.25,
                            Math.min(
                                5,
                                cameraZoom
                            )
                        );
                }


                // Two-finger pan

                if (
                    centre &&
                    lastMouseX !== null &&
                    lastMouseY !== null
                ) {

                    const dx =
                        centre.x -
                        lastMouseX;

                    const dy =
                        centre.y -
                        lastMouseY;


                    panX +=
                        dx * 0.002;

                    panY -=
                        dy * 0.002;


                    lastMouseX =
                        centre.x;

                    lastMouseY =
                        centre.y;
                }


                lastPinchDistance =
                    distance;


                draw();

                return;
            }


            // ====================================================
            // Single-pointer interaction
            // ====================================================

            if (
                activePointers.size === 1 &&
                dragging
            ) {

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


                // Mouse left button / touch = orbit

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
                }


                // Mouse right button = pan

                else {

                    panX +=
                        dx * 0.002;

                    panY -=
                        dy * 0.002;
                }


                draw();
            }
        },
        {
            passive: false
        }
    );


    // ============================================================
    // Pointer up
    // ============================================================

    function finishPointer(event) {

        const distanceMoved =
            Math.sqrt(
                Math.pow(
                    event.clientX -
                    pointerDownX,
                    2
                ) +
                Math.pow(
                    event.clientY -
                    pointerDownY,
                    2
                )
            );


        const duration =
            Date.now() -
            pointerDownTime;


        const wasTap =
            activePointers.size === 1 &&
            !multiTouch &&
            distanceMoved < 10 &&
            duration < 500;


        // Only a single-pointer tap should select
        // a package. A drag or two-finger gesture
        // does not affect the tooltip.

        if (wasTap) {

            const placement =
                pickPlacement(
                    event.clientX,
                    event.clientY
                );


            hoveredPlacement =
                placement;


            if (placement) {

                showTooltip(
                    placement,
                    event.clientX,
                    event.clientY
                );

            } else {

                tooltip.style.display =
                    "none";
            }


            draw();
        }


        activePointers.delete(
            event.pointerId
        );


        try {
            canvas.releasePointerCapture(
                event.pointerId
            );
        } catch (error) {
            // Ignore unsupported pointer capture
        }


        if (activePointers.size === 0) {

            dragging = false;

            lastPinchDistance =
                null;
            
            multiTouch = false;

            canvas.style.cursor =
                "grab";

            return;
        }


        // One pointer remains after a two-finger gesture

        if (activePointers.size === 1) {

            const remaining =
                Array.from(
                    activePointers.values()
                )[0];


            lastMouseX =
                remaining.clientX;

            lastMouseY =
                remaining.clientY;


            lastPinchDistance =
                null;

            dragging = true;
        }
    }


    canvas.addEventListener(
        "pointerup",
        finishPointer
    );


    canvas.addEventListener(
        "pointercancel",
        finishPointer
    );


    canvas.addEventListener(
        "pointerleave",
        function() {

            if (activePointers.size === 0) {

                dragging = false;

                canvas.style.cursor = "grab";
            }
        }
    );


    // ============================================================
    // Context menu
    // ============================================================

    canvas.addEventListener(
        "contextmenu",
        function(event) {

            event.preventDefault();
        }
    );


    // ============================================================
    // Mouse wheel zoom
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
    // Double-click / Double-tap reset
    // ============================================================

    canvas.addEventListener(
        "dblclick",
        function() {

            resetCamera();

            draw();
        }
    );


    // ============================================================
    // Touch behaviour
    // ============================================================

    canvas.style.touchAction =
        "none";

    canvas.style.cursor =
        "grab";
}


// ============================================================
// Rendering
// ============================================================

function draw() {
    console.log("draw");

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
    // Label planes
    // --------------------------------------------------------

    DATA.baskets.forEach(
        function(basket, basketIndex) {

            const offset = getBasketOffset(basketIndex);

            drawTextLabel(
                `Basket ${basketIndex + 1}`,
                offset.x + basket.capacity.width / 2,
                offset.y - 30,
                0.03,
                Math.min(basket.capacity.width * 0.45, LABEL_MAX_WIDTH),
                LABEL_TEXT_HEIGHT
            );
        }
    );

    drawUnplacedAreaGround();

    // --------------------------------------------------------
    // Basket
    // --------------------------------------------------------

    drawUnplaced();

    drawBasket();
}


// ============================================================
// Initialise
// ============================================================

export function initPacking3D(container) {
    console.log("initPacking3D");
    if (initialised) {
        return;
    }

    canvas = document.createElement("canvas");
    canvas.id = "packing-canvas";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    container.appendChild(canvas);

    info = document.createElement("div");
    info.id = "packing-info";
    info.style.position = "absolute";
    info.style.top = "12px";
    info.style.left = "12px";
    container.appendChild(info);

    tooltip = document.createElement("div");
    tooltip.id = "packing-tooltip";
    tooltip.className = "packing-tooltip";
    tooltip.style.display = "none";
    container.appendChild(tooltip);

    initialiseWebGL();
    initialiseShaders();
    initialiseGeometry();
    initialiseInteraction();

    initialised = true;

    resizeCanvas();
    draw();
}

export function renderPackingResult(result) {
    console.log("renderPackingResult");
    if (!initialised) {
        throw new Error("Packing 3D renderer has not been initialised");
    }

    DATA = result;
    hoveredPlacement = null;
    assignColours();
    resetCamera();
    resizeCanvas();
    draw();
}

export function clearPackingView() {
    DATA = {
        baskets: [],
        unplaced: []
    };

    hoveredPlacement = null;

    if (tooltip) {
        tooltip.style.display = "none";
    }

    if (initialised) {
        draw();
    }
}
