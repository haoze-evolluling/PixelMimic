"""
Image conversion and manipulation utilities for PixelMimic.
"""

from __future__ import annotations
import base64
import io
from typing import Optional
import cv2
import numpy as np
from PIL import Image


def base64_to_cv2(b64_str: str) -> Optional[np.ndarray]:
    """Convert base64 string to OpenCV BGR numpy array."""
    if not b64_str:
        return None
    try:
        if "," in b64_str:
            b64_str = b64_str.split(",", 1)[1]
        img_bytes = base64.b64decode(b64_str)
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_UNCHANGED)
        if img is None:
            return None
        if len(img.shape) == 2:
            img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
        return img
    except Exception as e:
        print(f"[image_utils] base64_to_cv2 error: {e}")
        return None


def pil_to_base64(pil_img: Image.Image, fmt: str = "PNG") -> str:
    """Convert PIL Image to base64 string."""
    if pil_img is None:
        return ""
    buf = io.BytesIO()
    pil_img.save(buf, format=fmt)
    return base64.b64encode(buf.getvalue()).decode("utf-8")
