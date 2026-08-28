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


if __name__ == "__main__":
    unittest.main()
