"""
Unit tests for OpenCV image matching engine.
"""

import unittest
import numpy as np
import cv2
from pixelmimic.core.matcher import ImageMatcher


class TestImageMatcher(unittest.TestCase):

    def setUp(self):
        self.matcher = ImageMatcher()

    def test_find_exact_match(self):
        # Create a synthetic 400x400 background image
        bg = np.zeros((400, 400, 3), dtype=np.uint8)
        # Create a distinctive 40x40 target pattern at (120, 150)
        target = np.ones((40, 40, 3), dtype=np.uint8) * 200
        cv2.circle(target, (20, 20), 10, (50, 100, 255), -1)

        # Place target in bg at x=120, y=150
        bg[150:190, 120:160] = target

        # Match
        match = self.matcher.find_match(
            template=target,
            screen_img=bg,
            confidence=0.9,
        )

        self.assertIsNotNone(match)
        self.assertEqual(match.x, 120)
        self.assertEqual(match.y, 150)
        self.assertEqual(match.center_x, 140)
        self.assertEqual(match.center_y, 170)
        self.assertGreaterEqual(match.confidence, 0.95)

    def test_find_all_and_nms(self):
        # Create image with 2 distinct targets
        bg = np.zeros((500, 500, 3), dtype=np.uint8)
        target = np.ones((30, 30, 3), dtype=np.uint8) * 180
        cv2.rectangle(target, (5, 5), (25, 25), (0, 255, 0), -1)

        # Place at (50, 50) and (200, 300)
        bg[50:80, 50:80] = target
        bg[300:330, 200:230] = target

        matches = self.matcher.find_all(
            template=target,
            screen_img=bg,
            confidence=0.85,
            max_results=5,
        )

        self.assertEqual(len(matches), 2)
        coords = sorted([(m.x, m.y) for m in matches])
        self.assertEqual(coords[0], (50, 50))
        self.assertEqual(coords[1], (200, 300))

    def test_match_with_roi(self):
        bg = np.zeros((400, 400, 3), dtype=np.uint8)
        target = np.ones((20, 20, 3), dtype=np.uint8) * 220
        cv2.circle(target, (10, 10), 5, (50, 100, 255), -1)
        bg[100:120, 100:120] = target

        # Search ROI containing the target: [80, 80, 100, 100]
        match = self.matcher.find_match(
            template=target,
            screen_img=bg,
            roi=(80, 80, 100, 100),
            confidence=0.9,
        )
        self.assertIsNotNone(match)
        self.assertEqual(match.x, 100)
        self.assertEqual(match.y, 100)

        # Search ROI NOT containing the target: [200, 200, 100, 100]
        match_none = self.matcher.find_match(
            template=target,
            screen_img=bg,
            roi=(200, 200, 100, 100),
            confidence=0.9,
        )
        self.assertIsNone(match_none)


if __name__ == "__main__":
    unittest.main()
