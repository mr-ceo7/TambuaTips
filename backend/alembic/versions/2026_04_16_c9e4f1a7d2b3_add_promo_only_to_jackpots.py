"""add promo_only to jackpots

Revision ID: c9e4f1a7d2b3
Revises: a6f1d8c2b4e7
Create Date: 2026-04-16 20:55:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "c9e4f1a7d2b3"
down_revision = "a6f1d8c2b4e7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("jackpots", sa.Column("promo_only", sa.Boolean(), nullable=False, server_default="0"))


def downgrade() -> None:
    op.drop_column("jackpots", "promo_only")
