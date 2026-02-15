import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from supabase import create_client

from config import SUPABASE_URL, SUPABASE_KEY

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["social"])


def _get_client(authorization: str):
    """Create a Supabase client authenticated with the user's JWT."""
    token = authorization.replace("Bearer ", "")
    client = create_client(SUPABASE_URL, SUPABASE_KEY)
    client.auth.set_session(token, token)          # sets the access token
    client.postgrest.auth(token)                   # auth for DB calls
    return client, token


# ── Request / Response Models ─────────────────────────────────

class FriendRequest(BaseModel):
    friend_id: str


class FriendResponse(BaseModel):
    friendship_id: str
    accept: bool


class ProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    is_activity_public: Optional[bool] = None


# ── Friend Routes ─────────────────────────────────────────────

@router.post("/friends/request")
async def send_friend_request(
    body: FriendRequest,
    authorization: str = Header(...),
):
    client, _ = _get_client(authorization)
    user = client.auth.get_user()
    uid = user.user.id

    if uid == body.friend_id:
        raise HTTPException(400, "Cannot friend yourself")

    # Check if friendship already exists in either direction
    existing = (
        client.table("friendships")
        .select("*")
        .or_(
            f"and(user_id.eq.{uid},friend_id.eq.{body.friend_id}),"
            f"and(user_id.eq.{body.friend_id},friend_id.eq.{uid})"
        )
        .execute()
    )
    if existing.data:
        raise HTTPException(400, "Friendship already exists")

    result = (
        client.table("friendships")
        .insert({"user_id": uid, "friend_id": body.friend_id, "status": "pending"})
        .execute()
    )
    return {"ok": True, "friendship": result.data[0]}


@router.post("/friends/respond")
async def respond_to_request(
    body: FriendResponse,
    authorization: str = Header(...),
):
    client, _ = _get_client(authorization)
    new_status = "accepted" if body.accept else "declined"
    result = (
        client.table("friendships")
        .update({"status": new_status})
        .eq("id", body.friendship_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(404, "Friendship not found or not authorized")
    return {"ok": True, "friendship": result.data[0]}


@router.get("/friends")
async def list_friends(authorization: str = Header(...)):
    client, _ = _get_client(authorization)
    user = client.auth.get_user()
    uid = user.user.id

    rows = (
        client.table("friendships")
        .select("*, profiles!friendships_friend_id_fkey(*), user_scores!inner(*)")
        .or_(f"user_id.eq.{uid},friend_id.eq.{uid}")
        .eq("status", "accepted")
        .execute()
    )

    friends = []
    for row in rows.data:
        other_id = row["friend_id"] if row["user_id"] == uid else row["user_id"]
        profile = (
            client.table("profiles").select("*").eq("id", other_id).single().execute()
        )
        score = (
            client.table("user_scores").select("*").eq("user_id", other_id).single().execute()
        )
        friends.append({
            "id": other_id,
            "profile": profile.data,
            "score": score.data,
            "friendship_id": row["id"],
        })
    return {"friends": friends}


@router.get("/friends/pending")
async def list_pending(authorization: str = Header(...)):
    client, _ = _get_client(authorization)
    user = client.auth.get_user()
    uid = user.user.id

    incoming = (
        client.table("friendships")
        .select("*, profiles!friendships_user_id_fkey(*)")
        .eq("friend_id", uid)
        .eq("status", "pending")
        .execute()
    )
    return {"pending": incoming.data}


# ── Leaderboard ───────────────────────────────────────────────

@router.get("/leaderboard")
async def leaderboard(authorization: str = Header(...)):
    client, _ = _get_client(authorization)
    user = client.auth.get_user()
    uid = user.user.id

    # Get accepted friend IDs
    friendships = (
        client.table("friendships")
        .select("user_id, friend_id")
        .or_(f"user_id.eq.{uid},friend_id.eq.{uid}")
        .eq("status", "accepted")
        .execute()
    )

    friend_ids = set()
    for f in friendships.data:
        friend_ids.add(f["friend_id"] if f["user_id"] == uid else f["user_id"])
    friend_ids.add(uid)  # include self

    # Fetch scores + profiles for all
    entries = []
    for fid in friend_ids:
        score = client.table("user_scores").select("*").eq("user_id", fid).single().execute()
        profile = client.table("profiles").select("*").eq("id", fid).single().execute()
        if score.data and profile.data:
            entries.append({
                "user_id": fid,
                "display_name": profile.data.get("display_name", "Anon"),
                "avatar_url": profile.data.get("avatar_url"),
                "current_score": score.data.get("current_score", 0),
                "tree_state": score.data.get("tree_state", "seedling"),
                "streak_days": score.data.get("streak_days", 0),
                "is_you": fid == uid,
            })

    entries.sort(key=lambda e: e["current_score"], reverse=True)

    # Assign ranks
    for i, entry in enumerate(entries):
        entry["rank"] = i + 1

    return {"leaderboard": entries}


# ── Activity Feed & Heatmap Data ──────────────────────────────

@router.get("/activity/{user_id}")
async def get_activity(user_id: str, authorization: str = Header(...)):
    client, _ = _get_client(authorization)

    activity = (
        client.table("activity_log")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(100)
        .execute()
    )
    return {"activity": activity.data}


@router.get("/activity/{user_id}/heatmap")
async def get_heatmap(user_id: str, authorization: str = Header(...)):
    """Returns daily point totals for the last 365 days."""
    client, _ = _get_client(authorization)

    activity = (
        client.table("activity_log")
        .select("points, created_at")
        .eq("user_id", user_id)
        .gte("created_at", "now() - interval '365 days'")
        .order("created_at", desc=False)
        .execute()
    )

    # Aggregate by date
    daily: dict[str, int] = {}
    for row in activity.data:
        date_str = row["created_at"][:10]  # YYYY-MM-DD
        daily[date_str] = daily.get(date_str, 0) + row["points"]

    return {"heatmap": daily}


# ── Profile ───────────────────────────────────────────────────

@router.get("/profile/{user_id}")
async def get_profile(user_id: str, authorization: str = Header(...)):
    client, _ = _get_client(authorization)
    profile = client.table("profiles").select("*").eq("id", user_id).single().execute()
    score = client.table("user_scores").select("*").eq("user_id", user_id).single().execute()
    return {"profile": profile.data, "score": score.data}


@router.put("/profile")
async def update_profile(body: ProfileUpdate, authorization: str = Header(...)):
    client, _ = _get_client(authorization)
    user = client.auth.get_user()
    uid = user.user.id

    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(400, "No fields to update")

    result = client.table("profiles").update(updates).eq("id", uid).execute()
    return {"ok": True, "profile": result.data[0] if result.data else None}
