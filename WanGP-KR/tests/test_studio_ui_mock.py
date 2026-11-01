"""실제 GPU 없이 Gradio 화면 구성과 사용자 이벤트 연결을 검증한다."""

from __future__ import annotations

import sys
import types
import unittest
from pathlib import Path
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[1]
PLUGIN_ROOT = ROOT / "plugin" / "wan2gp-gomfox-studio"


class UiEventMockTests(unittest.TestCase):
    def test_plugin_registers_offline_workshop_and_explicit_copy(self):
        events = []

        class Widget:
            def __init__(self, *args, **kwargs):
                self.kwargs = kwargs

            def __enter__(self):
                return self

            def __exit__(self, *_args):
                return False

            def click(self, *args, **kwargs):
                events.append(("click", kwargs))

            def change(self, *args, **kwargs):
                events.append(("change", kwargs))

        gr = types.ModuleType("gradio")
        for name in (
            "Column", "Tabs", "Tab", "Row", "Image", "HTML", "Markdown",
            "Dropdown", "Button", "Textbox", "Checkbox", "Number",
        ):
            setattr(gr, name, Widget)
        gr.Error = Exception

        class StubPlugin:
            def __init__(self):
                self.state = object()
                self.main_tabs = object()
                self.requests = []

            def request_component(self, name):
                self.requests.append(name)

            def add_tab(self, **kwargs):
                self.requests.append(kwargs["tab_id"])

            def goto_media_tab(self, state):
                return "Media Generator"

        modules = {"gradio": gr}
        for name in ("gomfox_test", "shared", "shared.utils", "shared.utils.plugins"):
            mod = types.ModuleType(name)
            mod.__path__ = []
            modules[name] = mod
        modules["shared.utils.plugins"].WAN2GPPlugin = StubPlugin
        for name, contents in {
            "catalog": {
                "format_model_catalog": lambda *args: "catalog",
                "format_model_details": lambda *args: "details",
                "format_queue_status": lambda *args: "queue",
            },
            "hardware": {"read_hardware_report": lambda: "report"},
            "help_content": {
                "TOPICS": ("처음 시작", "저사양 설정"),
                "render_guide": lambda topic: str(topic),
            },
        }.items():
            mod = types.ModuleType("gomfox_test." + name)
            mod.__dict__.update(contents)
            modules[mod.__name__] = mod

        prompt = types.ModuleType("gomfox_test.prompt_assistant")
        prompt_source = (PLUGIN_ROOT / "prompt_assistant.py").read_text(encoding="utf-8")
        exec(compile(prompt_source, "prompt_assistant.py", "exec"), prompt.__dict__)
        modules[prompt.__name__] = prompt

        with patch.dict(sys.modules, modules):
            plugin_module = types.ModuleType("gomfox_test.plugin")
            plugin_module.__package__ = "gomfox_test"
            plugin_module.__file__ = str(PLUGIN_ROOT / "plugin.py")
            source = (PLUGIN_ROOT / "plugin.py").read_text(encoding="utf-8")
            exec(compile(source, plugin_module.__file__, "exec"), plugin_module.__dict__)

            app = plugin_module.GomFoxStudioPlugin()
            app.setup_ui()
            app.create_ui()

        self.assertGreaterEqual(len(events), 18)
        self.assertEqual(app.requests, ["state", "main_tabs", "GomFoxStudio"])
        self.assertEqual(
            sum("navigator.clipboard.writeText" in e[1].get("js", "") for e in events),
            1,
        )
        self.assertTrue(any(e[1].get("fn") is prompt.build_prompt for e in events))
        self.assertFalse(any("prompt" in name for name in app.requests))


if __name__ == "__main__":
    unittest.main()
