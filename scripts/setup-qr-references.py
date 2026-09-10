"""Download the pinned ZXing Java test dependency; never used by the app."""
import hashlib
from pathlib import Path
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
JAR = ROOT / '.reference-deps' / 'zxing-core-3.5.3.jar'
SHA256 = '8d8064c1636fdaef7189dd9055c7d59950a8940a12f2293956446ec3c109fd82'
URL = 'https://repo.maven.apache.org/maven2/com/google/zxing/core/3.5.3/core-3.5.3.jar'

if not JAR.exists():
    with urllib.request.urlopen(URL, timeout=60) as response:
        data = response.read()
    if hashlib.sha256(data).hexdigest() != SHA256:
        raise SystemExit('ZXing download checksum mismatch')
    JAR.parent.mkdir(parents=True, exist_ok=True)
    JAR.write_bytes(data)
if hashlib.sha256(JAR.read_bytes()).hexdigest() != SHA256:
    raise SystemExit('ZXing jar checksum mismatch')
print('ZXing Java 3.5.3 verified')
