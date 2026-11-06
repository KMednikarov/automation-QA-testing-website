# Instructor guide

Use the admin account to prepare a dedicated instance per learner or team. Begin in clean mode. Learners should have the expected-behavior guide, not just a list of endpoints. The portal shows active mode and its settings are discoverable through the API; these exercises teach testing, not secrecy.

## Controlled defects

| Setting | Intentional failure | Minimal reproduction | Expected clean behavior |
| --- | --- | --- | --- |
| `exclude_end_date` | Exclusive end-date comparison | `GET /api/sales?start_date=2026-01-01&end_date=2026-01-01` returns 0 records | One seeded record; both dates included |
| `ignore_discounts` | Dashboard sums gross revenue | Sum net revenue from every sales page and compare with `/api/dashboard` | The two totals agree |
| `report_permissions` | DELETE skips report ownership | As Sam, delete seeded report 1, owned by admin | 403; report remains |

All flags default to false and can be combined. Date filtering affects sales queries, dashboard aggregation, and report exports. The discount defect affects the dashboard; sale revenue and export revenue retain the reference calculation. The ownership defect affects report DELETE only; report updates still enforce ownership. It is exercised by calling the API directly because the UI continues to hide unauthorized actions.

`PUT /api/training/defects` takes all three boolean fields and requires an admin token. Example:

```json
{"exclude_end_date":true,"ignore_discounts":false,"report_permissions":false}
```

## Reset

Instructor lab requires typing `RESET TRAINING DATA`. The equivalent API operation is admin-only `POST /api/training/reset` with:

```json
{"confirmation":"RESET TRAINING DATA"}
```

Reset deletes custom data, restores users and seeds, disables every defect, and invalidates every token. Always authenticate again afterward. Avoid resetting during another learner's run. Tests in `backend/tests` use temporary databases and never reset the live instance.

## Assessment

Evaluate meaningful assertions, independent calculation, isolated fixtures, cleanup, reproducibility, and clear failure messages. Enable one defect at a time initially. Ask learners to keep their correct assertions when the application fails; do not rewrite assertions to accept faulty results. Turn flags off and rerun to distinguish intentional failures from mistakes in tests.
