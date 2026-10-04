"""
DPI awareness setup for Windows.
"""

from __future__ import annotations
import ctypes
import platform


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
