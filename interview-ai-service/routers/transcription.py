import os
import tempfile
import asyncio
from fastapi import APIRouter, UploadFile, File, HTTPException, WebSocket, WebSocketDisconnect
from services.whisper_service import transcribe_audio

router = APIRouter()

MAX_AUDIO_BYTES = int(os.getenv("INTERVIEW_AI_MAX_AUDIO_BYTES", str(10 * 1024 * 1024)))
UPLOAD_CHUNK_SIZE = 1024 * 1024
SUPPORTED_AUDIO_MESSAGE = "Supported: webm, wav, mp3, ogg, m4a"

allowed_types = [
    "audio/webm",
    "audio/wav",
    "audio/x-wav",
    "audio/mpeg",
    "audio/mp3",
    "audio/ogg",
    "audio/m4a",
    "audio/mp4",
    "application/octet-stream",  # fallback for unknown types
]


def _audio_too_large_message():
    max_mb = MAX_AUDIO_BYTES / (1024 * 1024)
    return f"Audio file is too large. Maximum allowed size is {max_mb:.1f} MB."


@router.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    """
    Accept an audio file and return the transcribed text.
    Supports webm, wav, mp3, ogg, and m4a formats.
    """
    if audio.content_type and audio.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported audio format: {audio.content_type}. {SUPPORTED_AUDIO_MESSAGE}",
        )

    # Save uploaded audio to a temp file for faster-whisper to process
    suffix = os.path.splitext(audio.filename)[1] if audio.filename else ".webm"
    tmp_path = None
    total_bytes = 0
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp_path = tmp.name
            while True:
                chunk = await audio.read(UPLOAD_CHUNK_SIZE)
                if not chunk:
                    break

                total_bytes += len(chunk)
                if total_bytes > MAX_AUDIO_BYTES:
                    raise HTTPException(
                        status_code=413,
                        detail=_audio_too_large_message(),
                    )

                tmp.write(chunk)

        transcript = await asyncio.to_thread(transcribe_audio, tmp_path)

        return {"transcript": transcript}

    except HTTPException:
        raise
    except Exception as e:
        print(f"Transcription failed: {type(e).__name__}")
        raise HTTPException(
            status_code=500,
            detail="Transcription failed. Please try again.",
        )
    finally:
        # Clean up temp file
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)

@router.websocket("/ws/transcribe")
async def websocket_transcribe(websocket: WebSocket):
    """
    WebSocket endpoint for real-time streaming audio transcription.
    Accepts binary chunks of audio and accumulates them.
    When a text message 'STOP' is received, it transcribes the accumulated audio.
    """
    await websocket.accept()
    
    audio_buffer = bytearray()
    
    try:
        while True:
            # Receive message (can be bytes or text)
            message = await websocket.receive()
            
            chunk = message.get("bytes")
            if chunk is not None:
                if len(chunk) > MAX_AUDIO_BYTES or len(audio_buffer) + len(chunk) > MAX_AUDIO_BYTES:
                    await websocket.send_json({
                        "error": _audio_too_large_message(),
                        "code": "AUDIO_TOO_LARGE",
                    })
                    await websocket.close(code=1009)
                    return

                audio_buffer.extend(chunk)
            elif "text" in message:
                text = message["text"]
                if text == "STOP":
                    if not audio_buffer:
                        await websocket.send_json({"transcript": ""})
                        break
                        
                    # Save accumulated bytes to a temp file and transcribe
                    tmp_path = None
                    try:
                        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
                            tmp.write(audio_buffer)
                            tmp_path = tmp.name
                        
                        transcript = await asyncio.to_thread(transcribe_audio, tmp_path)
                        await websocket.send_json({"transcript": transcript})
                    except Exception as e:
                        print(f"WebSocket transcription failed: {type(e).__name__}")
                        await websocket.send_json({"error": "Transcription failed. Please try again."})
                    finally:
                        if tmp_path and os.path.exists(tmp_path):
                            os.unlink(tmp_path)
                    
                    # Reset buffer for next utterance
                    audio_buffer = bytearray()
                elif text == "PING":
                    await websocket.send_json({"status": "PONG"})
    except WebSocketDisconnect:
        print("Client disconnected from transcription websocket")
    except Exception as e:
        print(f"WebSocket transcription error: {type(e).__name__}")
        try:
            await websocket.close()
        except:
            pass

