import json
import sys

import zxingcpp


barcode = zxingcpp.create_barcode(
    sys.argv[2],
    zxingcpp.BarcodeFormat.DataMatrix,
    version=int(sys.argv[1]),
)
image = zxingcpp.write_barcode_to_image(
    barcode,
    scale=1,
    add_quiet_zones=False,
)
print(json.dumps([[value == 0 for value in row] for row in memoryview(image).tolist()]))
