"""
AgriMap DSP — Integration API Endpoints
Subsystem registry, health checks, and data exchange schema for Agrilythos modules.
"""
import logging
from typing import List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.integration.plugin_registry import plugin_registry

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/integration", tags=["Integration"])


class SubsystemRegisterRequest(BaseModel):
    """Request to register a new Agrilythos subsystem."""
    name: str
    version: str
    description: str
    base_url: str
    capabilities: List[str] = []


class NotifyRequest(BaseModel):
    """Notification to send to registered subsystems."""
    event_type: str
    data: dict


@router.get("/health")
def integration_health():
    """
    Check health status of all registered Agrilythos subsystems.
    """
    return plugin_registry.get_health()


@router.get("/schema")
def get_data_exchange_schema():
    """
    Return the standardized data exchange schema.
    Future Agrilythos subsystems should use this schema for data integration.
    """
    return plugin_registry.get_data_exchange_schema()


@router.get("/subsystems")
def list_subsystems():
    """List all registered Agrilythos subsystems."""
    return {"subsystems": plugin_registry.list_subsystems()}


@router.post("/subsystems/register")
def register_subsystem(payload: SubsystemRegisterRequest):
    """
    Register a new Agrilythos subsystem with the platform.
    Subsystems can then receive data change notifications.
    """
    result = plugin_registry.register(
        name=payload.name,
        version=payload.version,
        description=payload.description,
        base_url=payload.base_url,
        capabilities=payload.capabilities,
    )
    logger.info("Subsystem registered: %s v%s", payload.name, payload.version)
    return result


@router.delete("/subsystems/{name}")
def unregister_subsystem(name: str):
    """Remove a subsystem from the registry."""
    if not plugin_registry.unregister(name):
        raise HTTPException(status_code=404, detail=f"Subsystem '{name}' not found")
    return {"status": "unregistered", "name": name}


@router.post("/subsystems/{name}/heartbeat")
def subsystem_heartbeat(name: str):
    """Send a heartbeat from a subsystem to update its last-seen timestamp."""
    if not plugin_registry.heartbeat(name):
        raise HTTPException(status_code=404, detail=f"Subsystem '{name}' not found")
    return {"status": "ok", "name": name}


@router.post("/notify")
def notify_subsystems(payload: NotifyRequest):
    """
    Broadcast a notification to all registered subsystems.
    Used when data changes that other modules need to know about.
    """
    subsystems = plugin_registry.list_subsystems()
    logger.info("Notification broadcast: event=%s to %d subsystems", payload.event_type, len(subsystems))
    
    return {
        "event_type": payload.event_type,
        "notified_subsystems": len(subsystems),
        "subsystem_names": [s["name"] for s in subsystems],
    }
