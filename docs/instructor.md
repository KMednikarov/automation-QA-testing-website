# Instructor guide

Use the admin account to prepare a dedicated instance per learner or team. Begin in clean mode. Learners should have the expected-behavior guide, not just a list of endpoints. The portal shows active mode and its settings are discoverable through the API; these exercises teach testing, not secrecy.

## Controlled defects: 10 API + 10 UI

All 20 flags are independently selectable and default to false. The lab groups them by API/UI and includes reproduction and expected-result details for each challenge. Reset returns all 20 to clean mode. Existing databases gain new disabled flags on startup without losing records or existing settings.

Choose one defect at a time initially. API defects affect direct endpoint behavior (and may therefore also be visible in the UI). UI defects affect browser requests, interactions, or display; the API contract remains correct while only UI flags are enabled. Combine challenges later, but some combinations mask each other: for example, a stuck Next button prevents reaching page 2 to exercise the stuck Previous button.

### API testing

| ID / setting | Intentional failure | Reproduction | Expected clean behavior |
| --- | --- | --- | --- |
| API-01 · `exclude_end_date` | Date filters exclude the selected final day. | Query sales from 2026-01-01 to 2026-01-01 on the seed. | One sale, not zero. |
| API-02 · `ignore_discounts` | Dashboard revenue ignores discounts. | Sum net revenue from every sales page and compare with the dashboard. | Both totals equal 471180 on the unchanged seed. |
| API-03 · `report_permissions` | Analysts can delete another user’s report. | As Sam, DELETE /api/reports/1. | 403; the admin-owned report remains. |
| API-04 · `pagination_overlap` | Adjacent sales pages overlap by one record. | Compare IDs on sales pages 1 and 2 with page_size=10. | No shared IDs; page 2 begins with ID 11 on the seed. |
| API-05 · `wrong_filtered_total` | Sales pagination total ignores active filters. | GET /api/sales?region=Europe&page_size=100. | total equals the matching record count (30 on the seed). |
| API-06 · `missing_sale_success` | Reading a missing sale returns 200 with an empty object. | GET /api/sales/999999 on the seed. | 404 with a Sale not found error. |
| API-07 · `sale_update_ignored_discount` | Updating a sale silently retains the old discount. | Create a sale with discount 10; PUT the same sale with discount 20; GET it. | The persisted discount is 20. |
| API-08 · `export_ignores_region` | Report CSV export ignores the saved region. | Create a Europe-only report without dates and export its CSV. | Every exported row is European. |
| API-09 · `report_create_wrong_status` | Creating a report returns 200 instead of 201. | POST /api/reports with a valid name. | 201 Created with the new report body. |
| API-10 · `customer_count_orders` | Dashboard customer count counts orders instead of distinct customers. | GET /api/dashboard on the unchanged seed. | 5 customers, not 120. |

### UI testing

| ID / setting | Intentional failure | Reproduction | Expected clean behavior |
| --- | --- | --- | --- |
| UI-01 · `ui_region_ignored` | The browser omits the selected region from its queries. | Select Europe on Overview. Compare the UI and a direct Europe API query. | The overview shows 30 orders, not all 120. |
| UI-02 · `ui_clear_keeps_region` | Clear filters leaves the selected region in place. | Select Europe, wait for data, then click Clear. | All regions is selected and 120 orders return on the seed. |
| UI-03 · `ui_next_page_stuck` | Next does not advance the sales page. | On Sales data page 1, click Next. | Page 2 appears and displays the next ten records. |
| UI-04 · `ui_previous_page_stuck` | Previous does not return to the preceding sales page. | Advance to sales page 2, then click Previous. | Page 1 and its first ten records appear. |
| UI-05 · `ui_wrong_currency` | USD amounts are displayed as euros without conversion. | Inspect the dashboard or a sale’s revenue. | Amounts use USD ($), matching the API contract. |
| UI-06 · `ui_gross_sale_revenue` | Sales rows display gross revenue instead of net revenue. | Find seeded sale 2 with a 5% discount and compare its row with GET /api/sales/2. | 1691 USD, not 1780 USD. |
| UI-07 · `ui_report_cancel_saves` | Cancel on a valid new-report form creates the report. | Enter a unique report name in Create report, then click Cancel. | The dialog closes without creating a report. |
| UI-08 · `ui_report_edit_name_ignored` | Saving a report edit submits the original name. | Edit an owned report, change its name, and Save changes. | The new name is shown and persisted. |
| UI-09 · `ui_delete_cancel_deletes` | Cancel in a report-deletion dialog deletes the report. | Create a disposable report, click its Delete button, then Cancel. | The report remains; no DELETE request is sent. |
| UI-10 · `ui_mobile_export_hidden` | CSV export buttons disappear below 761px viewport width. | Open Reports at a 390px viewport width. | Every report still has a visible Export CSV action. |

### Configure challenges through the API

`GET /api/training` returns active flags and the catalogue (IDs, area, title, description, reproduction, expected result). `PUT /api/training/defects` requires admin authentication and updates only the supplied known boolean flags. Omitted flags retain their values. Unknown names or null values return 422. Existing clients sending the original three fields remain supported.

```json
{"pagination_overlap":true,"ui_next_page_stuck":false}
```

Refresh an already open learner page after changing instructor settings, so it loads the latest flags. Each new login/page load also retrieves them. Settings are shared across the instance.

The permission defect affects report DELETE only; the UI continues to hide unauthorized delete controls. Date filtering affects sales, dashboard queries, and exports. The discount defect affects dashboard aggregation; per-sale and CSV revenues remain correct. UI cancel defects intentionally mutate data: use disposable records on a dedicated instance.

## Reset

Instructor lab requires typing `RESET TRAINING DATA`. The equivalent API operation is admin-only `POST /api/training/reset` with:

```json
{"confirmation":"RESET TRAINING DATA"}
```

Reset deletes custom data, restores users and seeds, disables every defect, and invalidates every token. Always authenticate again afterward. Avoid resetting during another learner's run. Tests in `backend/tests` use temporary databases and never reset the live instance.

## Assessment

Evaluate meaningful assertions, independent calculation, isolated fixtures, cleanup, reproducibility, and clear failure messages. Enable one defect at a time initially. Ask learners to keep their correct assertions when the application fails; do not rewrite assertions to accept faulty results. Turn flags off and rerun to distinguish intentional failures from mistakes in tests.
