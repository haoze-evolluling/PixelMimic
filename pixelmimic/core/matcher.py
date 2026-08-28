"""
Image recognition and screen template matching engine based on OpenCV.
"""

from __future__ import annotations
from dataclasses import dataclass
import time
from typing import List, Optional, Tuple
import cv2
import mss
import numpy as np
from PIL import ImageGrab

from pixelmimic.utils.image_utils import base64_to_cv2


@dataclass
class MatchResult:
    x: int             # Top-left X in screen coordinates
    y: int             # Top-left Y in screen coordinates
    width: int         # Width of matched region
    height: int        # Height of matched region
    center_x: int      # Center X in screen coordinates
    center_y: int      # Center Y in screen coordinates
    confidence: float  # Matching confidence score [0.0 - 1.0]

    def to_dict(self):
        return {
            "x": self.x,
            "y": self.y,
            "width": self.width,
            "height": self.height,
            "center_x": self.center_x,
            "center_y": self.center_y,
            "confidence": round(self.confidence, 4),
        }


class ImageMatcher:
    """High-performance screen capture and template matching engine."""

    def __init__(self):
        self._sct = None

    def _get_sct(self) -> mss.mss:
        if self._sct is None:
            self._sct = mss.mss()
        return self._sct

    def capture_screen(self, roi: Optional[Tuple[int, int, int, int]] = None) -> np.ndarray:
        """
        Capture the screen or a region of interest (ROI).
        roi: (x, y, width, height)
        Returns OpenCV BGR image (np.ndarray).
        """
        try:
            sct = self._get_sct()
            if roi is not None:
                x, y, w, h = roi
                monitor = {"left": int(x), "top": int(y), "width": int(w), "height": int(h)}
            else:
                # Primary monitor (monitor 1) or all monitors (monitor 0)
                # Usually monitor 1 is primary monitor
                monitor = sct.monitors[1] if len(sct.monitors) > 1 else sct.monitors[0]

            sct_img = sct.grab(monitor)
            # mss outputs BGRA, convert to BGR
            img = np.array(sct_img)
            return cv2.cvtColor(img, cv2.COLOR_BGRA2BGR)
        except Exception:
            # Fallback to PIL ImageGrab
            if roi is not None:
                x, y, w, h = roi
                bbox = (int(x), int(y), int(x + w), int(y + h))
                pil_img = ImageGrab.grab(bbox=bbox)
            else:
                pil_img = ImageGrab.grab()
            arr = np.array(pil_img)
            return cv2.cvtColor(arr, cv2.COLOR_RGB2BGR)

    def find_match(
        self,
        template: np.ndarray,
        screen_img: Optional[np.ndarray] = None,
        roi: Optional[Tuple[int, int, int, int]] = None,
        confidence: float = 0.8,
        use_grayscale: bool = True,
        multi_scale: bool = False,
        method: int = cv2.TM_CCOEFF_NORMED,
    ) -> Optional[MatchResult]:
        """
        Find the best single match of template in the screen.
        Returns MatchResult or None if best match is below confidence threshold.
        """
        matches = self.find_all(
            template=template,
            screen_img=screen_img,
            roi=roi,
            confidence=confidence,
            use_grayscale=use_grayscale,
            multi_scale=multi_scale,
            method=method,
            max_results=1,
        )
        return matches[0] if matches else None

    def find_all(
        self,
        template: np.ndarray,
        screen_img: Optional[np.ndarray] = None,
        roi: Optional[Tuple[int, int, int, int]] = None,
        confidence: float = 0.8,
        use_grayscale: bool = True,
        multi_scale: bool = False,
        method: int = cv2.TM_CCOEFF_NORMED,
        max_results: int = 10,
    ) -> List[MatchResult]:
        """
        Find all occurrences of template in screen matching the confidence threshold.
        """
        if template is None or template.size == 0:
            return []

        # Offset for ROI
        offset_x = 0
        offset_y = 0

        if screen_img is None:
            if roi is not None:
                screen_img = self.capture_screen(roi)
                offset_x, offset_y = roi[0], roi[1]
            else:
                screen_img = self.capture_screen()
        elif roi is not None:
            rx, ry, rw, rh = roi
            screen_img = screen_img[ry : ry + rh, rx : rx + rw]
            offset_x, offset_y = rx, ry

        if screen_img is None or screen_img.size == 0:
            return []

        th, tw = template.shape[:2]
        sh, sw = screen_img.shape[:2]

        if th > sh or tw > sw:
            return []

        # Prepare scales
        scales = [1.0]
        if multi_scale:
            scales = [0.8, 0.85, 0.9, 0.95, 1.0, 1.05, 1.1, 1.15, 1.2]

        all_matches: List[MatchResult] = []

        # Handle mask if template has alpha channel
        mask = None
        if len(template.shape) == 3 and template.shape[2] == 4:
            mask = template[:, :, 3]
            template_bgr = cv2.cvtColor(template, cv2.COLOR_BGRA2BGR)
        else:
            template_bgr = template

        for scale in scales:
            scaled_w = int(tw * scale)
            scaled_h = int(th * scale)
            if scaled_w <= 0 or scaled_h <= 0 or scaled_w > sw or scaled_h > sh:
                continue

            if scale != 1.0:
                scaled_template = cv2.resize(template_bgr, (scaled_w, scaled_h), interpolation=cv2.INTER_AREA)
                scaled_mask = cv2.resize(mask, (scaled_w, scaled_h), interpolation=cv2.INTER_NEAREST) if mask is not None else None
            else:
                scaled_template = template_bgr
                scaled_mask = mask

            if use_grayscale:
                src_gray = cv2.cvtColor(screen_img, cv2.COLOR_BGR2GRAY) if len(screen_img.shape) == 3 else screen_img
                tpl_gray = cv2.cvtColor(scaled_template, cv2.COLOR_BGR2GRAY) if len(scaled_template.shape) == 3 else scaled_template
                if scaled_mask is not None:
                    res = cv2.matchTemplate(src_gray, tpl_gray, method, mask=scaled_mask)
                else:
                    res = cv2.matchTemplate(src_gray, tpl_gray, method)
            else:
                if scaled_mask is not None:
                    res = cv2.matchTemplate(screen_img, scaled_template, method, mask=scaled_mask)
                else:
                    res = cv2.matchTemplate(screen_img, scaled_template, method)

            if method == cv2.TM_SQDIFF_NORMED:
                # For SQDIFF, 0 is perfect match, convert to similarity score
                similarity = 1.0 - res
            else:
                similarity = res

            # Find locations exceeding confidence threshold
            loc = np.where(similarity >= confidence)
            for pt in zip(*loc[::-1]):  # (x, y)
                score = float(similarity[pt[1], pt[0]])
                match_x = int(pt[0] + offset_x)
                match_y = int(pt[1] + offset_y)
                all_matches.append(
                    MatchResult(
                        x=match_x,
                        y=match_y,
                        width=scaled_w,
                        height=scaled_h,
                        center_x=match_x + scaled_w // 2,
                        center_y=match_y + scaled_h // 2,
                        confidence=score,
                    )
                )

        if not all_matches:
            return []

        # Sort by confidence descending
        all_matches.sort(key=lambda m: m.confidence, reverse=True)

        # Apply Non-Maximum Suppression (NMS) to eliminate duplicate overlapping boxes
        filtered_matches: List[MatchResult] = []
        for m in all_matches:
            overlap = False
            for existing in filtered_matches:
                # Check intersection over min area
                x1 = max(m.x, existing.x)
                y1 = max(m.y, existing.y)
                x2 = min(m.x + m.width, existing.x + existing.width)
                y2 = min(m.y + m.height, existing.y + existing.height)
                inter_w = max(0, x2 - x1)
                inter_h = max(0, y2 - y1)
                inter_area = inter_w * inter_h
                min_area = min(m.width * m.height, existing.width * existing.height)
                if min_area > 0 and (inter_area / min_area) > 0.4:
                    overlap = True
                    break
            if not overlap:
                filtered_matches.append(m)
                if len(filtered_matches) >= max_results:
                    break

        return filtered_matches

    def wait_for_match(
        self,
        template: np.ndarray,
        timeout: float = 5.0,
        interval: float = 0.3,
        roi: Optional[Tuple[int, int, int, int]] = None,
        confidence: float = 0.8,
        use_grayscale: bool = True,
        multi_scale: bool = False,
        wait_for_disappear: bool = False,
    ) -> Optional[MatchResult]:
        """
        Wait until template appears or disappears within timeout seconds.
        """
        start_time = time.time()
        last_match = None

        while time.time() - start_time <= timeout:
            match = self.find_match(
                template=template,
                roi=roi,
                confidence=confidence,
                use_grayscale=use_grayscale,
                multi_scale=multi_scale,
            )
            if wait_for_disappear:
                if match is None:
                    return MatchResult(0, 0, 0, 0, 0, 0, 1.0)
            else:
                if match is not None:
                    return match

            last_match = match
            time.sleep(interval)

        return None if not wait_for_disappear else last_match
