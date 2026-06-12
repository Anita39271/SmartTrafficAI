# SmartTraffic AI Frontend

React and Vite frontend for SmartTraffic AI, a traffic prediction platform for Queensland route planning.

## Local Development Setup

```bash
cd frontend
npm install
npm run dev
```

Open the local URL shown by Vite.

## Backend Connection

The frontend reads `VITE_API_URL` from `.env` when present:

```env
VITE_API_URL=http://localhost:5000/api
VITE_GEOAPIFY_API_KEY=your_geoapify_api_key_here
```

User sign-up, user login, admin login, prediction history, saved routes, traffic records, and settings use the Node.js backend and PostgreSQL database.

## Pages Included

Public:

- Home
- User Login
- User Sign-up
- Admin Login

User:

- Map / Route Prediction
- Prediction Result
- History
- Profile
- Settings

Admin:

- Admin Dashboard
- Upload Historical Data
- Traffic Records
- Fetch QLDTraffic Data
- AI Management
- Manage Admins
- Reports / Analytics
- Admin Profile

## Notes

- JWT token, user session, and theme are saved in `localStorage`.
- The Map / Route Prediction page uses Leaflet with OpenStreetMap tiles, Geoapify autocomplete for address search, and backend Geoapify routing for route lines.
- The theme toggle appears once at the top-right through the shared layout.

## Geoapify Setup

Create a free Geoapify API key at `https://www.geoapify.com/`, then add it to `frontend/.env`:

```env
VITE_GEOAPIFY_API_KEY=your_geoapify_api_key_here
```

Address typing calls the backend autocomplete route, which uses Geoapify Autocomplete API. Route calculation calls the backend route endpoint, which uses Geoapify Routing API and returns route geometry for the Leaflet map. The backend also needs `GEOAPIFY_API_KEY` in `backend/.env`.

Live trip tracking uses browser geolocation. The app asks for location permission only after the user clicks `Start Now`; it does not create automatic trip progress without real location updates.
