# Atlas · Data training portal

A small, working sales analytics website for UI automation and API testing training. React + Vite, FastAPI, and SQLite. All data is fictional. Includes dashboards, sales CRUD, saved reports, CSV exports, eight API learning chapters, and three deliberately selectable defects.

## Run locally

Requires Python 3.12+ and Node.js 22.12+ (validated with Python 3.12 and Node 24).

```bash
bash scripts/setup.sh
bash scripts/start.sh
```

Open the server on port **8000** in your local browser. The backend serves the built React UI and the API from the same origin. Interactive Swagger documentation is at `/docs`; the OpenAPI contract is at `/openapi.json`.

| Account | Role | Password |
| --- | --- | --- |
| `admin@atlas.test` | Administrator | `Training123!` |
| `analyst@atlas.test` | Analyst | `Training123!` |
| `jordan@atlas.test` | Second analyst for ownership tests | `Training123!` |

These are public practice credentials, not production accounts. This intentionally vulnerable training application belongs in an isolated training environment. Do not store company or personal data in it.

## Develop

Run these in separate terminals from the repository root:

```bash
.venv/bin/python -m uvicorn backend.app:app --reload --port 8000
npm run dev --prefix frontend
```

Vite proxies `/api`, `/docs`, and `/openapi.json` to the backend. Rebuild the frontend before starting the combined server if you changed frontend source. No external service, API key, or database server is required.

## Data and training modes

On first startup, SQLite is created at `backend/atlas.sqlite3` with 120 sales dated January 1–April 30, 2026, three users, and two saved reports. The data persists across restarts. Override the database path with `ATLAS_DB_PATH`; choose a separate path per learner/team instance. `PORT` changes the combined server's port.

Clean mode is the default. Administrators can enable individual defects in **Instructor lab**. The lab also resets the database after an explicit typed confirmation. Reset deletes all custom records, resets defect settings, restores practice accounts, and revokes **all** sessions. Defect settings and data are shared by everyone on an instance. Learners can inspect mode through `/api/training`; this is a teaching exercise, not a hidden assessment system.

[Training chapters and expected behavior](docs/training.md) · [Instructor defect catalogue](docs/instructor.md)

## Tests

```bash
.venv/bin/python -m pytest backend/tests -q
npm run build --prefix frontend
```

API tests use a fresh temporary database for each test and do not alter the running training database. They verify authentication, roles, CRUD, input boundaries, pagination, aggregates, report ownership, CSV contents, formula escaping, reset, and every intentional defect. CI runs this suite and the frontend build.

The initial implementation was also checked in Chromium for login, dashboards, sale creation, report create/edit/export/delete, defect toggling, reset, role switching, and a 390px mobile viewport. Browser smoke checks are manual validation, separate from the committed API test suite.

## API example

Authenticate with `POST /api/auth/login` and JSON:

```json
{"email":"analyst@atlas.test","password":"Training123!"}
```

Use the returned `access_token` as `Authorization: Bearer <token>` on subsequent calls, for example `GET /api/sales?region=Europe&page=1&page_size=10`. Sessions expire after 12 hours and can be revoked with `POST /api/auth/logout`.

## First-version scope

This version supports direct sale entry rather than CSV dataset ingestion. Reports store filters and export current matching sales; they are not immutable snapshots. The learning path is reference material, with progress tracked by the learner's test project. UI automation exercise suggestions are in the training guide. There is no public hosting, signup, password recovery, background report processing, or per-user data isolation.
