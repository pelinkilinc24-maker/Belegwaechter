#!/bin/sh
# Lädt die Texterkennung (Tesseract.js 5.1.1, Apache-2.0) in den Ordner ocr/.
# Einmal im Terminal ausführen:  sh ocr-dateien-laden.sh
set -e
cd "$(dirname "$0")"
mkdir -p ocr/core ocr/lang
CDN=https://cdn.jsdelivr.net/npm
curl -fL -o ocr/tesseract.min.js                    "$CDN/tesseract.js@5.1.1/dist/tesseract.min.js"
curl -fL -o ocr/worker.min.js                       "$CDN/tesseract.js@5.1.1/dist/worker.min.js"
curl -fL -o ocr/core/tesseract-core-simd-lstm.wasm.js "$CDN/tesseract.js-core@5.1.1/tesseract-core-simd-lstm.wasm.js"
curl -fL -o ocr/core/tesseract-core-lstm.wasm.js      "$CDN/tesseract.js-core@5.1.1/tesseract-core-lstm.wasm.js"
curl -fL -o ocr/lang/deu.traineddata.gz             "$CDN/@tesseract.js-data/deu@1.0.0/4.0.0_best_int/deu.traineddata.gz"
echo
echo "Fertig. Dateien:"
ls -la ocr ocr/core ocr/lang
