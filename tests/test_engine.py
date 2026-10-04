"""
Unit tests for execution engine.
"""

import time
import unittest
from pixelmimic.core.engine import ExecutionEngine
from pixelmimic.core.models import (
    ActionType,
    ExecutionState,
    OnFailureAction,
    StepNode,
    Workflow,
)


class TestExecutionEngine(unittest.TestCase):

    def test_single_step_execution(self):
        wf = Workflow(name="测试工作流")
        step = StepNode(
            name="测试等待",
            action_type=ActionType.WAIT_TIME,
            pre_delay=0.05,
        )
        wf.steps.append(step)

        engine = ExecutionEngine(wf)
        res = engine.test_single_step(step)
        self.assertTrue(res.success)

    def test_full_workflow_run(self):
        wf = Workflow(name="短流程测试", loop_count=2, loop_interval=0.02)
        s1 = StepNode(name="步骤1", action_type=ActionType.WAIT_TIME, pre_delay=0.01, post_delay=0.0)
        s2 = StepNode(name="步骤2", action_type=ActionType.WAIT_TIME, pre_delay=0.01, post_delay=0.0)
        wf.steps.extend([s1, s2])

        engine = ExecutionEngine(wf)
        engine.start()

        # Wait for completion
        timeout = 5.0
        start = time.time()
        while engine.state == ExecutionState.RUNNING and (time.time() - start < timeout):
            time.sleep(0.05)

        self.assertEqual(engine.state, ExecutionState.COMPLETED)

    def test_stop_workflow(self):
        wf = Workflow(name="长流程测试", loop_count=0)  # infinite
        s1 = StepNode(name="循环步骤", action_type=ActionType.WAIT_TIME, pre_delay=0.2, post_delay=0.0)
        wf.steps.append(s1)

        engine = ExecutionEngine(wf)
        engine.start()
        time.sleep(0.1)
        self.assertEqual(engine.state, ExecutionState.RUNNING)

        engine.stop()
        time.sleep(0.2)
        self.assertEqual(engine.state, ExecutionState.STOPPED)

    def test_condition_branch_jump_and_skip(self):
        # Test condition jump
        wf = Workflow(name="条件跳转测试", loop_count=1)
        executed_steps = []

        s1 = StepNode(
            name="条件判断步骤",
            action_type=ActionType.CONDITION,
            condition_type="image_not_exists",  # no image provided -> is_met is True
            then_action="jump",
            then_jump_step=3,
            pre_delay=0.0,
            post_delay=0.0,
        )
        s2 = StepNode(name="被跳过的步骤2", action_type=ActionType.WAIT_TIME, pre_delay=0.0, post_delay=0.0)
        s3 = StepNode(name="目标步骤3", action_type=ActionType.WAIT_TIME, pre_delay=0.0, post_delay=0.0)
        wf.steps.extend([s1, s2, s3])

        engine = ExecutionEngine(wf)
        engine.add_listener("step_started", lambda idx, name: executed_steps.append(idx))
        engine.start()

        timeout = 5.0
        start = time.time()
        while engine.state == ExecutionState.RUNNING and (time.time() - start < timeout):
            time.sleep(0.05)

        self.assertEqual(engine.state, ExecutionState.COMPLETED)
        # Step 0 executed -> jumped to Step 2 (index 2), step 1 (index 1) was skipped
        self.assertIn(0, executed_steps)
        self.assertNotIn(1, executed_steps)
        self.assertIn(2, executed_steps)


if __name__ == "__main__":
    unittest.main()
