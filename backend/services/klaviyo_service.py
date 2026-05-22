import os

import httpx


class KlaviyoService:
    def __init__(self):
        self.api_key = os.environ.get("KLAVIYO_API_KEY")
        self.base_url = "https://a.klaviyo.com/api"
        self.headers = {
            "Authorization": f"Klaviyo-API-Key {self.api_key}",
            "revision": "2024-02-15",
            "Content-Type": "application/json",
        }

    async def create_list(self, name: str) -> dict:
        if not self.api_key:
            return {"error": "KLAVIYO_API_KEY not configured"}
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{self.base_url}/lists/",
                headers=self.headers,
                json={"data": {"type": "list", "attributes": {"name": name}}},
            )
            return response.json()

    async def add_profile(self, email: str, properties: dict = {}) -> dict:
        if not self.api_key:
            return {"error": "KLAVIYO_API_KEY not configured"}
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{self.base_url}/profiles/",
                headers=self.headers,
                json={
                    "data": {
                        "type": "profile",
                        "attributes": {"email": email, **properties},
                    }
                },
            )
            return response.json()

    async def create_campaign(
        self,
        name: str,
        subject: str,
        from_email: str,
        from_name: str,
        list_id: str,
    ) -> dict:
        if not self.api_key:
            return {"error": "KLAVIYO_API_KEY not configured"}
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{self.base_url}/campaigns/",
                headers=self.headers,
                json={
                    "data": {
                        "type": "campaign",
                        "attributes": {
                            "name": name,
                            "channel": "email",
                            "send_options": {"use_smart_sending": True},
                            "tracking_options": {
                                "is_tracking_opens": True,
                                "is_tracking_clicks": True,
                            },
                            "send_strategy": {"method": "immediate"},
                            "audiences": {"included": [list_id]},
                        },
                    }
                },
            )
            return response.json()

    async def get_lists(self) -> dict:
        if not self.api_key:
            return {"error": "KLAVIYO_API_KEY not configured"}
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(f"{self.base_url}/lists/", headers=self.headers)
            return response.json()

    async def get_metrics(self) -> dict:
        if not self.api_key:
            return {"error": "KLAVIYO_API_KEY not configured"}
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(f"{self.base_url}/metrics/", headers=self.headers)
            return response.json()

    async def send_event(self, event_name: str, email: str, properties: dict = {}) -> dict:
        if not self.api_key:
            return {"error": "KLAVIYO_API_KEY not configured"}
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{self.base_url}/events/",
                headers=self.headers,
                json={
                    "data": {
                        "type": "event",
                        "attributes": {
                            "metric": {
                                "data": {
                                    "type": "metric",
                                    "attributes": {"name": event_name},
                                }
                            },
                            "profile": {
                                "data": {
                                    "type": "profile",
                                    "attributes": {"email": email},
                                }
                            },
                            "properties": properties,
                        },
                    }
                },
            )
            return response.json()


async def build_email_marketing_premium_context() -> dict:
    """Fetch Klaviyo lists + metrics for email_marketing_premium agent prompts."""
    service = KlaviyoService()
    return {
        "lists": await service.get_lists(),
        "metrics": await service.get_metrics(),
    }
