"""
Sample workflow templates for beginners.
"""

from __future__ import annotations

from pixelmimic.core.models import (
    ActionType,
    ClickType,
    MouseButton,
    StepNode,
    TargetType,
    Workflow,
)


def build_sample_workflow() -> Workflow:
    """Generate beginner-friendly example workflow."""
    wf = Workflow(name="新手自动化示例流程", description="演示找图点击、文字输入与延时等待")

    s1 = StepNode(
        name="等待应用就绪",
        action_type=ActionType.WAIT_TIME,
        pre_delay=1.0,
        comment="等待前置窗口或软件加载完成",
    )
    s2 = StepNode(
        name="单击屏幕输入框",
        action_type=ActionType.MOUSE_CLICK,
        target_type=TargetType.COORDINATE,
        x=600,
        y=400,
        mouse_button=MouseButton.LEFT,
        click_type=ClickType.SINGLE,
        comment="点击目标输入框位置",
    )
    s3 = StepNode(
        name="自动输入欢迎文字",
        action_type=ActionType.TYPE_TEXT,
        text_to_type="你好，PixelMimic 自动化大师！",
        use_clipboard=True,
        comment="支持中文与特殊符号",
    )
    s4 = StepNode(
        name="按回车确认",
        action_type=ActionType.KEY_PRESS,
        key_press_key="enter",
        comment="模拟键盘按下 Enter 键",
    )
    wf.steps = [s1, s2, s3, s4]
    return wf
