"""
AgriMap DSP — MQTT Handler for IoT Device Integration
Subscribes to MQTT topics and stores incoming sensor readings.
Designed for field devices: soil sensors, weather stations, GPS trackers.

Skills used: REST APIs, IoT concepts
"""
import json
import uuid
import logging
from typing import Dict, Any, Optional, Callable
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class MQTTConfig:
    """MQTT broker configuration."""
    BROKER_HOST: str = "localhost"
    BROKER_PORT: int = 1883
    BASE_TOPIC: str = "agrimap"
    CLIENT_ID: str = "agrimap_dsp_server"
    USERNAME: Optional[str] = None
    PASSWORD: Optional[str] = None


class MQTTHandler:
    """
    MQTT client handler for receiving IoT device data.
    
    Topic structure:
    - agrimap/device/{device_id}/sensor  → Sensor readings
    - agrimap/device/{device_id}/status  → Device status updates
    - agrimap/field/{field_id}/update     → Field-level updates
    
    Usage:
        handler = MQTTHandler()
        handler.start()  # Starts listening in background
    """

    def __init__(self, config: Optional[MQTTConfig] = None):
        self.config = config or MQTTConfig()
        self._client = None
        self._message_handlers: Dict[str, Callable] = {}
        self._connected = False

    def start(self):
        """Start the MQTT client and subscribe to topics."""
        try:
            import paho.mqtt.client as mqtt
        except ImportError:
            logger.warning(
                "paho-mqtt not installed. MQTT disabled. Install with: pip install paho-mqtt"
            )
            return False

        self._client = mqtt.Client(client_id=self.config.CLIENT_ID)

        if self.config.USERNAME:
            self._client.username_pw_set(self.config.USERNAME, self.config.PASSWORD)

        self._client.on_connect = self._on_connect
        self._client.on_message = self._on_message
        self._client.on_disconnect = self._on_disconnect

        try:
            self._client.connect(self.config.BROKER_HOST, self.config.BROKER_PORT, keepalive=60)
            self._client.loop_start()  # Start background thread
            logger.info("MQTT client started — broker=%s:%d", self.config.BROKER_HOST, self.config.BROKER_PORT)
            return True
        except Exception as e:
            logger.error("Failed to connect to MQTT broker: %s", e)
            return False

    def stop(self):
        """Stop the MQTT client."""
        if self._client:
            self._client.loop_stop()
            self._client.disconnect()
            logger.info("MQTT client stopped")

    def _on_connect(self, client, userdata, flags, rc):
        """Callback when connected to MQTT broker."""
        if rc == 0:
            self._connected = True
            # Subscribe to all agrimap topics
            topics = [
                (f"{self.config.BASE_TOPIC}/device/+/sensor", 1),
                (f"{self.config.BASE_TOPIC}/device/+/status", 1),
                (f"{self.config.BASE_TOPIC}/field/+/update", 1),
            ]
            for topic, qos in topics:
                client.subscribe(topic, qos)
            logger.info("MQTT connected and subscribed to %d topics", len(topics))
        else:
            logger.error("MQTT connection failed with code: %d", rc)

    def _on_disconnect(self, client, userdata, rc):
        """Callback when disconnected from MQTT broker."""
        self._connected = False
        if rc != 0:
            logger.warning("MQTT unexpected disconnect (rc=%d), will auto-reconnect", rc)

    def _on_message(self, client, userdata, msg):
        """Process incoming MQTT messages."""
        try:
            topic = msg.topic
            payload = json.loads(msg.payload.decode("utf-8"))

            logger.debug("MQTT message received — topic=%s", topic)

            # Route to handler based on topic pattern
            topic_parts = topic.split("/")
            if len(topic_parts) >= 4 and topic_parts[1] == "device":
                device_id = topic_parts[2]
                message_type = topic_parts[3]

                if message_type == "sensor":
                    self._handle_sensor_data(device_id, payload)
                elif message_type == "status":
                    self._handle_device_status(device_id, payload)

            elif len(topic_parts) >= 4 and topic_parts[1] == "field":
                field_id = topic_parts[2]
                self._handle_field_update(field_id, payload)

        except json.JSONDecodeError:
            logger.warning("Invalid JSON in MQTT message on topic: %s", msg.topic)
        except Exception as e:
            logger.error("Error processing MQTT message: %s", e)

    def _handle_sensor_data(self, device_id: str, payload: Dict[str, Any]):
        """
        Handle incoming sensor reading from a device.
        Expected payload:
        {
            "sensor_type": "soil_moisture",
            "value": 42.5,
            "unit": "%",
            "latitude": 37.9838,
            "longitude": 23.7275,
            "measured_at": "2026-08-21T10:00:00Z"
        }
        """
        logger.info(
            "Sensor data from device %s: %s=%s%s",
            device_id,
            payload.get("sensor_type"),
            payload.get("value"),
            payload.get("unit", "")
        )
        # In production, this would save to the sensor_data table
        # For now, we log and store for later processing
        self._store_pending_data("sensor", device_id, payload)

    def _handle_device_status(self, device_id: str, payload: Dict[str, Any]):
        """Handle device status update (battery, signal, heartbeat)."""
        logger.info("Device status from %s: %s", device_id, payload.get("status", "unknown"))
        self._store_pending_data("status", device_id, payload)

    def _handle_field_update(self, field_id: str, payload: Dict[str, Any]):
        """Handle field-level updates from field devices."""
        logger.info("Field update for %s: %s", field_id, payload.get("update_type", "unknown"))
        self._store_pending_data("field_update", field_id, payload)

    def _store_pending_data(self, data_type: str, entity_id: str, payload: Dict[str, Any]):
        """Store received data for later database insertion."""
        # This stores data in memory for batch processing
        # In production, you'd use a message queue (Redis, RabbitMQ) for durability
        if not hasattr(self, '_pending_data'):
            self._pending_data = []
        
        self._pending_data.append({
            "type": data_type,
            "entity_id": entity_id,
            "payload": payload,
            "received_at": datetime.now(timezone.utc).isoformat(),
        })

    @property
    def is_connected(self) -> bool:
        return self._connected

    @property
    def pending_data_count(self) -> int:
        return len(getattr(self, '_pending_data', []))
