"""
PyWebView JavaScript API Bridge for PixelMimic.
Exposes Python backend services and real-time events to the web frontend.

The controller class composes three mixins by responsibility:
- WorkflowFilesMixin  workflow file lifecycle (new/open/save/save-as/sync/sample)
- ExecutionMixin      run control (start/pause/stop/single-step test)
- VisionMixin         screen snipping, match testing, coordinate picking
"""

from __future__ import annotations
import json
import os
import time
from typing import Any, Dict, Optional

import webview

from pixelmimic.core.engine import ExecutionEngine
from pixelmimic.core.hotkeys import HotkeyManager
from pixelmimic.core.models import Workflow
from pixelmimic.core.mouse_keyboard import InputDriver
from pixelmimic.gui.api.execution import ExecutionMixin
from pixelmimic.gui.api.vision import VisionMixin
from pixelmimic.gui.api.workflow_files import WorkflowFilesMixin
from pixelmimic.gui.screen_snipper import ScreenSnipper


class PyWebViewApi(WorkflowFilesMixin, ExecutionMixin, VisionMixin):
    """JS-accessible Python API controller."""

    def __init__(self):
        # NOTE: All internal state attributes MUST start with '_' so PyWebView's
        # JS reflection engine does not recursively traverse them and freeze on COM/.NET objects.
        self._window: Optional[webview.Window] = None
        self._workflow: Workflow = Workflow()
        self._file_path: Optional[str] = None
        self._engine: ExecutionEngine = ExecutionEngine(self._workflow)
        self._hotkey_mgr: HotkeyManager = HotkeyManager()
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

    def save_settings(self, settings_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update global settings."""
        self._settings.update(settings_data)
        return {"success": True, "settings": self._settings}

    def close_window(self):
        self._hotkey_mgr.stop()
        self._engine.stop()
        if self._window:
            self._window.destroy()
