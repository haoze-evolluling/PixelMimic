"""
Keyboard actions (TypeText, KeyPress, Hotkey).
"""

from __future__ import annotations
from pixelmimic.core.actions.base import BaseAction, ExecutionContext
from pixelmimic.core.models import ActionResult, StepNode
from pixelmimic.core.mouse_keyboard import InputDriver


class TypeTextAction(BaseAction):
    """Executes text typing (with clipboard support for Chinese/Unicode)."""

    def execute_core(self, context: ExecutionContext) -> ActionResult:
        text = self.step.text_to_type
        if not text:
            return ActionResult(success=True, message="文本内容为空，跳过输入")

        InputDriver.type_text(text, use_clipboard=self.step.use_clipboard)
        msg = f"输入文本: '{text}' (剪贴板模式: {self.step.use_clipboard})"
        context.log(msg, level="INFO")
        return ActionResult(success=True, message=msg)


class KeyPressAction(BaseAction):
    """Executes a single key press."""

    def execute_core(self, context: ExecutionContext) -> ActionResult:
        key = self.step.key_press_key
        if not key:
            return ActionResult(success=False, message="未指定按键")

        InputDriver.key_press(key)
        msg = f"按下单键: [{key}]"
        context.log(msg, level="INFO")
        return ActionResult(success=True, message=msg)


class HotkeyAction(BaseAction):
    """Executes hotkey combination."""

    def execute_core(self, context: ExecutionContext) -> ActionResult:
        keys = self.step.hotkeys
        if not keys:
            return ActionResult(success=False, message="未指定快捷键组合")

        InputDriver.hotkey(*keys)
        combo_str = " + ".join(keys)
        msg = f"触发组合键: [{combo_str}]"
        context.log(msg, level="INFO")
        return ActionResult(success=True, message=msg)
