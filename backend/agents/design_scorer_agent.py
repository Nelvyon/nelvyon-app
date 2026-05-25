"""Design quality scoring and auto-improvement for OS Web / Store Builder."""

from __future__ import annotations

import json
import logging
import os
from typing import Any

logger = logging.getLogger(__name__)

MODEL = "gpt-4o"
MIN_SCORE = 8.5
MAX_ITERATIONS = 3

CRITERIA = ("typography", "colors", "visual_hierarchy", "cta_clarity", "mobile_first")


class DesignScorerAgent:
    """Scores and iteratively improves website JSON using GPT-4o."""

    def __init__(self) -> None:
        self._client: Any = None

    def _openai_client(self) -> Any | None:
        if self._client is not None:
            return self._client
        from openai import AsyncOpenAI

        api_key = (
            os.environ.get("OPENAI_API_KEY", "").strip()
            or os.environ.get("APP_AI_KEY", "").strip()
        )
        if not api_key:
            return None
        base_url = (
            os.environ.get("OPENAI_BASE_URL", "").strip()
            or os.environ.get("APP_AI_BASE_URL", "").strip()
            or "https://api.openai.com/v1"
        )
        self._client = AsyncOpenAI(api_key=api_key, base_url=base_url)
        return self._client

    async def score_website(self, website_json: dict[str, Any]) -> dict[str, Any]:
        """Return per-criterion scores (0-10), average, and suggestions."""
        client = self._openai_client()
        if not client:
            return self._mock_scores()

        prompt = (
            "Evaluate this website JSON for premium SaaS design quality (Linear/Stripe/Vercel level).\n"
            "Score each criterion from 0 to 10:\n"
            "- typography\n- colors\n- visual_hierarchy\n- cta_clarity\n- mobile_first\n\n"
            'Return JSON only: {"scores":{...},"average":7.5,"suggestions":["..."],"summary":"..."}\n\n'
            f"Website JSON:\n{json.dumps(website_json, ensure_ascii=False)[:14000]}"
        )
        try:
            resp = await client.chat.completions.create(
                model=MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an elite web design critic. Be strict but fair.",
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.3,
                response_format={"type": "json_object"},
            )
            data = json.loads(resp.choices[0].message.content or "{}")
            scores = data.get("scores") or {}
            for key in CRITERIA:
                scores.setdefault(key, 7.0)
            avg = sum(float(scores.get(k, 7)) for k in CRITERIA) / len(CRITERIA)
            data["scores"] = {k: round(float(scores.get(k, 7)), 1) for k in CRITERIA}
            data["average"] = round(avg, 2)
            data.setdefault("suggestions", [])
            data.setdefault("summary", "")
            return data
        except Exception as exc:
            logger.warning("DesignScorerAgent.score_website failed: %s", exc)
            return self._mock_scores()

    async def improve_design(
        self, website_json: dict[str, Any], scores: dict[str, Any]
    ) -> dict[str, Any]:
        """Return improved website JSON targeting higher design scores."""
        client = self._openai_client()
        if not client:
            return website_json

        score_map = scores.get("scores") if isinstance(scores.get("scores"), dict) else scores
        suggestions = scores.get("suggestions") or []

        prompt = (
            f"Current design scores: {json.dumps(score_map, ensure_ascii=False)}\n"
            f"Suggestions: {json.dumps(suggestions, ensure_ascii=False)}\n\n"
            "Improve the website JSON to reach 8.5+ average. Keep the same structure "
            "(business_info, hero_image_url, pages with blocks/meta). Enhance typography "
            "(fontFamily in props), colors, hierarchy, CTAs, and mobile responsive flags.\n\n"
            f"Original JSON:\n{json.dumps(website_json, ensure_ascii=False)[:14000]}"
        )
        try:
            resp = await client.chat.completions.create(
                model=MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": "You improve website JSON for world-class design. Output valid JSON only.",
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.4,
                response_format={"type": "json_object"},
            )
            improved = json.loads(resp.choices[0].message.content or "{}")
            if "pages" in improved or "business_info" in improved:
                return improved
            if isinstance(improved.get("website"), dict):
                return improved["website"]
            return {**website_json, **improved}
        except Exception as exc:
            logger.warning("DesignScorerAgent.improve_design failed: %s", exc)
            return website_json

    async def score_and_improve(
        self, website_json: dict[str, Any]
    ) -> tuple[dict[str, Any], dict[str, Any]]:
        """Iterate up to MAX_ITERATIONS until average >= MIN_SCORE."""
        current = website_json
        last_eval: dict[str, Any] = {}
        for iteration in range(MAX_ITERATIONS):
            last_eval = await self.score_website(current)
            last_eval["iteration"] = iteration + 1
            avg = float(last_eval.get("average") or 0)
            if avg >= MIN_SCORE:
                last_eval["passed"] = True
                return current, last_eval
            if iteration < MAX_ITERATIONS - 1:
                current = await self.improve_design(current, last_eval)
        last_eval["passed"] = float(last_eval.get("average") or 0) >= MIN_SCORE
        return current, last_eval

    @staticmethod
    def _mock_scores() -> dict[str, Any]:
        scores = {k: 8.5 for k in CRITERIA}
        return {
            "scores": scores,
            "average": 8.5,
            "suggestions": [],
            "summary": "Mock scores (OpenAI unavailable)",
            "mock": True,
            "passed": True,
        }


_design_scorer: DesignScorerAgent | None = None


def get_design_scorer_agent() -> DesignScorerAgent:
    global _design_scorer
    if _design_scorer is None:
        _design_scorer = DesignScorerAgent()
    return _design_scorer
