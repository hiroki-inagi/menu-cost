from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080
    OPENWEATHERMAP_API_KEY: str = ""

    # --- パスワード再設定メール用のSMTP設定 ---
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = ""          # 差出人アドレス。未設定ならSMTP_USERを使う
    SMTP_FROM_NAME: str = "MenuCost"
    SMTP_USE_TLS: bool = True    # 587番ポートのSTARTTLS。465番を使う場合はfalse
    FRONTEND_URL: str = "http://localhost:5173"  # 再設定リンクの生成に使う
    PASSWORD_RESET_EXPIRE_MINUTES: int = 60

    @property
    def smtp_configured(self) -> bool:
        return bool(self.SMTP_HOST and self.SMTP_USER and self.SMTP_PASSWORD)

    class Config:
        env_file = ".env"

settings = Settings()
