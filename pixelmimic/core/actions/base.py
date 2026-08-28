"""
Base action class and execution context.
"""

from __future__ import annotations
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
import random
import time
from typing import Any, Callable, Dict, Optional, Tuple

from pixelmimic.core.models import ActionResult, OnFailureAction, StepNode


@dataclass
class ExecutionContext:
    """Shared state during workflow execution."""
    variables: Dict[str, Any] = field(default_factory=dict)
    last_matched_pos: Optional[Tuple[int, int]] = None
    last_matched_confidence: Optional[float] = None
    loop_index: int = 0
    current_step_index: int = 0
    total_steps: int = 0
    is_paused: bool = False
    is_stopped: bool = False
    log_callback: Optional[Callable[[str, str], None]] = None  # (level, message)
    matcher: Any = None
    input_driver: Any = None

    def log(self, message: str, level: str = "INFO"):
        if self.log_callback:
            self.log_callback(level, message)
        else:
            print(f"[{level}] {message}")

    def check_flow_control(self):
        """Handle pause and stop conditions."""
        while self.is_paused and not self.is_stopped:
            time.sleep(0.1)
        if self.is_stopped:
            raise InterruptedError("Workflow execution stopped by user.")


class BaseAction(ABC):
    """Abstract base class for all workflow actions."""

    def __init__(self, step: StepNode):
        self.step = step

    def execute(self, context: ExecutionContext) -> ActionResult:
        """Executes the action with pre-delay, retries, and post-delay."""
        context.check_flow_control()

        # 1. Pre-delay
        if self.step.pre_delay > 0:
            time.sleep(self.step.pre_delay)

        # 2. Random delay if configured
        if self.step.random_delay_max > self.step.random_delay_min >= 0:
            delay = random.uniform(self.step.random_delay_min, self.step.random_delay_max)
            time.sleep(delay)

        start_time = time.time()
        retries = max(1, self.step.retry_count)
        last_result = ActionResult(success=False, message="No attempt executed")

        for attempt in range(1, retries + 1):
            context.check_flow_control()
            try:
                result = self.execute_core(context)
                result.execution_time = time.time() - start_time
                if result.success:
                    last_result = result
                    break
                else:
                    last_result = result
                    if attempt < retries:
                        context.log(
                            f"第 {attempt} 次尝试失败 ({result.message})，将在 {self.step.retry_interval}s 后重试...",
                            level="WARNING",
                        )
                        time.sleep(self.step.retry_interval)
            except InterruptedError:
                raise
            except Exception as e:
                last_result = ActionResult(
                    success=False,
                    message=f"执行异常: {str(e)}",
                    execution_time=time.time() - start_time,
                )
                if attempt < retries:
                    time.sleep(self.step.retry_interval)

        # 3. Post-delay
        if self.step.post_delay > 0:
            time.sleep(self.step.post_delay)

        return last_result

    @abstractmethod
    def execute_core(self, context: ExecutionContext) -> ActionResult:
        """Core action execution logic implemented by subclasses."""
        pass
