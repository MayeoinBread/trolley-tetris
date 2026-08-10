import {
    initPacking3D,
    renderPackingResult,
    clearPackingView,
} from "./packing_3d.js";

import {
    initBarcodeScanner
} from "./barcode_scanner.js";


const packingView =
    document.getElementById(
        "packing-view"
    );

initPacking3D(
    packingView
);


const state = {
    products: [],
    packingResult: null,
};


// ============================================================
// DOM
// ============================================================

const addProductForm =
    document.getElementById(
        "add-product-form"
    );

const itemNumberInput =
    document.getElementById(
        "item-number"
    );

const trolleyProducts =
    document.getElementById(
        "trolley-products"
    );

const productCount =
    document.getElementById(
        "product-count"
    );

const packButton =
    document.getElementById(
        "pack-button"
    );

const basketType =
    document.getElementById(
        "basket-type"
    );

const errorMessage =
    document.getElementById(
        "error-message"
    );

const resultSummary =
    document.getElementById(
        "result-summary"
    );

const resultContent =
    document.getElementById(
        "result-content"
    );

const vehicleWidth =
    document.getElementById("vehicle-width");

const vehicleLength =
    document.getElementById("vehicle-length");

const vehicleHeight =
    document.getElementById("vehicle-height");

const vehicleWeight =
    document.getElementById("vehicle-weight");

const scanButton =
    document.getElementById("scan-button");

const barcodeClose =
    document.getElementById("barcode-close");

const barcodeVideo =
    document.getElementById("barcode-video");

const barcodeError =
    document.getElementById("barcode-error");

const barcodeScanner =
    document.getElementById("barcode-scanner");

const switchCameraButton =
    document.getElementById("switch-camera-button");

initBarcodeScanner({
    scanButton: scanButton,
    closeButton: barcodeClose,
    switchCameraButton: switchCameraButton,
    videoElement: barcodeVideo,
    errorElement: barcodeError,
    scannerElement: barcodeScanner,
    inputElement: itemNumberInput
});

let vehiclePresets = {};

async function loadVehicles() {
    vehiclePresets = await api("/api/vehicles");

    basketType.innerHTML = "";

    Object.entries(vehiclePresets).forEach(
        ([key, vehicle]) => {
            const option = document.createElement("option");

            option.value = key;
            option.textContent = vehicle.name;

            if (key === "family_car") {
                option.selected = true;
            }

            basketType.appendChild(option);
        }
    );

    loadVehiclePreset();
}


function loadVehiclePreset() {
    const preset = vehiclePresets[basketType.value];

    if (!preset) {
        return;
    }

    vehicleWidth.value = preset.width;
    vehicleLength.value = preset.length;
    vehicleHeight.value = preset.height;
    vehicleWeight.value = preset.weight;
}


basketType.addEventListener(
    "change",
    loadVehiclePreset
);


basketType.addEventListener(
    "change",
    loadVehiclePreset
);


await loadVehicles();

// ============================================================
// API
// ============================================================

async function api(
    url,
    options = {}
) {
    const response = await fetch(
        url,
        {
            headers: {
                "Content-Type":
                    "application/json",
            },

            ...options,
        }
    );


    const data =
        await response.json();


    if (!response.ok) {
        throw new Error(
            data.error ||
            "Request failed."
        );
    }


    return data;
}


// ============================================================
// Error handling
// ============================================================

function showError(message) {
    errorMessage.textContent =
        message;

    errorMessage.classList.remove(
        "hidden"
    );
}


function clearError() {
    errorMessage.textContent = "";

    errorMessage.classList.add(
        "hidden"
    );
}


// ============================================================
// Load trolley
// ============================================================

async function loadTrolley() {
    const data =
        await api(
            "/api/trolley"
        );

    state.products = data.products;

    renderTrolley();
}


// ============================================================
// Render trolley
// ============================================================

function renderTrolley() {
    trolleyProducts.innerHTML = "";

    if (state.products.length === 0) {
        trolleyProducts.innerHTML = `
            <div class="empty-state">
                No products added yet.
            </div>
        `;

        productCount.textContent = "0";
        packButton.disabled = true;
        return;
    }

    let totalQuantity = 0;

    state.products.forEach(product => {
        totalQuantity += product.quantity;

        const element = document.createElement("div");
        element.className = "product";

        element.innerHTML = `
            <div class="product-info">
                <div class="product-name">
                    ${escapeHtml(product.name)}
                </div>

                <div class="product-description">
                    ${escapeHtml(product.description || product.type || "")}
                </div>

                <div class="product-number">
                    ${escapeHtml(product.item_number)}
                </div>
            </div>

            <div class="product-controls">

                <button
                    class="quantity-button"
                    data-action="decrease"
                    data-item="${product.item_number}"
                >
                    −
                </button>

                <span class="quantity">
                    ${product.quantity}
                </span>

                <button
                    class="quantity-button"
                    data-action="increase"
                    data-item="${product.item_number}"
                >
                    +
                </button>

                <button
                    class="remove-button"
                    data-action="remove"
                    data-item="${product.item_number}"
                >
                    ×
                </button>

            </div>
        `;

        trolleyProducts.appendChild(element);
    });

    productCount.textContent = totalQuantity;
    packButton.disabled = false;
}


// ============================================================
// Product controls
// ============================================================

trolleyProducts.addEventListener(
    "click",
    async event => {

        const button =
            event.target.closest(
                "button"
            );


        if (!button) {
            return;
        }


        const itemNumber =
            button.dataset.item;

        const action =
            button.dataset.action;


        try {

            if (
                action === "remove"
            ) {

                await api(
                    `/api/trolley/products/${itemNumber}`,
                    {
                        method: "DELETE",
                    }
                );

            } else {

                const product =
                    state.products.find(
                        item =>
                            item.item_number ===
                            itemNumber
                    );


                if (!product) {
                    return;
                }


                let quantity =
                    product.quantity;


                if (
                    action === "increase"
                ) {
                    quantity += 1;
                }


                if (
                    action === "decrease"
                ) {
                    quantity -= 1;
                }


                if (quantity <= 0) {

                    await api(
                        `/api/trolley/products/${itemNumber}`,
                        {
                            method: "DELETE",
                        }
                    );

                } else {

                    await api(
                        "/api/trolley/products",
                        {
                            method: "POST",

                            body:
                                JSON.stringify({
                                    item_number:
                                        itemNumber,

                                    quantity:
                                        quantity,
                                }),
                        }
                    );
                }
            }


            await loadTrolley();

            clearPackingResult();

        } catch (error) {

            showError(
                error.message
            );
        }
    }
);


// ============================================================
// Add product
// ============================================================

addProductForm.addEventListener(
    "submit",
    async event => {

        event.preventDefault();

        clearError();


        const itemNumber =
            itemNumberInput.value.trim();


        if (!itemNumber) {
            return;
        }


        try {

            await api(
                "/api/trolley/products",
                {
                    method: "POST",

                    body:
                        JSON.stringify({
                            item_number:
                                itemNumber,

                            quantity: 1,
                        }),
                }
            );


            itemNumberInput.value =
                "";

            await loadTrolley();

            clearPackingResult();

            itemNumberInput.focus();

        } catch (error) {

            showError(
                error.message
            );
        }
    }
);


// ============================================================
// Pack
// ============================================================

packButton.addEventListener(
    "click",
    async () => {

        clearError();


        packButton.disabled =
            true;

        packButton.textContent =
            "Packing...";


        try {

            const result =
                await api(
                    "/api/pack",
                    {
                        method: "POST",

                        body:
                            JSON.stringify({
                                basket_type: basketType.value,
                                width: Number(vehicleWidth.value),
                                length: Number(vehicleLength.value),
                                height: Number(vehicleHeight.value),
                                weight: Number(vehicleWeight.value)
                            }),
                    }
                );


            state.packingResult =
                result;


            renderResult(
                result
            );

            renderPackingResult(
                result
            );

        } catch (error) {

            showError(
                error.message
            );

        } finally {

            packButton.disabled =
                false;

            packButton.textContent =
                "Pack trolley";
        }
    }
);


// ============================================================
// Result
// ============================================================

function renderResult(result) {

    resultSummary.classList.remove(
        "hidden"
    );


    const basketCount =
        result.baskets.length;


    let html = `

        <div class="result-row">
            <span>Baskets</span>
            <strong>
                ${basketCount}
            </strong>
        </div>

    `;


    if (
        result.unplaced.length > 0
    ) {

        html += `
            <div class="unplaced">

                <div class="result-row">
                    <span>Unplaced</span>
                    <strong>
                        ${result.unplaced.length}
                    </strong>
                </div>
        `;


        result.unplaced.forEach(
            packageItem => {

                html += `
                    <div class="unplaced-item">
                        ${escapeHtml(
                            packageItem.name
                        )}
                        (${escapeHtml(
                            packageItem.item_number
                        )})
                    </div>
                `;
            }
        );


        html += "</div>";
    }


    resultContent.innerHTML =
        html;
}


// ============================================================
// Clear result
// ============================================================

function clearPackingResult() {

    state.packingResult =
        null;


    resultSummary.classList.add(
        "hidden"
    );


    clearPackingView();
}


// ============================================================
// HTML escaping
// ============================================================

function escapeHtml(value) {

    return String(value)
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );
}


// ============================================================
// Startup
// ============================================================

loadTrolley().catch(
    error => {
        showError(
            error.message
        );
    }
);

// ============================================================
// MOBILE CONTROLS DRAWER
// ============================================================

const controlsButton =
    document.getElementById("controls-button");

const controlsCloseButton =
    document.getElementById("controls-close-button");

const drawerBackdrop =
    document.getElementById("drawer-backdrop");


function openControls() {
    document.body.classList.add("drawer-open");
}


function closeControls() {
    document.body.classList.remove("drawer-open");
}


if (controlsButton) {
    controlsButton.addEventListener(
        "click",
        openControls
    );
}


if (controlsCloseButton) {
    controlsCloseButton.addEventListener(
        "click",
        closeControls
    );
}


if (drawerBackdrop) {
    drawerBackdrop.addEventListener(
        "click",
        closeControls
    );
}