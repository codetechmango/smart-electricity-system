# Smart Electricity System

Smart Electricity System is a full-stack web platform for monitoring electricity usage, detecting anomalies, generating billing insights, and supporting role-based workflows for admins and consumers.

## Overview

This repository contains:

- A FastAPI backend for authentication, meter ingestion, billing logic, alerting, and dashboard APIs.
- A Next.js frontend for admin and user dashboards, charts, billing views, alerts, and profile workflows.
- A local SQLite persistence layer for rapid setup and demo use.

## Key Features

- Role-based authentication (`admin` and `user`).
- Meter reading capture and usage tracking.
- Consumption anomaly detection and alert generation.
- Billing calculation workflows.
- Admin dashboard metrics and user management endpoints.
- Responsive frontend dashboards with charts and data tables.

## Tech Stack

### Backend

- Python 3.10+
- FastAPI
- SQLAlchemy
- Uvicorn
- Pydantic

### Frontend

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4
- Axios
- Recharts

## Repository Structure

```text
smart-electricity-system/
├── backend/
│   ├── app/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── ml_models/
│   │   └── ...
│   ├── requirements.txt
│   └── electricity.db
└── frontend/
		├── src/
		│   ├── app/
		│   ├── components/
		│   ├── services/
		│   └── ...
		└── package.json
```

## Getting Started

## Prerequisites

- Python 3.10 or newer
- Node.js 20 or newer
- npm 10 or newer

### 1) Clone the Repository

```bash
git clone https://github.com/codetechmango/smart-electricity-system.git
cd smart-electricity-system
```

### 2) Run Backend (FastAPI)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be available at:

- API base URL: `http://localhost:8000`
- Swagger docs: `http://localhost:8000/docs`

### 3) Run Frontend (Next.js)

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend will be available at:

- `http://localhost:3000`

By default, the frontend calls backend APIs at `http://localhost:8000`.

To override the backend URL, create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

## Demo Accounts

The backend seeds default users at startup:

- Admin
	- Email: `admin@smartgrid.com`
	- Password: `Admin@123`
- User
	- Email: `priya@consumer.com`
	- Password: `User@123`

## Backend API Areas

- `POST /auth/register` and `POST /auth/login`
- `/admin/*` admin workflows
- `/meter/*` meter reading workflows
- `/users/*` user-facing workflows
- `/dashboard/*` dashboard metrics

## Frontend Scripts

From `frontend/`:

- `npm run dev` - start development server
- `npm run build` - create production build
- `npm run start` - run production server
- `npm run lint` - run lint checks

## Deployment Notes

- Replace permissive CORS settings in production.
- Move secrets and environment-specific values to environment variables.
- Use a production-grade database (for example PostgreSQL) instead of SQLite.
- Serve backend and frontend over HTTPS behind a reverse proxy.

## Contributing

1. Create a feature branch from `main`.
2. Make and test changes locally.
3. Open a pull request with a clear summary and screenshots for UI changes.

## License

Add a project license file (for example MIT) if you plan to open source this repository.