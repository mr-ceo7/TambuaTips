"""add jackpot promo fields

Revision ID: a6f1d8c2b4e7
Revises: 4e3d2b6a8c91
Create Date: 2026-04-16 12:30:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "a6f1d8c2b4e7"
down_revision = "4e3d2b6a8c91"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("jackpots", sa.Column("promo_image_url", sa.String(length=500), nullable=True))
    op.add_column("jackpots", sa.Column("promo_title", sa.String(length=255), nullable=True))
    op.add_column("jackpots", sa.Column("promo_caption", sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column("jackpots", "promo_caption")
    op.drop_column("jackpots", "promo_title")
    op.drop_column("jackpots", "promo_image_url")
