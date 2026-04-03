import pytest
import asyncio
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base
from app.dependencies import get_db

# Import models so Base.metadata is populated
from app.models import user, tip, jackpot, subscription, payment

SQLALCHEMY_DATABASE_URL = "sqlite+aiosqlite:///file:testdb?mode=memory&cache=shared&uri=true"

engine = create_async_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)


TestingSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)



@pytest.fixture()
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    
    async with TestingSessionLocal() as session:
        # Populate tiers
        tiers = [
            subscription.SubscriptionTier(tier_id="free", name="Free", price_2wk=0, price_4wk=0, categories=["free"]),
            subscription.SubscriptionTier(tier_id="basic", name="Basic", price_2wk=500, price_4wk=800, categories=["free", "4+"]),
            subscription.SubscriptionTier(tier_id="premium", name="Premium", price_2wk=1000, price_4wk=1500, categories=["free", "2+", "4+", "gg", "10+", "vip"]),
        ]
        session.add_all(tiers)
        await session.commit()
        yield session

@pytest.fixture()
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    async def override_get_db():
        async with TestingSessionLocal() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    
    app.dependency_overrides.clear()

from unittest.mock import patch

@pytest.fixture(autouse=True)
def mock_external_services():
    with patch("app.routers.auth.send_welcome_email"), \
         patch("app.routers.payments.send_payment_receipt_email"), \
         patch("app.routers.auth.fetch_user_country"):
        yield
