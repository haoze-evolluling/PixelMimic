"""
Flow control actions (Wait Time, Loop, Condition).
"""

from __future__ import annotations
import random
import time
from pixelmimic.core.actions.base import BaseAction, ExecutionContext
from pixelmimic.core.matcher import ImageMatcher
from pixelmimic.core.models import ActionResult, StepNode
from pixelmimic.utils.image_utils import base64_to_cv2


class WaitTimeAction(BaseAction):
    """Waits for a specified fixed or random duration."""

    def execute_core(self, context: ExecutionContext) -> ActionResult:
        duration = self.step.pre_delay
        if self.step.random_delay_max > self.step.random_delay_min > 0:
            duration = random.uniform(self.step.random_delay_min, self.step.random_delay_max)
        elif duration <= 0:
            duration = max(0.1, self.step.wait_timeout)

        msg = f"等待延迟 {duration:.2f} 秒..."
        context.log(msg, level="INFO")

        # Sleep in small slices to remain interruptible
        end_time = time.time() + duration
        while time.time() < end_time:
            context.check_flow_control()
            time.sleep(min(0.1, max(0.0, end_time - time.time())))

        return ActionResult(success=True, message=f"等待完成 ({duration:.2f}s)")


class ConditionAction(BaseAction):
    """Checks a condition (e.g. image exists on screen)."""

    def execute_core(self, context: ExecutionContext) -> ActionResult:
        # Check if template image exists
        if self.step.image_base64:
            template = base64_to_cv2(self.step.image_base64)
            if template is not None:
                matcher: ImageMatcher = context.matcher or ImageMatcher()
                roi = tuple(self.step.search_roi) if self.step.search_roi else None
                match = matcher.find_match(
                    template=template,
                    roi=roi,
                    confidence=self.step.confidence,
                    use_grayscale=self.step.use_grayscale,
                    multi_scale=self.step.multi_scale,
                )
                exists = match is not None
                msg = f"条件判断: 图像{'存在' if exists else '不存在'} (置信度: {match.confidence if match else 0.0:.2f})"
                context.log(msg, level="INFO")
                return ActionResult(success=exists, message=msg, data={"condition_met": exists})

        return ActionResult(success=True, message="默认条件通过")
