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

BASE = "http://localhost:8000/api"
EMAIL = "tip12041204@gmail.com"
PASSWORD = input("パスワードを入力: ")

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
        print(f"  Error {e.code} {method} {path}: {e.read().decode()}")
        return None

# ── ログイン ──
form = urllib.parse.urlencode({"username": EMAIL, "password": PASSWORD}).encode()
req = urllib.request.Request(f"{BASE}/auth/login", data=form,
    headers={"Content-Type": "application/x-www-form-urlencoded"}, method="POST")
try:
    with urllib.request.urlopen(req) as res:
        token = json.loads(res.read())["access_token"]
except Exception as e:
    print("ログイン失敗:", e); sys.exit(1)
print("✅ ログイン成功")

# ── 店舗設定 ──
call("PUT", "/store/settings", {"default_cost_rate": 0.30, "tax_rate": 0.10,
    "rounding_unit": 50, "labor_cost_rate": 0.25, "city_name": "Tokyo"}, token)
print("✅ 店舗設定")

# ── 仕入先 ──
suppliers = {}
for name, contact in [("田中青果", "03-1234-5678"), ("丸善食材", "03-9876-5432"), ("海鮮問屋 山本", "045-111-2222")]:
    r = call("POST", "/suppliers", {"name": name, "contact": contact}, token)
    if r: suppliers[name] = r["id"]
print(f"✅ 仕入先 {len(suppliers)}件")

# ── 食材 ──
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
    r = call("POST", "/ingredients", {"name": name, "unit": unit, "category": cat,
        "unit_price": price, "supplier_id": suppliers.get(sup)}, token)
    if r: ingredients[name] = r["id"]
print(f"✅ 食材 {len(ingredients)}品")

# ── レシピ ──
recipes_data = [
    {"name": "エビチリ",       "category": "メイン", "selling_price": 1200, "target_cost_rate": 0.30,
     "ings": [("エビ",120,0.9),("トマト缶",80,1.0),("玉ねぎ",50,0.9),("にんにく",10,1.0),("白米",150,1.0)]},
    {"name": "チキングリル",   "category": "メイン", "selling_price": 980,  "target_cost_rate": 0.28,
     "ings": [("鶏もも肉",180,0.85),("バター",15,1.0),("にんにく",8,1.0)]},
    {"name": "クリームパスタ", "category": "メイン", "selling_price": 880,  "target_cost_rate": 0.32,
     "ings": [("パスタ",100,1.0),("生クリーム",100,1.0),("チーズ",30,1.0),("バター",10,1.0)]},
    {"name": "シーザーサラダ", "category": "サイド", "selling_price": 550,  "target_cost_rate": 0.25,
     "ings": [("レタス",120,0.8),("チーズ",20,1.0)]},
    {"name": "ガーリックライス","category": "サイド","selling_price": 350,  "target_cost_rate": 0.30,
     "ings": [("白米",200,1.0),("バター",10,1.0),("にんにく",5,1.0)]},
]
recipe_ids = []
for rd in recipes_data:
    r = call("POST", "/recipes", {
        "name": rd["name"], "category": rd["category"],
        "selling_price": rd["selling_price"], "target_cost_rate": rd["target_cost_rate"], "servings": 1,
        "ingredients": [{"ingredient_id": ingredients[n], "quantity": q, "yield_rate": y}
                        for n, q, y in rd["ings"] if n in ingredients],
    }, token)
    if r: recipe_ids.append((rd["name"], r["id"]))
print(f"✅ レシピ {len(recipe_ids)}品")

# ── 売上データ (過去2週間) ──
random.seed(42)
today = date.today()
for days_ago in range(14, 0, -1):
    d = today - timedelta(days=days_ago)
    entries = []
    for name, rid in recipe_ids:
        is_main = name in ["エビチリ", "チキングリル", "クリームパスタ"]
        qty = random.randint(3, 15) if is_main else random.randint(1, 8)
        if d.weekday() >= 4:
            qty = int(qty * 1.5)
        entries.append({"recipe_id": rid, "quantity": qty})
    call("POST", "/sales/daily", {"sold_date": d.isoformat(), "entries": entries}, token)
print("✅ 売上データ 14日分")

print("\n🎉 完了！ブラウザをリロードしてください。")
