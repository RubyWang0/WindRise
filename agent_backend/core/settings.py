import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Agent MVP Backend"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    # LLM default temperature (used as temperature_start when creating new sessions)
    Temperature: float = 0.2

    # Workspace Config - Moved to the project root (windrise_agent/workspace)
    # This prevents the backend from reloading when files are written during execution.
    WORKSPACE_BASE_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "workspace")

    
    

    class Config:
        case_sensitive = True

settings = Settings()

# Ensure workspace dir exists
os.makedirs(settings.WORKSPACE_BASE_DIR, exist_ok=True)
