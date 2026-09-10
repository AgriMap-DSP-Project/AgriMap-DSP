from app.schemas.auth import LoginRequest, TokenResponse
from app.schemas.pagination import PaginatedResponse
from app.schemas.user import UserBase, UserCreate, UserUpdate, UserRead
from app.schemas.project import ProjectBase, ProjectCreate, ProjectUpdate, ProjectRead
from app.schemas.farmer import FarmerBase, FarmerCreate, FarmerUpdate, FarmerRead
from app.schemas.field import FieldBase, FieldCreate, FieldUpdate, FieldRead, FieldVerificationUpdate
from app.schemas.zone import FieldZoneBase, FieldZoneCreate, FieldZoneUpdate, FieldZoneRead
from app.schemas.resource import ResourceBase, ResourceCreate, ResourceUpdate, ResourceRead
from app.schemas.reference_point import ReferencePointBase, ReferencePointCreate, ReferencePointUpdate, ReferencePointRead
from app.schemas.observation import ObservationBase, ObservationCreate, ObservationUpdate, ObservationRead
from app.schemas.photo import PhotoBase, PhotoCreate, PhotoUpdate, PhotoRead
from app.schemas.device import DeviceBase, DeviceCreate, DeviceUpdate, DeviceRead
from app.schemas.sensor_data import SensorDataBase, SensorDataCreate, SensorDataBulkCreate, SensorDataRead

__all__ = [
    "LoginRequest", "TokenResponse",
    "PaginatedResponse",
    "UserBase", "UserCreate", "UserUpdate", "UserRead",
    "ProjectBase", "ProjectCreate", "ProjectUpdate", "ProjectRead",
    "FarmerBase", "FarmerCreate", "FarmerUpdate", "FarmerRead",
    "FieldBase", "FieldCreate", "FieldUpdate", "FieldRead", "FieldVerificationUpdate",
    "FieldZoneBase", "FieldZoneCreate", "FieldZoneUpdate", "FieldZoneRead",
    "ResourceBase", "ResourceCreate", "ResourceUpdate", "ResourceRead",
    "ReferencePointBase", "ReferencePointCreate", "ReferencePointUpdate", "ReferencePointRead",
    "ObservationBase", "ObservationCreate", "ObservationUpdate", "ObservationRead",
    "PhotoBase", "PhotoCreate", "PhotoUpdate", "PhotoRead",
    "DeviceBase", "DeviceCreate", "DeviceUpdate", "DeviceRead",
    "SensorDataBase", "SensorDataCreate", "SensorDataBulkCreate", "SensorDataRead",
]
