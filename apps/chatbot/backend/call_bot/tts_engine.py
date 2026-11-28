import os
import hashlib
import base64
import asyncio
from pathlib import Path
from typing import Optional
import edge_tts
from .config import DEFAULT_VOICE, CACHE_AUDIO_DIR

# In-memory base64 audio cache for common phrases
_AUDIO_MEMORY_CACHE = {}

async def synthesize_speech_bytes(text: str, voice: Optional[str] = None) -> bytes:
    """Generate MP3 audio bytes using edge-tts."""
    selected_voice = voice or DEFAULT_VOICE
    communicate = edge_tts.Communicate(text=text, voice=selected_voice)
    audio_chunks = []
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_chunks.append(chunk["data"])
    return b"".join(audio_chunks)

async def text_to_speech_base64(text: str, voice: Optional[str] = None) -> str:
    """Convert text to speech and return as base64 encoded MP3 data string."""
    selected_voice = voice or DEFAULT_VOICE
    
    # Hash text + voice for caching
    cache_key = hashlib.md5(f"{selected_voice}_{text}".encode("utf-8")).hexdigest()
    
    # Check in-memory cache
    if cache_key in _AUDIO_MEMORY_CACHE:
        return _AUDIO_MEMORY_CACHE[cache_key]

    # Check file cache on disk
    disk_file = CACHE_AUDIO_DIR / f"{cache_key}.mp3"
    if disk_file.exists():
        with open(disk_file, "rb") as f:
            audio_b64 = base64.b64encode(f.read()).decode("utf-8")
            _AUDIO_MEMORY_CACHE[cache_key] = audio_b64
            return audio_b64

    # Synthesize new audio
    audio_bytes = await synthesize_speech_bytes(text, selected_voice)
    
    # Save to disk cache in background
    try:
        with open(disk_file, "wb") as f:
            f.write(audio_bytes)
    except Exception as e:
        print(f"Cache write error: {e}")

    audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")
    _AUDIO_MEMORY_CACHE[cache_key] = audio_b64
    return audio_b64
