"""
Global hotkey listener using pynput.
"""

from __future__ import annotations
import threading
from typing import Callable, Dict, Optional
from pynput import keyboard


class HotkeyManager:
    """Manages global background hotkeys."""

    def __init__(self):
        self._listener: Optional[keyboard.GlobalHotKeys] = None
        self._callbacks: Dict[str, Callable[[], None]] = {}
        self._is_running = False

    def register(self, key_combo: str, callback: Callable[[], None]):
        """Register a hotkey combination (e.g. '<f8>', '<ctrl>+<shift>+s')."""
        self._callbacks[key_combo] = callback
        if self._is_running:
            self.restart()

    def unregister(self, key_combo: str):
        """Unregister a hotkey combination."""
        if key_combo in self._callbacks:
            del self._callbacks[key_combo]
            if self._is_running:
                self.restart()

    def start(self):
        """Start listening to hotkeys."""
        if self._is_running:
            return
        if not self._callbacks:
            return

        try:
            self._listener = keyboard.GlobalHotKeys(self._callbacks)
            self._listener.daemon = True
            self._listener.start()
            self._is_running = True
        except Exception as e:
            print(f"[hotkeys] Error starting global hotkeys: {e}")

    def stop(self):
        """Stop listening to hotkeys."""
        if self._listener is not None:
            try:
                self._listener.stop()
            except Exception:
                pass
            self._listener = None
        self._is_running = False

    def restart(self):
        """Restart listener with updated callbacks."""
        self.stop()
        self.start()
