"""add display_date to jackpots

Revision ID: 4e3d2b6a8c91
Revises: c4b7b9d2e1a8
Create Date: 2026-04-14 01:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4e3d2b6a8c91'
down_revision: Union[str, None] = 'c4b7b9d2e1a8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('jackpots', sa.Column('display_date', sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column('jackpots', 'display_date')
