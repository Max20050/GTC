from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    port: int = 8000
    env: str = "development"
    llm_model: str = ""
    anthropic_api_key: str = ""
    gcp_project: str = ""
    gcp_location: str = "us-central1"
    jwt_public_key: str = ""


settings = Settings()

STACK_REGISTRY: dict[str, dict] = {
    "python-fastapi": {
        "preferred_libs": ["sqlalchemy", "alembic", "pydantic-settings", "httpx", "pytest-asyncio"],
        "folder_convention": "app/routes, app/models, app/services, tests/",
        "prompt_template": "plan.txt",
    },
    "go-gin": {
        "preferred_libs": ["gin", "gorm", "viper", "testify", "go-migrate"],
        "folder_convention": "cmd/, internal/handlers, internal/models, internal/services",
        "prompt_template": "plan.txt",
    },
    "node-express": {
        "preferred_libs": ["express", "prisma", "zod", "jest", "supertest", "dotenv"],
        "folder_convention": "src/routes, src/models, src/services, tests/",
        "prompt_template": "plan.txt",
    },
}
