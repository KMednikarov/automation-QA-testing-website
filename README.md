# Atlas · Data training portal

A small, working sales analytics website for UI automation and API testing training. React + Vite, FastAPI, and SQLite. All data is fictional. Includes dashboards, sales CRUD, saved reports, CSV exports, eight guided API sessions with Postman and Karate, and 20 deliberately selectable defects (10 API + 10 UI).

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

Clean mode is the default. Administrators can enable individual API/UI defects in **Instructor lab**, grouped by stable challenge IDs. **Return to clean mode** disables every flag without deleting data or signing users out. Existing databases gain disabled new flags automatically while retaining their data and original settings. The lab also resets the database after an explicit typed confirmation. Reset deletes all custom records, resets defect settings, restores practice accounts, and revokes **all** sessions. Defect settings and data are shared by everyone on an instance. Learners can inspect mode through `/api/training`; this is a teaching exercise, not a hidden assessment system.

[Training chapters and expected behavior](docs/training.md) · [Instructor defect catalogue](docs/instructor.md)

## Course and validation

Sign in and open **Learning path**. Eight 90-minute API-only sessions include theory, examples, demonstrations, hands-on tasks, self-checks, and deliverables. Sessions 1–3 use Postman; 4–8 use Karate. Completion is a manual record saved per account in that browser. The UI defects are separate instructor switches; there are no UI course exercises.

The [Karate learner starter](training/karate/README.md) requires Java 21+ and Maven 3.9+. Extend its two smoke scenarios during the course:

```bash
mvn --batch-mode -f training/karate/pom.xml test
```

Maintainer checks, from the repository root after setup:

```bash
.venv/bin/python -m pytest backend/tests -q
npm run lint --prefix frontend
npm run build --prefix frontend
node scripts/export-course.mjs --check
cd frontend
npx playwright install chromium
npm run test:browser
```

On Linux, browser system dependencies may require `npx playwright install --with-deps chromium`. The browser checks require the repository's `.venv` and a built frontend. Port 8765 must be free. They use `.tmp/atlas-browser-tests.sqlite3`, separate from the ordinary training database. API tests use a fresh temporary database per case. Both verify correct clean behavior and that the matching intentional bug is detected. They do not replace the tests learners build during the course.

CI runs API tests, lint, the build, course-document consistency, browser checks, and the Karate starter against a dedicated clean database. Failed test status remains failed; reports are preserved. Course text is authored in `frontend/src/course.js`; regenerate the offline guide with `node scripts/export-course.mjs`.

## API example

Authenticate with `POST /api/auth/login` and JSON:

```json
{"email":"analyst@atlas.test","password":"Training123!"}
```

Use the returned `access_token` as `Authorization: Bearer <token>` on subsequent calls, for example `GET /api/sales?region=Europe&page=1&page_size=10`. Sessions expire after 12 hours and can be revoked with `POST /api/auth/logout`.

## First-version scope

This version supports direct sale entry rather than CSV dataset ingestion. Reports store filters and export current matching sales; they are not immutable snapshots. The learning path provides the API course and browser progress; execution evidence comes from the learner’s test project. There is no public hosting, signup, password recovery, background report processing, or per-user data isolation.
