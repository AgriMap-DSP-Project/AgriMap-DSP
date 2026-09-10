"""
AgriMap DSP — Plugin Registry for Agrilythos Subsystem Integration
Provides a registry pattern for future Agrilythos modules to register and exchange data.
"""
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class SubsystemInfo:
    """Information about a registered Agrilythos subsystem."""

    def __init__(self, name: str, version: str, description: str, base_url: str, capabilities: List[str]):
        self.name = name
        self.version = version
        self.description = description
        self.base_url = base_url
        self.capabilities = capabilities
        self.registered_at = datetime.now(timezone.utc)
        self.last_heartbeat = self.registered_at
        self.status = "active"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "version": self.version,
            "description": self.description,
            "base_url": self.base_url,
            "capabilities": self.capabilities,
            "status": self.status,
            "registered_at": self.registered_at.isoformat(),
            "last_heartbeat": self.last_heartbeat.isoformat(),
        }


class PluginRegistry:
    """
    Registry for Agrilythos subsystems to register, discover, and communicate.
    
    Future subsystems (e.g., crop monitoring, yield prediction, market analysis)
    can register here and receive data change notifications.
    """

    def __init__(self):
        self._subsystems: Dict[str, SubsystemInfo] = {}

    def register(self, name: str, version: str, description: str,
                 base_url: str, capabilities: List[str]) -> Dict[str, Any]:
        """Register a new subsystem with the platform."""
        info = SubsystemInfo(name, version, description, base_url, capabilities)
        self._subsystems[name] = info
        logger.info("Subsystem registered: %s v%s", name, version)
        return info.to_dict()

    def unregister(self, name: str) -> bool:
        """Remove a subsystem from the registry."""
        if name in self._subsystems:
            del self._subsystems[name]
            logger.info("Subsystem unregistered: %s", name)
            return True
        return False

    def heartbeat(self, name: str) -> bool:
        """Update the last heartbeat timestamp for a subsystem."""
        if name in self._subsystems:
            self._subsystems[name].last_heartbeat = datetime.now(timezone.utc)
            return True
        return False

    def get_subsystem(self, name: str) -> Optional[Dict[str, Any]]:
        """Get info about a specific subsystem."""
        info = self._subsystems.get(name)
        return info.to_dict() if info else None

    def list_subsystems(self) -> List[Dict[str, Any]]:
        """List all registered subsystems."""
        return [info.to_dict() for info in self._subsystems.values()]

    def get_health(self) -> Dict[str, Any]:
        """Get health status of all registered subsystems."""
        return {
            "total_subsystems": len(self._subsystems),
            "active": sum(1 for s in self._subsystems.values() if s.status == "active"),
            "subsystems": {
                name: {"status": info.status, "last_heartbeat": info.last_heartbeat.isoformat()}
                for name, info in self._subsystems.items()
            },
            "checked_at": datetime.now(timezone.utc).isoformat(),
        }

    def get_data_exchange_schema(self) -> Dict[str, Any]:
        """Return the standardized data exchange schema for subsystem integration."""
        return {
            "schema_version": "1.0.0",
            "platform": "AgriMap DSP",
            "entities": {
                "field": {
                    "id": "uuid",
                    "name": "string",
                    "boundary": "GeoJSON MultiPolygon",
                    "crop_type": "string",
                    "area_hectares": "float",
                    "verification_status": "enum(pending, verified, rejected)",
                },
                "resource": {
                    "id": "uuid",
                    "name": "string",
                    "resource_class": "enum(WATER, POWER, IRRIGATION, STRUCTURE, OTHER)",
                    "geom": "GeoJSON Geometry",
                    "attributes": "JSONB",
                },
                "observation": {
                    "id": "uuid",
                    "category": "enum(soil_health, crop_growth, pest_weed_infestation, damage, general)",
                    "severity": "enum(low, medium, high, critical)",
                    "geom": "GeoJSON Point",
                },
                "sensor_data": {
                    "id": "uuid",
                    "device_id": "uuid",
                    "sensor_type": "string",
                    "value": "float",
                    "unit": "string",
                    "measured_at": "datetime(ISO 8601)",
                },
            },
            "events": {
                "field.created": "Emitted when a new field is mapped",
                "field.verified": "Emitted when a field boundary is verified",
                "resource.created": "Emitted when a new resource is mapped",
                "observation.created": "Emitted when a new observation is logged",
                "sensor.reading": "Emitted when a new sensor reading arrives",
            },
        }


# Global singleton instance
plugin_registry = PluginRegistry()
