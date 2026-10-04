"""
Unit tests for PyWebViewApi controller and backend methods.
"""

import unittest
from pixelmimic.core.models import ActionType, StepNode, Workflow
from pixelmimic.gui.api import PyWebViewApi


class TestPyWebViewApi(unittest.TestCase):

    def setUp(self):
        self.api = PyWebViewApi()

    def tearDown(self):
        self.api._engine.stop()
        self.api._hotkey_mgr.stop()

    def test_get_initial_data(self):
        data = self.api.get_initial_data()
        self.assertIn("workflow", data)
        self.assertIn("settings", data)
        self.assertIn("cursorPos", data)
        self.assertIn("state", data)

    def test_new_workflow(self):
        res = self.api.new_workflow()
        self.assertTrue(res["success"])
        self.assertEqual(len(res["workflow"]["steps"]), 0)

    def test_update_workflow(self):
        wf = Workflow(name="API测试流程")
        step = StepNode(name="测试延时", action_type=ActionType.WAIT_TIME, pre_delay=0.1)
        wf.steps.append(step)

        res = self.api.update_workflow(wf.to_dict())
        self.assertTrue(res["success"])
        self.assertEqual(len(self.api._workflow.steps), 1)
        self.assertEqual(self.api._workflow.steps[0].name, "测试延时")

    def test_load_sample_template(self):
        res = self.api.load_sample_template("basic")
        self.assertTrue(res["success"])
        self.assertGreater(len(res["workflow"]["steps"]), 0)

    def test_single_step_execution_via_api(self):
        step = StepNode(name="API单步测试", action_type=ActionType.WAIT_TIME, pre_delay=0.01)
        res = self.api.test_single_step(step.to_dict(), 0)
        self.assertTrue(res["success"])

    def test_save_settings(self):
        res = self.api.save_settings({"loop_count": 5, "minimize_on_run": False})
        self.assertTrue(res["success"])
        self.assertEqual(self.api._settings["loop_count"], 5)
        self.assertFalse(self.api._settings["minimize_on_run"])

        # Test infinite loop (loop_count: 0)
        res_zero = self.api.save_settings({"loop_count": 0})
        self.assertTrue(res_zero["success"])
        self.assertEqual(self.api._settings["loop_count"], 0)


if __name__ == "__main__":
    unittest.main()
