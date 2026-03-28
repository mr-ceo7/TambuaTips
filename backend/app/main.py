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
from app.models import user, tip, jackpot, subscription, payment  # noqa: F401

# Import routers
from app.routers import auth, tips, jackpots, payments, subscriptions, sports, news, admin


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    # Startup: Create tables if they don't exist (dev convenience)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
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
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error"},
    )


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "tambuatips-api"}
