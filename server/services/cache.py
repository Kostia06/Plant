import hashlib
import json
import logging
from datetime import datetime, timezone

from supabase import create_client

from config import SUPABASE_URL, SUPABASE_KEY
from models.schemas import AnalysisResult

logger = logging.getLogger(__name__)

_client = create_client(SUPABASE_URL, SUPABASE_KEY)


def _hash_url(url: str) -> str:
    return hashlib.sha256(url.encode()).hexdigest()


def get_cached(url: str) -> dict | None:
    url_hash = _hash_url(url)
    try:
        response = (
            _client.table("video_analyses")
            .select("*")
            .eq("url_hash", url_hash)
            .limit(1)
            .execute()
        )
        if response.data:
            row = response.data[0]
            return {
                "title": row.get("title", ""),
                "platform": row.get("platform", ""),
                "duration_seconds": row.get("duration_seconds"),
                "summary": row.get("summary", ""),
                "transcript": row.get("transcript", ""),
                "claims": row.get("claims", []),
                "perspectives": row.get("perspectives", {}),
                "bias_analysis": row.get("bias_analysis", {}),
                "points_awarded": row.get("points_awarded", 5),
            }
    except Exception as e:
        logger.warning("Cache read failed: %s", e)
    return None


def store_result(url: str, result: AnalysisResult) -> str:
    url_hash = _hash_url(url)
    try:
        data = {
            "url_hash": url_hash,
            "url": url,
            "platform": result.platform,
            "title": result.title,
            "duration_seconds": result.duration_seconds,
            "summary": result.summary,
            "transcript": result.transcript,
            "claims": json.loads(
                json.dumps([c.model_dump() for c in result.claims], default=str)
            ),
            "perspectives": result.perspectives.model_dump(),
            "bias_analysis": json.loads(
                json.dumps(result.bias_analysis.model_dump(), default=str)
            ),
            "points_awarded": result.points_awarded,
        }
        response = _client.table("video_analyses").upsert(data).execute()
        if response.data:
            return response.data[0]["id"]
    except Exception as e:
        logger.warning("Cache write failed: %s", e)
    return ""


def record_user_analysis(user_id: str, analysis_id: str, points: int) -> None:
    try:
        _client.table("user_analyses").insert({
            "user_id": user_id,
            "analysis_id": analysis_id,
            "points_earned": points,
        }).execute()

        existing = (
            _client.table("user_scores")
            .select("current_score,total_analyses")
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )

        now = datetime.now(timezone.utc).isoformat()

        if existing.data:
            row = existing.data[0]
            new_score = row["current_score"] + points
            new_total = row["total_analyses"] + 1
            _client.table("user_scores").update({
                "current_score": new_score,
                "total_analyses": new_total,
                "tree_state": _get_tree_state(new_score),
                "updated_at": now,
            }).eq("user_id", user_id).execute()
        else:
            _client.table("user_scores").insert({
                "user_id": user_id,
                "current_score": points,
                "total_analyses": 1,
                "tree_state": _get_tree_state(points),
                "updated_at": now,
            }).execute()
    except Exception as e:
        logger.warning("Record user analysis failed: %s", e)


def _get_tree_state(score: int) -> str:
    if score < 100:
        return "seedling"
    if score < 500:
        return "sapling"
    if score < 1000:
        return "healthy"
    return "blooming"
