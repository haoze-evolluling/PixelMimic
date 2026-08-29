"""
Flow control actions (Wait Time, Loop, Condition).
"""

from __future__ import annotations
import random
import time
from pixelmimic.core.actions.base import BaseAction, ExecutionContext
from pixelmimic.core.matcher import ImageMatcher
from pixelmimic.core.models import ActionResult, StepNode
from pixelmimic.utils.image_utils import base64_to_cv2_cached


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
    """Evaluates conditions (e.g. image exists / not exists) and directs workflow branching."""

    def execute_core(self, context: ExecutionContext) -> ActionResult:
        cond_type = getattr(self.step, "condition_type", "image_exists") or "image_exists"
        image_found = False
        confidence = 0.0

        if self.step.image_base64:
            template = base64_to_cv2_cached(self.step.image_base64)
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
                if match is not None:
                    image_found = True
                    confidence = match.confidence
        else:
            context.log("警告: 条件判断步骤未设置目标图片，默认判定图像不存在", level="WARNING")

        if cond_type == "image_not_exists":
            condition_met = not image_found
            cond_desc = "图像不存在"
        else:
            condition_met = image_found
            cond_desc = "图像存在"

        # Determine branch directive
        if condition_met:
            branch_action = getattr(self.step, "then_action", "continue") or "continue"
            jump_step = int(getattr(self.step, "then_jump_step", 1) or 1)
            skip_count = int(getattr(self.step, "then_skip_count", 1) or 1)
        else:
            branch_action = getattr(self.step, "else_action", "continue") or "continue"
            jump_step = int(getattr(self.step, "else_jump_step", 1) or 1)
            skip_count = int(getattr(self.step, "else_skip_count", 1) or 1)

        action_desc_map = {
            "continue": "继续执行下一步",
            "jump": f"跳转至第 {jump_step} 步",
            "skip": f"跳过后续 {skip_count} 步",
            "stop": "终止流程",
        }
        action_text = action_desc_map.get(branch_action, "继续执行下一步")
        met_str = "【成立】" if condition_met else "【不成立】"
        msg = f"条件判断 ({cond_desc}): 判定为{met_str} (置信度: {confidence:.2f}) -> {action_text}"
        context.log(msg, level="INFO")

        return ActionResult(
            success=True,
            message=msg,
            data={
                "condition_met": condition_met,
                "branch_action": branch_action,
                "jump_step": jump_step,
                "skip_count": skip_count,
                "confidence": confidence,
            },
        )
