# AgriMap DSP — Frontend

React + Vite frontend for the AgriMap Digital Land Mapping Platform.

## Quick Start

```bash
# 1. Make sure the backend is running first
cd ../backend
docker-compose up -d

# 2. Install dependencies
cd ../frontend
npm install

# 3. Start the dev server
npm run dev
```

Open http://localhost:5173

## Test Accounts

| Role      | Email                       | Password    |
|-----------|-----------------------------|-------------|
| Admin     | admin@agrimap.local         | admin123    |
| Surveyor  | surveyor@agrimap.local      | surveyor123 |
| Verifier  | verifier@agrimap.local      | verifier123 |

## Pages

| Route                  | Description                         | Roles              |
|------------------------|-------------------------------------|--------------------|
| /login                 | OAuth2 password-flow login          | Public             |
| /register              | Create surveyor/verifier account    | Public             |
| /dashboard             | Projects, stats, live alerts        | All                |
| /projects/:id          | Fields, farmers, verification       | All                |
| /map/:fieldId          | Interactive satellite map           | All                |
| /iot                   | IoT device list                     | All                |
| /iot/:fieldId          | Field-specific live sensor charts   | All                |
| /data-tools            | CSV/GeoJSON import, exports         | Admin, Surveyor    |
| /users                 | User management                     | Admin only         |

## Architecture

```
src/
  lib/api.js              Axios instance + JWT interceptor + tokenStore
  contexts/AuthContext.jsx Global auth state (memory token, not localStorage)
  components/
    layout/               AppLayout sidebar + ProtectedRoute
    ui/                   Pagination, Modal, StatusBadge, Toast
    verification/         VerificationDrawer (verifier/admin)
    survey/               SurveyEntryPanel (surveyor: resource/refpt/obs/photo)
    ai/                   AIInsightsPanel (analysis + RAG query)
  pages/
    LoginPage             OAuth2 form-urlencoded login
    RegisterPage          New account creation
    DashboardPage         Projects table + IoT device list + live WS alerts
    ProjectDetailPage     Fields + farmers + create forms + verify links
    MapViewPage           Leaflet satellite map with layer toggles
    IoTDashboardPage      Recharts history + live WebSocket feed
    DataToolsPage         CSV/GeoJSON upload + export tools
    UsersPage             Admin user management table
```

## Key Implementation Notes

- **Token storage**: in-memory only (`tokenStore` singleton). A `sessionStorage` flag
  tracks tab session so hard refresh prompts re-login cleanly.
- **Auth interceptor**: every Axios request gets `Authorization: Bearer <token>` automatically.
  401 responses fire `auth:logout` event → AuthContext clears state.
- **Verification payloads**: use `verification_status` + `verification_notes` (not `status`/`notes`)
  as confirmed from the backend `FieldVerificationUpdate` schema.
- **GeoJSON formats**: Fields → `MultiPolygon`, Zones → `Polygon`, everything else → `Point`/`Geometry`.
- **WebSocket heartbeat**: `{"type":"ping"}` every 30s; `{"type":"auth","token":"..."}` on connect.
- **Photo download**: served via `/api/v1/photos/{id}/download` with bearer token via Vite proxy.
