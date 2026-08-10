let codeReader = null;
let controls = null;
let video = null;
let cameraDevices = [];
let currentCameraIndex = 0;

export function initBarcodeScanner({
    scanButton,
    closeButton,
    switchCameraButton,
    videoElement,
    errorElement,
    scannerElement,
    inputElement
}) {
    video = videoElement;

    scanButton.addEventListener("click", function() {
        startScanner(errorElement, scannerElement, inputElement);
    });

    closeButton.addEventListener("click", function() {
        stopScanner(scannerElement);
    });

    switchCameraButton.addEventListener("click", function() {
        switchCamera(errorElement, scannerElement, inputElement);
    });
}

async function switchCamera(errorElement, scannerElement, inputElement) {
    if (!cameraDevices || cameraDevices.length < 2) {
        return;
    }

    if (controls) {
        try {
            controls.stop();
        } catch (error) {
            console.error(error);
        }

        controls = null;
    }

    currentCameraIndex =
        (currentCameraIndex + 1) % cameraDevices.length;

    await startScanner(
        errorElement,
        scannerElement,
        inputElement
    );
}

async function startScanner(errorElement, scannerElement, inputElement) {
    errorElement.textContent = "";
    errorElement.classList.add("hidden");
    scannerElement.classList.remove("hidden");

    try {
        if (!window.ZXingBrowser) {
            throw new Error("ZXing failed to load.");
        }

        codeReader = new ZXingBrowser.BrowserMultiFormatReader();

        cameraDevices = await ZXingBrowser.BrowserCodeReader.listVideoInputDevices();

        if (!cameraDevices || cameraDevices.length === 0) {
            throw new Error("No camera was found.");
        }

        if (currentCameraIndex >= cameraDevices.length) {
            currentCameraIndex = 0;
        }

        const deviceId = cameraDevices[currentCameraIndex].deviceId;

        controls = await codeReader.decodeFromVideoDevice(
            deviceId,
            video,
            function(result, error) {
                if (result) {
                    const value = result.getText();

                    console.log("ZXing result:", value);

                    if (!value) {
                        return;
                    }

                    let itemNumber = null;
                    const ikeaMatch = value.match(/\/(\d{8})\d{6}(?:\?|$)/);
                    if (ikeaMatch) {
                        itemNumber = ikeaMatch[1];
                    } else if(/^\d{8}$/.test(value)) {
                        itemNumber = value;
                    } else {
                        itemNumber = value;
                    }

                    inputElement.value = itemNumber;
                    // inputElement.dispatchEvent(
                    //     new Event("input", { bubbles: true })
                    // );

                    inputElement.focus();

                    stopScanner(scannerElement);
                    return;
                }

                if (error) {
                    console.log("ZXing decode attempt:", error.name, error.message);
                }
            }
        );

        const stream = video.srcObject;

        if (stream) {
            const track = stream.getVideoTracks()[0];

            if (track) {
                try {
                    await track.applyConstraints({
                        advanced: [
                            {
                                width: { ideal: 1920 },
                                height: { ideal: 1080 },
                                focusMode: "continuous"
                            }
                        ]
                    });
                } catch (error) {
                    console.log("Camera constraints not supported:", error);
                }
            }
        }

    } catch (error) {
        console.error("Barcode scanner error:", error);

        errorElement.textContent =
            error.message ||
            "Unable to start barcode scanner.";

        errorElement.classList.remove("hidden");
    }
}

function stopScanner(scannerElement) {
    if (controls) {
        try {
            controls.stop();
        } catch (error) {
            console.error(error);
        }

        controls = null;
    }

    if (video) {
        video.pause();
        video.srcObject = null;
    }

    scannerElement.classList.add("hidden");
}