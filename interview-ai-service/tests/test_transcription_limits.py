import importlib
import os
import sys
import types
import unittest
from pathlib import Path

from fastapi import FastAPI
from fastapi.testclient import TestClient


SERVICE_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SERVICE_ROOT))


def load_transcription_router(max_audio_bytes=16):
    os.environ["INTERVIEW_AI_MAX_AUDIO_BYTES"] = str(max_audio_bytes)
    sys.modules["services.whisper_service"] = types.SimpleNamespace(
        transcribe_audio=lambda _path: "transcribed text"
    )
    sys.modules.pop("routers.transcription", None)
    return importlib.import_module("routers.transcription")


def create_client(max_audio_bytes=16):
    transcription = load_transcription_router(max_audio_bytes)
    app = FastAPI()
    app.include_router(transcription.router, prefix="/api")
    return TestClient(app), transcription


class TranscriptionLimitTests(unittest.TestCase):
    def tearDown(self):
        sys.modules.pop("routers.transcription", None)
        sys.modules.pop("services.whisper_service", None)
        os.environ.pop("INTERVIEW_AI_MAX_AUDIO_BYTES", None)

    def test_rejects_oversized_http_upload(self):
        client, transcription = create_client(max_audio_bytes=16)

        response = client.post(
            "/api/transcribe",
            files={
                "audio": (
                    "answer.webm",
                    b"x" * (transcription.MAX_AUDIO_BYTES + 1),
                    "audio/webm",
                )
            },
        )

        self.assertEqual(response.status_code, 413)
        self.assertIn("too large", response.json()["detail"])

    def test_accepts_http_upload_within_limit(self):
        client, _transcription = create_client(max_audio_bytes=16)

        response = client.post(
            "/api/transcribe",
            files={"audio": ("answer.webm", b"x" * 16, "audio/webm")},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"transcript": "transcribed text"})

    def test_rejects_oversized_websocket_chunk(self):
        client, transcription = create_client(max_audio_bytes=16)

        with client.websocket_connect("/api/ws/transcribe") as websocket:
            websocket.send_bytes(b"x" * (transcription.MAX_AUDIO_BYTES + 1))
            message = websocket.receive_json()

        self.assertEqual(message["code"], "AUDIO_TOO_LARGE")
        self.assertIn("too large", message["error"])

    def test_rejects_websocket_buffer_growth_over_limit(self):
        client, _transcription = create_client(max_audio_bytes=16)

        with client.websocket_connect("/api/ws/transcribe") as websocket:
            websocket.send_bytes(b"x" * 10)
            websocket.send_bytes(b"x" * 7)
            message = websocket.receive_json()

        self.assertEqual(message["code"], "AUDIO_TOO_LARGE")
        self.assertIn("too large", message["error"])

    def test_websocket_transcribe_success(self):
        client, _transcription = create_client(max_audio_bytes=16)

        with client.websocket_connect("/api/ws/transcribe") as websocket:
            websocket.send_bytes(b"x" * 10)
            websocket.send_text("STOP")
            message = websocket.receive_json()

        self.assertEqual(message, {"transcript": "transcribed text"})

    def test_websocket_transcribe_empty(self):
        client, _transcription = create_client(max_audio_bytes=16)

        with client.websocket_connect("/api/ws/transcribe") as websocket:
            websocket.send_text("STOP")
            message = websocket.receive_json()

        self.assertEqual(message, {"transcript": ""})

    def test_websocket_transcribe_file_error_cleanup(self):
        import tempfile
        from unittest.mock import patch
        
        client, _transcription = create_client(max_audio_bytes=16)

        # Mock NamedTemporaryFile to raise an exception (simulating disk/system error)
        def mock_named_temp_file(*args, **kwargs):
            raise IOError("Simulated write/creation failure")

        with patch("tempfile.NamedTemporaryFile", mock_named_temp_file):
            with client.websocket_connect("/api/ws/transcribe") as websocket:
                websocket.send_bytes(b"x" * 10)
                websocket.send_text("STOP")
                message = websocket.receive_json()

        # The error should be caught and returned, and no TypeError should bubble out
        self.assertIn("error", message)
        self.assertEqual(message["error"], "Transcription failed. Please try again.")


if __name__ == "__main__":
    unittest.main()
