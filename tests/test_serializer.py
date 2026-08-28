"""
Unit tests for workflow serializer.
"""

import os
import tempfile
import unittest
from pixelmimic.core.models import ActionType, MouseButton, StepNode, Workflow
from pixelmimic.utils.serializer import WorkflowSerializer


class TestSerializer(unittest.TestCase):

    def test_save_and_load_workflow(self):
        wf = Workflow(name="测试序列化流程", description="用于验证文件存取")
        step1 = StepNode(
            name="点击确定",
            action_type=ActionType.MOUSE_CLICK,
            x=350,
            y=420,
            mouse_button=MouseButton.LEFT,
        )
        step2 = StepNode(
            name="延时等待",
            action_type=ActionType.WAIT_TIME,
            pre_delay=0.5,
        )
        wf.steps.extend([step1, step2])

        with tempfile.NamedTemporaryFile(suffix=".pmflow", delete=False) as tmp:
            tmp_path = tmp.name

        try:
            # Save
            res = WorkflowSerializer.save_to_file(wf, tmp_path)
            self.assertTrue(res)

            # Load
            loaded_wf = WorkflowSerializer.load_from_file(tmp_path)
            self.assertIsNotNone(loaded_wf)
            self.assertEqual(loaded_wf.name, "测试序列化流程")
            self.assertEqual(len(loaded_wf.steps), 2)
            self.assertEqual(loaded_wf.steps[0].name, "点击确定")
            self.assertEqual(loaded_wf.steps[0].x, 350)
            self.assertEqual(loaded_wf.steps[0].y, 420)
            self.assertEqual(loaded_wf.steps[1].action_type, ActionType.WAIT_TIME)
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)


if __name__ == "__main__":
    unittest.main()
