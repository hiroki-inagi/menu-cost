"""店舗の招待コード生成ユーティリティ。

紛らわしい文字 (0/O, 1/I/L) を除いた英数字を使い、
口頭やメモで伝えても間違えにくいコードを作る。
"""
import secrets
from sqlalchemy.orm import Session

ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
CODE_LENGTH = 8


def _random_code() -> str:
    return "".join(secrets.choice(ALPHABET) for _ in range(CODE_LENGTH))


def generate_unique_invite_code(db: Session, max_attempts: int = 20) -> str:
    """DB内で重複しない招待コードを返す。"""
    from app.models.store import Store

    for _ in range(max_attempts):
        code = _random_code()
        if not db.query(Store).filter(Store.invite_code == code).first():
            return code
    raise RuntimeError("招待コードの生成に失敗しました")


def normalize_invite_code(raw: str) -> str:
    """入力されたコードを正規化（空白・ハイフン除去、大文字化）。"""
    return "".join(raw.split()).replace("-", "").upper()
