import json
import sys

import segno


def main():
    payload = json.loads(sys.stdin.buffer.read().decode("utf-8"))
    data = payload["data"]
    version = payload["version"]
    error = payload["error"]
    mode = payload["mode"]
    mask = payload["mask"]
    encoding = payload.get("encoding")

    kwargs = {
        "version": version,
        "error": None if error == "NONE" else error,
        "mode": mode,
        "mask": mask,
        "boost_error": False,
    }
    if encoding:
        kwargs["encoding"] = encoding

    code = segno.make_micro(data, **kwargs)
    rows = ["".join("1" if cell else "0" for cell in row) for row in code.matrix]
    sys.stdout.write("\n".join(rows))


if __name__ == "__main__":
    main()
