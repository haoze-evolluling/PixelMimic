"""
Image recognition actions (Image Click, Wait for Image, Image Drag).
"""

from __future__ import annotations
import os
import cv2
from pixelmimic.core.actions.base import BaseAction, ExecutionContext
from pixelmimic.core.matcher import ImageMatcher, MatchResult
from pixelmimic.core.models import ActionResult, ClickType, MouseButton, StepNode
from pixelmimic.core.mouse_keyboard import InputDriver
from pixelmimic.utils.image_utils import base64_to_cv2_cached


class ImageActionHelper:
    """Helper to load template images and perform matching."""

    @staticmethod
    def get_template(step: StepNode) -> cv2.typing.MatLike | None:
        if step.image_base64:
            return base64_to_cv2_cached(step.image_base64)
        elif step.image_path and os.path.exists(step.image_path):
            return cv2.imread(step.image_path, cv2.IMREAD_UNCHANGED)
        return None


class ImageClickAction(BaseAction):
    """Finds image on screen and clicks it."""

    def execute_core(self, context: ExecutionContext) -> ActionResult:
        template = ImageActionHelper.get_template(self.step)
        if template is None:
            return ActionResult(success=False, message="缺少目标图片或图片数据无效")

        matcher: ImageMatcher = context.matcher or ImageMatcher()
        timeout = max(0.1, self.step.wait_timeout)
        roi = tuple(self.step.search_roi) if self.step.search_roi else None

        match: MatchResult | None = matcher.wait_for_match(
            template=template,
            timeout=timeout,
            roi=roi,
            confidence=self.step.confidence,
            use_grayscale=self.step.use_grayscale,
            multi_scale=self.step.multi_scale,
        )

        if match is None:
            msg = f"未在屏幕中找到目标图片 (超时 {timeout}s，置信度阈值 {self.step.confidence})"
            context.log(msg, level="ERROR")
            return ActionResult(success=False, message=msg)

        # Calculate click position (center + offset)
        click_x = match.center_x + self.step.offset_x
        click_y = match.center_y + self.step.offset_y

        context.last_matched_pos = (click_x, click_y)
        context.last_matched_confidence = match.confidence

        btn = self.step.mouse_button.value if isinstance(self.step.mouse_button, MouseButton) else str(self.step.mouse_button)
        click_type = self.step.click_type.value if isinstance(self.step.click_type, ClickType) else str(self.step.click_type)

        if click_type == ClickType.DOUBLE.value:
            InputDriver.double_click(click_x, click_y, button=btn)
            act_desc = f"双击【{btn}】键"
        elif click_type == ClickType.TRIPLE.value:
            InputDriver.click(click_x, click_y, button=btn, clicks=3)
            act_desc = f"三击【{btn}】键"
        elif click_type == ClickType.DOWN.value:
            InputDriver.mouse_down(click_x, click_y, button=btn)
            act_desc = f"按下【{btn}】键"
        elif click_type == ClickType.UP.value:
            InputDriver.mouse_up(click_x, click_y, button=btn)
            act_desc = f"释放【{btn}】键"
        else:
            if self.step.press_duration > 0.3:
                InputDriver.long_press(click_x, click_y, button=btn, duration=self.step.press_duration)
                act_desc = f"长按【{btn}】键 {self.step.press_duration:.2f}s"
            else:
                InputDriver.click(click_x, click_y, button=btn, clicks=1)
                act_desc = f"单击【{btn}】键"

        msg = f"匹配到目标图片 (置信度 {match.confidence:.2f})，在位置 ({click_x}, {click_y}) {act_desc}"
        context.log(msg, level="SUCCESS")
        return ActionResult(
            success=True,
            message=msg,
            matched_pos=(click_x, click_y),
            confidence=match.confidence,
        )


class ImageWaitAction(BaseAction):
    """Waits for image to appear or disappear."""

    def execute_core(self, context: ExecutionContext) -> ActionResult:
        template = ImageActionHelper.get_template(self.step)
        if template is None:
            return ActionResult(success=False, message="缺少目标图片或图片数据无效")

        matcher: ImageMatcher = context.matcher or ImageMatcher()
        timeout = max(0.1, self.step.wait_timeout)
        roi = tuple(self.step.search_roi) if self.step.search_roi else None

        match: MatchResult | None = matcher.wait_for_match(
            template=template,
            timeout=timeout,
            roi=roi,
            confidence=self.step.confidence,
            use_grayscale=self.step.use_grayscale,
            multi_scale=self.step.multi_scale,
            wait_for_disappear=self.step.wait_for_disappear,
        )

        if match is None:
            state = "消失" if self.step.wait_for_disappear else "出现"
            msg = f"等待目标图片{state}超时 ({timeout}s)"
            context.log(msg, level="ERROR")
            return ActionResult(success=False, message=msg)

        state = "已消失" if self.step.wait_for_disappear else f"已出现 (坐标: {match.center_x}, {match.center_y}, 置信度: {match.confidence:.2f})"
        msg = f"目标图片{state}"
        context.log(msg, level="SUCCESS")
        return ActionResult(
            success=True,
            message=msg,
            matched_pos=(match.center_x, match.center_y) if not self.step.wait_for_disappear else None,
            confidence=match.confidence,
        )


class ImageDragAction(BaseAction):
    """Finds image and drags it to destination coordinates."""

    def execute_core(self, context: ExecutionContext) -> ActionResult:
        template = ImageActionHelper.get_template(self.step)
        if template is None:
            return ActionResult(success=False, message="缺少目标图片或图片数据无效")

        matcher: ImageMatcher = context.matcher or ImageMatcher()
        timeout = max(0.1, self.step.wait_timeout)
        roi = tuple(self.step.search_roi) if self.step.search_roi else None

        match: MatchResult | None = matcher.wait_for_match(
            template=template,
            timeout=timeout,
            roi=roi,
            confidence=self.step.confidence,
            use_grayscale=self.step.use_grayscale,
            multi_scale=self.step.multi_scale,
        )

        if match is None:
            msg = f"未找到拖拽起始目标图片 (超时 {timeout}s)"
            context.log(msg, level="ERROR")
            return ActionResult(success=False, message=msg)

        from_x = match.center_x + self.step.offset_x
        from_y = match.center_y + self.step.offset_y
        to_x = self.step.drag_to_x
        to_y = self.step.drag_to_y
        btn = self.step.mouse_button.value if isinstance(self.step.mouse_button, MouseButton) else str(self.step.mouse_button)
        duration = max(0.1, self.step.drag_duration)

        InputDriver.drag_to(
            from_x=from_x,
            from_y=from_y,
            to_x=to_x,
            to_y=to_y,
            duration=duration,
            button=btn,
            smooth=self.step.smooth_drag,
        )

        msg = f"图像拖拽: 从识别位置 ({from_x}, {from_y}) 拖拽至 ({to_x}, {to_y})"
        context.log(msg, level="SUCCESS")
        return ActionResult(success=True, message=msg, matched_pos=(to_x, to_y), confidence=match.confidence)
