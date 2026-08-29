"""
Image conversion and manipulation utilities for PixelMimic.
"""

from __future__ import annotations
import base64
import io
from collections import OrderedDict
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


# 模板解码缓存：同一 base64 模板会在重试、轮询与循环执行期间被反复使用，
# 缓存可免去每次 b64decode + 图像解码。以 base64 字符串本身为键
# （内容不变即命中），容量受限防止内存增长。
_TEMPLATE_CACHE: "OrderedDict[str, np.ndarray]" = OrderedDict()
_TEMPLATE_CACHE_MAX = 8


def base64_to_cv2_cached(b64_str: Optional[str]) -> Optional[np.ndarray]:
    """Cached variant of base64_to_cv2, for template images used repeatedly.

    返回的数组为缓存共享实例，调用方不得原地修改。
    """
    if not b64_str:
        return None
    cached = _TEMPLATE_CACHE.get(b64_str)
    if cached is not None:
        return cached
    img = base64_to_cv2(b64_str)
    if img is not None:
        _TEMPLATE_CACHE[b64_str] = img
        while len(_TEMPLATE_CACHE) > _TEMPLATE_CACHE_MAX:
            _TEMPLATE_CACHE.popitem(last=False)
    return img


def pil_to_base64(pil_img: Image.Image, fmt: str = "PNG") -> str:
    """Convert PIL Image to base64 string."""
    if pil_img is None:
        return ""
    buf = io.BytesIO()
    pil_img.save(buf, format=fmt)
    return base64.b64encode(buf.getvalue()).decode("utf-8")
