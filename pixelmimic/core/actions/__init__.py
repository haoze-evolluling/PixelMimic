"""
Action registry and factory for creating action handlers.
"""

from __future__ import annotations
from typing import Dict, Type
from pixelmimic.core.actions.base import BaseAction, ExecutionContext
from pixelmimic.core.actions.flow_action import ConditionAction, WaitTimeAction
from pixelmimic.core.actions.image_action import ImageClickAction, ImageDragAction, ImageWaitAction
from pixelmimic.core.actions.keyboard_action import HotkeyAction, KeyPressAction, TypeTextAction
from pixelmimic.core.actions.mouse_action import (
    MouseClickAction,
    MouseDragAction,
    MouseLongPressAction,
    MouseMoveAction,
    MouseScrollAction,
)
from pixelmimic.core.actions.ocr_action import OcrClickAction
from pixelmimic.core.models import ActionType, StepNode


class ActionRegistry:
    """Registry mapping ActionType to Action classes."""

    _registry: Dict[ActionType, Type[BaseAction]] = {
        ActionType.MOUSE_CLICK: MouseClickAction,
        ActionType.MOUSE_LONGPRESS: MouseLongPressAction,
        ActionType.MOUSE_MOVE: MouseMoveAction,
        ActionType.MOUSE_DRAG: MouseDragAction,
        ActionType.MOUSE_SCROLL: MouseScrollAction,
        ActionType.IMAGE_CLICK: ImageClickAction,
        ActionType.IMAGE_WAIT: ImageWaitAction,
        ActionType.IMAGE_DRAG: ImageDragAction,
        ActionType.TYPE_TEXT: TypeTextAction,
        ActionType.KEY_PRESS: KeyPressAction,
        ActionType.HOTKEY: HotkeyAction,
        ActionType.WAIT_TIME: WaitTimeAction,
        ActionType.CONDITION: ConditionAction,
        ActionType.OCR_CLICK: OcrClickAction,
    }

    @classmethod
    def register(cls, action_type: ActionType, action_cls: Type[BaseAction]):
        """Register a custom action class."""
        cls._registry[action_type] = action_cls

    @classmethod
    def create(cls, step: StepNode) -> BaseAction:
        """Create action instance for the given step."""
        act_type = step.action_type
        if isinstance(act_type, str):
            try:
                act_type = ActionType(act_type)
            except ValueError:
                pass

        action_cls = cls._registry.get(act_type)
        if action_cls is None:
            # Default fallback to MouseClickAction
            action_cls = MouseClickAction
        return action_cls(step)


__all__ = [
    "BaseAction",
    "ExecutionContext",
    "ActionRegistry",
    "MouseClickAction",
    "MouseLongPressAction",
    "MouseMoveAction",
    "MouseDragAction",
    "MouseScrollAction",
    "ImageClickAction",
    "ImageWaitAction",
    "ImageDragAction",
    "TypeTextAction",
    "KeyPressAction",
    "HotkeyAction",
    "WaitTimeAction",
    "ConditionAction",
    "OcrClickAction",
]
