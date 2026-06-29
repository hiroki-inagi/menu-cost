"""
サンプルデータ投入スクリプト (urllib版 - 追加インストール不要)
実行方法: venv\Scripts\python.exe seed_sample_data.py
"""
import json
import urllib.request
import urllib.parse
from datetime import date, timedelta
import random
import sys

BASE = "https://menu-cost-backend.onrender.com/api"

print("=" * 50)
print("  MenuCost サンプルデータ投入")
print("=" * 50)
EMAIL    = input("メールアドレス: ").strip()
PASSWORD = input("パスワード: ").strip()

def call(method, path, data=None, token=None):
    body = json.dumps(data).encode() if data else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"{BASE}{path}", data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as res:
            return json.loads(res.read())
    except urllib.error.HTTPError as e:
        err = e.read().decode()
        print(f"  [Error {e.code}] {method} {path}: {err}")
        return None

# ── 登録 or ログイン ──
print("\n【1/6】アカウント確認...")

# まずログインを試みる
form = urllib.parse.urlencode({"username": EMAIL, "password": PASSWORD}).encode()
req = urllib.request.Request(
    f"{BASE}/auth/login", data=form,
    headers={"Content-Type": "application/x-www-form-urlencoded"}, method="POST",
)
token = None
try:
    with urllib.request.urlopen(req) as res:
        token = json.loads(res.read())["access_token"]
    print("  ✅ ログイン成功")
except urllib.error.HTTPError:
    # ログイン失敗 → 新規登録を試みる
    print("  ログイン失敗。新規登録を試みます...")
    name       = input("  表示名（例: 山田 太郎）: ").strip()
    store_name = input("  店舗名（例: レストランABC）: ").strip()
    r = call("POST", "/auth/register", {
        "email": EMAIL, "password": PASSWORD,
        "name": name, "store_name": store_name,
    })
    if not r:
        print("  ❌ 登録失敗。終了します。")
        sys.exit(1)
    print(f"  ✅ 登録成功: {r['name']}")

    # 登録後にログイン
    form = urllib.parse.urlencode({"username": EMAIL, "password": PASSWORD}).encode()
    req = urllib.request.Request(
        f"{BASE}/auth/login", data=form,
        headers={"Content-Type": "application/x-www-form-urlencoded"}, method="POST",
    )
    try:
        with urllib.request.urlopen(req) as res:
            token = json.loads(res.read())["access_token"]
        print("  ✅ ログイン成功")
    except Exception as e:
        print(f"  ❌ ログイン失敗: {e}")
        sys.exit(1)

# ストアの存在確認
me = call("GET", "/auth/me", token=token)
if not me or not me.get("store_id"):
    print("\n  ❌ このアカウントに店舗が紐付いていません。")
    print("     新しいアカウントを作成し直すか、店舗名を設定してください。")
    sys.exit(1)

# ── 店舗設定 ──
print("\n【2/6】店舗設定...")
r = call("PUT", "/store/settings", {
    "default_cost_rate": 0.30,
    "tax_rate": 0.10,
    "rounding_unit": 50,
    "labor_cost_rate": 0.25,
    "city_name": "Tokyo",
}, token)
if r:
    print("  ✅ 店舗設定完了")
else:
    print("  ⚠️  店舗設定に失敗しましたが続行します")

# ── 仕入先 ──
print("\n【3/6】仕入先登録...")
suppliers = {}
for name, contact in [
    ("田中青果",       "03-1234-5678"),
    ("丸善食材",       "03-9876-5432"),
    ("海鮮問屋 山本", "045-111-2222"),
]:
    r = call("POST", "/suppliers", {"name": name, "contact": contact}, token)
    if r:
        suppliers[name] = r["id"]
        print(f"  ✅ {name}")
    else:
        print(f"  ⚠️  {name} の登録をスキップ")
print(f"  → {len(suppliers)}件登録")

# ── 食材 ──
print("\n【4/6】食材登録...")
ingredients_data = [
    ("鶏もも肉",   "g",  "肉類",   2.8, "田中青果"),
    ("エビ",       "g",  "魚介",   4.5, "海鮮問屋 山本"),
    ("白米",       "g",  "穀物",   0.4, "丸善食材"),
    ("トマト缶",   "g",  "野菜",   0.5, "丸善食材"),
    ("玉ねぎ",     "g",  "野菜",   0.3, "田中青果"),
    ("にんにく",   "g",  "野菜",   1.2, "田中青果"),
    ("生クリーム", "ml", "乳製品", 2.0, "丸善食材"),
    ("バター",     "g",  "乳製品", 3.5, "丸善食材"),
    ("パスタ",     "g",  "穀物",   0.6, "丸善食材"),
    ("レタス",     "g",  "野菜",   1.5, "田中青果"),
    ("チーズ",     "g",  "乳製品", 5.0, "丸善食材"),
]
ingredients = {}
for name, unit, cat, price, sup in ingredients_data:
    payload = {
        "name": name, "unit": unit, "category": cat, "unit_price": price,
    }
    if sup in suppliers:
        payload["supplier_id"] = suppliers[sup]
    r = call("POST", "/ingredients", payload, token)
    if r:
        ingredients[name] = r["id"]
        print(f"  ✅ {name}")
    else:
        print(f"  ⚠️  {name} の登録をスキップ")
print(f"  → {len(ingredients)}品登録")

# ── レシピ ──
print("\n【5/6】レシピ登録...")
recipes_data = [
    {
        "name": "エビチリ", "category": "メイン",
        "selling_price": 1200, "target_cost_rate": 0.30,
        "ings": [("エビ",120,0.9),("トマト缶",80,1.0),("玉ねぎ",50,0.9),("にんにく",10,1.0),("白米",150,1.0)],
    },
    {
        "name": "チキングリル", "category": "メイン",
        "selling_price": 980, "target_cost_rate": 0.28,
        "ings": [("鶏もも肉",180,0.85),("バター",15,1.0),("にんにく",8,1.0)],
    },
    {
        "name": "クリームパスタ", "category": "メイン",
        "selling_price": 880, "target_cost_rate": 0.32,
        "ings": [("パスタ",100,1.0),("生クリーム",100,1.0),("チーズ",30,1.0),("バター",10,1.0)],
    },
    {
        "name": "シーザーサラダ", "category": "サイド",
        "selling_price": 550, "target_cost_rate": 0.25,
        "ings": [("レタス",120,0.8),("チーズ",20,1.0)],
    },
    {
        "name": "ガーリックライス", "category": "サイド",
        "selling_price": 350, "target_cost_rate": 0.30,
        "ings": [("白米",200,1.0),("バター",10,1.0),("にんにく",5,1.0)],
    },
]
recipe_ids = []
for rd in recipes_data:
    ing_list = [
        {"ingredient_id": ingredients[n], "quantity": q, "yield_rate": y}
        for n, q, y in rd["ings"] if n in ingredients
    ]
    r = call("POST", "/recipes", {
        "name": rd["name"], "category": rd["category"],
        "selling_price": rd["selling_price"],
        "target_cost_rate": rd["target_cost_rate"],
        "servings": 1,
        "ingredients": ing_list,
    }, token)
    if r:
        recipe_ids.append((rd["name"], r["id"]))
        print(f"  ✅ {rd['name']}")
    else:
        print(f"  ⚠️  {rd['name']} の登録をスキップ")
print(f"  → {len(recipe_ids)}品登録")

# ── 売上データ (過去2週間) ──
print("\n【6/7】売上データ投入（過去14日）...")
random.seed(42)
today = date.today()
ok_count = 0
for days_ago in range(14, 0, -1):
    d = today - timedelta(days=days_ago)
    entries = []
    for name, rid in recipe_ids:
        is_main = name in ["エビチリ", "チキングリル", "クリームパスタ"]
        qty = random.randint(3, 15) if is_main else random.randint(1, 8)
        if d.weekday() >= 4:  # 金土日は多め
            qty = int(qty * 1.5)
        entries.append({"recipe_id": rid, "quantity": qty})
    r = call("POST", "/sales/daily", {"sold_date": d.isoformat(), "entries": entries}, token)
    if r:
        ok_count += 1
print(f"  ✅ {ok_count}/14日分 投入完了")

# ── 天気ログ (過去2週間) ──
print("\n【7/7】天気ログ投入（過去14日）...")
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
try:
    from app.database import SessionLocal
    from app.models.weather_log import WeatherLog
    from app.models.user import User
    from sqlalchemy.dialects.postgresql import insert as pg_insert
    import uuid as _uuid

    WEATHER_PATTERN = [
        ("Clear",  "晴れ",  32.0, 24.0, 0.0),
        ("Clear",  "晴れ",  31.0, 23.5, 0.0),
        ("Clouds", "曇り",  28.0, 22.0, 0.0),
        ("Rain",   "雨",    25.0, 20.0, 8.0),
        ("Clear",  "晴れ",  30.0, 22.0, 0.0),
        ("Clouds", "曇り",  27.0, 21.0, 0.0),
        ("Clear",  "晴れ",  33.0, 25.0, 0.0),
        ("Rain",   "雨",    24.0, 19.0, 12.0),
        ("Clouds", "曇り",  26.0, 20.0, 0.0),
        ("Clear",  "晴れ",  31.0, 23.0, 0.0),
        ("Clear",  "晴れ",  32.0, 24.0, 0.0),
        ("Rain",   "雨",    23.0, 18.0, 5.0),
        ("Clouds", "曇り",  27.0, 21.0, 0.0),
        ("Clear",  "晴れ",  30.0, 22.0, 0.0),
    ]

    db = SessionLocal()
    # ログイン中のユーザーのstore_idを取得
    user_obj = db.query(User).filter(User.email == EMAIL).first()
    if user_obj and user_obj.store_id:
        wl_count = 0
        for i, days_ago in enumerate(range(14, 0, -1)):
            d = today - timedelta(days=days_ago)
            cond, label, tmax, tmin, precip = WEATHER_PATTERN[i % len(WEATHER_PATTERN)]
            # upsert（重複は無視）
            existing = db.query(WeatherLog).filter(
                WeatherLog.store_id == user_obj.store_id,
                WeatherLog.weather_date == d,
            ).first()
            if not existing:
                db.add(WeatherLog(
                    store_id=user_obj.store_id,
                    weather_date=d,
                    condition=cond,
                    condition_label=label,
                    temp_max=tmax,
                    temp_min=tmin,
                    precipitation=precip,
                ))
                wl_count += 1
        db.commit()
        db.close()
        print(f"  ✅ {wl_count}日分の天気ログ投入完了")
    else:
        print("  ⚠️  store_id が見つかりません。スキップ")
except Exception as e:
    print(f"  ⚠️  天気ログの投入に失敗しました: {e}")

print("\n🎉 完了！ブラウザをリロードしてください。")
