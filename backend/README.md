# 🌾 AgriMap DSP — Digital Land & Systems Platform

**Backend API for V2V Agrilythos (AGX) Digital Land Mapping Pre-Assessment**

> Digitally capture a farmer's field — boundaries, water sources, power sources, irrigation systems, structures — as a structured data foundation for the Agrilythos system.

---

## Quick Start

### Option 1: Docker (Recommended)

```bash
# Start database + API
docker-compose up -d

# API available at:
# http://localhost:8000
# Docs: http://localhost:8000/docs
```

### Option 2: Local Development

```bash
# 1. Create and activate virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac

# 2. Install dependencies
pip install -r requirements.txt

# 3. Set up PostgreSQL + PostGIS database
# Create database 'agrimap_dsp' and run:
psql -U postgres -d agrimap_dsp -f schema.sql
psql -U postgres -d agrimap_dsp -f seed.sql

# 4. Configure environment
cp .env.example .env
# Edit .env with your database credentials

# 5. Run the server
uvicorn app.main:app --reload --port 8000
```

---

## API Documentation

Once running, visit:
- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

### Authentication

All endpoints (except `/api/v1/auth/register` and `/api/v1/auth/login`) require a JWT Bearer token.

```bash
# 1. Register a user
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"surveyor@agrimap.com","password":"password123","full_name":"Test User","role":"surveyor"}'

# 2. Login to get token
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"surveyor@agrimap.com","password":"password123"}'

# 3. Use token in subsequent requests
curl -H "Authorization: Bearer <your-token>" http://localhost:8000/api/v1/projects/
```

---

## API Endpoints

| Resource | Endpoint | Methods |
|----------|----------|---------|
| **Auth** | `/api/v1/auth/` | POST register, POST login, GET me |
| **Users** | `/api/v1/users/` | CRUD (admin-only create/delete) |
| **Projects** | `/api/v1/projects/` | CRUD |
| **Farmers** | `/api/v1/farmers/` | CRUD |
| **Fields** | `/api/v1/fields/` | CRUD + boundary + verify |
| **Zones** | `/api/v1/zones/` | CRUD + verify |
| **Resources** | `/api/v1/resources/` | CRUD + verify |
| **Reference Points** | `/api/v1/reference-points/` | CRUD + verify |
| **Observations** | `/api/v1/observations/` | CRUD + verify |
| **Photos** | `/api/v1/photos/` | CRUD + upload + download |

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Framework | FastAPI |
| Database | PostgreSQL + PostGIS |
| ORM | SQLAlchemy 2.x |
| Spatial | GeoAlchemy2 + Shapely |
| Auth | JWT (python-jose) + bcrypt (passlib) |
| Validation | Pydantic v2 |
| Migrations | Alembic |

---

## Project Structure

```
V2V/
├── app/
│   ├── main.py                  # FastAPI application
│   ├── core/
│   │   ├── config.py            # Settings (from .env)
│   │   ├── database.py          # SQLAlchemy engine
│   │   ├── security.py          # JWT auth + password hashing
│   │   ├── spatial.py           # GeoJSON ↔ PostGIS conversion
│   │   ├── exceptions.py        # DB error handlers
│   │   └── logging_config.py    # Structured logging
│   ├── models/                  # SQLAlchemy ORM models (9 tables)
│   ├── schemas/                 # Pydantic validation schemas
│   └── api/v1/                  # REST API endpoints
├── tests/                       # pytest test suite
├── uploads/                     # Photo file storage
├── schema.sql                   # Database DDL
├── seed.sql                     # Sample data
├── docker-compose.yml           # Docker setup
├── Dockerfile
├── requirements.txt
└── .env
```

---

## Data Flow

```
Field Survey → REST API (FastAPI) → Validation (Pydantic) → ORM (SQLAlchemy) → PostgreSQL+PostGIS → API Response (GeoJSON) → Frontend Map
```

---

## Team

| Member | Role |
|--------|------|
| Bavanies | Mentor |
| Ram Prasath | Frontend |
| Kishore | Backend |
| Ravi | Platform |

---

*AgriMap DSP — V2V Tech London Project — August 2026*
