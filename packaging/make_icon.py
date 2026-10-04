"""Generate packaging/pixelmimic.ico from the brand artwork in icon/.

Reads icon/pixelmimic.png (same artwork as icon/pixelmimic.svg) and writes
the multi-resolution ICO used by the PyInstaller spec and the Inno Setup
installer.
"""

import os

from PIL import Image

ICO_SIZES = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]


def main() -> None:
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    src = os.path.join(root, "icon", "pixelmimic.png")
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "pixelmimic.ico")
    img = Image.open(src).convert("RGBA")
    img.save(out, format="ICO", sizes=ICO_SIZES)
    print(f"icon written: {out}")


if __name__ == "__main__":
    main()
