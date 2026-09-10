"""
AgriMap DSP — WebSocket Endpoint for Real-time Updates
Pushes live updates to connected frontend clients.
"""
import json
import uuid
import logging
from typing import Dict, Set
from datetime import datetime, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/websocket", tags=["Real-time Updates"])


class ConnectionManager:
    """Manages WebSocket connections for real-time field updates."""

    def __init__(self):
        # field_id → set of connected websockets
        self._connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, field_id: str):
        """Accept a WebSocket connection for a field."""
        await websocket.accept()
        if field_id not in self._connections:
            self._connections[field_id] = set()
        self._connections[field_id].add(websocket)
        logger.info("WebSocket connected: field=%s (total=%d)", field_id, len(self._connections[field_id]))

    def disconnect(self, websocket: WebSocket, field_id: str):
        """Remove a WebSocket connection."""
        if field_id in self._connections:
            self._connections[field_id].discard(websocket)
            if not self._connections[field_id]:
                del self._connections[field_id]
        logger.info("WebSocket disconnected: field=%s", field_id)

    async def broadcast_to_field(self, field_id: str, message: Dict):
        """Send a message to all clients connected to a field."""
        connections = self._connections.get(field_id, set())
        dead_connections = set()

        for websocket in connections:
            try:
                await websocket.send_json(message)
            except Exception:
                dead_connections.add(websocket)

        # Clean up dead connections
        for ws in dead_connections:
            self._connections.get(field_id, set()).discard(ws)

    async def broadcast_all(self, message: Dict):
        """Send a message to all connected clients."""
        for field_id in list(self._connections.keys()):
            await self.broadcast_to_field(field_id, message)

    @property
    def active_connections(self) -> int:
        return sum(len(conns) for conns in self._connections.values())

    @property
    def active_fields(self) -> int:
        return len(self._connections)


# Global connection manager
ws_manager = ConnectionManager()


@router.websocket("/ws/field/{field_id}")
async def websocket_field_updates(websocket: WebSocket, field_id: str):
    """
    WebSocket endpoint for real-time field updates.
    
    Connect to receive live notifications when:
    - New resources are added to the field
    - Observations are logged
    - Verification status changes
    - Sensor data arrives
    
    Usage (JavaScript):
    ```
    const ws = new WebSocket('ws://localhost:8000/ws/field/<field-id>');
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('Update:', data);
    };
    ```
    """
    await ws_manager.connect(websocket, field_id)

    # Send welcome message
    await websocket.send_json({
        "type": "connected",
        "field_id": field_id,
        "message": f"Connected to real-time updates for field {field_id}",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })

    try:
        while True:
            # Keep connection alive, receive any client messages
            data = await websocket.receive_text()

            # Echo back with timestamp (clients can send pings)
            try:
                parsed = json.loads(data)
                if parsed.get("type") == "ping":
                    await websocket.send_json({
                        "type": "pong",
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "active_connections": ws_manager.active_connections,
                    })
            except json.JSONDecodeError:
                pass

    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, field_id)


@router.websocket("/ws/dashboard")
async def websocket_dashboard(websocket: WebSocket):
    """
    WebSocket endpoint for dashboard-wide real-time updates.
    Receives notifications for all fields.
    """
    await ws_manager.connect(websocket, "__dashboard__")

    await websocket.send_json({
        "type": "connected",
        "message": "Connected to dashboard updates",
        "active_fields": ws_manager.active_fields,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })

    try:
        while True:
            data = await websocket.receive_text()
            parsed = json.loads(data) if data else {}
            if parsed.get("type") == "ping":
                await websocket.send_json({
                    "type": "pong",
                    "active_fields": ws_manager.active_fields,
                    "active_connections": ws_manager.active_connections,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })
    except (WebSocketDisconnect, json.JSONDecodeError):
        ws_manager.disconnect(websocket, "__dashboard__")
