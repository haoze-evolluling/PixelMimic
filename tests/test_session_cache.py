"""
Unit tests for the session autosave cache and workflow session restore.
"""

import os
import re
import tempfile
import unittest

from pixelmimic.core.models import ActionType, StepNode, Workflow
from pixelmimic.gui.api import PyWebViewApi
from pixelmimic.utils.session_cache import SessionCache


class TestSessionCache(unittest.TestCase):

    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.cache = SessionCache(cache_dir=self._tmp.name)

    def tearDown(self):
        self._tmp.cleanup()

    def test_save_and_load_roundtrip(self):
        wf = Workflow(name="缓存测试流程")
        wf.steps.append(StepNode(name="步骤一", action_type=ActionType.WAIT_TIME))
        self.assertTrue(self.cache.save(wf.to_dict(), r"C:\flow\缓存测试流程.pmflow", force=True))

        data = self.cache.load()
        self.assertIsNotNone(data)
        self.assertEqual(data["file_path"], r"C:\flow\缓存测试流程.pmflow")
        restored = Workflow.from_dict(data["workflow"])
        self.assertEqual(restored.name, "缓存测试流程")
        self.assertEqual(len(restored.steps), 1)
        self.assertEqual(restored.steps[0].name, "步骤一")
        self.assertIn("saved_at", data)

    def test_load_missing_or_corrupt(self):
        self.assertIsNone(self.cache.load())
        with open(self.cache._path, "w", encoding="utf-8") as f:
            f.write("{ not json")
        self.assertIsNone(self.cache.load())

    def test_throttled_save_skips_until_forced(self):
        wf = Workflow(name="节流测试")
        self.assertTrue(self.cache.save(wf.to_dict(), None, force=True))
        # Within the throttle window a non-forced write is skipped.
        self.assertFalse(self.cache.save(wf.to_dict(), None))
        self.assertTrue(self.cache.save(wf.to_dict(), None, force=True))


class TestApiSessionRestore(unittest.TestCase):
    """API restores the cached session on startup."""

    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        os.environ["PIXELMIMIC_CACHE_DIR"] = self._tmp.name

    def tearDown(self):
        os.environ.pop("PIXELMIMIC_CACHE_DIR", None)
        self._tmp.cleanup()

    def _write_cache(self, name: str):
        cache = SessionCache(cache_dir=self._tmp.name)
        wf = Workflow(name=name)
        wf.steps.append(StepNode(name="恢复步骤", action_type=ActionType.WAIT_TIME))
        cache.save(wf.to_dict(), r"C:\flow\cached.pmflow", force=True)

    def test_restore_on_init(self):
        self._write_cache("上次会话")
        api = PyWebViewApi()
        try:
            self.assertEqual(api._workflow.name, "上次会话")
            self.assertEqual(api._file_path, r"C:\flow\cached.pmflow")
            self.assertEqual(len(api._workflow.steps), 1)
            self.assertIsNotNone(api._restored_at)

            data = api.get_initial_data()
            self.assertTrue(data["restored"])
            self.assertEqual(data["filePath"], r"C:\flow\cached.pmflow")
        finally:
            api._engine.stop()
            api._hotkey_mgr.stop()

    def test_no_cache_starts_fresh(self):
        api = PyWebViewApi()
        try:
            self.assertIsNone(api._restored_at)
            self.assertFalse(api.get_initial_data()["restored"])
        finally:
            api._engine.stop()
            api._hotkey_mgr.stop()

    def test_new_workflow_default_time_name(self):
        api = PyWebViewApi()
        try:
            res = api.new_workflow()
            self.assertTrue(res["success"])
            self.assertRegex(api._workflow.name, r"^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$")
        finally:
            api._engine.stop()
            api._hotkey_mgr.stop()


if __name__ == "__main__":
    unittest.main()
