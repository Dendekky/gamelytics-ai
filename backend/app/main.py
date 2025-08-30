from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.api.v1.api import api_router
from app.services.cache_service import cache_manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize cache cleanup task
    await cache_manager.start_cleanup_task(interval_seconds=300)  # Clean every 5 minutes
    print("🚀 Started cache cleanup task")
    yield
    # Shutdown: Stop cache cleanup task
    await cache_manager.stop_cleanup_task()
    print("🛑 Stopped cache cleanup task")


app = FastAPI(
    title="GG-Sync API",
    description="League of Legends Performance Analysis Engine API",
    version="0.1.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

# Set up CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:1420"],  # Tauri dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
async def root():
    return {"message": "GG-Sync API is running!"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"} 