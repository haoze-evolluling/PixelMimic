"""
Image conversion and manipulation utilities for PixelMimic.
"""

from __future__ import annotations
import base64
import io
from typing import Optional, Tuple
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


def cv2_to_base64(cv_img: np.ndarray, ext: str = ".png", quality: int = 95) -> str:
    """Convert OpenCV BGR image to base64 string."""
    if cv_img is None:
        return ""
    params = []
    if ext.lower() in [".jpg", ".jpeg"]:
        params = [int(cv2.IMWRITE_JPEG_QUALITY), quality]
    elif ext.lower() == ".png":
        params = [int(cv2.IMWRITE_PNG_COMPRESSION), 4]
    
    success, buffer = cv2.imencode(ext, cv_img, params)
    if not success:
        return ""
    return base64.b64encode(buffer).decode("utf-8")


def pil_to_base64(pil_img: Image.Image, fmt: str = "PNG") -> str:
    """Convert PIL Image to base64 string."""
    if pil_img is None:
        return ""
    buf = io.BytesIO()
    pil_img.save(buf, format=fmt)
    return base64.b64encode(buf.getvalue()).decode("utf-8")


def base64_to_pil(b64_str: str) -> Optional[Image.Image]:
    """Convert base64 string to PIL Image."""
    if not b64_str:
        return None
    try:
        if "," in b64_str:
            b64_str = b64_str.split(",", 1)[1]
        img_bytes = base64.b64decode(b64_str)
        return Image.open(io.BytesIO(img_bytes))
    except Exception as e:
        print(f"[image_utils] base64_to_pil error: {e}")
        return None


def pil_to_cv2(pil_img: Image.Image) -> np.ndarray:
    """Convert PIL Image to OpenCV BGR/BGRA numpy array."""
    arr = np.array(pil_img)
    if len(arr.shape) == 2:
        return cv2.cvtColor(arr, cv2.COLOR_GRAY2BGR)
    elif arr.shape[2] == 3:
        return cv2.cvtColor(arr, cv2.COLOR_RGB2BGR)
    elif arr.shape[2] == 4:
        return cv2.cvtColor(arr, cv2.COLOR_RGBA2BGRA)
    return arr


def cv2_to_pil(cv_img: np.ndarray) -> Image.Image:
    """Convert OpenCV image to PIL Image."""
    if len(cv_img.shape) == 2:
        return Image.fromarray(cv_img)
    elif cv_img.shape[2] == 3:
        return Image.fromarray(cv2.cvtColor(cv_img, cv2.COLOR_BGR2RGB))
    elif cv_img.shape[2] == 4:
        return Image.fromarray(cv2.cvtColor(cv_img, cv2.COLOR_BGRA2RGBA))
    return Image.fromarray(cv_img)
