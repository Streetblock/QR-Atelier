import json
import sys

import segno


def main():
    payload = json.loads(sys.stdin.buffer.read().decode("utf-8"))
    kwargs = {
        "version": payload["version"],
        "error": None if payload["error"] == "NONE" else payload["error"],
        "mode": payload["mode"],
        "mask": payload["mask"],
        "boost_error": False,
    }
    if payload.get("encoding"):
        kwargs["encoding"] = payload["encoding"]

    code = segno.make(payload["data"], **kwargs)
    matrix = tuple(tuple(bool(value) for value in row) for row in code.matrix)
    sys.stdout.write("\n".join("".join("1" if value else "0" for value in row) for row in matrix))


if __name__ == "__main__":
    main()
