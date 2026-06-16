"""Configuration for the TerraMind AI inference service."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # TokenRouter / MiniMax-M3 — injected by Vault in production.
    tokenrouter_api_key: str = ""
    tokenrouter_base_url: str = "https://api.tokenrouter.com/v1"
    ai_model: str = "MiniMax-M3"
    ai_timeout_sec: int = 45
    ai_force_mock: bool = False

    # Where the simulated drone "camera frames" live.
    image_dir: str = "../demo-imagery"

    @property
    def live_enabled(self) -> bool:
        return bool(self.tokenrouter_api_key) and not self.ai_force_mock


settings = Settings()
