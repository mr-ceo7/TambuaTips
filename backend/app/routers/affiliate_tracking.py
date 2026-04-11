"""
Affiliate tracking routes — called by the main site when a visitor
arrives via an affiliate link (?aff=CODE).
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.dependencies import get_db
from app.models.affiliate import Affiliate, AffiliateClick
from app.schemas.affiliate import ClickTrackRequest

router = APIRouter(prefix="/api/affiliate/track", tags=["Affiliate Tracking"])


@router.post("/click")
async def track_click(
    body: ClickTrackRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Record a click when someone visits the site via an affiliate link.
    Called from AffiliateCatcher on the frontend.
    """
    # Find the affiliate by referral code
    result = await db.execute(
        select(Affiliate).where(Affiliate.referral_code == body.code)
    )
    affiliate = result.scalar_one_or_none()

    if not affiliate:
        raise HTTPException(status_code=404, detail="Invalid affiliate code")

    if affiliate.status != "approved":
        raise HTTPException(status_code=403, detail="Affiliate is not active")

    # Get visitor IP
    x_forwarded = request.headers.get("x-forwarded-for")
    ip_address = x_forwarded.split(",")[0].strip() if x_forwarded else (
        request.headers.get("x-real-ip") or
        (request.client.host if request.client else None)
    )

    # Record the click
    click = AffiliateClick(
        affiliate_id=affiliate.id,
        ip_address=ip_address,
        user_agent=request.headers.get("user-agent", "")[:500],
        referrer_url=body.referrer_url[:1000] if body.referrer_url else None,
    )
    db.add(click)

    # Increment cached counter
    affiliate.total_clicks = (affiliate.total_clicks or 0) + 1
    db.add(affiliate)

    await db.commit()

    return {"status": "ok"}


@router.get("/validate/{code}")
async def validate_code(code: str, db: AsyncSession = Depends(get_db)):
    """
    Verify that an affiliate code is valid and the affiliate is active.
    Called by the frontend before caching the code in localStorage.
    """
    result = await db.execute(
        select(Affiliate.id, Affiliate.name, Affiliate.status)
        .where(Affiliate.referral_code == code)
    )
    row = result.one_or_none()

    if not row:
        return {"valid": False}

    return {
        "valid": row.status == "approved",
        "affiliate_name": row.name if row.status == "approved" else None,
    }
