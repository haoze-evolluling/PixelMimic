"""
Workflow file lifecycle methods for the PyWebView API bridge.
Exposes new / open / save / save-as / sync / sample-template operations to JS.
"""

from __future__ import annotations

import os
import re
import time
from typing import Any, Dict, Optional

import webview

from pixelmimic.core.models import Workflow
from pixelmimic.core.sample_workflow import build_sample_workflow
from pixelmimic.utils.serializer import WorkflowSerializer


class WorkflowFilesMixin:
    """JS-exposed workflow file lifecycle API (mixin for PyWebViewApi)."""

    def new_workflow(self) -> Dict[str, Any]:
        """Create a fresh workflow, named by creation time by default."""
        self._workflow = Workflow(steps=[])
        self._workflow.name = time.strftime("%Y-%m-%d %H:%M")
        self._file_path = None
        self._engine.set_workflow(self._workflow)
        self._persist_session(force=True)
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
                self._persist_session(force=True)
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
                self._persist_session(force=True)
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

            # Strip Windows-illegal filename chars (e.g. ':' in time-based names)
            safe_name = re.sub(r'[\\/:*?"<>|]', "-", self._workflow.name or "my_workflow")
            default_name = f"{safe_name}.pmflow"
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
                self._persist_session(force=True)
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
            self._persist_session()
            return {"success": True}
        except Exception as e:
            return {"success": False, "message": str(e)}

    def load_sample_template(self, template_type: str = "basic") -> Dict[str, Any]:
        """Load a beginner-friendly example workflow."""
        self._workflow = build_sample_workflow()
        self._file_path = None
        self._engine.set_workflow(self._workflow)
        self._persist_session(force=True)
        return {
            "success": True,
            "workflow": self._workflow.to_dict(),
            "fileName": "新手示例流程.pmflow",
        }
