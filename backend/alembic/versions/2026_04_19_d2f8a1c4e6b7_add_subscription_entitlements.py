"""add subscription entitlements

Revision ID: d2f8a1c4e6b7
Revises: c9e4f1a7d2b3
Create Date: 2026-04-19 17:45:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d2f8a1c4e6b7"
down_revision: Union[str, Sequence[str], None] = "c9e4f1a7d2b3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "subscription_entitlements",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("tier_id", sa.String(length=20), nullable=False),
        sa.Column("payment_id", sa.BigInteger(), nullable=True),
        sa.Column("source", sa.String(length=50), nullable=False, server_default="payment"),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["payment_id"], ["payments.id"]),
        sa.ForeignKeyConstraint(["tier_id"], ["subscription_tiers.tier_id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_subscription_entitlements_user_id"), "subscription_entitlements", ["user_id"], unique=False)
    op.create_index(op.f("ix_subscription_entitlements_tier_id"), "subscription_entitlements", ["tier_id"], unique=False)
    op.create_index(op.f("ix_subscription_entitlements_payment_id"), "subscription_entitlements", ["payment_id"], unique=False)
    op.create_index(op.f("ix_subscription_entitlements_expires_at"), "subscription_entitlements", ["expires_at"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_subscription_entitlements_expires_at"), table_name="subscription_entitlements")
    op.drop_index(op.f("ix_subscription_entitlements_payment_id"), table_name="subscription_entitlements")
    op.drop_index(op.f("ix_subscription_entitlements_tier_id"), table_name="subscription_entitlements")
    op.drop_index(op.f("ix_subscription_entitlements_user_id"), table_name="subscription_entitlements")
    op.drop_table("subscription_entitlements")
