import hashlib
import json
import logging

from supabase import create_client

from config import SUPABASE_URL, SUPABASE_KEY

logger = logging.getLogger(__name__)

TABLE = "video_analyses"

_client = create_client(SUPABASE_URL, SUPABASE_KEY)


def hash_url(url: str) -> str:
    return hashlib.sha256(url.encode()).hexdigest()


def get_cached(url: str) -> dict | None:
    url_hash = hash_url(url)
    try:
        response = (
            _client.table(TABLE)
            .select("results")
            .eq("url_hash", url_hash)
            .limit(1)
            .execute()
        )
        if response.data:
            return response.data[0]["results"]
    except Exception as e:
        logger.warning("Cache read failed: %s", e)
    return None


def store_result(url: str, results: dict) -> None:
    url_hash = hash_url(url)
    try:
        _client.table(TABLE).upsert({
            "url_hash": url_hash,
            "url": url,
            "results": json.loads(json.dumps(results, default=str)),
        }).execute()
    except Exception as e:
        logger.warning("Cache write failed: %s", e)
