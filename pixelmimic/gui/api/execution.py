"""
Execution control methods for the PyWebView API bridge.
Exposes start / pause / stop / single-step-test operations to JS.
"""

from __future__ import annotations

from typing import Any, Dict, Optional

from pixelmimic.core.models import (
    ActionResult,
    ExecutionState,
    StepNode,
    Workflow,
)


class ExecutionMixin:
    """JS-exposed execution control API (mixin for PyWebViewApi)."""

    def start_workflow(self, workflow_data: Optional[Dict[str, Any]] = None, settings: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Start running workflow."""
        if self._engine.state == ExecutionState.RUNNING:
            return {"success": False, "message": "流程已经在运行中"}

        if workflow_data:
            self._workflow = Workflow.from_dict(workflow_data)

        if settings:
            self._settings.update(settings)

        if not self._workflow.steps:
            return {"success": False, "message": "工作流为空，请先添加操作步骤"}

        self._workflow.loop_count = int(self._settings.get("loop_count", 1))
        self._workflow.loop_interval = float(self._settings.get("loop_interval", 1.0))
        self._engine.set_workflow(self._workflow)

        if self._settings.get("minimize_on_run", True) and self._window:
            try:
                self._window.minimize()
            except Exception:
                pass

        self._engine.start()
        return {"success": True}

    def toggle_pause(self) -> Dict[str, Any]:
        if self._engine.state == ExecutionState.RUNNING:
            self._engine.pause()
        elif self._engine.state == ExecutionState.PAUSED:
            self._engine.resume()
        return {"success": True, "state": self._engine.state.value}

    def stop_workflow(self) -> Dict[str, Any]:
        self._engine.stop()
        if self._window:
            try:
                self._window.restore()
            except Exception:
                pass
        return {"success": True, "state": self._engine.state.value}

    def test_single_step(self, step_data: Dict[str, Any], index: int = 0) -> Dict[str, Any]:
        """Execute a single step node and return result."""
        try:
            step = StepNode.from_dict(step_data)
            res: ActionResult = self._engine.test_single_step(step, index)
            return {
                "success": res.success,
                "message": res.message,
                "confidence": res.confidence,
                "matchedPos": res.matched_pos,
                "executionTime": round(res.execution_time, 3),
            }
        except Exception as e:
            return {"success": False, "message": f"单步测试异常: {str(e)}"}
