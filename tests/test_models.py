"""
Unit tests for data models.
"""

import unittest
from pixelmimic.core.models import (
    ActionType,
    ClickType,
    MatchMethod,
    MouseButton,
    OnFailureAction,
    StepNode,
    Workflow,
)


class TestModels(unittest.TestCase):

    def test_step_node_defaults_and_serialization(self):
        step = StepNode(
            name="测试点击",
            action_type=ActionType.MOUSE_CLICK,
            x=100,
            y=200,
            mouse_button=MouseButton.RIGHT,
            click_type=ClickType.DOUBLE,
        )
        d = step.to_dict()
        self.assertEqual(d["name"], "测试点击")
        self.assertEqual(d["action_type"], "mouse_click")
        self.assertEqual(d["x"], 100)
        self.assertEqual(d["y"], 200)
        self.assertEqual(d["mouse_button"], "right")
        self.assertEqual(d["click_type"], "double")

        # Reconstruct from dict
        reconstructed = StepNode.from_dict(d)
        self.assertEqual(reconstructed.id, step.id)
        self.assertEqual(reconstructed.name, step.name)
        self.assertEqual(reconstructed.action_type, ActionType.MOUSE_CLICK)
        self.assertEqual(reconstructed.mouse_button, MouseButton.RIGHT)
        self.assertEqual(reconstructed.click_type, ClickType.DOUBLE)

    def test_condition_and_scroll_serialization(self):
        step_scroll = StepNode(
            name="向下滚动测试",
            action_type=ActionType.MOUSE_SCROLL,
            scroll_amount=-5,
            x=300,
            y=400,
        )
        d_scroll = step_scroll.to_dict()
        self.assertEqual(d_scroll["action_type"], "mouse_scroll")
        self.assertEqual(d_scroll["scroll_amount"], -5)
        self.assertEqual(d_scroll["x"], 300)
        self.assertEqual(d_scroll["y"], 400)

        recon_scroll = StepNode.from_dict(d_scroll)
        self.assertEqual(recon_scroll.action_type, ActionType.MOUSE_SCROLL)
        self.assertEqual(recon_scroll.scroll_amount, -5)

        step_cond = StepNode(
            name="条件判断测试",
            action_type=ActionType.CONDITION,
            condition_type="image_not_exists",
            then_action="jump",
            then_jump_step=4,
            else_action="skip",
            else_skip_count=2,
        )
        d_cond = step_cond.to_dict()
        self.assertEqual(d_cond["action_type"], "condition")
        self.assertEqual(d_cond["condition_type"], "image_not_exists")
        self.assertEqual(d_cond["then_action"], "jump")
        self.assertEqual(d_cond["then_jump_step"], 4)
        self.assertEqual(d_cond["else_action"], "skip")
        self.assertEqual(d_cond["else_skip_count"], 2)

        recon_cond = StepNode.from_dict(d_cond)
        self.assertEqual(recon_cond.action_type, ActionType.CONDITION)
        self.assertEqual(recon_cond.condition_type, "image_not_exists")
        self.assertEqual(recon_cond.then_action, "jump")
        self.assertEqual(recon_cond.then_jump_step, 4)
        self.assertEqual(recon_cond.else_action, "skip")
        self.assertEqual(recon_cond.else_skip_count, 2)


if __name__ == "__main__":
    unittest.main()
