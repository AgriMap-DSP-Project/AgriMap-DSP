import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.exceptions import register_exception_handlers
from app.core.logging_config import setup_logging
from app.api.v1 import v1_router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    # Startup
    setup_logging()
    logger.info("AgriMap DSP starting — %s", settings.PROJECT_NAME)
    
    # Ensure upload directory exists
    import os
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    
    yield
    
    # Shutdown
    logger.info("AgriMap DSP shutting down")


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend API for AgriMap DSP — Digital Land Mapping Pre-Assessment module under V2V Agrilythos (AGX).",
    version="1.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Set CORS middleware with configurable origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register custom database exception handlers globally
register_exception_handlers(app)

# Mount uploaded files as static for serving
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Mount API routers under v1Str path
app.include_router(v1_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["Health"])
def health_check():
    """
    Service health check endpoint.
    """
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "version": "1.0.0",
        "api_docs": "/docs"
    }
