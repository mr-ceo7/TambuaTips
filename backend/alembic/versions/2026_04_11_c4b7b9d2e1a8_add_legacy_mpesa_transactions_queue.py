"""add legacy mpesa transactions queue

Revision ID: c4b7b9d2e1a8
Revises: 9f3c1f6a2b7d
Create Date: 2026-04-11 15:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c4b7b9d2e1a8'
down_revision: Union[str, None] = '9f3c1f6a2b7d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'legacy_mpesa_transactions',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('source_record_id', sa.BigInteger(), nullable=False),
        sa.Column('biz_no', sa.String(length=50), nullable=True),
        sa.Column('phone', sa.String(length=20), nullable=False),
        sa.Column('first_name', sa.String(length=255), nullable=True),
        sa.Column('other_name', sa.String(length=255), nullable=True),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('paid_at', sa.DateTime(), nullable=False),
        sa.Column('raw_payload', sa.Text(), nullable=True),
        sa.Column('user_id', sa.BigInteger(), nullable=True),
        sa.Column('payment_id', sa.BigInteger(), nullable=True),
        sa.Column('onboarding_status', sa.String(length=30), nullable=False, server_default='pending_assignment'),
        sa.Column('assigned_tier', sa.String(length=50), nullable=True),
        sa.Column('assigned_duration_days', sa.BigInteger(), nullable=True),
        sa.Column('assigned_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['payment_id'], ['payments.id']),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('source_record_id', name='uq_legacy_mpesa_transactions_source_record_id'),
    )
    op.create_index('ix_legacy_mpesa_transactions_paid_at', 'legacy_mpesa_transactions', ['paid_at'], unique=False)
    op.create_index('ix_legacy_mpesa_transactions_payment_id', 'legacy_mpesa_transactions', ['payment_id'], unique=False)
    op.create_index('ix_legacy_mpesa_transactions_phone', 'legacy_mpesa_transactions', ['phone'], unique=False)
    op.create_index('ix_legacy_mpesa_transactions_source_record_id', 'legacy_mpesa_transactions', ['source_record_id'], unique=False)
    op.create_index('ix_legacy_mpesa_transactions_status_paid_at', 'legacy_mpesa_transactions', ['onboarding_status', 'paid_at'], unique=False)
    op.create_index('ix_legacy_mpesa_transactions_user_id', 'legacy_mpesa_transactions', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_legacy_mpesa_transactions_user_id', table_name='legacy_mpesa_transactions')
    op.drop_index('ix_legacy_mpesa_transactions_status_paid_at', table_name='legacy_mpesa_transactions')
    op.drop_index('ix_legacy_mpesa_transactions_source_record_id', table_name='legacy_mpesa_transactions')
    op.drop_index('ix_legacy_mpesa_transactions_phone', table_name='legacy_mpesa_transactions')
    op.drop_index('ix_legacy_mpesa_transactions_payment_id', table_name='legacy_mpesa_transactions')
    op.drop_index('ix_legacy_mpesa_transactions_paid_at', table_name='legacy_mpesa_transactions')
    op.drop_table('legacy_mpesa_transactions')
