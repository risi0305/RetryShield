# RetryShield

Payment incident replay simulator.

## Structure

```
/client   React + Vite + TypeScript + Tailwind frontend
/server   Node.js + Express backend (idempotency checks, Firestore access, AI API calls)
```

The frontend never talks to Firestore or the AI API directly. All of that goes
through the backend so that credentials stay server-side and every write passes
through the idempotency check.

## Prerequisites

- Node.js 18+
- A Firebase project with Firestore enabled, and a service account key for the
  Admin SDK

## Setup

### Server

```bash
cd server
npm install
cp .env.example .env   # fill in Firebase + AI API credentials
npm run dev
```

Runs on `http://localhost:4000` by default. Health check: `GET /api/health`.

### Client

```bash
cd client
npm install
npm run dev
```

Runs on `http://localhost:5173` by default (Vite's default port).

## Environment variables (server/.env)

See `server/.env.example` for the full list:

- `PORT` — port for the Express server
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` — Firebase Admin SDK service account credentials
- `AI_API_KEY` — key for the AI provider, used only server-side

## Notes

- This is currently just a scaffold: the client renders a placeholder page and
  the server exposes a single health check route. No product features are
  implemented yet.
# RetryShield
