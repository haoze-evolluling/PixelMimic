"""
Temporary screen highlight overlay to flash matched bounding box on screen using Tkinter.
"""

from __future__ import annotations
import threading
import tkinter as tk
import tkinter.font as tkfont


class MatchHighlighter:
    """Flashes a temporary highlight box over matched coordinates on screen."""

    @staticmethod
    def show_highlight(x: int, y: int, width: int, height: int, confidence: float, duration_ms: int = 1500):
        """Display non-blocking highlight on a separate thread."""
        threading.Thread(
            target=MatchHighlighter._run_window,
            args=(x, y, width, height, confidence, duration_ms),
            daemon=True,
        ).start()

    @staticmethod
    def _run_window(x: int, y: int, w: int, h: int, confidence: float, duration_ms: int):
        try:
            root = tk.Tk()
            root.title("Match Highlight")
            root.withdraw()  # hide until geometry is finalized
            pad_x = 10
            pad_top = 28
            pad_bot = 10

            # Compute tag size first so the window can fit it
            tag_text = f"🎯 匹配成功: {confidence * 100:.1f}%"
            tag_font = tkfont.Font(family="Segoe UI", size=9, weight="bold")
            text_w = tag_font.measure(tag_text)
            tag_h = 24
            tag_inner_pad = 14
            tag_w = max(130, text_w + tag_inner_pad * 2)

            total_w = max(w, tag_w) + pad_x * 2
            total_h = h + pad_top + pad_bot

            # Clamp position inside the virtual screen so the tag is not clipped
            screen_w = root.winfo_screenwidth()
            screen_h = root.winfo_screenheight()
            win_x = max(0, min(screen_w - total_w, x - pad_x))
            win_y = max(0, min(screen_h - total_h, y - pad_top))

            root.geometry(f"{total_w}x{total_h}+{win_x}+{win_y}")
            root.overrideredirect(True)
            root.attributes("-topmost", True)
            
            # Use transparent color key for Windows
            try:
                root.wm_attributes("-transparentcolor", "#010101")
                bg_color = "#010101"
            except Exception:
                bg_color = "#0f172a"
                try:
                    root.attributes("-alpha", 0.85)
                except Exception:
                    pass

            root.config(bg=bg_color)
            canvas = tk.Canvas(root, width=total_w, height=total_h, bg=bg_color, highlightthickness=0)
            canvas.pack(fill="both", expand=True)

            # Draw tag background & text
            canvas.create_rectangle(
                pad_x, 2, pad_x + tag_w, 2 + tag_h,
                fill="#1e293b", outline="#10b981", width=1
            )
            canvas.create_text(
                pad_x + tag_w // 2, 2 + tag_h // 2,
                text=tag_text, fill="#34d399", font=tag_font,
                anchor="center"
            )

            # Draw target red/green bounding box
            rx1 = pad_x
            ry1 = pad_top
            rx2 = pad_x + w
            ry2 = pad_top + h
            canvas.create_rectangle(rx1, ry1, rx2, ry2, outline="#f43f5e", width=3)

            # Center target crosshair
            cx = (rx1 + rx2) // 2
            cy = (ry1 + ry2) // 2
            canvas.create_line(cx - 8, cy, cx + 8, cy, fill="#f43f5e", width=2)
            canvas.create_line(cx, cy - 8, cx, cy + 8, fill="#f43f5e", width=2)

            # Show the finalized window and auto close after duration
            root.deiconify()
            root.after(duration_ms, root.destroy)
            root.mainloop()
        except Exception as e:
            print(f"[MatchHighlighter] Error: {e}")
