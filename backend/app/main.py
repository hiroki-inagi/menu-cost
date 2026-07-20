from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.database import Base, engine
from app.routers import auth, store, suppliers, ingredients, recipes, dashboard, sales, weather, export


def _run_startup_migrations() -> None:
    """既存テーブルへの列追加・招待コード発行（初回起動時のみ実質的に処理が走る）"""
    with engine.connect() as conn:
        conn.execute(text(
            "ALTER TABLE stores ADD COLUMN IF NOT EXISTS weather_api_key VARCHAR"
        ))
        conn.execute(text(
            "ALTER TABLE stores ADD COLUMN IF NOT EXISTS invite_code VARCHAR(12)"
        ))
        conn.execute(text(
            "CREATE UNIQUE INDEX IF NOT EXISTS ix_stores_invite_code ON stores (invite_code)"
        ))
        conn.commit()

        # 招待コード未発行の既存店舗にコードを発行する
        from app.services.invite_code import _random_code

        rows = conn.execute(text("SELECT id FROM stores WHERE invite_code IS NULL")).fetchall()
        if rows:
            existing = {r[0] for r in conn.execute(text(
                "SELECT invite_code FROM stores WHERE invite_code IS NOT NULL"
            )).fetchall()}
            for (store_id,) in rows:
                code = _random_code()
                while code in existing:
                    code = _random_code()
                existing.add(code)
                conn.execute(
                    text("UPDATE stores SET invite_code = :code WHERE id = :id"),
                    {"code": code, "id": store_id},
                )
            conn.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    アプリ起動時の処理をリクエスト処理と分離する。
    テーブル作成・列追加・招待コード発行は初回のみ実質的な作業が発生し、
    2回目以降は軽い存在チェックのみで完了するため通常時の起動は高速。
    """
    Base.metadata.create_all(bind=engine)
    _run_startup_migrations()
    print("✅ Database ready")
    yield


app = FastAPI(title="MenuCost API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(store.router)
app.include_router(suppliers.router)
app.include_router(ingredients.router)
app.include_router(recipes.router)
app.include_router(dashboard.router)
app.include_router(sales.router)
app.include_router(weather.router)
app.include_router(export.router)

@app.get("/")
def root():
    return {"status": "ok", "app": "MenuCost API"}

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.get("/api/health")
def api_health():
    """フロントエンドからのウォームアップ(コールドスタート対策)用"""
    return {"status": "healthy"}


