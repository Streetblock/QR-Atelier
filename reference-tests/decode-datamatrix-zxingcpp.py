import json
import pathlib
import sys

import zxingcpp


raw_path = pathlib.Path(sys.argv[1])
width = int(sys.argv[2])
height = int(sys.argv[3])
pixels = raw_path.read_bytes()
if len(pixels) != width * height:
    raise RuntimeError("Invalid grayscale image dimensions")

image = memoryview(pixels).cast("B", shape=(height, width))
result = zxingcpp.read_barcode(
    image,
    formats=zxingcpp.BarcodeFormat.DataMatrix,
    is_pure=True,
)
if result is None:
    raise RuntimeError("ZXing-C++ could not decode the Data Matrix symbol")

print(json.dumps({
    "text": result.text,
    "bytes": list(result.bytes),
    "symbologyIdentifier": result.symbology_identifier,
    "contentType": str(result.content_type),
}))
