"""
Application settings loaded from environment variables.
"""

from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # ── Database ──────────────────────────────────────────────
    DATABASE_URL: str = "mysql+asyncmy://root:password@localhost:3306/tambuatips_com"

    # ── JWT ───────────────────────────────────────────────────
    JWT_SECRET_KEY: str = "change-me"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── API-Football ─────────────────────────────────────────
    API_FOOTBALL_KEYS: str = ""

    # ── Payments ─────────────────────────────────────────────
    PAYMENTS_LIVE: bool = False

    # M-Pesa
    MPESA_CONSUMER_KEY: str = ""
    MPESA_CONSUMER_SECRET: str = ""
    MPESA_SHORTCODE: str = ""
    MPESA_PASSKEY: str = ""
    MPESA_CALLBACK_URL: str = ""
    MPESA_ENV: str = "sandbox"

    # PayPal
    PAYPAL_CLIENT_ID: str = ""
    PAYPAL_CLIENT_SECRET: str = ""
    PAYPAL_MODE: str = "sandbox"

    # Skrill
    SKRILL_MERCHANT_ID: str = ""
    SKRILL_SECRET_WORD: str = ""
    SKRILL_RETURN_URL: str = ""
    SKRILL_CANCEL_URL: str = ""

    # Paystack
    PAYSTACK_SECRET_KEY: str = ""
    PAYSTACK_PUBLIC_KEY: str = ""

    # ── CORS ─────────────────────────────────────────────────
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    # ── Gemini AI ────────────────────────────────────────────
    GEMINI_API_KEY: str = ""

    @property
    def api_football_key_list(self) -> List[str]:
        return [k.strip() for k in self.API_FOOTBALL_KEYS.split(",") if k.strip()]

    @property
    def cors_origins(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
