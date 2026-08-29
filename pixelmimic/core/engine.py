"""
Workflow execution engine with multi-threading, pause, resume, and real-time event callbacks.
"""

from __future__ import annotations
from collections import defaultdict
import threading
import time
from typing import Callable, Dict, List, Optional

from pixelmimic.core.actions import ActionRegistry
from pixelmimic.core.actions.base import ExecutionContext
from pixelmimic.core.matcher import ImageMatcher
from pixelmimic.core.models import ActionResult, ExecutionState, OnFailureAction, StepNode, Workflow
from pixelmimic.core.mouse_keyboard import InputDriver


class ExecutionEngine:
    """Core Workflow Execution Engine with pub-sub event dispatching."""

    def __init__(self, workflow: Optional[Workflow] = None):
        self.workflow = workflow or Workflow()
        self.state: ExecutionState = ExecutionState.IDLE
        self.context: ExecutionContext = ExecutionContext()
        self.matcher = ImageMatcher()
        self._thread: Optional[threading.Thread] = None
        self._lock = threading.Lock()
        self._listeners: Dict[str, List[Callable[..., None]]] = defaultdict(list)

    def add_listener(self, event_name: str, callback: Callable[..., None]):
        """Subscribe to an execution event."""
        if callback not in self._listeners[event_name]:
            self._listeners[event_name].append(callback)

    def remove_listener(self, event_name: str, callback: Callable[..., None]):
        """Unsubscribe from an execution event."""
        if callback in self._listeners[event_name]:
            self._listeners[event_name].remove(callback)

    def _emit(self, event_name: str, *args, **kwargs):
        """Dispatch event to all registered Python listeners."""
        for cb in list(self._listeners.get(event_name, [])):
            try:
                cb(*args, **kwargs)
            except Exception as e:
                print(f"[engine] Listener error on {event_name}: {e}")

    def set_workflow(self, workflow: Workflow):
        """Set or update the active workflow."""
        if self.state == ExecutionState.RUNNING:
            raise RuntimeError("无法在运行中更换工作流")
        self.workflow = workflow

    def _set_state(self, new_state: ExecutionState):
        with self._lock:
            self.state = new_state
        self._emit("state_changed", new_state.value)

    def _log(self, level: str, message: str):
        self._emit("log_emitted", level, message)
        print(f"[{level}] {message}")

    def start(self):
        """Start running the workflow in a background thread."""
        if self.state == ExecutionState.RUNNING:
            return

        if not self.workflow.steps:
            self._log("WARNING", "工作流中没有可执行的步骤")
            return

        self._set_state(ExecutionState.RUNNING)
        self.context = ExecutionContext(
            matcher=self.matcher,
            input_driver=InputDriver,
            log_callback=self._log,
        )
        self._thread = threading.Thread(target=self._run_workflow, daemon=True)
        self._thread.start()

    def pause(self):
        """Pause execution."""
        if self.state == ExecutionState.RUNNING:
            self.context.is_paused = True
            self._set_state(ExecutionState.PAUSED)
            self._log("WARNING", "工作流已暂停 (按 F9 或点击恢复继续执行)")

    def resume(self):
        """Resume execution."""
        if self.state == ExecutionState.PAUSED:
            self.context.is_paused = False
            self._set_state(ExecutionState.RUNNING)
            self._log("INFO", "工作流继续执行")

    def stop(self):
        """Stop/terminate execution."""
        if self.state in [ExecutionState.RUNNING, ExecutionState.PAUSED]:
            self.context.is_stopped = True
            self.context.is_paused = False
            self._set_state(ExecutionState.STOPPED)
            self._log("WARNING", "工作流已由用户停止")

    def test_single_step(self, step: StepNode, step_index: int = 0) -> ActionResult:
        """Execute a single step for debugging/testing in isolation."""
        self._log("INFO", f"--- 测试单步: [{step.name}] ---")
        ctx = ExecutionContext(
            matcher=self.matcher,
            input_driver=InputDriver,
            log_callback=self._log,
            current_step_index=step_index,
            total_steps=1,
        )
        action = ActionRegistry.create(step)
        try:
            result = action.execute(ctx)
            if result.success:
                self._log("SUCCESS", f"单步测试成功: {result.message}")
            else:
                self._log("ERROR", f"单步测试失败: {result.message}")
            return result
        except Exception as e:
            msg = f"单步测试异常: {str(e)}"
            self._log("ERROR", msg)
            return ActionResult(success=False, message=msg)

    def _run_workflow(self):
        """Main execution loop."""
        total_loops = self.workflow.loop_count
        loop_counter = 0
        overall_success = True

        self._log("INFO", f"=== 工作流【{self.workflow.name}】开始执行 (共 {len(self.workflow.steps)} 步) ===")

        try:
            while not self.context.is_stopped:
                loop_counter += 1
                self.context.loop_index = loop_counter

                self._emit("loop_progress", loop_counter, total_loops)

                if total_loops > 1:
                    self._log("INFO", f">> 第 {loop_counter}/{total_loops} 次循环开始")
                elif total_loops == 0:
                    self._log("INFO", f">> 第 {loop_counter} 次无限循环迭代")

                # Execute steps using index-driven loop for conditional jumping and skipping
                idx = 0
                while idx < len(self.workflow.steps):
                    if self.context.is_stopped:
                        break

                    self.context.check_flow_control()

                    step = self.workflow.steps[idx]
                    if not step.enabled:
                        self._log("INFO", f"步骤 #{idx + 1} [{step.name}] 已禁用，跳过")
                        idx += 1
                        continue

                    self.context.current_step_index = idx
                    self.context.total_steps = len(self.workflow.steps)

                    self._emit("step_started", idx, step.name)

                    action = ActionRegistry.create(step)
                    result = action.execute(self.context)

                    self._emit("step_finished", idx, result.success, result.message)

                    if not result.success:
                        # Canvas "False" port takes precedence: jump on failure if wired
                        fail_action = getattr(step, "fail_action", None)
                        fail_jump_step = getattr(step, "fail_jump_step", None)
                        if fail_action == "jump" and fail_jump_step:
                            fail_target = int(fail_jump_step) - 1
                            if 0 <= fail_target < len(self.workflow.steps):
                                self._log("INFO", f">> 失败分支: 步骤 #{idx + 1} 执行失败，跳转到步骤 #{fail_target + 1}")
                                idx = fail_target
                                continue
                            self._log("WARNING", f">> 失败跳转目标步骤 #{fail_target + 1} 无效 (总步数: {len(self.workflow.steps)})，回退到失败策略")

                        on_fail = step.on_failure
                        if isinstance(on_fail, str):
                            try:
                                on_fail = OnFailureAction(on_fail)
                            except ValueError:
                                on_fail = OnFailureAction.STOP

                        if on_fail == OnFailureAction.STOP or self.workflow.stop_on_error:
                            overall_success = False
                            self._log("ERROR", f"步骤 #{idx + 1} 执行失败，流程终止: {result.message}")
                            self._set_state(ExecutionState.ERROR)
                            self._emit("execution_finished", False, f"步骤 #{idx + 1} 失败: {result.message}")
                            return
                        else:
                            self._log("WARNING", f"步骤 #{idx + 1} 失败但设置为忽略并继续")
                            idx += 1
                            continue

                    # Check for branching directives from flow control (e.g. ConditionAction)
                    branch_action = result.data.get("branch_action") if result.data else None
                    if branch_action == "jump":
                        jump_target = int(result.data.get("jump_step", 1)) - 1  # convert 1-based to 0-based
                        if 0 <= jump_target < len(self.workflow.steps):
                            self._log("INFO", f">> 流程跳转: 从步骤 #{idx + 1} 跳转到步骤 #{jump_target + 1}")
                            idx = jump_target
                        else:
                            self._log("WARNING", f">> 跳转目标步骤 #{jump_target + 1} 超出范围 (总步数: {len(self.workflow.steps)})，流程结束")
                            break
                    elif branch_action == "skip":
                        skip_count = int(result.data.get("skip_count", 1))
                        next_idx = idx + 1 + skip_count
                        self._log("INFO", f">> 流程跳过: 跳过后续 {skip_count} 步，转至步骤 #{next_idx + 1}")
                        idx = next_idx
                    elif branch_action == "stop":
                        self._log("INFO", f">> 流程控制: 条件分支触发终止流程")
                        break
                    else:
                        # Check if step has a custom jump configured via canvas connection or flow setting
                        step_next_action = getattr(step, "next_action", "continue")
                        step_jump_target = getattr(step, "next_jump_step", None)
                        if step_next_action == "jump" and step_jump_target is not None:
                            jump_target = int(step_jump_target) - 1
                            if 0 <= jump_target < len(self.workflow.steps):
                                self._log("INFO", f">> 步骤跳转: 从步骤 #{idx + 1} 跳转到步骤 #{jump_target + 1}")
                                idx = jump_target
                            else:
                                self._log("WARNING", f">> 跳转目标步骤 #{jump_target + 1} 超出范围 (总步数: {len(self.workflow.steps)})，流程结束")
                                break
                        else:
                            idx += 1

                # Check loop termination
                if total_loops > 0 and loop_counter >= total_loops:
                    break

                # Sleep between loops
                if self.workflow.loop_interval > 0:
                    time.sleep(self.workflow.loop_interval)

            self._set_state(ExecutionState.COMPLETED)
            self._log("SUCCESS", f"=== 工作流【{self.workflow.name}】执行完毕 (完成 {loop_counter} 次循环) ===")
            self._emit("execution_finished", overall_success, "执行完成")

        except InterruptedError:
            self._set_state(ExecutionState.STOPPED)
            self._log("WARNING", "工作流已停止")
            self._emit("execution_finished", False, "用户手动停止")
        except Exception as e:
            self._set_state(ExecutionState.ERROR)
            self._log("ERROR", f"工作流发生未捕获异常: {str(e)}")
            self._emit("execution_finished", False, str(e))
