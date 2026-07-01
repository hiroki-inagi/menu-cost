"""
大久保店原価表.xlsx の内容でDBを置き換えるインポートスクリプト

【このスクリプトが行うこと】
対象店舗（DBに登録されている唯一の店舗）について、以下を全て削除してから
Excelの内容で作り直します。
  削除: 仕入先(suppliers) / 食材(ingredients) / 価格履歴(price_history) /
        レシピ(recipes) / レシピ食材(recipe_ingredients) /
        売上データ(daily_sales) / 天気ログ(weather_logs)
  ※ 店舗(stores)自体とユーザーアカウント(users)は削除しません
    （ログインができなくなる・対象店舗そのものが無くなってしまうため、
      原価データの入れ替えという目的には不要と判断して残しています。
      これも含めて完全に消したい場合は教えてください）

【実行方法】
1. backend フォルダに移動
     cd backend
2. 依存パッケージがインストール済みの環境で実行（.envにDATABASE_URLがある前提）
     python scripts/import_okubo_costs.py
   ローカルにpsycopg2/python-dotenvが無ければ:
     pip install psycopg2-binary python-dotenv
   もしくは Render Dashboard → Backend Service → Shell タブに
   このファイルをアップロードして同様に実行してください。
3. 確認プロンプトが出るので、内容を確認して "DELETE" と入力すると実行されます。

【出典】大久保店原価表.xlsx（バナナオレ / モチコ照り焼き / ロコモコ /
ミネストローネ / マラサダプレーン / 紅茶クリーム の6シート）
すべてのレシピ合計原価は、このスクリプトのデータでExcel記載の合計金額と
一致することを確認済みです。

【要確認・データの解釈について】
- Excelの「各食材1gあたりの金額」列(H)が使える行はそれを単価(g単価)とし、
  使えない行（#DIV/0!等）は「1個当たりの材料の金額」列(J)をそのまま
  数量1・単価として採用しています。
- 同じ食材名でも仕入先・単価が異なる場合は「食材名（仕入先）」として
  別食材にしています（例: 卵／卵（イオン）、牛乳／牛乳（タカナシ）等）。
- マラサダプレーンシートのB22セル「富澤商店」は食材名欄に仕入先名が
  入っているように見えたため、そのまま食材名として登録しています。
  実際の商品名が分かれば後で修正してください。
- レシピの「原価率」はExcelの実績値のため取り込まず、売価のみ登録して
  います（店舗のデフォルト目標原価率で計算されます）。
"""
import os
import sys
import uuid
from decimal import Decimal

try:
    import psycopg2
except ImportError:
    print("psycopg2-binary が必要です: pip install psycopg2-binary python-dotenv")
    sys.exit(1)

try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
except ImportError:
    pass

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    print("環境変数 DATABASE_URL が見つかりません（backend/.env を確認してください）")
    sys.exit(1)

DATA = {
  "recipes": [
    {
      "sheet": "バナナオレ", "name": "バナナオレ", "selling_price": 380.0,
      "note": "原価表作成日: 2024年7月5日 / 作成者：赤嶺 / 販売期間: 2024.7.6～8/末まで予定 / 4月5月限定商品チョコバナナで余ったバナナピューレを使った商品です。バナナの栄養価が注目される中、暑い夏のビタミン補給に可愛いPOPを使って販売促進していきます。",
      "items": [
        {"name": "バナナピューレ", "quantity": 60.0, "unit_price": 2.1},
        {"name": "コンデンスミルク", "quantity": 8.0, "unit_price": 1.1},
        {"name": "牛乳", "quantity": 160.0, "unit_price": 0.2},
      ],
    },
    {
      "sheet": "モチコ照り焼き", "name": "モチコテリヤキ丼", "selling_price": 860.0,
      "note": "期間限定メニュー / 原価表作成日: 2024年2月12日 / 作成者：山田 / 現在販売しているモチコチキンを使用した丼ぶりランチです。ロコモコに並び、丼ぶりなので食べやすく、店内飲食とランチボックスでのテイク販売で、売り上げも期待できると思います",
      "items": [
        {"name": "鶏肉", "quantity": 153.846154, "unit_price": 0.583},
        {"name": "ニンニク", "quantity": 2.769231, "unit_price": 0.86},
        {"name": "味塩コショウ", "quantity": 0.692308, "unit_price": 0.666667},
        {"name": "料理酒", "quantity": 11.7, "unit_price": 2.222222},
        {"name": "モチコ", "quantity": 3.846154, "unit_price": 1.413},
        {"name": "コーンスターチ", "quantity": 3.846154, "unit_price": 0.273},
        {"name": "テリヤキソース", "quantity": 50.0, "unit_price": 0.8},
        {"name": "白米", "quantity": 165.0, "unit_price": 0.3},
        {"name": "プチトマト", "quantity": 15.0, "unit_price": 0.52},
        {"name": "サニーレタス", "quantity": 5.0, "unit_price": 0.52},
        {"name": "グリーンリーフ", "quantity": 5.0, "unit_price": 0.52},
        {"name": "ベビーリーフリーフ", "quantity": 2.0, "unit_price": 2.6},
        {"name": "紫キャベツ", "quantity": 5.0, "unit_price": 0.495},
        {"name": "かんたん酢", "quantity": 5.0, "unit_price": 0.203},
      ],
    },
    {
      "sheet": "ロコモコ", "name": "ロコモコ", "selling_price": 860.0,
      "note": "期間限定メニュー / 原価表作成日: 2024年1月30日 / 作成者：山田 / ランチプレートを召し上がる方が増えてきたのでごはんメニューを増やします。アボカドは使用せず、アボカドトルティーヤを使い、ロスを削減。サラダはランチプレートで使用している物を使います。ハンバーグ生地で使用しているパン粉はダメ生地マラサダを使用",
      "items": [
        {"name": "ハンバーグ肉", "quantity": 71.428571, "unit_price": 1.1},
        {"name": "飴色玉ねぎ", "quantity": 21.428571, "unit_price": 0.86},
        {"name": "味塩コショウ", "quantity": 0.571429, "unit_price": 0.666667},
        {"name": "卵", "quantity": 78.0, "unit_price": 0.333333},
        {"name": "ケチャップ", "quantity": 12.5, "unit_price": 0.26},
        {"name": "ウスターソース", "quantity": 1.0, "unit_price": 0.666667},
        {"name": "砂糖", "quantity": 2.0, "unit_price": 2.16},
        {"name": "デミソース缶", "quantity": 41.0, "unit_price": 0.692683},
        {"name": "ダメ生地マラサダ", "quantity": 1.0, "unit_price": 0.0},
        {"name": "白米", "quantity": 165.0, "unit_price": 0.3},
        {"name": "プチトマト", "quantity": 15.0, "unit_price": 0.52},
        {"name": "サニーレタス", "quantity": 5.0, "unit_price": 0.52},
        {"name": "グリーンリーフ", "quantity": 5.0, "unit_price": 0.52},
        {"name": "ベビーリーフリーフ", "quantity": 2.0, "unit_price": 2.6},
        {"name": "紫キャベツ", "quantity": 5.0, "unit_price": 0.495},
        {"name": "トルティーヤ", "quantity": 2.0, "unit_price": 1.714286},
        {"name": "かんたん酢", "quantity": 5.0, "unit_price": 0.203},
      ],
    },
    {
      "sheet": "ミネストローネ", "name": "ミネストローネ", "selling_price": 280.0,
      "note": "期間限定メニュー / 原価表作成日: 2023年8月9日 / 作成者：横山",
      "items": [
        {"name": "ミネストローネ", "quantity": 100.0, "unit_price": 0.772},
        {"name": "水", "quantity": 1.0, "unit_price": 0.0},
        {"name": "カップ", "quantity": 1.0, "unit_price": 11.2},
        {"name": "フタ", "quantity": 1.0, "unit_price": 5.4},
      ],
    },
    {
      "sheet": "マラサダプレーン", "name": "マラサダプレーン", "selling_price": 260.0,
      "note": "期間限定メニュー / 原価表作成日: 2023年8月9日 / 作成者：横山",
      "items": [
        {"name": "カメリア", "quantity": 25.0, "unit_price": 0.19504},
        {"name": "ドライイースト", "quantity": 0.25, "unit_price": 1.35},
        {"name": "しお", "quantity": 0.5, "unit_price": 0.1314},
        {"name": "上白糖", "quantity": 3.75, "unit_price": 0.23325},
        {"name": "スキムミルク", "quantity": 1.0, "unit_price": 1.11},
        {"name": "イビスアジュール", "quantity": 0.25, "unit_price": 2.376},
        {"name": "バター", "quantity": 6.0, "unit_price": 1.757778},
        {"name": "卵（イオン）", "quantity": 7.5, "unit_price": 0.52},
        {"name": "水（規格違い）", "quantity": 1.0, "unit_price": 0.0},
        {"name": "サラダ油", "quantity": 0.625, "unit_price": 0.445091},
        {"name": "富澤商店", "quantity": 5.0, "unit_price": 0.38895},
      ],
    },
    {
      "sheet": "紅茶クリーム", "name": "紅茶クリーム", "selling_price": 350.0,
      "note": "期間限定メニュー / 原価表作成日: 2023年9月21日 / 作成者：横山 / 販売期間: 2023年 / 紅茶プレーン（280円）・紅茶クリーム（350円） / ★2023年9月21日時点での原価です。",
      "items": [
        {"name": "マラサダ", "quantity": 1.0, "unit_price": 24.5},
        {"name": "茶葉", "quantity": 0.35, "unit_price": 3.18},
        {"name": "凍結卵黄", "quantity": 5.833333, "unit_price": 1.679},
        {"name": "グラニュー糖", "quantity": 4.583333, "unit_price": 0.2409},
        {"name": "薄力", "quantity": 2.916667, "unit_price": 0.23},
        {"name": "牛乳（タカナシ）", "quantity": 40.0, "unit_price": 0.22},
        {"name": "バター", "quantity": 0.833333, "unit_price": 1.757778},
        {"name": "紅茶茶葉", "quantity": 0.5, "unit_price": 3.18},
        {"name": "バーガー袋", "quantity": 1.0, "unit_price": 2.7},
      ],
    },
  ],
  "ingredients": [
    {"name": "バナナピューレ", "unit": "g", "unit_price": 2.1, "supplier": "昭和物産"},
    {"name": "コンデンスミルク", "unit": "g", "unit_price": 1.1, "supplier": "昭和物産"},
    {"name": "牛乳", "unit": "g", "unit_price": 0.2, "supplier": "タカナシ"},
    {"name": "鶏肉", "unit": "g", "unit_price": 0.583, "supplier": "肉の皆川"},
    {"name": "ニンニク", "unit": "g", "unit_price": 0.86, "supplier": "昭和物産"},
    {"name": "味塩コショウ", "unit": "g", "unit_price": 0.666667, "supplier": "業スー"},
    {"name": "料理酒", "unit": "g", "unit_price": 2.222222, "supplier": "昭和物産"},
    {"name": "モチコ", "unit": "g", "unit_price": 1.413, "supplier": "昭和物産"},
    {"name": "コーンスターチ", "unit": "g", "unit_price": 0.273, "supplier": "昭和物産"},
    {"name": "テリヤキソース", "unit": "g", "unit_price": 0.8, "supplier": "業スー"},
    {"name": "白米", "unit": "g", "unit_price": 0.3, "supplier": "業スー"},
    {"name": "プチトマト", "unit": "g", "unit_price": 0.52, "supplier": "八百松"},
    {"name": "サニーレタス", "unit": "g", "unit_price": 0.52, "supplier": "八百松"},
    {"name": "グリーンリーフ", "unit": "g", "unit_price": 0.52, "supplier": "八百松"},
    {"name": "ベビーリーフリーフ", "unit": "g", "unit_price": 2.6, "supplier": "八百松"},
    {"name": "紫キャベツ", "unit": "g", "unit_price": 0.495, "supplier": "八百松"},
    {"name": "かんたん酢", "unit": "g", "unit_price": 0.203, "supplier": "業スー"},
    {"name": "ハンバーグ肉", "unit": "g", "unit_price": 1.1, "supplier": "肉の皆川"},
    {"name": "飴色玉ねぎ", "unit": "g", "unit_price": 0.86, "supplier": "ミクリード"},
    {"name": "卵", "unit": "g", "unit_price": 0.333333, "supplier": "八百松"},
    {"name": "ケチャップ", "unit": "g", "unit_price": 0.26, "supplier": "業スー"},
    {"name": "ウスターソース", "unit": "g", "unit_price": 0.666667, "supplier": "業スー"},
    {"name": "砂糖", "unit": "g", "unit_price": 2.16, "supplier": "大蔵物産"},
    {"name": "デミソース缶", "unit": "g", "unit_price": 0.692683, "supplier": "業スー"},
    {"name": "ダメ生地マラサダ", "unit": "g", "unit_price": 0.0, "supplier": None},
    {"name": "トルティーヤ", "unit": "g", "unit_price": 1.714286, "supplier": "業スー"},
    {"name": "ミネストローネ", "unit": "g", "unit_price": 0.772, "supplier": "昭和物産"},
    {"name": "水", "unit": "g", "unit_price": 0.0, "supplier": "大蔵物産"},
    {"name": "カップ", "unit": "g", "unit_price": 11.2, "supplier": "大蔵物産"},
    {"name": "フタ", "unit": "g", "unit_price": 5.4, "supplier": "大蔵物産"},
    {"name": "カメリア", "unit": "g", "unit_price": 0.19504, "supplier": "大蔵物産"},
    {"name": "ドライイースト", "unit": "g", "unit_price": 1.35, "supplier": "大蔵物産"},
    {"name": "しお", "unit": "g", "unit_price": 0.1314, "supplier": "大蔵物産"},
    {"name": "上白糖", "unit": "g", "unit_price": 0.23325, "supplier": "大蔵物産"},
    {"name": "スキムミルク", "unit": "g", "unit_price": 1.11, "supplier": "大蔵物産"},
    {"name": "イビスアジュール", "unit": "g", "unit_price": 2.376, "supplier": "大蔵物産"},
    {"name": "バター", "unit": "g", "unit_price": 1.757778, "supplier": "タカナシ"},
    {"name": "卵（イオン）", "unit": "g", "unit_price": 0.52, "supplier": "イオン"},
    {"name": "水（規格違い）", "unit": "g", "unit_price": 0.0, "supplier": None},
    {"name": "サラダ油", "unit": "g", "unit_price": 0.445091, "supplier": "大蔵物産"},
    {"name": "富澤商店", "unit": "g", "unit_price": 0.38895, "supplier": None},
    {"name": "マラサダ", "unit": "g", "unit_price": 24.5, "supplier": None},
    {"name": "茶葉", "unit": "g", "unit_price": 3.18, "supplier": "業務スーパー"},
    {"name": "凍結卵黄", "unit": "g", "unit_price": 1.679, "supplier": "オーダリー"},
    {"name": "グラニュー糖", "unit": "g", "unit_price": 0.2409, "supplier": "大蔵物産"},
    {"name": "薄力", "unit": "g", "unit_price": 0.23, "supplier": "スーパー"},
    {"name": "牛乳（タカナシ）", "unit": "g", "unit_price": 0.22, "supplier": "タカナシ"},
    {"name": "紅茶茶葉", "unit": "g", "unit_price": 3.18, "supplier": "業務スーパー"},
    {"name": "バーガー袋", "unit": "g", "unit_price": 2.7, "supplier": None},
  ],
}


def main():
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False
    cur = conn.cursor()

    cur.execute("SELECT id, name FROM stores")
    stores = cur.fetchall()
    if len(stores) != 1:
        print(f"店舗が {len(stores)} 件見つかりました。1件だけの前提のスクリプトです。")
        for sid, sname in stores:
            print(f"  - {sid}  {sname}")
        print("STORE_ID を直接指定して実行してください（スクリプト内 main() を編集）。")
        sys.exit(1)
    store_id, store_name = stores[0]
    print(f"対象店舗: {store_name} ({store_id})")

    cur.execute("SELECT count(*) FROM ingredients WHERE store_id=%s", (store_id,))
    n_ing = cur.fetchone()[0]
    cur.execute("SELECT count(*) FROM recipes WHERE store_id=%s", (store_id,))
    n_rec = cur.fetchone()[0]
    cur.execute("SELECT count(*) FROM suppliers WHERE store_id=%s", (store_id,))
    n_sup = cur.fetchone()[0]
    cur.execute("SELECT count(*) FROM daily_sales WHERE store_id=%s", (store_id,))
    n_sales = cur.fetchone()[0]

    print(f"現在のデータ: 食材{n_ing}件 / レシピ{n_rec}件 / 仕入先{n_sup}件 / 売上{n_sales}件")
    print(f"→ これらを全て削除し、Excelの内容（レシピ{len(DATA['recipes'])}件 / "
          f"食材{len(DATA['ingredients'])}件）で置き換えます。store/usersは残します。")
    answer = input("本当に実行しますか？ 'DELETE' と入力してください: ")
    if answer.strip() != "DELETE":
        print("中止しました。")
        return

    try:
        cur.execute("DELETE FROM daily_sales WHERE store_id=%s", (store_id,))
        cur.execute("DELETE FROM weather_logs WHERE store_id=%s", (store_id,))
        cur.execute(
            "DELETE FROM recipe_ingredients WHERE recipe_id IN "
            "(SELECT id FROM recipes WHERE store_id=%s)", (store_id,)
        )
        cur.execute("DELETE FROM recipes WHERE store_id=%s", (store_id,))
        cur.execute(
            "DELETE FROM price_history WHERE ingredient_id IN "
            "(SELECT id FROM ingredients WHERE store_id=%s)", (store_id,)
        )
        cur.execute("DELETE FROM ingredients WHERE store_id=%s", (store_id,))
        cur.execute("DELETE FROM suppliers WHERE store_id=%s", (store_id,))
        print("既存データを削除しました。")

        supplier_ids = {}
        for name in sorted({ing["supplier"] for ing in DATA["ingredients"] if ing["supplier"]}):
            sid = uuid.uuid4()
            cur.execute(
                "INSERT INTO suppliers (id, store_id, name) VALUES (%s, %s, %s)",
                (str(sid), store_id, name),
            )
            supplier_ids[name] = sid
        print(f"仕入先 {len(supplier_ids)} 件を作成しました。")

        ingredient_ids = {}
        for ing in DATA["ingredients"]:
            iid = uuid.uuid4()
            sup_id = supplier_ids.get(ing["supplier"])
            price = Decimal(str(ing["unit_price"]))
            cur.execute(
                "INSERT INTO ingredients (id, store_id, supplier_id, name, unit, unit_price) "
                "VALUES (%s, %s, %s, %s, %s, %s)",
                (str(iid), store_id, str(sup_id) if sup_id else None, ing["name"], ing["unit"], price),
            )
            cur.execute(
                "INSERT INTO price_history (id, ingredient_id, unit_price) VALUES (%s, %s, %s)",
                (str(uuid.uuid4()), str(iid), price),
            )
            ingredient_ids[ing["name"]] = iid
        print(f"食材 {len(ingredient_ids)} 件を作成しました。")

        for recipe in DATA["recipes"]:
            rid = uuid.uuid4()
            cur.execute(
                "INSERT INTO recipes (id, store_id, name, selling_price, servings, note, is_active) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s)",
                (str(rid), store_id, recipe["name"], Decimal(str(recipe["selling_price"])), 1, recipe["note"], True),
            )
            for item in recipe["items"]:
                ing_id = ingredient_ids.get(item["name"])
                if not ing_id:
                    raise RuntimeError(f"食材が見つかりません: {item['name']}")
                cur.execute(
                    "INSERT INTO recipe_ingredients (id, recipe_id, ingredient_id, quantity, yield_rate) "
                    "VALUES (%s, %s, %s, %s, %s)",
                    (str(uuid.uuid4()), str(rid), str(ing_id), Decimal(str(item["quantity"])), Decimal("1.0")),
                )
        print(f"レシピ {len(DATA['recipes'])} 件を作成しました。")

        conn.commit()
        print("完了しました。コミットしました。")
    except Exception:
        conn.rollback()
        print("エラーが発生したためロールバックしました。")
        raise
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    main()
