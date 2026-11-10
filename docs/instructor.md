# Atlas instructor guide

Teach the eight 90-minute sessions through **Learning path**. The curriculum is API-only: Postman for sessions 1–3 and Karate for sessions 4–8. Each session contains theory, a timed agenda, examples, a demonstration, hands-on API tasks, completion checks, answers, and a deliverable. The same content is in [training.md](training.md); regenerate it with `node scripts/export-course.mjs` after editing `frontend/src/course.js`.

## Prepare the class

1. Start a dedicated Atlas instance per learner or team. Everyone using one instance shares sales, reports, and all challenge switches.
2. Sign in as `admin@atlas.test` / `Training123!`. Begin in clean mode. Existing databases gain the 17 new settings disabled without deleting data, sessions, or existing settings.
3. Give learners the instance origin, `/docs`, and practice credentials. Browser access reads the course and application; Postman and Java/Maven are needed for the respective practical tooling. The learner Karate starter is in `training/karate`.
4. Demonstrate public health, analyst login, and an authenticated sales request. Confirm the expected dataset before any seed-specific check.
5. Keep learner clean regression results separate from intentional challenge failures. The learner's correct assertion should fail against a faulty application and pass again after recovery.

## API challenges: ten selectable defects

All switches are off by default. Enable one at a time while introducing detection. These are application behavior changes; no request fault header is required.

| ID / setting | Intentional change | Correct assertion / minimal detector | Course sessions |
| --- | --- | --- | --- |
| API-01 `exclude_end_date` | Drops the inclusive final date in sales selection, dashboard, and exports | On untouched seed, Jan 1–Jan 1 2026 returns one sale, not zero | 3, 6, 8 |
| API-02 `ignore_discounts` | Dashboard uses gross revenue; sale and CSV revenue stay net | Independently sum per-sale net revenue across all pages and compare dashboard revenue | 6, 7, 8 |
| API-03 `report_permissions` | Report DELETE omits ownership enforcement; PUT remains protected | Create an admin-owned report; Sam DELETE must return 403 and preserve it | 5, 6, 8 |
| API-04 `ignore_region_filter` | Shared sales selection ignores region | Europe-filtered results must all have region Europe; also affects dashboard/export selection | 3, 6, 8 |
| API-05 `overlap_pages` | Later pages start one record early | Adjacent sales pages have disjoint ID sets, in stable date/ID order | 6, 7, 8 |
| API-06 `unfiltered_total` | Sales metadata counts all rows | With page_size 100 on untouched seed, Europe total equals the 30 returned items | 3, 6, 7, 8 |
| API-07 `lose_updated_discount` | Sale PUT retains the previous discount | Create discount 10, PUT 20 with the full valid body, GET must show 20 and net revenue 160 for quantity 2 / price 100 | 2, 5, 6, 8 |
| API-08 `export_all_regions` | CSV ignores the saved region but keeps dates | Export an owned Europe report; parse CSV and assert every row is Europe | 5, 6, 8 |
| API-09 `logout_keeps_session` | Logout does not revoke its bearer token | Log out a separate analyst token, then use it on /api/auth/me: expect 401 | 2, 6, 8 |
| API-10 `count_rows_as_customers` | Dashboard counts rows as customers | Independently count distinct customer names across all matching sales; untouched seed has 5 customers, not 120 | 6, 7, 8 |

The seeded unfiltered clean dashboard is revenue 471180.00, orders 120, customers 5, average_order 3926.50. Seed assertions apply before mutations or after a coordinated reset. Prefer created IDs for writes; recreate fixtures after a faulty delete. For currency, round each sale to two decimals before summing. Avoid tie-breaking edge values until a rounding contract is agreed.

## UI switches: separate from the API course

These ten switches are available in Instructor lab for application testing. They do not change direct API behavior. No UI lessons or learner exercises are added to the Learning Path.

| ID / setting | Intentional UI change |
| --- | --- |
| UI-01 `ui_revenue_offset` | Revenue card adds 1,000 to the API number |
| UI-02 `ui_orders_from_customers` | Orders card displays the customer count |
| UI-03 `ui_wrong_region` | Choosing Europe selects/requests North America |
| UI-04 `ui_stuck_next_page` | Next leaves the sales page unchanged |
| UI-05 `ui_zero_discount` | Sale form sends discount zero regardless of entered value |
| UI-06 `ui_report_name_prefill` | Report edit pre-fills an extra ` (copy)` suffix |
| UI-07 `ui_cancel_deletes` | Cancel in a sale/report delete dialog actually deletes that selected record; Close and Escape retain their usual behavior unless separately switched |
| UI-08 `ui_hide_filter_error` | Overview/Sales data suppress request error alerts |
| UI-09 `ui_csv_extension` | CSV download is named `.txt` |
| UI-10 `ui_escape_ignored` | Escape does not close a nonbusy dialog |

UI-07 is deliberately destructive to the selected training record when enabled. Use synthetic, owned fixtures. Maintainer browser checks run against a separate database and verify both the clean behavior and detection of every UI switch.

## Operating the switches

`GET /api/training` requires authentication and returns `mode`, all 20 `defects`, and a `catalogue` grouped into `api` and `ui`, with stable IDs, keys, titles, and descriptions. Settings are discoverable; this is a teaching lab, not a hidden assessment.

Admin-only `PUT /api/training/defects` accepts the full current boolean map. Read the current map, change the selected key, and send the full map to preserve other settings. The original three-field payload remains supported; omitted new settings default to false. The original three fields remain required. Unknown keys are rejected. The Instructor lab always sends the full map.

**Return to clean mode** disables all 20 switches and keeps data and sessions. It does not restore records changed or deleted during a challenge. Refresh application data after settings changed by another user; the UI fetches settings with its normal data refresh rather than pushing updates live.

## Reset

Instructor lab requires typing `RESET TRAINING DATA`. Equivalent admin API request:

```http
POST /api/training/reset
Authorization: Bearer <admin-token>
Content-Type: application/json

{"confirmation":"RESET TRAINING DATA"}
```

Reset deletes custom data, restores users/120 sales/two reports, disables all flags, and revokes every token. Log in again. Coordinate reset outside active learner runs. Backend tests use temporary databases; committed browser tests use `.tmp/atlas-browser-tests.sqlite3` on a separate port and never reset the ordinary instance.

## Assessment and delivery

Assess requirement-linked assertions, exact statuses, independent calculations, data ownership/cleanup, repeatability, and readable failure evidence. The final submission includes source, instructions, a coverage matrix, current clean results, one clean/fault/recovered API report, and known gaps. A smoke pass alone does not demonstrate the full course coverage. The starter intentionally supplies only two smoke scenarios so learners build the remaining tests.

The site changes do not add hosting. Colleagues need an accessible running Atlas instance to share the application/API; the repository and course source can be distributed independently. Course completion is a manual browser record per account, not an automated grading service or a shared learner database.
