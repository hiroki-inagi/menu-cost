@echo off
chcp 65001 > nul
echo ================================================
echo   MenuCost — GitHub Push セットアップ
echo ================================================
echo.

:: このスクリプトがある場所 = menu-cost フォルダ
cd /d "%~dp0"

:: git が使えるか確認
where git >nul 2>&1
if %errorlevel% neq 0 (
    echo [エラー] git がインストールされていません。
    echo https://git-scm.com/download/win からインストールしてください。
    pause
    exit /b 1
)

echo [1/4] GitHubのユーザー名を入力してください
set /p GH_USER="GitHub ユーザー名: "

echo.
echo [2/4] リポジトリ名を入力してください（デフォルト: menu-cost）
set /p REPO_NAME="リポジトリ名 [menu-cost]: "
if "%REPO_NAME%"=="" set REPO_NAME=menu-cost

echo.
echo [3/4] git 初期化 & コミット中...
git init
git config core.autocrlf false
git add .
git commit -m "initial commit: MenuCost — 飲食店原価計算App"
git branch -M main

echo.
echo [4/4] GitHub にプッシュ中...
echo リモートURL: https://github.com/%GH_USER%/%REPO_NAME%.git
git remote add origin https://github.com/%GH_USER%/%REPO_NAME%.git
git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo ================================================
    echo   完了！
    echo   https://github.com/%GH_USER%/%REPO_NAME%
    echo ================================================
    echo.
    echo 次のステップ: render.com で "New → Blueprint" を選択し
    echo このリポジトリを接続してください。
) else (
    echo.
    echo [注意] push に失敗しました。以下を確認してください：
    echo   1. https://github.com/new でリポジトリ "%REPO_NAME%" を作成済みか
    echo   2. GitHub にログイン済みか（git credential manager）
    echo   3. ユーザー名が正しいか: %GH_USER%
)

echo.
pause
