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

    # Path to webview frontend (prioritize Vue 3 dist build)
    dist_html_path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "pixelmimic", "gui", "web", "dist", "index.html")
    )
    fallback_html_path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "pixelmimic", "gui", "web", "index.html")
    )
    html_path = dist_html_path if os.path.exists(dist_html_path) else fallback_html_path

    # Create PyWebView native window
    window = webview.create_window(
        title="PixelMimic - 桌面可视化自动化大师",
        url=html_path,
        js_api=api,
        width=1280,
        height=850,
        min_size=(960, 640),
        background_color="#0b0f19",
    )
    api.set_window(window)

    # Start application event loop
    webview.start(debug=False)


if __name__ == "__main__":
    main()
