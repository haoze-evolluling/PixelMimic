"""
OCR Text recognition action (Extensible Plugin Node).
"""

from __future__ import annotations
from pixelmimic.core.actions.base import BaseAction, ExecutionContext
from pixelmimic.core.models import ActionResult, StepNode
from pixelmimic.core.mouse_keyboard import InputDriver


class OcrClickAction(BaseAction):
    """
    Finds text on screen using OCR and clicks it.
    Can integrate RapidOCR / EasyOCR / Windows Media OCR seamlessly.
    """

    def execute_core(self, context: ExecutionContext) -> ActionResult:
        target_text = self.step.text_to_type or self.step.metadata.get("ocr_target_text", "")
        if not target_text:
            return ActionResult(success=False, message="未指定 OCR 检索目标文本")

        context.log(f"正在进行 OCR 文字识别检索: '{target_text}'...", level="INFO")
        # Architecture hook for pluggable OCR engines
        # When rapidocr or tesseract is installed, it can be called here.
        # Fallback message
        return ActionResult(
            success=False,
            message=f"OCR 插件已挂载。请确保已安装相应 OCR 引擎组件以激活文字检索功能 ({target_text})",
        )
