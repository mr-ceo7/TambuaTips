"""add sms tip delivery support

Revision ID: 9f3c1f6a2b7d
Revises: bbee0fe62dcd
Create Date: 2026-04-11 13:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9f3c1f6a2b7d'
down_revision: Union[str, None] = 'bbee0fe62dcd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('sms_tips_enabled', sa.Boolean(), nullable=False, server_default='0'))

    op.create_table(
        'sms_tip_queue',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.BigInteger(), nullable=False),
        sa.Column('tip_id', sa.BigInteger(), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='pending'),
        sa.Column('dispatch_scheduled_for', sa.DateTime(), nullable=False),
        sa.Column('sent_at', sa.DateTime(), nullable=True),
        sa.Column('error', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['tip_id'], ['tips.id']),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'tip_id', name='uq_sms_tip_queue_user_tip'),
    )
    op.create_index('ix_sms_tip_queue_dispatch_scheduled_for', 'sms_tip_queue', ['dispatch_scheduled_for'], unique=False)
    op.create_index('ix_sms_tip_queue_tip_id', 'sms_tip_queue', ['tip_id'], unique=False)
    op.create_index('ix_sms_tip_queue_user_id', 'sms_tip_queue', ['user_id'], unique=False)
    op.create_index('ix_sms_tip_queue_user_status_dispatch', 'sms_tip_queue', ['user_id', 'status', 'dispatch_scheduled_for'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_sms_tip_queue_user_status_dispatch', table_name='sms_tip_queue')
    op.drop_index('ix_sms_tip_queue_user_id', table_name='sms_tip_queue')
    op.drop_index('ix_sms_tip_queue_tip_id', table_name='sms_tip_queue')
    op.drop_index('ix_sms_tip_queue_dispatch_scheduled_for', table_name='sms_tip_queue')
    op.drop_table('sms_tip_queue')

    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('sms_tips_enabled')
