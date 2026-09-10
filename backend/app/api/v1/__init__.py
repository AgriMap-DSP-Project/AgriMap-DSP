from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.users import router as users_router
from app.api.v1.projects import router as projects_router
from app.api.v1.farmers import router as farmers_router
from app.api.v1.fields import router as fields_router
from app.api.v1.zones import router as zones_router
from app.api.v1.resources import router as resources_router
from app.api.v1.reference_points import router as reference_points_router
from app.api.v1.observations import router as observations_router
from app.api.v1.photos import router as photos_router
from app.api.v1.ingestion import router as ingestion_router
from app.api.v1.export import router as export_router
from app.api.v1.ai import router as ai_router
from app.api.v1.devices import router as devices_router
from app.api.v1.webhooks import router as webhooks_router
from app.api.v1.websocket import router as websocket_router
from app.api.v1.integration import router as integration_router

v1_router = APIRouter()

# --- Kishore's Core APIs ---
v1_router.include_router(auth_router)
v1_router.include_router(users_router)
v1_router.include_router(projects_router)
v1_router.include_router(farmers_router)
v1_router.include_router(fields_router)
v1_router.include_router(zones_router)
v1_router.include_router(resources_router)
v1_router.include_router(reference_points_router)
v1_router.include_router(observations_router)
v1_router.include_router(photos_router)

# --- Ravi's Platform APIs ---
v1_router.include_router(ingestion_router)
v1_router.include_router(export_router)
v1_router.include_router(ai_router)
v1_router.include_router(devices_router)
v1_router.include_router(webhooks_router)
v1_router.include_router(websocket_router)
v1_router.include_router(integration_router)
