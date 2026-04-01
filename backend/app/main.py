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
from app.models import user, tip, jackpot, subscription, payment, ad  # noqa: F401

# Import routers
from app.routers import auth, tips, jackpots, payments, subscriptions, sports, news, admin


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

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    # Startup: Create tables if they don't exist (dev convenience)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    await seed_default_ads()
    
    yield
    # Shutdown: dispose connection pool
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


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "tambuatips-api"}
