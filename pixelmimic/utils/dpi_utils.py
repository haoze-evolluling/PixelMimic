"""
DPI and Multi-Monitor Coordinate utilities.
"""

from __future__ import annotations
import ctypes
import platform
from typing import Tuple


def setup_dpi_awareness():
    """Set process DPI awareness on Windows."""
    if platform.system() == "Windows":
        try:
            # SetPerMonitorV2 (2) or PerMonitor (1) or SystemAware (1)
            ctypes.windll.shcore.SetProcessDpiAwareness(2)
        except Exception:
            try:
                ctypes.windll.user32.SetProcessDPIAware()
            except Exception:
                pass


def get_screen_scale_factor() -> float:
    """Get the primary monitor scaling factor (e.g., 1.0, 1.25, 1.5)."""
    if platform.system() == "Windows":
        try:
            hdc = ctypes.windll.user32.GetDC(0)
            logpixelsy = ctypes.windll.gdi32.GetDeviceCaps(hdc, 90)  # LOGPIXELSY
            ctypes.windll.user32.ReleaseDC(0, hdc)
            return logpixelsy / 96.0
        except Exception:
            pass
    return 1.0


def physical_to_logical(x: int, y: int, scale: float = None) -> Tuple[int, int]:
    """Convert physical screen pixels to logical coordinates."""
    if scale is None:
        scale = get_screen_scale_factor()
    if scale <= 0:
        scale = 1.0
    return int(round(x / scale)), int(round(y / scale))


def logical_to_physical(x: int, y: int, scale: float = None) -> Tuple[int, int]:
    """Convert logical coordinates to physical screen pixels."""
    if scale is None:
        scale = get_screen_scale_factor()
    if scale <= 0:
        scale = 1.0
    return int(round(x * scale)), int(round(y * scale))
