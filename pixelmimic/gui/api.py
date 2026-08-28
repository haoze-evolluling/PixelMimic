"""
PyWebView JavaScript API Bridge for PixelMimic.
Exposes Python backend services and real-time events to the web frontend.
"""

from __future__ import annotations
import json
import os
import time
from typing import Any, Dict, Optional
import cv2
import webview

from pixelmimic.core.engine import ExecutionEngine
from pixelmimic.core.hotkeys import HotkeyManager
from pixelmimic.core.matcher import ImageMatcher
from pixelmimic.core.models import (
    ActionResult,
    ActionType,
    ClickType,
    ExecutionState,
    MouseButton,
    StepNode,
    TargetType,
    Workflow,
)
from pixelmimic.core.mouse_keyboard import InputDriver
from pixelmimic.gui.match_highlighter import MatchHighlighter
from pixelmimic.gui.screen_snipper import ScreenSnipper
from pixelmimic.utils.image_utils import base64_to_cv2
from pixelmimic.utils.serializer import WorkflowSerializer


class PyWebViewApi:
    """JS-accessible Python API controller."""

    def __init__(self):
        # NOTE: All internal state attributes MUST start with '_' so PyWebView's
        # JS reflection engine does not recursively traverse them and freeze on COM/.NET objects.
        self._window: Optional[webview.Window] = None
        self._workflow: Workflow = Workflow()
        self._file_path: Optional[str] = None
        self._engine: ExecutionEngine = ExecutionEngine(self._workflow)
        self._hotkey_mgr: HotkeyManager = HotkeyManager()
        self._matcher: ImageMatcher = ImageMatcher()
        self._snipper: ScreenSnipper = ScreenSnipper(callback=self._on_snip_captured)

        self._settings: Dict[str, Any] = {
            "loop_count": 1,
            "loop_interval": 1.0,
            "minimize_on_run": True,
            "failsafe": True,
        }

        self._setup_engine_listeners()
        self._setup_hotkeys()

    def set_window(self, window: webview.Window):
        """Bind active PyWebView window."""
        self._window = window

    def _setup_engine_listeners(self):
        self._engine.add_listener(
            "step_started",
            lambda idx, name: self.emit_event("step_started", {"index": idx, "name": name}),
        )
        self._engine.add_listener(
            "step_finished",
            lambda idx, succ, msg: self.emit_event(
                "step_finished", {"index": idx, "success": succ, "message": msg}
            ),
        )
        self._engine.add_listener(
            "state_changed",
            lambda state_str: self.emit_event("state_changed", {"state": state_str}),
        )
        self._engine.add_listener(
            "log_emitted",
            lambda lvl, msg: self.emit_event(
                "log_emitted",
                {"level": lvl, "message": msg, "time": time.strftime("%H:%M:%S")},
            ),
        )
        self._engine.add_listener(
            "loop_progress",
            lambda cur, tot: self.emit_event("loop_progress", {"current": cur, "total": tot}),
        )
        self._engine.add_listener(
            "execution_finished",
            self._on_execution_finished,
        )

    def _setup_hotkeys(self):
        try:
            self._hotkey_mgr.register("<f8>", lambda: self._hotkey_action("start"))
            self._hotkey_mgr.register("<f9>", lambda: self._hotkey_action("toggle_pause"))
            self._hotkey_mgr.register("<f10>", lambda: self._hotkey_action("stop"))
            self._hotkey_mgr.register("<f7>", lambda: self._hotkey_action("snip"))
            self._hotkey_mgr.start()
        except Exception as e:
            print(f"[Api] Hotkey initialization error: {e}")

    def _hotkey_action(self, action: str):
        if action == "start":
            self.start_workflow()
        elif action == "toggle_pause":
            self.toggle_pause()
        elif action == "stop":
            self.stop_workflow()
        elif action == "snip":
            self.start_snip()

    def emit_event(self, event_name: str, data: Any = None):
        """Push an asynchronous event to Javascript."""
        if not self._window:
            return
        try:
            json_payload = json.dumps(data, ensure_ascii=False)
            js_code = f"window.PixelMimic && window.PixelMimic.onBackendEvent('{event_name}', {json_payload});"
            self._window.evaluate_js(js_code)
        except Exception:
            pass

    def _on_execution_finished(self, success: bool, message: str):
        self.emit_event("execution_finished", {"success": success, "message": message})
        if self._settings.get("minimize_on_run", True) and self._window:
            try:
                self._window.restore()
            except Exception:
                pass

    def _on_snip_captured(self, b64: str, x: int, y: int, w: int, h: int):
        self.emit_event(
            "snip_captured",
            {"image_base64": b64, "x": x, "y": y, "width": w, "height": h},
        )
        if self._window:
            try:
                self._window.restore()
            except Exception:
                pass

    # ==================== Exposed API Methods ====================

    def get_initial_data(self) -> Dict[str, Any]:
        """Return app state for frontend initialization."""
        cur_x, cur_y = InputDriver.get_mouse_position()
        return {
            "workflow": self._workflow.to_dict(),
            "filePath": self._file_path,
            "fileName": os.path.basename(self._file_path) if self._file_path else "未命名流程.pmflow",
            "settings": self._settings,
            "cursorPos": {"x": cur_x, "y": cur_y},
            "state": self._engine.state.value,
        }

    def new_workflow(self) -> Dict[str, Any]:
        """Create a fresh workflow."""
        self._workflow = Workflow(steps=[])
        self._file_path = None
        self._engine.set_workflow(self._workflow)
        return {
            "success": True,
            "workflow": self._workflow.to_dict(),
            "filePath": None,
            "fileName": "未命名流程.pmflow",
        }

    def open_workflow(self) -> Dict[str, Any]:
        """Show open file dialog and load workflow."""
        if not self._window:
            return {"success": False, "message": "窗口未初始化"}

        try:
            file_types = ("PixelMimic 流程文件 (*.pmflow;*.json)", "All files (*.*)")
            res = self._window.create_file_dialog(webview.OPEN_DIALOG, allow_multiple=False, file_types=file_types)
            if not res or len(res) == 0:
                return {"success": False, "cancelled": True}

            selected_path = res[0]
            wf = WorkflowSerializer.load_from_file(selected_path)
            if wf:
                self._workflow = wf
                self._file_path = selected_path
                self._engine.set_workflow(self._workflow)
                return {
                    "success": True,
                    "workflow": self._workflow.to_dict(),
                    "filePath": self._file_path,
                    "fileName": os.path.basename(self._file_path),
                }
            else:
                return {"success": False, "message": "无法解析该工作流文件"}
        except Exception as e:
            return {"success": False, "message": str(e)}

    def save_workflow(self, workflow_data: Dict[str, Any], file_path: Optional[str] = None) -> Dict[str, Any]:
        """Save workflow to file."""
        try:
            self._workflow = Workflow.from_dict(workflow_data)
            self._engine.set_workflow(self._workflow)

            target_path = file_path or self._file_path
            if not target_path:
                return self.save_as_workflow(workflow_data)

            success = WorkflowSerializer.save_to_file(self._workflow, target_path)
            if success:
                self._file_path = target_path
                return {
                    "success": True,
                    "filePath": self._file_path,
                    "fileName": os.path.basename(self._file_path),
                }
            else:
                return {"success": False, "message": "保存文件失败"}
        except Exception as e:
            return {"success": False, "message": str(e)}

    def save_as_workflow(self, workflow_data: Dict[str, Any]) -> Dict[str, Any]:
        """Show save file dialog and save workflow."""
        if not self._window:
            return {"success": False, "message": "窗口未初始化"}

        try:
            self._workflow = Workflow.from_dict(workflow_data)
            self._engine.set_workflow(self._workflow)

            default_name = f"{self._workflow.name or 'my_workflow'}.pmflow"
            file_types = ("PixelMimic 流程文件 (*.pmflow)", "JSON 文件 (*.json)")
            res = self._window.create_file_dialog(
                webview.SAVE_DIALOG,
                save_filename=default_name,
                file_types=file_types,
            )
            if not res:
                return {"success": False, "cancelled": True}

            selected_path = res if isinstance(res, str) else res[0]
            if not selected_path.endswith(".pmflow") and not selected_path.endswith(".json"):
                selected_path += ".pmflow"

            success = WorkflowSerializer.save_to_file(self._workflow, selected_path)
            if success:
                self._file_path = selected_path
                return {
                    "success": True,
                    "filePath": self._file_path,
                    "fileName": os.path.basename(self._file_path),
                }
            else:
                return {"success": False, "message": "保存文件失败"}
        except Exception as e:
            return {"success": False, "message": str(e)}

    def update_workflow(self, workflow_data: Dict[str, Any]) -> Dict[str, Any]:
        """Sync workflow data from frontend."""
        try:
            self._workflow = Workflow.from_dict(workflow_data)
            self._engine.set_workflow(self._workflow)
            return {"success": True}
        except Exception as e:
            return {"success": False, "message": str(e)}

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

    def start_snip(self) -> Dict[str, Any]:
        """Launch screen snipper."""
        try:
            self._snipper.start_snip(callback=self._on_snip_captured)
            return {"success": True}
        except Exception as e:
            return {"success": False, "message": str(e)}

    def test_match(self, step_data: Dict[str, Any]) -> Dict[str, Any]:
        """Test OpenCV template match on current screen and flash target highlight."""
        try:
            step = StepNode.from_dict(step_data)
            if not step.image_base64:
                return {"found": False, "message": "步骤中未设置目标图片，请先截取或上传图片"}

            tpl = base64_to_cv2(step.image_base64)
            if tpl is None:
                return {"found": False, "message": "目标图片解析失败"}

            method_val = getattr(cv2, step.match_method.value, cv2.TM_CCOEFF_NORMED)
            roi = tuple(step.search_roi) if step.search_roi and len(step.search_roi) == 4 else None

            match = self._matcher.find_match(
                template=tpl,
                roi=roi,
                confidence=step.confidence,
                use_grayscale=step.use_grayscale,
                multi_scale=step.multi_scale,
                method=method_val,
            )

            if match:
                # Flash highlight overlay on screen
                MatchHighlighter.show_highlight(match.x, match.y, match.width, match.height, match.confidence)
                return {
                    "found": True,
                    "x": match.x,
                    "y": match.y,
                    "width": match.width,
                    "height": match.height,
                    "center_x": match.center_x,
                    "center_y": match.center_y,
                    "confidence": round(match.confidence, 4),
                    "confidencePct": f"{match.confidence * 100:.1f}%",
                    "message": f"匹配成功！相似度 {match.confidence * 100:.1f}%，位置 ({match.center_x}, {match.center_y})",
                }
            else:
                return {
                    "found": False,
                    "message": f"未在当前屏幕中找到相似度 ≥ {int(step.confidence * 100)}% 的目标图片",
                }
        except Exception as e:
            return {"found": False, "message": f"匹配测试异常: {str(e)}"}

    def pick_mouse_position(self) -> Dict[str, Any]:
        """Get current mouse coordinates."""
        x, y = InputDriver.get_mouse_position()
        return {"success": True, "x": x, "y": y}

    def save_settings(self, settings_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update global settings."""
        self._settings.update(settings_data)
        return {"success": True, "settings": self._settings}

    def load_sample_template(self, template_type: str = "basic") -> Dict[str, Any]:
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
        self._workflow = wf
        self._file_path = None
        self._engine.set_workflow(self._workflow)
        return {
            "success": True,
            "workflow": self._workflow.to_dict(),
            "fileName": "新手示例流程.pmflow",
        }

    def close_window(self):
        self._hotkey_mgr.stop()
        self._engine.stop()
        if self._window:
            self._window.destroy()
