"""add weather_api_key to stores

Revision ID: a1b2c3d4e5f6
Revises:
Create Date: 2026-06-30

"""
from alembic import op
import sqlalchemy as sa

revision = 'a1b2c3d4e5f6'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('stores', sa.Column('weather_api_key', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('stores', 'weather_api_key')
