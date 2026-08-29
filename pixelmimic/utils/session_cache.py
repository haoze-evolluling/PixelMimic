"""
Session autosave cache (Word-like crash recovery).

Persists the live editing session (workflow + current file path) to
<project root>/cache/session.json so the editor can restore the last
editing state after an abnormal exit or unexpected shutdown.
"""

from __future__ import annotations

import json
import os
import threading
import time
from typing import Any, Dict, Optional


def _default_cache_dir() -> str:
    override = os.environ.get("PIXELMIMIC_CACHE_DIR")
    if override:
        return override
    # pixelmimic/utils/session_cache.py -> project root
    root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    return os.path.join(root, "cache")


class SessionCache:
    """Throttled, crash-safe autosave of the editing session to disk."""

    MIN_INTERVAL = 2.0  # seconds between throttled writes

    def __init__(self, cache_dir: Optional[str] = None):
        self._dir = cache_dir or _default_cache_dir()
        self._path = os.path.join(self._dir, "session.json")
        self._lock = threading.Lock()
        self._last_write = 0.0

    def save(self, workflow_dict: Dict[str, Any], file_path: Optional[str], force: bool = False) -> bool:
        """Write the session snapshot. Non-forced writes are throttled."""
        now = time.monotonic()
        with self._lock:
            if not force and (now - self._last_write) < self.MIN_INTERVAL:
                return False
            data = {
                "app": "PixelMimic",
                "version": 1,
                "saved_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                "file_path": file_path,
                "workflow": workflow_dict,
            }
            try:
                os.makedirs(self._dir, exist_ok=True)
                tmp_path = self._path + ".tmp"
                with open(tmp_path, "w", encoding="utf-8") as f:
                    json.dump(data, f, ensure_ascii=False)
                os.replace(tmp_path, self._path)
                self._last_write = now
                return True
            except Exception as e:
                print(f"[session] Error writing session cache: {e}")
                return False

    def load(self) -> Optional[Dict[str, Any]]:
        """Return the last session snapshot, or None if absent/corrupt."""
        try:
            if not os.path.exists(self._path):
                return None
            with open(self._path, "r", encoding="utf-8") as f:
                data = json.load(f)
            if not isinstance(data, dict) or not isinstance(data.get("workflow"), dict):
                return None
            return data
        except Exception as e:
            print(f"[session] Error reading session cache: {e}")
            return None
