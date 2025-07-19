from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # API Configuration
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "GG-Sync API"
    
    # Database Configuration
    DATABASE_URL: str = "sqlite+aiosqlite:///./gg_sync.db"
    
    # Riot API Configuration
    RIOT_API_KEY: Optional[str] = None
    
    # CORS Configuration
    BACKEND_CORS_ORIGINS: list[str] = ["http://localhost:1420"]
    
    # Development Configuration
    DEBUG: bool = True
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "allow"  # This allows reading any extra .env variables


settings = Settings() 