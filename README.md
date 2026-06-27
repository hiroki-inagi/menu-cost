# MenuCost — 飲食店原価計算App

飲食店向けの原価計算・売上分析Webアプリケーション

## 機能
- 食材マスタ管理（単価・仕入先・単価履歴）
- レシピ管理（食材紐付け・歩留まり）
- 自動原価計算 → 推奨売価提案
- 売上データ入力（日次）
- 売上分析：期間別 / 天気別 / 曜日ヒートマップ
- 気温×売上 相関グラフ

## 技術スタック
- **Backend**: FastAPI + SQLAlchemy + PostgreSQL + Alembic
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + Recharts
- **Deploy**: Render (Web Service + Static Site + PostgreSQL)

---

## ローカル開発

### 1. リポジトリのクローン
```bash
git clone https://github.com/YOUR_USERNAME/menu-cost.git
cd menu-cost
```

### 2. バックエンドのセットアップ
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# 環境変数を設定
cp .env.example .env
# .env を編集して DATABASE_URL / SECRET_KEY を設定

# DBマイグレーション
alembic upgrade head

# サーバー起動
uvicorn app.main:app --reload
```

### 3. フロントエンドのセットアップ
```bash
cd frontend
npm install
npm run dev
```

ブラウザで http://localhost:5173 を開く

---

## Render へのデプロイ

### Step 1: GitHub にプッシュ
```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/YOUR_USERNAME/menu-cost.git
git push -u origin main
```

### Step 2: Render でサービスを作成
1. [render.com](https://render.com) にログイン
2. **New → Blueprint** を選択
3. GitHubリポジトリを選択
4. `render.yaml` が自動検出される → **Apply** をクリック
5. 以下の環境変数を手動で追加（Render Dashboard → Backend Service → Environment）:
   - `OPENWEATHERMAP_API_KEY` : [openweathermap.org](https://openweathermap.org/api) で無料取得したキー

### Step 3: 初回マイグレーション
Render Dashboard → Backend Service → **Shell** タブ:
```bash
alembic upgrade head
```

### Step 4: フロントエンドの API URL 確認
Render でバックエンドのデプロイが完了したら:
- バックエンドの URL（例: `https://menu-cost-backend.onrender.com`）を確認
- `render.yaml` の `VITE_API_URL` がその URL になっているか確認（自動設定済み）

---

## OpenWeatherMap APIキーの取得

1. https://openweathermap.org/api にアクセス
2. 無料アカウントを作成
3. **API keys** タブからキーをコピー
4. Render の環境変数 `OPENWEATHERMAP_API_KEY` に設定
5. アプリの **設定ページ** で店舗の「都市名」を設定（例: `Tokyo`）

---

## ディレクトリ構成

```
menu-cost/
├── backend/          # FastAPI アプリケーション
│   ├── app/
│   │   ├── models/   # SQLAlchemy モデル
│   │   ├── schemas/  # Pydantic スキーマ
│   │   ├── routers/  # APIエンドポイント
│   │   ├── services/ # ビジネスロジック
│   │   └── auth/     # JWT認証
│   ├── alembic/      # DBマイグレーション
│   └── requirements.txt
├── frontend/         # React アプリケーション
│   ├── src/
│   │   ├── api/      # APIクライアント
│   │   ├── pages/    # ページコンポーネント
│   │   ├── components/
│   │   └── types/    # TypeScript型定義
│   └── package.json
├── render.yaml       # Render デプロイ設定
└── README.md
```
