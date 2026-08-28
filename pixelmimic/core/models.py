"""
Data models and enumerations for PixelMimic.
"""

from __future__ import annotations
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple
import uuid


class ActionType(str, Enum):
    # Mouse Operations
    MOUSE_CLICK = "mouse_click"           # 单击/双击/右键点击坐标
    MOUSE_LONGPRESS = "mouse_longpress"   # 鼠标长按
    MOUSE_MOVE = "mouse_move"             # 鼠标移动
    MOUSE_DRAG = "mouse_drag"             # 鼠标拖拽
    MOUSE_SCROLL = "mouse_scroll"         # 滚轮滚动

    # Image-based Operations
    IMAGE_CLICK = "image_click"           # 图像识别并点击
    IMAGE_WAIT = "image_wait"             # 等待图像出现/消失
    IMAGE_DRAG = "image_drag"             # 图像识别拖拽到目标位置

    # Keyboard Operations
    TYPE_TEXT = "type_text"               # 文本输入
    KEY_PRESS = "key_press"               # 单个按键按下
    HOTKEY = "hotkey"                     # 组合快捷键 (e.g. Ctrl+V)

    # Flow Control Operations
    WAIT_TIME = "wait_time"               # 等待延迟 (固定或随机)
    LOOP = "loop"                         # 循环执行 (预留/高级)
    CONDITION = "condition"               # 条件分支 (预留/高级)

    # Advanced Extensions
    OCR_CLICK = "ocr_click"               # OCR文字识别并点击 (预留)
    WINDOW_ACTIVATE = "window_activate"   # 窗口激活/前置 (预留)


class MouseButton(str, Enum):
    LEFT = "left"
    RIGHT = "right"
    MIDDLE = "middle"


class ClickType(str, Enum):
    SINGLE = "single"
    DOUBLE = "double"
    TRIPLE = "triple"
    DOWN = "down"
    UP = "up"


class TargetType(str, Enum):
    COORDINATE = "coordinate"
    IMAGE = "image"
    CURRENT = "current"


class MatchMethod(str, Enum):
    CCOEFF_NORMED = "TM_CCOEFF_NORMED"
    CCORR_NORMED = "TM_CCORR_NORMED"
    SQDIFF_NORMED = "TM_SQDIFF_NORMED"


class OnFailureAction(str, Enum):
    STOP = "stop"
    CONTINUE = "continue"
    RETRY = "retry"


class ExecutionState(str, Enum):
    IDLE = "idle"
    RUNNING = "running"
    PAUSED = "paused"
    STOPPED = "stopped"
    COMPLETED = "completed"
    ERROR = "error"


@dataclass
class ActionResult:
    success: bool = True
    message: str = ""
    matched_pos: Optional[Tuple[int, int]] = None
    confidence: Optional[float] = None
    execution_time: float = 0.0
    data: Dict[str, Any] = field(default_factory=dict)


@dataclass
class StepNode:
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    name: str = "未命名步骤"
    action_type: ActionType = ActionType.MOUSE_CLICK
    enabled: bool = True

    # Target & Coordinates
    target_type: TargetType = TargetType.COORDINATE
    x: int = 0
    y: int = 0
    offset_x: int = 0
    offset_y: int = 0

    # Drag parameters
    drag_to_x: int = 0
    drag_to_y: int = 0
    drag_duration: float = 0.5
    smooth_drag: bool = True

    # Mouse parameters
    mouse_button: MouseButton = MouseButton.LEFT
    click_type: ClickType = ClickType.SINGLE
    press_duration: float = 1.0  # seconds for long press
    scroll_amount: int = 0      # positive for up, negative for down

    # Keyboard parameters
    text_to_type: str = ""
    use_clipboard: bool = False
    hotkeys: List[str] = field(default_factory=list)
    key_press_key: str = ""

    # Image matching parameters
    image_base64: Optional[str] = None
    image_path: Optional[str] = None
    confidence: float = 0.8
    match_method: MatchMethod = MatchMethod.CCOEFF_NORMED
    use_grayscale: bool = True
    multi_scale: bool = False
    search_roi: Optional[List[int]] = None  # [x, y, w, h] or None for full screen
    wait_timeout: float = 5.0              # max seconds to wait for image
    wait_for_disappear: bool = False

    # Condition parameters
    condition_type: str = "image_exists"  # "image_exists" | "image_not_exists"
    then_action: str = "continue"         # "continue" | "jump" | "skip" | "stop"
    then_jump_step: int = 1               # 1-indexed target step
    then_skip_count: int = 1              # number of steps to skip
    else_action: str = "continue"         # "continue" | "jump" | "skip" | "stop"
    else_jump_step: int = 1
    else_skip_count: int = 1

    # Timing & Retry parameters
    pre_delay: float = 0.0       # seconds before executing step
    post_delay: float = 0.2      # seconds after executing step
    random_delay_min: float = 0.0 # for random delay
    random_delay_max: float = 0.0
    retry_count: int = 1
    retry_interval: float = 0.5
    on_failure: OnFailureAction = OnFailureAction.STOP

    # Visual Canvas Layout coordinates (for n8n-style workflow editor)
    node_x: int = 0
    node_y: int = 0

    # Extensible Metadata
    comment: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "action_type": self.action_type.value if isinstance(self.action_type, ActionType) else self.action_type,
            "enabled": self.enabled,
            "target_type": self.target_type.value if isinstance(self.target_type, TargetType) else self.target_type,
            "x": self.x,
            "y": self.y,
            "offset_x": self.offset_x,
            "offset_y": self.offset_y,
            "drag_to_x": self.drag_to_x,
            "drag_to_y": self.drag_to_y,
            "drag_duration": self.drag_duration,
            "smooth_drag": self.smooth_drag,
            "mouse_button": self.mouse_button.value if isinstance(self.mouse_button, MouseButton) else self.mouse_button,
            "click_type": self.click_type.value if isinstance(self.click_type, ClickType) else self.click_type,
            "press_duration": self.press_duration,
            "scroll_amount": self.scroll_amount,
            "text_to_type": self.text_to_type,
            "use_clipboard": self.use_clipboard,
            "hotkeys": list(self.hotkeys),
            "key_press_key": self.key_press_key,
            "image_base64": self.image_base64,
            "image_path": self.image_path,
            "confidence": self.confidence,
            "match_method": self.match_method.value if isinstance(self.match_method, MatchMethod) else self.match_method,
            "use_grayscale": self.use_grayscale,
            "multi_scale": self.multi_scale,
            "search_roi": list(self.search_roi) if self.search_roi else None,
            "wait_timeout": self.wait_timeout,
            "wait_for_disappear": self.wait_for_disappear,
            "condition_type": self.condition_type,
            "then_action": self.then_action,
            "then_jump_step": self.then_jump_step,
            "then_skip_count": self.then_skip_count,
            "else_action": self.else_action,
            "else_jump_step": self.else_jump_step,
            "else_skip_count": self.else_skip_count,
            "pre_delay": self.pre_delay,
            "post_delay": self.post_delay,
            "random_delay_min": self.random_delay_min,
            "random_delay_max": self.random_delay_max,
            "retry_count": self.retry_count,
            "retry_interval": self.retry_interval,
            "on_failure": self.on_failure.value if isinstance(self.on_failure, OnFailureAction) else self.on_failure,
            "node_x": self.node_x,
            "node_y": self.node_y,
            "comment": self.comment,
            "metadata": dict(self.metadata),
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> StepNode:
        data = dict(data)
        if "action_type" in data:
            data["action_type"] = ActionType(data["action_type"])
        if "target_type" in data:
            data["target_type"] = TargetType(data["target_type"])
        if "mouse_button" in data:
            data["mouse_button"] = MouseButton(data["mouse_button"])
        if "click_type" in data:
            data["click_type"] = ClickType(data["click_type"])
        if "match_method" in data:
            data["match_method"] = MatchMethod(data["match_method"])
        if "on_failure" in data:
            data["on_failure"] = OnFailureAction(data["on_failure"])
        return cls(**data)


@dataclass
class Workflow:
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    name: str = "新工作流"
    description: str = ""
    version: str = "1.0.0"
    loop_count: int = 1         # 1 for once, 0 for infinite, N for N times
    loop_interval: float = 1.0  # seconds between loops
    stop_on_error: bool = True
    steps: List[StepNode] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "version": self.version,
            "loop_count": self.loop_count,
            "loop_interval": self.loop_interval,
            "stop_on_error": self.stop_on_error,
            "steps": [step.to_dict() for step in self.steps],
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> Workflow:
        data = dict(data)
        steps_data = data.pop("steps", [])
        steps = [StepNode.from_dict(s) for s in steps_data]
        return cls(steps=steps, **data)
