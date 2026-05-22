import base64
import os

import httpx


class ElevenLabsService:
    def __init__(self):
        self.api_key = os.environ.get("ELEVENLABS_API_KEY")
        self.base_url = "https://api.elevenlabs.io/v1"
        self.default_voice_id = os.environ.get(
            "ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM"
        )  # Rachel - voz profesional por defecto

    async def text_to_speech(self, text: str, voice_id: str = None) -> bytes:
        if not self.api_key:
            raise ValueError("ELEVENLABS_API_KEY not configured")
        vid = voice_id or self.default_voice_id
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/text-to-speech/{vid}",
                headers={"xi-api-key": self.api_key, "Content-Type": "application/json"},
                json={
                    "text": text,
                    "model_id": "eleven_multilingual_v2",
                    "voice_settings": {"stability": 0.5, "similarity_boost": 0.75},
                },
                timeout=30.0,
            )
            response.raise_for_status()
            return response.content

    async def text_to_speech_base64(self, text: str, voice_id: str = None) -> str:
        audio_bytes = await self.text_to_speech(text, voice_id)
        return base64.b64encode(audio_bytes).decode("utf-8")

    async def get_voices(self) -> list:
        if not self.api_key:
            return []
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/voices",
                headers={"xi-api-key": self.api_key},
            )
            response.raise_for_status()
            return response.json().get("voices", [])

    async def stream_audio(self, text: str, voice_id: str = None):
        if not self.api_key:
            raise ValueError("ELEVENLABS_API_KEY not configured")
        vid = voice_id or self.default_voice_id
        async with httpx.AsyncClient() as client:
            async with client.stream(
                "POST",
                f"{self.base_url}/text-to-speech/{vid}/stream",
                headers={"xi-api-key": self.api_key, "Content-Type": "application/json"},
                json={
                    "text": text,
                    "model_id": "eleven_multilingual_v2",
                    "voice_settings": {"stability": 0.5, "similarity_boost": 0.75},
                },
                timeout=60.0,
            ) as response:
                response.raise_for_status()
                async for chunk in response.aiter_bytes():
                    yield chunk
