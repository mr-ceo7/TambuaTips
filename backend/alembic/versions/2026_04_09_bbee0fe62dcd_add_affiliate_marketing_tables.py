"""add affiliate marketing tables

Revision ID: bbee0fe62dcd
Revises: ef8f6e149d94
Create Date: 2026-04-09 20:24:42.509273

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bbee0fe62dcd'
down_revision: Union[str, None] = 'ef8f6e149d94'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- Affiliates table ---
    op.create_table(
        'affiliates',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('phone', sa.String(20), nullable=False),
        sa.Column('referral_code', sa.String(30), nullable=False),
        sa.Column('status', sa.String(20), nullable=False, server_default='pending'),
        sa.Column('affiliate_admin_id', sa.BigInteger(), sa.ForeignKey('affiliates.id'), nullable=True),
        sa.Column('is_affiliate_admin', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('total_clicks', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_signups', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_revenue', sa.Float(), nullable=False, server_default='0'),
        sa.Column('commission_earned', sa.Float(), nullable=False, server_default='0'),
        sa.Column('commission_paid', sa.Float(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_affiliates_email', 'affiliates', ['email'], unique=True)
    op.create_index('ix_affiliates_referral_code', 'affiliates', ['referral_code'], unique=True)

    # --- Affiliate Clicks ---
    op.create_table(
        'affiliate_clicks',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('affiliate_id', sa.BigInteger(), sa.ForeignKey('affiliates.id'), nullable=False),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('referrer_url', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_aff_clicks_affiliate', 'affiliate_clicks', ['affiliate_id'])

    # --- Affiliate Conversions ---
    op.create_table(
        'affiliate_conversions',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('affiliate_id', sa.BigInteger(), sa.ForeignKey('affiliates.id'), nullable=False),
        sa.Column('user_id', sa.BigInteger(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('conversion_type', sa.String(20), nullable=False),
        sa.Column('payment_id', sa.BigInteger(), sa.ForeignKey('payments.id'), nullable=True),
        sa.Column('amount', sa.Float(), nullable=False, server_default='0'),
        sa.Column('commission_amount', sa.Float(), nullable=False, server_default='0'),
        sa.Column('affiliate_admin_commission', sa.Float(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_aff_conv_affiliate', 'affiliate_conversions', ['affiliate_id'])
    op.create_index('ix_aff_conv_user', 'affiliate_conversions', ['user_id'])

    # --- Affiliate Payouts ---
    op.create_table(
        'affiliate_payouts',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('affiliate_id', sa.BigInteger(), sa.ForeignKey('affiliates.id'), nullable=False),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('method', sa.String(20), nullable=False, server_default='mpesa_b2c'),
        sa.Column('phone', sa.String(20), nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='pending'),
        sa.Column('transaction_id', sa.String(255), nullable=True),
        sa.Column('period_start', sa.DateTime(), nullable=True),
        sa.Column('period_end', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_aff_payouts_affiliate', 'affiliate_payouts', ['affiliate_id'])

    # --- Affiliate Commission Configs ---
    op.create_table(
        'affiliate_commission_configs',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('item_type', sa.String(20), nullable=False),
        sa.Column('tier_id', sa.String(30), nullable=True),
        sa.Column('duration', sa.String(10), nullable=True),
        sa.Column('commission_percent', sa.Float(), nullable=False, server_default='10'),
        sa.Column('affiliate_admin_commission_percent', sa.Float(), nullable=False, server_default='20'),
        sa.Column('earn_on_renewal', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_aff_comm_unique', 'affiliate_commission_configs',
                     ['item_type', 'tier_id', 'duration'], unique=True)

    # --- Add affiliate_id to users ---
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('affiliate_id', sa.BigInteger(), nullable=True))
        batch_op.create_foreign_key('fk_users_affiliate_id', 'affiliates', ['affiliate_id'], ['id'])


def downgrade() -> None:
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_constraint('fk_users_affiliate_id', type_='foreignkey')
        batch_op.drop_column('affiliate_id')

    op.drop_table('affiliate_commission_configs')
    op.drop_table('affiliate_payouts')
    op.drop_table('affiliate_conversions')
    op.drop_table('affiliate_clicks')
    op.drop_table('affiliates')
