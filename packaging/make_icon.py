"""Generate packaging/pixelmimic.ico — a simple dark crosshair icon.

The repo has no artwork; this produces a clean placeholder that can be
replaced by a hand-designed icon of the same filename at any time.
"""

import os

from PIL import Image, ImageDraw

SIZE = 256
BG = (11, 15, 25, 255)        # app background #0b0f19
RING = (99, 102, 241, 255)    # indigo #6366f1
DOT = (34, 211, 238, 255)     # cyan #22d3ee
TICK = (226, 232, 240, 255)   # light #e2e8f0


def build_master() -> Image.Image:
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Rounded dark tile
    d.rounded_rectangle([10, 10, SIZE - 10, SIZE - 10], radius=56, fill=BG)

    cx = cy = SIZE // 2
    r_ring = 74
    w_ring = 12

    # Crosshair ring
    d.ellipse(
        [cx - r_ring, cy - r_ring, cx + r_ring, cy + r_ring],
        outline=RING,
        width=w_ring,
    )

    # Tick marks at 0/90/180/270 degrees, outside the ring
    r_out = r_ring + 22
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        x1 = cx + dx * (r_ring + w_ring)
        y1 = cy + dy * (r_ring + w_ring)
        x2 = cx + dx * r_out
        y2 = cy + dy * r_out
        d.line([x1, y1, x2, y2], fill=TICK, width=w_ring)

    # Center dot
    r_dot = 18
    d.ellipse(
        [cx - r_dot, cy - r_dot, cx + r_dot, cy + r_dot],
        fill=DOT,
    )
    return img


def main() -> None:
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "pixelmimic.ico")
    master = build_master()
    master.save(out, format="ICO", sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    print(f"icon written: {out}")


if __name__ == "__main__":
    main()
