"""
Low-level Mouse and Keyboard simulation driver using PyAutoGUI and PyPerClip.
"""

from __future__ import annotations
import math
import time
from typing import List, Optional, Tuple
import pyautogui
import pyperclip

# Configure PyAutoGUI defaults
pyautogui.FAILSAFE = True
pyautogui.PAUSE = 0.05


class InputDriver:
    """Hardware input simulation controller for mouse and keyboard."""

    @staticmethod
    def get_mouse_position() -> Tuple[int, int]:
        """Get current mouse cursor position (x, y)."""
        return pyautogui.position()

    @staticmethod
    def move_to(x: int, y: int, duration: float = 0.0, smooth: bool = True):
        """Move mouse to absolute coordinates."""
        if smooth and duration > 0:
            pyautogui.moveTo(int(x), int(y), duration=duration, tween=pyautogui.easeInOutQuad)
        else:
            pyautogui.moveTo(int(x), int(y))

    @staticmethod
    def move_rel(dx: int, dy: int, duration: float = 0.0):
        """Move mouse relative to current position."""
        pyautogui.moveRel(int(dx), int(dy), duration=duration)

    @staticmethod
    def click(
        x: Optional[int] = None,
        y: Optional[int] = None,
        button: str = "left",
        clicks: int = 1,
        interval: float = 0.1,
    ):
        """Click mouse button at (x, y) or current position."""
        if x is not None and y is not None:
            pyautogui.click(x=int(x), y=int(y), button=button, clicks=clicks, interval=interval)
        else:
            pyautogui.click(button=button, clicks=clicks, interval=interval)

    @staticmethod
    def double_click(x: Optional[int] = None, y: Optional[int] = None, button: str = "left"):
        """Double click at position."""
        InputDriver.click(x=x, y=y, button=button, clicks=2, interval=0.1)

    @staticmethod
    def mouse_down(x: Optional[int] = None, y: Optional[int] = None, button: str = "left"):
        """Press and hold mouse button."""
        if x is not None and y is not None:
            pyautogui.mouseDown(x=int(x), y=int(y), button=button)
        else:
            pyautogui.mouseDown(button=button)

    @staticmethod
    def mouse_up(x: Optional[int] = None, y: Optional[int] = None, button: str = "left"):
        """Release mouse button."""
        if x is not None and y is not None:
            pyautogui.mouseUp(x=int(x), y=int(y), button=button)
        else:
            pyautogui.mouseUp(button=button)

    @staticmethod
    def long_press(x: Optional[int] = None, y: Optional[int] = None, button: str = "left", duration: float = 1.0):
        """Press and hold mouse button for specified duration, then release."""
        if x is not None and y is not None:
            pyautogui.moveTo(int(x), int(y))
        pyautogui.mouseDown(button=button)
        time.sleep(max(0.01, duration))
        pyautogui.mouseUp(button=button)

    @staticmethod
    def drag_to(
        from_x: int,
        from_y: int,
        to_x: int,
        to_y: int,
        duration: float = 0.5,
        button: str = "left",
        smooth: bool = True,
    ):
        """Drag mouse from (from_x, from_y) to (to_x, to_y)."""
        pyautogui.moveTo(int(from_x), int(from_y))
        time.sleep(0.05)
        pyautogui.mouseDown(button=button)
        time.sleep(0.05)
        if smooth and duration > 0:
            pyautogui.moveTo(int(to_x), int(to_y), duration=duration, tween=pyautogui.easeInOutQuad)
        else:
            pyautogui.moveTo(int(to_x), int(to_y))
        time.sleep(0.05)
        pyautogui.mouseUp(button=button)

    @staticmethod
    def scroll(clicks: int, x: Optional[int] = None, y: Optional[int] = None):
        """Scroll mouse wheel (positive for up, negative for down)."""
        if x is not None and y is not None:
            pyautogui.scroll(int(clicks), x=int(x), y=int(y))
        else:
            pyautogui.scroll(int(clicks))

    @staticmethod
    def type_text(text: str, interval: float = 0.02, use_clipboard: bool = False):
        """Type text string. Uses clipboard pasting for Chinese/Unicode characters."""
        if not text:
            return

        if use_clipboard or any(ord(c) > 127 for c in text):
            # Use clipboard to safely paste unicode / Chinese characters
            old_clip = ""
            try:
                old_clip = pyperclip.paste()
            except Exception:
                pass
            pyperclip.copy(text)
            time.sleep(0.05)
            pyautogui.hotkey("ctrl", "v")
            time.sleep(0.05)
            # Restore clipboard after slight delay
            try:
                pyperclip.copy(old_clip)
            except Exception:
                pass
        else:
            pyautogui.write(text, interval=interval)

    @staticmethod
    def key_press(key: str):
        """Press a single key (e.g. 'enter', 'esc', 'tab', 'f5')."""
        if key:
            pyautogui.press(key.lower())

    @staticmethod
    def hotkey(*keys: str):
        """Execute key combination (e.g. ('ctrl', 'c'))."""
        if keys:
            normalized = [k.lower().strip() for k in keys if k]
            if normalized:
                pyautogui.hotkey(*normalized)
