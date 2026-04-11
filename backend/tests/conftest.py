from contextlib import asynccontextmanager
import importlib
import sys
import types
from unittest.mock import patch

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy import event
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.dependencies import get_db

# Import all models so Base.metadata is fully populated, including FK targets.
import app.models  # noqa: F401
from app.models import pricing  # noqa: F401
from app.models.pricing import PricingRegion
from app.models.subscription import SubscriptionTier


def _install_google_stubs() -> None:
    if "google.oauth2.id_token" in sys.modules and "google.auth.transport.requests" in sys.modules:
        return

    google_module = sys.modules.setdefault("google", types.ModuleType("google"))

    oauth2_module = sys.modules.setdefault("google.oauth2", types.ModuleType("google.oauth2"))
    id_token_module = sys.modules.setdefault("google.oauth2.id_token", types.ModuleType("google.oauth2.id_token"))

    auth_module = sys.modules.setdefault("google.auth", types.ModuleType("google.auth"))
    transport_module = sys.modules.setdefault("google.auth.transport", types.ModuleType("google.auth.transport"))
    requests_module = sys.modules.setdefault(
        "google.auth.transport.requests",
        types.ModuleType("google.auth.transport.requests"),
    )

    def verify_oauth2_token(*args, **kwargs):
        raise RuntimeError("google oauth stub called without test patch")

    class Request:
        pass

    id_token_module.verify_oauth2_token = verify_oauth2_token
    requests_module.Request = Request

    google_module.oauth2 = oauth2_module
    google_module.auth = auth_module
    oauth2_module.id_token = id_token_module
    auth_module.transport = transport_module
    transport_module.requests = requests_module


_install_google_stubs()


class AsyncSessionAdapter:
    """Small async-compatible wrapper around a synchronous SQLAlchemy session."""

    def __init__(self, session: Session):
        self._session = session

    def __getattr__(self, name):
        return getattr(self._session, name)

    async def execute(self, *args, **kwargs):
        return self._session.execute(*args, **kwargs)

    async def commit(self):
        self._session.commit()

    async def rollback(self):
        self._session.rollback()

    async def refresh(self, instance, *args, **kwargs):
        self._session.refresh(instance, *args, **kwargs)

    async def flush(self, *args, **kwargs):
        self._session.flush(*args, **kwargs)

    async def delete(self, instance):
        self._session.delete(instance)

    async def get(self, *args, **kwargs):
        return self._session.get(*args, **kwargs)

    async def scalar(self, *args, **kwargs):
        return self._session.scalar(*args, **kwargs)

    async def scalars(self, *args, **kwargs):
        return self._session.scalars(*args, **kwargs)

    async def close(self):
        self._session.close()

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        if exc_type is not None:
            self._session.rollback()
        self._session.close()


ID_COUNTERS: dict[str, int] = {}


class TestingSyncSession(Session):
    pass


@event.listens_for(TestingSyncSession, "before_flush")
def assign_sqlite_bigint_ids(session, flush_context, instances):
    for obj in session.new:
        table = getattr(obj, "__table__", None)
        if table is None or "id" not in table.c:
            continue
        if getattr(obj, "id", None) is not None:
            continue

        table_name = table.name
        next_id = ID_COUNTERS.get(table_name, 0) + 1
        ID_COUNTERS[table_name] = next_id
        setattr(obj, "id", next_id)


SYNC_ENGINE = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
SyncSessionLocal = sessionmaker(
    bind=SYNC_ENGINE,
    class_=TestingSyncSession,
    expire_on_commit=False,
)


@pytest.fixture()
async def db_session():
    Base.metadata.drop_all(bind=SYNC_ENGINE)
    Base.metadata.create_all(bind=SYNC_ENGINE)
    ID_COUNTERS.clear()

    sync_session = SyncSessionLocal()
    adapter = AsyncSessionAdapter(sync_session)

    sync_session.add_all([
        PricingRegion(
            region_code="local",
            name="Kenya",
            currency="KES",
            currency_symbol="KES",
            countries=["KE"],
            is_default=False,
        ),
        PricingRegion(
            region_code="international",
            name="International",
            currency="USD",
            currency_symbol="$",
            countries=[],
            is_default=True,
        ),
        SubscriptionTier(tier_id="free", name="Free", price_2wk=0, price_4wk=0, categories=["free"]),
        SubscriptionTier(tier_id="basic", name="Basic", price_2wk=500, price_4wk=800, categories=["free", "4+"]),
        SubscriptionTier(tier_id="standard", name="Standard", price_2wk=1250, price_4wk=2000, categories=["free", "2+", "4+", "gg"]),
        SubscriptionTier(tier_id="premium", name="Premium", price_2wk=1000, price_4wk=1500, categories=["free", "2+", "4+", "gg", "10+", "vip"]),
    ])
    sync_session.commit()

    try:
        yield adapter
    finally:
        sync_session.close()


@pytest.fixture()
async def client(db_session):
    from app.main import app
    import app.database as database_module
    import app.dependencies as dependencies_module

    async def override_get_db():
        yield db_session

    class TestingSessionFactory:
        def __call__(self):
            return AsyncSessionAdapter(SyncSessionLocal())

    original_lifespan = app.router.lifespan_context
    patched_modules = {
        "app.database": database_module,
        "app.dependencies": dependencies_module,
    }
    for module_name in [
        "app.routers.auth",
        "app.routers.campaigns",
        "app.routers.internal",
        "app.routers.affiliates",
        "app.routers.seo",
        "app.services.email_service",
        "app.services.alert_service",
        "app.services.match_poller",
        "app.services.sms_tip_delivery",
    ]:
        try:
            patched_modules[module_name] = importlib.import_module(module_name)
        except Exception:
            continue

    original_session_locals = {
        name: getattr(module, "AsyncSessionLocal")
        for name, module in patched_modules.items()
        if hasattr(module, "AsyncSessionLocal")
    }

    app.dependency_overrides[get_db] = override_get_db

    testing_session_factory = TestingSessionFactory()
    for module in patched_modules.values():
        if hasattr(module, "AsyncSessionLocal"):
            module.AsyncSessionLocal = testing_session_factory

    @asynccontextmanager
    async def test_lifespan(_app):
        yield

    app.router.lifespan_context = test_lifespan

    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac
    finally:
        app.router.lifespan_context = original_lifespan
        app.dependency_overrides.clear()
        for module_name, original_session_local in original_session_locals.items():
            patched_modules[module_name].AsyncSessionLocal = original_session_local


@pytest.fixture(autouse=True)
def mock_external_services():
    with patch("app.routers.auth.send_welcome_email"), \
         patch("app.routers.payments.send_payment_receipt_email"), \
         patch("app.routers.auth.fetch_user_country"):
        yield
