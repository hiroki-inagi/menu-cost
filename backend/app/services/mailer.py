"""SMTP経由でのメール送信。

SMTPが未設定の環境（ローカル開発など）では例外を投げずにログ出力だけ行う。
本番でメール送信に失敗した場合は例外を投げるので、呼び出し側で握りつぶすこと
（パスワード再設定APIはメールアドレスの存在有無を漏らさないため常に200を返す）。
"""
import logging
import smtplib
from email.message import EmailMessage
from app.config import settings

logger = logging.getLogger(__name__)


def send_email(to: str, subject: str, body: str) -> bool:
    """メールを送信する。SMTP未設定ならFalseを返す。"""
    if not settings.smtp_configured:
        logger.warning(
            "SMTPが未設定のためメールを送信できません。宛先=%s 件名=%s\n%s",
            to, subject, body,
        )
        return False

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM or settings.SMTP_USER}>"
    msg["To"] = to
    msg.set_content(body)

    if settings.SMTP_USE_TLS:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as smtp:
            smtp.starttls()
            smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            smtp.send_message(msg)
    else:
        with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as smtp:
            smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            smtp.send_message(msg)

    logger.info("メールを送信しました: 宛先=%s 件名=%s", to, subject)
    return True


def check_smtp_connection() -> tuple[bool, str]:
    """SMTPへの接続とログインだけを試す（メールは送らない）。

    設定画面の「接続テスト」から呼ぶ。よくある失敗は日本語で説明を返す。
    """
    if not settings.smtp_configured:
        return False, "SMTPが未設定です。SMTP_USER と SMTP_PASSWORD を環境変数に設定してください"

    try:
        if settings.SMTP_USE_TLS:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as smtp:
                smtp.starttls()
                smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        else:
            with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as smtp:
                smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        return True, "接続に成功しました"

    except smtplib.SMTPAuthenticationError:
        return False, (
            "認証に失敗しました。Gmailの場合は通常のパスワードではなく"
            "「アプリパスワード」（16桁）が必要です。2段階認証を有効にしてから発行してください"
        )
    except (smtplib.SMTPConnectError, OSError) as e:
        return False, f"サーバーに接続できません（ホスト/ポートをご確認ください）: {e}"
    except Exception as e:
        return False, f"接続に失敗しました: {e}"


def send_password_reset_email(to: str, user_name: str, reset_url: str, expire_minutes: int) -> bool:
    subject = "【MenuCost】パスワード再設定のご案内"
    body = f"""{user_name} 様

MenuCostのパスワード再設定のリクエストを受け付けました。
下のリンクを開いて、新しいパスワードを設定してください。

{reset_url}

・このリンクの有効期限は {expire_minutes} 分です
・リンクは1回だけ使用できます
・心当たりがない場合は、このメールを破棄してください。パスワードは変更されません

--
MenuCost
"""
    return send_email(to, subject, body)
