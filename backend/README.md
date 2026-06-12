# SmartTraffic AI Backend

SmartTraffic AI is a traffic prediction platform that uses route details, traffic records, incident data, and AI-based analysis to predict future route conditions.

This backend uses Node.js, Express, PostgreSQL, Prisma ORM, JWT authentication, admin-protected traffic tools, and an optional FastAPI AI service.

## PostgreSQL Setup

Create the database:

```sql
CREATE DATABASE smarttraffic_ai;
```

Create `backend/.env`:

```env
PORT=5000
DATABASE_URL=postgresql://postgres:Postgres123!@localhost:5432/smarttraffic_ai
JWT_SECRET=change_this_secret
FRONTEND_URL=http://localhost:5173
AI_SERVICE_URL=http://localhost:8000
QLDTRAFFIC_API_URL=
QLD_TRAFFIC_API_URL=
USE_MOCK_TRAFFIC_API=true
GEOCODING_PROVIDER=geoapify
ROUTING_PROVIDER=geoapify
GEOAPIFY_API_KEY=your_geoapify_api_key_here
```

If your PostgreSQL password is different, update only the password section of `DATABASE_URL`.

## Local Development Setup

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npx prisma db seed
npm run dev
```

If Prisma asks for a migration name, use:

```text
init
```

The API runs on `http://localhost:5000/api` by default.

## Geoapify Setup

Create a free Geoapify API key at `https://www.geoapify.com/`, then add it to `backend/.env`:

```env
GEOAPIFY_API_KEY=your_geoapify_api_key_here
```

The backend uses:

- Geoapify Autocomplete API through `GET /api/maps/autocomplete?text=...`
- Geoapify Routing API through `POST /api/maps/route`

The frontend also stores `VITE_GEOAPIFY_API_KEY` in `frontend/.env` so the interface can clearly detect whether map search has been configured.

## Default Local Super Admin

The seed keeps one default local super admin:

- Full name: Anita
- Email: `anita@smarttraffic.ai`
- Password: `12345`
- Role: `super_admin`

The seed also refreshes sample historical Queensland traffic records and incident records for local development.

PostgreSQL stores users, historical traffic records, QLDTraffic incidents, prediction history, saved trips, route geometry, distance, estimated duration, model training runs, and admin logs through Prisma.

The `historical_traffic_data` table is designed for up to five years of Queensland/Brisbane traffic data. The local seed creates sample historical records for development only, so real historical datasets can be imported later without changing the database architecture.

## Historical Traffic Data Import

Admins can import real historical traffic records into PostgreSQL from the Admin Upload Historical Traffic Data page. The import pipeline supports CSV and JSON files now. GeoJSON can be supplied later as JSON features if each feature contains the same properties.

The system architecture supports up to five years of historical traffic data, but the MVP should start with 1-2 years of clean data. Do not describe the model as trained on five years of data unless the database actually contains that date coverage. The app reports real coverage from the earliest and latest dates in `historical_traffic_data`, for example `Historical data coverage: 18 months`.

Required import fields:

- `road_name`
- `date`
- `time`
- `average_speed` or `traffic_volume`
- `congestion_level`

Optional import fields:

- `suburb`
- `latitude`
- `longitude`
- `day_of_week`
- `incident_count`
- `roadwork_active`
- `weather`
- `source`

Safe defaults and calculated values:

- `day_of_week` is calculated from `date` when missing.
- `congestion_level` can be calculated from `average_speed` or `traffic_volume` when missing.
- `incident_count` defaults to `0`.
- `roadwork_active` defaults to `false`.
- `weather` defaults to `unknown`.
- `source` defaults to `uploaded_file`.

Admin import routes:

- `POST /api/admin/historical-data/import`
- `GET /api/admin/historical-data/import-template`
- `GET /api/admin/historical-data/stats`

Duplicate handling uses:

```text
road_name + suburb/location + date + time
```

If a duplicate exists, the backend updates it only when the incoming row has more complete data. Otherwise it skips the duplicate. The import response returns total, inserted, updated, skipped duplicate, invalid rows, and validation errors.

After importing real historical data, go to Admin AI Management and click Train AI Model. The FastAPI service uses imported PostgreSQL records when at least 1,000 valid records exist. If fewer than 1,000 real records exist, it falls back to the sample CSV and clearly reports `sample-data` rather than `real-data`.

Training readiness:

- Less than 1,000 real records: not enough real data; sample-data fallback is used.
- 1,000-10,000 real records: small real-data model.
- 10,000+ real records: good MVP model data volume.
- 1-2 years of clean imported data: recommended MVP target.

## AI Service Setup

The backend connects to the Python FastAPI service using:

```env
AI_SERVICE_URL=http://localhost:8000
```

Run the AI service from the project root:

```bash
cd ai-service
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

Useful AI service endpoints:

- `GET http://localhost:8000/health`
- `GET http://localhost:8000/model/status`
- `POST http://localhost:8000/model/train`
- `POST http://localhost:8000/predict`

If the AI service is offline, the backend returns a rule-based traffic prediction so the route workflow can continue during local development.

AI prediction uses the selected route, travel date and time, historical traffic records, active/planned QLDTraffic incidents, roadworks, congestion data, and peak-hour features from PostgreSQL before calling the FastAPI Random Forest service. AI training uses imported historical traffic records when enough real records exist; otherwise it uses the sample training CSV and reports that honestly in model status.

## Development Traffic Source

Admins can fetch current/planned traffic events from:

- QLDTraffic Live API, once `QLDTRAFFIC_API_URL` or `QLD_TRAFFIC_API_URL` is configured
- Development Traffic Source for local development

Development source mode is controlled by:

```env
USE_MOCK_TRAFFIC_API=true
```

To use a real source later:

```env
USE_MOCK_TRAFFIC_API=false
QLD_TRAFFIC_API_URL=https://your-qldtraffic-geojson-url
```

The fetch route converts GeoJSON features into PostgreSQL incident records and admin logs. Normal users cannot upload, fetch, edit, or delete traffic or incident data.

Live trip tracking is handled in the browser with `navigator.geolocation.watchPosition` after the user clicks `Start Now`. If location permission is not allowed, the selected route remains available as a route preview without live tracking.

## API Routes

Auth:

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/admin-login`
- `GET /api/auth/me`
- `POST /api/auth/logout`

Users:

- `GET /api/users/profile`
- `PUT /api/users/profile`
- `PUT /api/users/change-password`
- `DELETE /api/users/account`

Predictions:

- `POST /api/predictions`
- `GET /api/predictions/history`
- `DELETE /api/predictions/history/:id`

Maps:

- `GET /api/maps/autocomplete`
- `POST /api/maps/route`

Admin:

- `GET /api/admin/dashboard`
- `GET /api/admin/users`
- `POST /api/admin/create-admin`
- `PUT /api/admin/change-role/:id`
- `DELETE /api/admin/remove-admin/:id`
- `POST /api/admin/fetch-live-data`
- `GET /api/admin/live-data/status`
- `GET /api/admin/traffic`
- `POST /api/admin/historical-data/import`
- `GET /api/admin/historical-data/import-template`
- `GET /api/admin/historical-data/stats`

## Troubleshooting

If the frontend cannot connect, check that PostgreSQL is running, `smarttraffic_ai` exists, `backend/.env` has the correct `DATABASE_URL`, Prisma migration and seed have completed, and the backend is running on `http://localhost:5000`.
