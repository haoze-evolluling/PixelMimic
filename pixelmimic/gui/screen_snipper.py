"""
Fullscreen Screen Snipping and Region Selection Tool with Magnifier & Crosshairs using Tkinter and MSS.
"""

from __future__ import annotations
import threading
from typing import Callable, Optional, Tuple
import tkinter as tk
from PIL import Image, ImageTk
import mss

from pixelmimic.utils.image_utils import pil_to_base64


class ScreenSnipper:
    """
    Lightweight fullscreen screen snipper using Tkinter + MSS.
    Features:
      - Full virtual desktop coverage (multi-monitor support)
      - Crosshair alignment guide lines
      - 4x Real-time pixel magnifier loupe with RGB color and absolute coordinates
      - Drag-to-select crop region with dimension indicator
      - Pure Python implementation (no heavy Qt dependencies)
    """

    def __init__(self, callback: Optional[Callable[[str, int, int, int, int], None]] = None):
        """
        callback signature: (base64_str, abs_x, abs_y, width, height)
        """
        self.callback = callback
        self._root: Optional[tk.Toplevel | tk.Tk] = None

    def start_snip(self, callback: Optional[Callable[[str, int, int, int, int], None]] = None):
        """Run snip in main/separate thread."""
        if callback:
            self.callback = callback

        # Run in thread or synchronously
        threading.Thread(target=self._run_snip_window, daemon=True).start()

    def _run_snip_window(self):
        try:
            with mss.mss() as sct:
                # monitor 0 contains all monitors combined
                monitor = sct.monitors[0]
                left = monitor["left"]
                top = monitor["top"]
                width = monitor["width"]
                height = monitor["height"]

                sct_img = sct.grab(monitor)
                # Convert to PIL Image (RGB)
                pil_img = Image.frombytes("RGB", sct_img.size, sct_img.bgra, "raw", "BGRX")
        except Exception as e:
            print(f"[ScreenSnipper] Screen capture error: {e}")
            return

        # Prepare dimmed background image
        dimmed_img = pil_img.copy()
        darken_layer = Image.new("RGBA", pil_img.size, (0, 0, 0, 100))
        dimmed_img.paste(Image.new("RGB", pil_img.size, (0, 0, 0)), mask=darken_layer.split()[3])

        # Create Tkinter overlay window
        root = tk.Tk()
        self._root = root
        root.title("PixelMimic Snipper")
        root.geometry(f"{width}x{height}+{left}+{top}")
        root.overrideredirect(True)
        root.attributes("-topmost", True)
        root.config(cursor="crosshair")

        canvas = tk.Canvas(root, width=width, height=height, highlightthickness=0, bd=0)
        canvas.pack(fill="both", expand=True)

        # Keep references to PhotoImages
        tk_dimmed = ImageTk.PhotoImage(dimmed_img)
        canvas.create_image(0, 0, image=tk_dimmed, anchor="nw")

        start_x = [None]
        start_y = [None]
        curr_x = [None]
        curr_y = [None]
        is_dragging = [False]
        selection_crop_ref = [None]
        magnifier_img_ref = [None]

        def get_rect(x1, y1, x2, y2):
            rx1, rx2 = min(x1, x2), max(x1, x2)
            ry1, ry2 = min(y1, y2), max(y1, y2)
            return rx1, ry1, rx2, ry2

        def redraw(cx, cy):
            canvas.delete("overlay")

            # 1. Selection box & highlighted original image preview
            if is_dragging[0] and start_x[0] is not None and start_y[0] is not None:
                rx1, ry1, rx2, ry2 = get_rect(start_x[0], start_y[0], cx, cy)
                w = rx2 - rx1
                h = ry2 - ry1
                if w > 1 and h > 1:
                    cropped_preview = pil_img.crop((rx1, ry1, rx2, ry2))
                    selection_crop_ref[0] = ImageTk.PhotoImage(cropped_preview)
                    canvas.create_image(rx1, ry1, image=selection_crop_ref[0], anchor="nw", tags="overlay")

                    # Border around selection
                    canvas.create_rectangle(rx1, ry1, rx2, ry2, outline="#3b82f6", width=2, tags="overlay")

                    # Dimension label
                    dim_text = f" {w} × {h} "
                    canvas.create_rectangle(rx1, max(0, ry1 - 22), rx1 + 75, max(20, ry1), fill="#0f172a", outline="#3b82f6", tags="overlay")
                    canvas.create_text(rx1 + 38, max(10, ry1 - 11), text=dim_text, fill="#ffffff", font=("Segoe UI", 9, "bold"), tags="overlay")

            # 2. Crosshair guide lines
            canvas.create_line(0, cy, width, cy, fill="#60a5fa", dash=(4, 4), tags="overlay")
            canvas.create_line(cx, 0, cx, height, fill="#60a5fa", dash=(4, 4), tags="overlay")

            # 3. 4x Magnifier Loupe
            loupe_w, loupe_h = 120, 120
            sample_size = 20
            lx = cx + 20 if cx + 20 + loupe_w < width else cx - 20 - loupe_w
            ly = cy + 20 if cy + 20 + loupe_h + 30 < height else cy - 20 - loupe_h - 30

            sx1 = max(0, min(width - sample_size, cx - sample_size // 2))
            sy1 = max(0, min(height - sample_size, cy - sample_size // 2))
            sample_img = pil_img.crop((sx1, sy1, sx1 + sample_size, sy1 + sample_size))
            mag_img = sample_img.resize((loupe_w, loupe_h), Image.Resampling.NEAREST)

            magnifier_img_ref[0] = ImageTk.PhotoImage(mag_img)
            # Loupe background & image
            canvas.create_rectangle(lx - 2, ly - 2, lx + loupe_w + 2, ly + loupe_h + 24, fill="#0f172a", outline="#3b82f6", width=1, tags="overlay")
            canvas.create_image(lx, ly, image=magnifier_img_ref[0], anchor="nw", tags="overlay")

            # Center target box in loupe
            cw, ch = loupe_w // sample_size, loupe_h // sample_size
            mcx, mcy = lx + loupe_w // 2, ly + loupe_h // 2
            canvas.create_rectangle(mcx - cw // 2, mcy - ch // 2, mcx + cw // 2, mcy + ch // 2, outline="#f43f5e", width=2, tags="overlay")

            # Pixel RGB & Coordinates
            if 0 <= cx < width and 0 <= cy < height:
                r, g, b = pil_img.getpixel((cx, cy))[:3]
                abs_x = cx + left
                abs_y = cy + top
                info = f"({abs_x}, {abs_y}) RGB:{r},{g},{b}"
                canvas.create_text(lx + loupe_w // 2, ly + loupe_h + 12, text=info, fill="#38bdf8", font=("Segoe UI", 8, "bold"), tags="overlay")

        def on_mouse_move(event):
            curr_x[0] = event.x
            curr_y[0] = event.y
            redraw(event.x, event.y)

        def on_mouse_down(event):
            if event.num == 1:
                start_x[0] = event.x
                start_y[0] = event.y
                is_dragging[0] = True
                redraw(event.x, event.y)
            elif event.num == 3:  # Right click to cancel
                cancel()

        def on_mouse_up(event):
            if event.num == 1 and is_dragging[0]:
                is_dragging[0] = False
                if start_x[0] is not None and start_y[0] is not None:
                    rx1, ry1, rx2, ry2 = get_rect(start_x[0], start_y[0], event.x, event.y)
                    w = rx2 - rx1
                    h = ry2 - ry1
                    if w > 3 and h > 3:
                        cropped = pil_img.crop((rx1, ry1, rx2, ry2))
                        b64 = pil_to_base64(cropped, fmt="PNG")
                        abs_x = rx1 + left
                        abs_y = ry1 + top
                        finish(b64, abs_x, abs_y, w, h)
                        return
                cancel()

        def cancel(event=None):
            root.destroy()

        def finish(b64: str, x: int, y: int, w: int, h: int):
            root.destroy()
            if self.callback:
                try:
                    self.callback(b64, x, y, w, h)
                except Exception as e:
                    print(f"[ScreenSnipper] Callback error: {e}")

        root.bind("<Motion>", on_mouse_move)
        root.bind("<B1-Motion>", on_mouse_move)
        root.bind("<Button-1>", on_mouse_down)
        root.bind("<ButtonRelease-1>", on_mouse_up)
        root.bind("<Button-3>", on_mouse_down)
        root.bind("<Escape>", cancel)
        root.bind("<Return>", lambda e: on_mouse_up(type("obj", (), {"num": 1, "x": curr_x[0] or 0, "y": curr_y[0] or 0})()))

        root.mainloop()

