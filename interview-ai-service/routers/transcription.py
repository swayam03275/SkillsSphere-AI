import os
import tempfile
import asyncio
from fastapi import APIRouter, UploadFile, File, HTTPException, WebSocket, WebSocketDisconnect
from services.whisper_service import transcribe_audio

router = APIRouter()


@router.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    """
    Accept an audio file and return the transcribed text.
    Supports webm, wav, mp3, ogg, and m4a formats.
    """
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

    if audio.content_type and audio.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported audio format: {audio.content_type}. Supported: webm, wav, mp3, ogg, m4a",
        )

    # Save uploaded audio to a temp file for faster-whisper to process
    suffix = os.path.splitext(audio.filename)[1] if audio.filename else ".webm"
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            content = await audio.read()
            tmp.write(content)
            tmp_path = tmp.name

        transcript = transcribe_audio(tmp_path)

        return {"transcript": transcript}

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Transcription failed: {str(e)}",
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
            
            if "bytes" in message:
                audio_buffer.extend(message["bytes"])
            elif "text" in message:
                text = message["text"]
                if text == "STOP":
                    if not audio_buffer:
                        await websocket.send_json({"transcript": ""})
                        break
                        
                    # Save accumulated bytes to a temp file and transcribe
                    tmp_path = None
                    with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
                        tmp.write(audio_buffer)
                        tmp_path = tmp.name
                    
                    try:
                        transcript = transcribe_audio(tmp_path)
                        await websocket.send_json({"transcript": transcript})
                    except Exception as e:
                        await websocket.send_json({"error": str(e)})
                    finally:
                        if os.path.exists(tmp_path):
                            os.unlink(tmp_path)
                    
                    # Reset buffer for next utterance
                    audio_buffer = bytearray()
                elif text == "PING":
                    await websocket.send_json({"status": "PONG"})
    except WebSocketDisconnect:
        print("Client disconnected from transcription websocket")
    except Exception as e:
        print(f"WebSocket transcription error: {e}")
        try:
            await websocket.close()
        except:
            pass

