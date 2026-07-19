"""add invite_code to stores

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-07-19

"""
import secrets
from alembic import op
import sqlalchemy as sa

revision = 'b2c3d4e5f6a7'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None

ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"


def _code() -> str:
    return "".join(secrets.choice(ALPHABET) for _ in range(8))


def upgrade() -> None:
    op.add_column('stores', sa.Column('invite_code', sa.String(length=12), nullable=True))
    op.create_index('ix_stores_invite_code', 'stores', ['invite_code'], unique=True)

    # 既存店舗にも招待コードを発行する
    conn = op.get_bind()
    store_ids = [row[0] for row in conn.execute(sa.text("SELECT id FROM stores"))]
    used = set()
    for store_id in store_ids:
        code = _code()
        while code in used:
            code = _code()
        used.add(code)
        conn.execute(
            sa.text("UPDATE stores SET invite_code = :code WHERE id = :id"),
            {"code": code, "id": store_id},
        )


def downgrade() -> None:
    op.drop_index('ix_stores_invite_code', table_name='stores')
    op.drop_column('stores', 'invite_code')
