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

    def test_workflow_serialization(self):
        wf = Workflow(name="登录流程", loop_count=3, loop_interval=0.5)
        step1 = StepNode(name="第1步", action_type=ActionType.MOUSE_CLICK, x=50, y=50)
        step2 = StepNode(name="第2步", action_type=ActionType.TYPE_TEXT, text_to_type="hello")
        wf.steps.extend([step1, step2])

        d = wf.to_dict()
        self.assertEqual(d["name"], "登录流程")
        self.assertEqual(d["loop_count"], 3)
        self.assertEqual(len(d["steps"]), 2)

        wf_loaded = Workflow.from_dict(d)
        self.assertEqual(wf_loaded.id, wf.id)
        self.assertEqual(wf_loaded.name, "登录流程")
        self.assertEqual(len(wf_loaded.steps), 2)
        self.assertEqual(wf_loaded.steps[0].action_type, ActionType.MOUSE_CLICK)
        self.assertEqual(wf_loaded.steps[1].text_to_type, "hello")


if __name__ == "__main__":
    unittest.main()
