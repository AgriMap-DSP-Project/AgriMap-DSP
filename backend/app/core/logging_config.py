"""
AgriMap DSP — Structured Logging Configuration
"""
import logging
import sys
from app.core.config import settings


def setup_logging() -> None:
    """
    Configure structured logging for the application.
    Log level is controlled via the LOG_LEVEL environment variable.
    """
    log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
    
    # Root logger configuration
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    
    # Clear existing handlers to avoid duplicates on reload
    root_logger.handlers.clear()
    
    # Console handler with structured format
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(log_level)
    
    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(name)-30s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)
    
    # Suppress noisy third-party loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(
        logging.INFO if log_level == logging.DEBUG else logging.WARNING
    )
    
    logging.getLogger("app").info(
        "Logging initialized — level=%s, service=%s",
        settings.LOG_LEVEL, settings.PROJECT_NAME
    )
