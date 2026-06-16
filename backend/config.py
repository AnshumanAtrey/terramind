"""Configuration for the TerraMind command backend."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # SQLite for local dev; set to a postgresql:// URL in docker-compose / K8s.
    database_url: str = "sqlite:///./terramind.db"

    ai_service_url: str = "http://localhost:8001"
    scan_interval_sec: int = 20

    ao_codename: str = "AO SENTINEL"
    cors_origins: str = "*"  # comma-separated, or "*"


settings = Settings()
