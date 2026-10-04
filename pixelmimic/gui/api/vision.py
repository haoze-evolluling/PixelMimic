"""
Vision & input picking methods for the PyWebView API bridge.
Exposes screen snipping, template match testing and mouse position picking to JS.
"""

from __future__ import annotations

from typing import Any, Dict

import cv2

from pixelmimic.core.models import StepNode
from pixelmimic.core.mouse_keyboard import InputDriver
from pixelmimic.gui.match_highlighter import MatchHighlighter
from pixelmimic.utils.image_utils import base64_to_cv2_cached


class VisionMixin:
    """JS-exposed vision & coordinate picking API (mixin for PyWebViewApi)."""

    def start_snip(self) -> Dict[str, Any]:
        """Launch screen snipper."""
        try:
            self._snipper.start_snip(callback=self._on_snip_captured)
            return {"success": True}
        except Exception as e:
            return {"success": False, "message": str(e)}

    def test_match(self, step_data: Dict[str, Any]) -> Dict[str, Any]:
        """Test OpenCV template match on current screen and flash target highlight."""
        try:
            step = StepNode.from_dict(step_data)
            if not step.image_base64:
                return {"found": False, "message": "步骤中未设置目标图片，请先截取或上传图片"}

            tpl = base64_to_cv2_cached(step.image_base64)
            if tpl is None:
                return {"found": False, "message": "目标图片解析失败"}

            method_val = getattr(cv2, step.match_method.value, cv2.TM_CCOEFF_NORMED)
            roi = tuple(step.search_roi) if step.search_roi and len(step.search_roi) == 4 else None

            match = self._engine.matcher.find_match(
                template=tpl,
                roi=roi,
                confidence=step.confidence,
                use_grayscale=step.use_grayscale,
                multi_scale=step.multi_scale,
                method=method_val,
            )

            if match:
                # Flash highlight overlay on screen
                MatchHighlighter.show_highlight(match.x, match.y, match.width, match.height, match.confidence)
                return {
                    "found": True,
                    "x": match.x,
                    "y": match.y,
                    "width": match.width,
                    "height": match.height,
                    "center_x": match.center_x,
                    "center_y": match.center_y,
                    "confidence": round(match.confidence, 4),
                    "confidencePct": f"{match.confidence * 100:.1f}%",
                    "message": f"匹配成功！相似度 {match.confidence * 100:.1f}%，位置 ({match.center_x}, {match.center_y})",
                }
            else:
                return {
                    "found": False,
                    "message": f"未在当前屏幕中找到相似度 ≥ {int(step.confidence * 100)}% 的目标图片",
                }
        except Exception as e:
            return {"found": False, "message": f"匹配测试异常: {str(e)}"}

    def pick_mouse_position(self) -> Dict[str, Any]:
        """Get current mouse coordinates."""
        x, y = InputDriver.get_mouse_position()
        return {"success": True, "x": x, "y": y}
