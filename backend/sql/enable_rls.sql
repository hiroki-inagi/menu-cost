-- ============================================================================
-- MenuCost: Row-Level Security (RLS) 有効化スクリプト
-- ============================================================================
-- 目的:
--   Supabase が public スキーマのテーブルを自動的にデータAPI(PostgREST)経由で
--   公開するため、RLS未設定だと「プロジェクトURL + anon key」を知る第三者が
--   テーブルを read/edit/delete できてしまう(警告: rls_disabled_in_public)。
--
-- この対策:
--   全テーブルで RLS を「有効化」する(ポリシーは作らない)。
--   ポリシーが無い状態で RLS 有効 = anon / authenticated ロールは全アクセス拒否
--   となり、データAPI経由の不正アクセスを完全に遮断する。
--
-- アプリへの影響:
--   MenuCost バックエンドは SQLAlchemy で Postgres に直接接続しており
--   (接続ユーザ = テーブル所有者 postgres)、所有者は RLS をバイパスするため
--   ★機能・データは一切変わらない★。データAPIはアプリで使用していない。
--   ※ FORCE ROW LEVEL SECURITY は使わない(所有者にもRLSを強制してしまい
--     バックエンドが動かなくなるため)。
--
-- 冪等性: ENABLE は繰り返し実行しても安全(既に有効なら実質no-op)。
-- ============================================================================

-- public スキーマの全テーブルに適用する。
-- 明示リストだと SQLAlchemy モデルに無いテーブル
-- (alembic_version / 旧 password_reset_tokens など)を取りこぼすため、
-- pg_tables を走査して自動適用する方式にしている。
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
  END LOOP;
END $$;

-- 確認用: 全テーブルで rowsecurity = true になっていればOK
--   SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
