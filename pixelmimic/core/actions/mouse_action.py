"""
Mouse operation actions (Click, Double Click, Long Press, Drag, Move, Scroll).
"""

from __future__ import annotations
from pixelmimic.core.actions.base import BaseAction, ExecutionContext
from pixelmimic.core.models import ActionResult, ClickType, MouseButton, StepNode
from pixelmimic.core.mouse_keyboard import InputDriver


class MouseClickAction(BaseAction):
    """Executes single, double, down, or up click at coordinates."""

    def execute_core(self, context: ExecutionContext) -> ActionResult:
        x, y = self.step.x + self.step.offset_x, self.step.y + self.step.offset_y
        btn = self.step.mouse_button.value if isinstance(self.step.mouse_button, MouseButton) else str(self.step.mouse_button)
        click_type = self.step.click_type.value if isinstance(self.step.click_type, ClickType) else str(self.step.click_type)

        if click_type == ClickType.DOUBLE.value:
            InputDriver.double_click(x, y, button=btn)
            msg = f"在坐标 ({x}, {y}) 双击鼠标【{btn}】键"
        elif click_type == ClickType.TRIPLE.value:
            InputDriver.click(x, y, button=btn, clicks=3)
            msg = f"在坐标 ({x}, {y}) 三击鼠标【{btn}】键"
        elif click_type == ClickType.DOWN.value:
            InputDriver.mouse_down(x, y, button=btn)
            msg = f"在坐标 ({x}, {y}) 按下鼠标【{btn}】键"
        elif click_type == ClickType.UP.value:
            InputDriver.mouse_up(x, y, button=btn)
            msg = f"在坐标 ({x}, {y}) 释放鼠标【{btn}】键"
        else:
            InputDriver.click(x, y, button=btn, clicks=1)
            msg = f"在坐标 ({x}, {y}) 单击鼠标【{btn}】键"

        context.log(msg, level="INFO")
        return ActionResult(success=True, message=msg, matched_pos=(x, y))


class MouseLongPressAction(BaseAction):
    """Executes mouse long press (hold for duration seconds)."""

    def execute_core(self, context: ExecutionContext) -> ActionResult:
        x, y = self.step.x + self.step.offset_x, self.step.y + self.step.offset_y
        btn = self.step.mouse_button.value if isinstance(self.step.mouse_button, MouseButton) else str(self.step.mouse_button)
        duration = max(0.1, self.step.press_duration)

        InputDriver.long_press(x, y, button=btn, duration=duration)
        msg = f"在坐标 ({x}, {y}) 长按鼠标【{btn}】键 {duration:.2f} 秒"
        context.log(msg, level="INFO")
        return ActionResult(success=True, message=msg, matched_pos=(x, y))


class MouseMoveAction(BaseAction):
    """Executes mouse movement to target coordinates."""

    def execute_core(self, context: ExecutionContext) -> ActionResult:
        x, y = self.step.x + self.step.offset_x, self.step.y + self.step.offset_y
        duration = max(0.0, self.step.drag_duration)
        InputDriver.move_to(x, y, duration=duration, smooth=self.step.smooth_drag)
        msg = f"移动鼠标到坐标 ({x}, {y})"
        context.log(msg, level="INFO")
        return ActionResult(success=True, message=msg, matched_pos=(x, y))


class MouseDragAction(BaseAction):
    """Executes mouse drag from start position to end position."""

    def execute_core(self, context: ExecutionContext) -> ActionResult:
        from_x = self.step.x + self.step.offset_x
        from_y = self.step.y + self.step.offset_y
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
        msg = f"从 ({from_x}, {from_y}) 拖拽鼠标【{btn}】键至 ({to_x}, {to_y})，耗时 {duration:.2f}s"
        context.log(msg, level="INFO")
        return ActionResult(success=True, message=msg, matched_pos=(to_x, to_y))


class MouseScrollAction(BaseAction):
    """Executes mouse wheel scroll."""

    def execute_core(self, context: ExecutionContext) -> ActionResult:
        x = (self.step.x + self.step.offset_x) if self.step.x > 0 else None
        y = (self.step.y + self.step.offset_y) if self.step.y > 0 else None
        clicks = self.step.scroll_amount

        InputDriver.scroll(clicks, x=x, y=y)
        direction = "向上" if clicks > 0 else "向下"
        msg = f"鼠标滚轮{direction}滚动 {abs(clicks)} 格"
        context.log(msg, level="INFO")
        return ActionResult(success=True, message=msg)
