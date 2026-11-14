"""실제 GPU 없이 Gradio 화면 구성과 사용자 이벤트 연결을 검증한다."""

from __future__ import annotations

import sys
import tempfile
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
            "Column", "Tabs", "Tab", "Row", "Accordion", "Image", "HTML", "Markdown",
            "Dropdown", "Button", "Textbox", "Checkbox", "Number",
        ):
            setattr(gr, name, Widget)
        gr.Error = Exception
        gr.update = lambda **kwargs: {"__type__": "update", **kwargs}

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
                "format_model_catalog_page": lambda *args: ("catalog", [("Mock image [img1]", "img1")]),
                "format_model_details": lambda *args: "details",
                "format_model_preflight": lambda *args: "preflight",
                "format_queue_dashboard": lambda *args: ("summary", "queue"),
                "format_queue_dashboard_guided": lambda *args: ("summary", "queue", "guide"),
                "GALLERY_CONFIRM_CHOICES": (
                    "아직 확인 전", "원본 갤러리에 결과가 보임", "원본에 오류가 표시됨", "갤러리에 결과가 보이지 않음",
                ),
                "format_gallery_confirmation": lambda *args: "수동 결과 안내",
            },
            "hardware": {"read_hardware_report": lambda: "report", "detect_hardware": lambda: {}},
            "help_content": {
                "TOPICS": ("처음 시작", "저사양 설정"),
                "render_guide": lambda topic: str(topic),
                "render_card_summary": lambda topic: "card: " + str(topic),
                "TROUBLESHOOT_TOPICS": (
                    "원본 WanGP가 열리지 않아요", "모델 다운로드·생성이 멈춘 것 같아요",
                    "GPT 없이 무료로 만들고 싶어요",
                ),
                "render_troubleshooting": lambda topic: "문제 해결: " + str(topic),
                "FIRST_CREATION_STAGES": ("① 원본 실행 확인", "② 모델과 준비물", "③ 무료 생성하기", "④ 결과 확인·저장"),
                "render_first_creation_step": lambda topic, stage: "안내: " + str(topic) + str(stage),
                "render_first_creation_blocker": lambda stage: "막혔나요: " + str(stage),
                "next_first_creation_stage": lambda stage: {
                    "① 원본 실행 확인": "② 모델과 준비물",
                    "② 모델과 준비물": "③ 무료 생성하기",
                    "③ 무료 생성하기": "④ 결과 확인·저장",
                }.get(stage, "④ 결과 확인·저장"),
                "format_first_creation_handoff": lambda topic, a, b, c: f"시작 점검: {topic} {a} {b} {c}",
                "connected_creation_choices": lambda topic: ("이미지", "이미지"),
            },
            "studio_check": {
                "format_studio_readiness": lambda session: "check",
                "format_error_diagnosis": lambda message: "진단: " + str(message),
                "suggest_recovery_topic": lambda message: (
                    "모델 다운로드·생성이 멈춘 것 같아요" if message == "OOM"
                    else "<unrecognized>" if message == "bad-proposal" else None
                ),
                "clear_error_diagnosis": lambda: ("", "지웠습니다"),
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

            art_css = plugin_module.category_art_css()
            self.assertEqual(art_css.count("data:image/webp;base64,"), 4)
            self.assertLess(len(art_css), 400_000)
            self.assertEqual(art_css.count("background-size:100% 100%,auto 100%"), 4)
            self.assertNotIn("<svg", art_css.casefold())
            helper_css = plugin_module.first_run_art_css()
            self.assertEqual(helper_css.count("data:image/webp;base64,"), 1)
            self.assertLess(len(helper_css), 215_000)
            self.assertIn(".gfs-first-run-intro", helper_css)
            self.assertNotIn("<svg", helper_css.casefold())
            with tempfile.TemporaryDirectory() as scratch:
                bad = Path(scratch) / "category-video.webp"
                bad.write_bytes(b"not an image")
                original = plugin_module.CATEGORY_ART["video"]
                plugin_module.CATEGORY_ART["video"] = bad
                self.assertEqual(plugin_module.category_art_css().count("data:image/webp;base64,"), 3)
                plugin_module.CATEGORY_ART["video"] = original
                helper_path = plugin_module.FIRST_RUN_ART_FILE
                plugin_module.FIRST_RUN_ART_FILE = bad
                self.assertEqual(plugin_module.first_run_art_css(), "")
                plugin_module.FIRST_RUN_ART_FILE = helper_path

            app = plugin_module.GomFoxStudioPlugin()
            app.setup_ui()
            app.create_ui()

            class Deepy:
                unavailable_reason = "secret-token-from-deepy"
                deepy_type = "prime"

            app.deepy = Deepy()
            with self.assertRaises(Exception) as unavailable:
                app._send_optional_director_request("test", True)
            self.assertNotIn("secret-token", str(unavailable.exception))

            class Job:
                def __enter__(self):
                    return self

                def __exit__(self, *_):
                    return False

                def events(self):
                    return []

                def result(self):
                    return types.SimpleNamespace(status="error", cancelled=False, error="secret-token-in-error")

            class RunningDeepy:
                unavailable_reason = None
                deepy_type = "prime"

                def run(self, prompt, workspace):
                    return Job()

            app.deepy = RunningDeepy()
            with self.assertRaises(Exception) as failed:
                app._send_optional_director_request("test", True)
            self.assertNotIn("secret-token", str(failed.exception))

            Job.result = lambda self: types.SimpleNamespace(
                status="ok", cancelled=False, outputs=[{"name": r"C:\\Users\\private\\secret-token"}]
            )
            completed = app._send_optional_director_request("test", True)
            self.assertIn("갤러리", completed)
            self.assertNotIn("secret-token", completed)

        self.assertGreaterEqual(len(events), 20)
        self.assertEqual(app.requests, ["state", "main_tabs", "GomFoxStudio"])
        self.assertEqual(
            sum("navigator.clipboard.writeText" in e[1].get("js", "") for e in events),
            1,
        )
        self.assertTrue(any(e[1].get("fn") is prompt.build_prompt for e in events))
        self.assertTrue(any(e[1].get("fn") is prompt.fill_example for e in events))
        self.assertTrue(any(
            e[0] == "click" and [getattr(widget, "kwargs", {}).get("elem_id") for widget in e[1].get("outputs", [])]
            == ["gfs-queue-overview", "gfs-queue-result", "gfs-queue-guidance", "gfs-gallery-observed", "gfs-gallery-file-opened", "gfs-gallery-result"]
            for e in events
        ))
        guided_queue = next(
            e[1] for e in events if e[0] == "click"
            and [getattr(widget, "kwargs", {}).get("elem_id") for widget in e[1].get("outputs", [])]
            == ["gfs-queue-overview", "gfs-queue-result", "gfs-queue-guidance", "gfs-gallery-observed", "gfs-gallery-file-opened", "gfs-gallery-result"]
        )
        refreshed = guided_queue["fn"](False)
        self.assertEqual(refreshed[:3], ("summary", "queue", "guide"))
        self.assertEqual(refreshed[3], {"__type__": "update", "value": "아직 확인 전"})
        self.assertEqual(refreshed[4], {"__type__": "update", "value": False})
        self.assertIn("초기화", refreshed[5])
        self.assertTrue(any(
            e[0] == "click" and e[1].get("fn") is modules["gomfox_test.catalog"].format_gallery_confirmation
            for e in events
        ))
        handoff = next(
            e[1] for e in events if e[0] == "click"
            and [getattr(w, "kwargs", {}).get("elem_id") for w in e[1].get("outputs", [])]
            == ["gfs-first-handoff-result"]
        )
        self.assertEqual(
            [w.kwargs.get("elem_id") for w in handoff["inputs"][1:]],
            ["gfs-first-original-checked", "gfs-first-model-checked", "gfs-first-input-checked"],
        )
        self.assertEqual(handoff["fn"]("처음 시작", True, False, True), "시작 점검: 처음 시작 True False True")
        resets = [
            e[1] for e in events if e[0] == "change"
            and [getattr(w, "kwargs", {}).get("elem_id") for w in e[1].get("outputs", [])]
            == ["gfs-first-original-checked", "gfs-first-model-checked", "gfs-first-input-checked", "gfs-first-handoff-result"]
        ]
        self.assertEqual(len(resets), 1)
        flags = resets[0]["fn"]("짧은 영상")
        self.assertTrue(all(flag == {"__type__": "update", "value": False} for flag in flags[:3]))
        self.assertIn("False False False", flags[3])
        refreshes = [
            e[1] for e in events if e[0] == "change"
            and e[1].get("fn") is modules["gomfox_test.help_content"].format_first_creation_handoff
        ]
        self.assertEqual(len(refreshes), 3)
        picker_refresh = next(
            e[1] for e in events if e[0] == "click"
            and len(e[1].get("outputs", [])) == 3
            and getattr(e[1]["outputs"][1], "kwargs", {}).get("elem_id") == "gfs-model-pick"
        )
        report, update, cleared = picker_refresh["fn"]("이미지", "", 1)
        self.assertEqual(report, "catalog")
        self.assertEqual(update["choices"], [("Mock image [img1]", "img1")])
        self.assertIsNone(update["value"])
        self.assertEqual(cleared, "")
        picker_change = next(
            e[1] for e in events if e[0] == "change"
            and getattr(e[1].get("inputs", [None])[0], "kwargs", {}).get("elem_id") == "gfs-model-pick"
        )
        self.assertEqual(picker_change["fn"]("img1"), "img1")
        beginner_lookup = next(
            e[1] for e in events if e[0] == "click"
            and [getattr(widget, "kwargs", {}).get("elem_id") for widget in e[1].get("outputs", [])]
            == [None, "gfs-welcome-model-pick", "gfs-welcome-model-report"]
        )
        status, selected, readiness = beginner_lookup["fn"]("처음 시작", "Mock")
        self.assertIn("조회 결과", status)
        self.assertEqual(selected["choices"], [("Mock image [img1]", "img1")])
        self.assertIsNone(selected["value"])
        self.assertIn("준비 확인", readiness)
        change_beginner_topic = next(
            e[1] for e in events if e[0] == "change"
            and [getattr(widget, "kwargs", {}).get("elem_id") for widget in e[1].get("outputs", [])]
            == [None, "gfs-welcome-model-pick", None, "gfs-welcome-model-report"]
        )
        cleared_query, cleared_dropdown, message, cleared_result = change_beginner_topic["fn"]("짧은 영상")
        self.assertEqual(cleared_query, "")
        self.assertEqual(cleared_dropdown["choices"], [])
        self.assertIsNone(cleared_dropdown["value"])
        self.assertIn("다시 조회", message)
        self.assertIn("지웠습니다", cleared_result)
        change_query = next(
            e[1] for e in events if e[0] == "change"
            and len(e[1].get("outputs", [])) == 3
            and getattr(e[1]["outputs"][0], "kwargs", {}).get("elem_id") == "gfs-welcome-model-pick"
        )
        search_dropdown, search_message, search_result = change_query["fn"]("Flux")
        self.assertEqual(search_dropdown["choices"], [])
        self.assertIn("다시 조회", search_message)
        self.assertIn("이전 모델", search_result)
        beginner_check = next(
            e[1] for e in events if e[0] == "click"
            and [getattr(widget, "kwargs", {}).get("elem_id") for widget in e[1].get("inputs", [])]
            == ["gfs-welcome-model-pick"]
        )
        self.assertEqual(beginner_check["fn"]("img1"), "preflight")
        change_model = next(
            e[1] for e in events if e[0] == "change"
            and [getattr(widget, "kwargs", {}).get("elem_id") for widget in e[1].get("inputs", [])]
            == ["gfs-welcome-model-pick"]
        )
        self.assertIn("다시 눌러", change_model["fn"]("img1"))
        self.assertTrue(any(
            e[0] == "change" and e[1].get("fn") is modules["gomfox_test.help_content"].render_troubleshooting
            for e in events
        ))
        stage_outputs = ["gfs-first-creation-guide", "gfs-first-creation-blocker"]
        stage_change = next(
            e[1] for e in events if e[0] == "change"
            and [w.kwargs.get("elem_id") for w in e[1]["outputs"]] == stage_outputs
        )
        self.assertEqual(stage_change["fn"]("짧은 영상", "② 모델과 준비물"),
                         ("안내: 짧은 영상② 모델과 준비물", "막혔나요: ② 모델과 준비물"))
        flow_outputs = ["gfs-first-creation-stage", *stage_outputs]
        flow_events = [
            e for e in events if [getattr(w, "kwargs", {}).get("elem_id") for w in e[1].get("outputs", [])] == flow_outputs
        ]
        self.assertEqual({e[0] for e in flow_events}, {"click", "change"})
        reset = next(e[1] for e in flow_events if e[0] == "change")
        update, guide, blocker = reset["fn"]("짧은 영상")
        self.assertEqual(update["value"], "① 원본 실행 확인")
        self.assertIn("짧은 영상① 원본 실행 확인", guide)
        self.assertIn("① 원본 실행 확인", blocker)
        advance = next(e[1] for e in flow_events if e[0] == "click")
        update, guide, blocker = advance["fn"]("짧은 영상", "① 원본 실행 확인")
        self.assertEqual(update["value"], "② 모델과 준비물")
        self.assertIn("짧은 영상② 모델과 준비물", guide)
        update, guide, blocker = advance["fn"]("처음 시작", "④ 결과 확인·저장")
        self.assertEqual(update["value"], "④ 결과 확인·저장")
        self.assertTrue(any(
            e[0] == "change" and e[1].get("fn") is modules["gomfox_test.help_content"].connected_creation_choices
            for e in events
        ))
        self.assertTrue(any(
            e[0] == "click" and [getattr(widget, "kwargs", {}).get("elem_id") for widget in e[1].get("outputs", [])]
            == ["gfs-model-preflight-result"]
            for e in events
        ))
        diagnoses = [
            e[1] for e in events if e[0] == "click"
            and [getattr(widget, "kwargs", {}).get("elem_id") for widget in e[1].get("outputs", [])]
            == ["gfs-error-advice", "gfs-recovery-topic", "gfs-recovery-guide"]
        ]
        self.assertEqual(len(diagnoses), 1)
        self.assertEqual(
            [getattr(widget, "kwargs", {}).get("elem_id") for widget in diagnoses[0]["inputs"]],
            ["gfs-error-input", "gfs-recovery-topic"],
        )
        current = "원본 WanGP가 열리지 않아요"
        diagnosis, selected, guide = diagnoses[0]["fn"]("OOM", current)
        self.assertEqual(diagnosis, "진단: OOM")
        self.assertEqual(selected["value"], "모델 다운로드·생성이 멈춘 것 같아요")
        self.assertIn("모델 다운로드·생성이 멈춘 것 같아요", guide)
        diagnosis, selected, guide = diagnoses[0]["fn"]("unknown", current)
        self.assertEqual(selected["value"], current)
        diagnosis, selected, guide = diagnoses[0]["fn"]("bad-proposal", current)
        self.assertEqual(selected["value"], current)
        clears = [
            e[1] for e in events if e[0] == "click"
            and [getattr(widget, "kwargs", {}).get("elem_id") for widget in e[1].get("outputs", [])]
            == ["gfs-error-input", "gfs-error-advice", "gfs-recovery-topic", "gfs-recovery-guide"]
        ]
        self.assertEqual(len(clears), 1)
        cleared, hint, selected, guide = clears[0]["fn"]()
        self.assertEqual(cleared, "")
        self.assertEqual(hint, "지웠습니다")
        self.assertEqual(selected["value"], "원본 WanGP가 열리지 않아요")
        self.assertTrue(any(
            e[0] == "click"
            and [getattr(widget, "kwargs", {}).get("elem_id") for widget in e[1].get("outputs", [])]
            == ["gfs-connection-result"]
            for e in events
        ))
        self.assertFalse(any("prompt" in name for name in app.requests))


if __name__ == "__main__":
    unittest.main()
