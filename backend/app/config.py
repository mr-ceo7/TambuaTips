"""
Application settings loaded from environment variables.
"""

from pydantic_settings import BaseSettings
from typing import List
from pydantic import field_validator


class Settings(BaseSettings):
    # ── Database ──────────────────────────────────────────────
    DATABASE_URL: str = "mysql+asyncmy://root:password@localhost:3306/tambuatips_com"
    DEBUG: bool = True  # Set to False in production

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
    MPESA_CALLBACK_SECRET: str = ""
    MPESA_ENV: str = "sandbox"
    LEGACY_MPESA_DATABASE_URL: str = ""
    LEGACY_MPESA_BIZ_NO: str = "804633"
    LEGACY_MPESA_SYNC_BATCH_SIZE: int = 200

    # M-Pesa B2C (Affiliate Payouts)
    MPESA_B2C_CONSUMER_KEY: str = ""
    MPESA_B2C_CONSUMER_SECRET: str = ""
    MPESA_B2C_SHORTCODE: str = ""
    MPESA_B2C_INITIATOR_NAME: str = ""
    MPESA_B2C_SECURITY_CREDENTIAL: str = ""
    MPESA_B2C_CALLBACK_URL: str = ""
    MPESA_B2C_TIMEOUT_URL: str = ""

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
    ALLOWED_ORIGINS: str = "http://localhost:8000,http://localhost:3000,http://localhost:5173,http://affiliate.tambualocal.com:5173,http://affiliate.tambualocal.com:3000,http://affiliate.localhost:3000,http://affiliate.localhost:5173,https://www.tambuatips.com,https://tambua-tips-preview.vercel.app,https://affiliate.tambuatips.com"

    # ── Gemini AI ────────────────────────────────────────────
    GEMINI_API_KEY: str = ""

    # ── Web Push ─────────────────────────────────────────────
    VAPID_PUBLIC_KEY: str = ""
    VAPID_PRIVATE_KEY: str = ""
    VAPID_SUBJECT: str = ""

    # ── Auth ─────────────────────────────────────────────────
    GOOGLE_CLIENT_ID: str = ""

    # ── Frontend URL (for payment redirects) ─────────────────
    FRONTEND_URL: str = "http://localhost:5173"

    # ── Backend URL (for callbacks/captures) ──────────────────
    BACKEND_URL: str = "http://localhost:8000"

    # ── SMTP (Email Server) ──────────────────────────────────
    SMTP_SERVER: str = "smtp.gmail.com"
    SMTP_PORT: int = 465
    SMTP_USERNAME: str = "tambuatips@gmail.com"
    SMTP_PASSWORD: str = ""
    FROM_EMAIL: str = "tambuatips@gmail.com"

    @field_validator("DEBUG", mode="before")
    @classmethod
    def normalize_debug(cls, value):
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"1", "true", "yes", "on", "debug"}:
                return True
            if normalized in {"0", "false", "no", "off", "release", "prod", "production"}:
                return False
        return value

    @property
    def api_football_key_list(self) -> List[str]:
        return [k.strip() for k in self.API_FOOTBALL_KEYS.split(",") if k.strip()]

    @property
    def cors_origins(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
