"""
PixelMimic Application Entry Point (PyWebView).
"""

from __future__ import annotations
import os
import sys

# Ensure project root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import webview
from pixelmimic.gui.api import PyWebViewApi
from pixelmimic.utils.dpi_utils import setup_dpi_awareness


def main():
    # Setup Windows DPI awareness
    setup_dpi_awareness()

    # Create Python-JS API controller
    api = PyWebViewApi()

    # Direct path to modern Vue 3 webview distribution
    dist_html_path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "pixelmimic", "gui", "web", "dist", "index.html")
    )

    # Create PyWebView native window
    window = webview.create_window(
        title="PixelMimic - 所见即达，一触即成",
        url=dist_html_path,
        js_api=api,
        width=1040,
        height=680,
        min_size=(800, 520),
        background_color="#0b0f19",
    )
    api.set_window(window)

    # Flush the editing-session cache right before the window closes so the
    # next launch restores the last editing state (Word-like resume).
    def _flush_session_on_close(*_args, **_kwargs):
        try:
            api.flush_session()
        except Exception:
            pass

    window.events.closing += _flush_session_on_close

    # Start application event loop
    webview.start(debug=False)


if __name__ == "__main__":
    main()
