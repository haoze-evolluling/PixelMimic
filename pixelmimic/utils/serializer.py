"""
Workflow serialization, export, and import utilities.
"""

from __future__ import annotations
import json
import os
from typing import Optional
from pixelmimic.core.models import Workflow


class WorkflowSerializer:
    """Handles saving and loading workflows to/from JSON (.pmflow) files."""

    @staticmethod
    def save_to_file(workflow: Workflow, file_path: str) -> bool:
        """Save workflow to JSON file."""
        try:
            data = workflow.to_dict()
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            return True
        except Exception as e:
            print(f"[serializer] Error saving workflow to {file_path}: {e}")
            return False

    @staticmethod
    def load_from_file(file_path: str) -> Optional[Workflow]:
        """Load workflow from JSON file."""
        try:
            if not os.path.exists(file_path):
                return None
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            return Workflow.from_dict(data)
        except Exception as e:
            print(f"[serializer] Error loading workflow from {file_path}: {e}")
            return None
