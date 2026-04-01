from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.dependencies import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.notification import MatchSubscription
from pydantic import BaseModel

router = APIRouter(
    prefix="/api/notifications",
    tags=["notifications"]
)

class ToggleMatchSubscriptionRequest(BaseModel):
    home_team: str | None = None
    away_team: str | None = None

@router.post("/match/{match_id}/toggle")
async def toggle_match_subscription(
    match_id: int,
    request: ToggleMatchSubscriptionRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Toggle a match subscription for the current user.
    If it exists, delete it. If it doesn't exist, create it.
    """
    # Check if subscription already exists
    query = select(MatchSubscription).where(
        MatchSubscription.user_id == user.id,
        MatchSubscription.match_id == match_id
    )
    result = await db.execute(query)
    existing_sub = result.scalar_one_or_none()

    if existing_sub:
        await db.delete(existing_sub)
        await db.commit()
        return {"status": "unsubscribed", "match_id": match_id}
    else:
        new_sub = MatchSubscription(
            user_id=user.id,
            match_id=match_id,
            home_team=request.home_team,
            away_team=request.away_team,
            last_status_notified="upcoming"  # By default, assume it's upcoming
        )
        db.add(new_sub)
        await db.commit()
        return {"status": "subscribed", "match_id": match_id}

