from fastapi import FastAPI

from app.config import settings

app = FastAPI(title="build-agent", version="0.1.0")


@app.get("/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.port, reload=settings.env == "development")
