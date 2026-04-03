"""
TambuaTips FastAPI backend — main application entry point.
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import engine, Base

logger = logging.getLogger(__name__)

# Import all models so SQLAlchemy registers them
from app.models import user, tip, jackpot, subscription, payment, ad, notification  # noqa: F401

# Import routers
from app.routers import auth, tips, jackpots, payments, subscriptions, sports, news, admin, notifications


async def seed_default_ads():
    from sqlalchemy import select
    from app.database import AsyncSessionLocal
    from app.models.ad import AdPost
    
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(AdPost).limit(1))
        if result.scalar_one_or_none() is not None:
            return  # Already seeded or has data

        ads_data = [
            {
                "title": "TAMBUA TIPS - KEEP YOUR TIPS UP",
                "image_url": "/brand-ad.jpeg",
                "link_url": "/tips",
                "category": "Promo",
                "is_active": True,
            },
            {
                "title": "🎁 Invite Friends & Get Free Daily Tips! Share your referral link and unlock exclusive predictions.",
                "image_url": "https://images.unsplash.com/photo-1577223625816-7546f13df25d?q=80&w=800&auto=format&fit=crop",
                "link_url": "/tips",
                "category": "Promo",
                "is_active": True,
            },
            {
                "title": "🏆 Go Premium — Get Exclusive Expert Tips with 75%+ Win Rate. Join the winning team today!",
                "image_url": "https://images.unsplash.com/photo-1560272564-c83b66b1ad12?q=80&w=800&auto=format&fit=crop",
                "link_url": "/tips",
                "category": "Promo",
                "is_active": True,
            },
            {
                "title": "🔔 Never Miss a Winning Tip! Subscribe for daily free picks and premium alerts delivered straight to you.",
                "image_url": "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?q=80&w=800&auto=format&fit=crop",
                "link_url": "/tips",
                "category": "Promo",
                "is_active": True,
            }
        ]
        for val in ads_data:
            session.add(AdPost(**val))
        await session.commit()

import asyncio
from app.services.match_poller import poll_live_matches

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    # Startup: Create tables if they don't exist (dev convenience)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    await seed_default_ads()
    
    # Start the background match poller task
    poller_task = asyncio.create_task(poll_live_matches())
    
    yield
    
    # Shutdown: dispose connection pool
    poller_task.cancel()
    await engine.dispose()


app = FastAPI(
    title="TambuaTips API",
    description="Sports betting tips platform API",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register routers ────────────────────────────────────────
app.include_router(auth.router)
app.include_router(tips.router)
app.include_router(jackpots.router)
app.include_router(payments.router)
app.include_router(subscriptions.router)
app.include_router(sports.router)
app.include_router(news.router)
app.include_router(admin.router)
app.include_router(notifications.router)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.method} {request.url}: {exc}", exc_info=True)
    origin = request.headers.get("origin", "")
    headers = {}
    if origin in settings.cors_origins:
        headers["access-control-allow-origin"] = origin
        headers["access-control-allow-credentials"] = "true"
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error"},
        headers=headers,
    )


@app.api_route("/api/health", methods=["GET", "HEAD"])
async def health():
    return {"status": "ok", "service": "tambuatips-api"}


@app.post("/api/bootstrap-admin")
async def bootstrap_admin(request: Request):
    """One-time endpoint to promote the first admin. Only works when zero admins exist."""
    from sqlalchemy import select, func
    from app.database import AsyncSessionLocal
    from app.models.user import User

    body = await request.json()
    email = body.get("email", "").lower().strip()
    secret = body.get("secret", "")

    # Require a bootstrap secret to prevent random access
    import os
    bootstrap_secret = os.getenv("BOOTSTRAP_SECRET", "tambuatips-first-admin-2026")
    if secret != bootstrap_secret:
        raise HTTPException(status_code=403, detail="Invalid bootstrap secret")

    async with AsyncSessionLocal() as session:
        # Check if any admin already exists
        admin_count = await session.execute(select(func.count(User.id)).where(User.is_admin == True))
        if admin_count.scalar() > 0:
            raise HTTPException(status_code=409, detail="Admin already exists. Use /api/admin/users/{id}/make-admin instead.")

        # Find user by email
        result = await session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail=f"No user found with email: {email}")

        user.is_admin = True
        session.add(user)
        await session.commit()

    return {"status": "success", "message": f"{email} is now the first admin!"}
