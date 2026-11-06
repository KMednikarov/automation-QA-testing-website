# Atlas API testing: one project, eight chapters

## Project brief

You are testing a sales analytics portal for a fictional data company. Analysts explore sales and produce reports. Administrators maintain sales data. Build a reusable test suite and a concise defect report as you progress. Use a dedicated training instance per learner or team.

All requests except login and health require a bearer token. Use `/docs` to explore endpoint schemas. Start in clean mode; your instructor can enable named challenges later. Requirements below describe **expected clean-mode behavior**, even when an intentional defect is active.

## 1. Meet the API

**Theory.** HTTP requests consist of a method, URL, headers, and optional body. GET retrieves resources; POST creates resources or executes an action; PUT replaces editable fields; DELETE removes a resource. JSON properties have types: the number `1` differs from the string `"1"`. Status codes describe outcomes; success alone does not establish that the response is correct. Authentication establishes who is calling.

**Task.** Log in with `POST /api/auth/login`. Store the access token in a variable rather than hardcoding it in subsequent requests. Call `/api/auth/me`, `/api/sales`, and `/api/dashboard`. Record methods, statuses, content types, and representative bodies. Try missing and invalid tokens; expect 401.

**Deliverable.** A collection or automated test file that signs in and makes three authenticated requests.

## 2. Trust, but verify

**Theory.** Assertions turn observations into checks. A response contract covers status, shape, types, and business constraints. A schema catches missing or malformed fields, while an example assertion checks a known value. Avoid overly strict assertions about fields whose values are legitimately dynamic, such as session tokens and creation timestamps.

**Task.** Assert the sales envelope contains `items`, `total`, `page`, and `page_size`. Check each sale has a positive integer ID, ISO date, valid region, and numeric revenue. Verify an unknown sale ID returns 404. Distinguish an empty valid query from an invalid request.

**Deliverable.** Positive and negative contract checks with useful failure messages.

## 3. Create your test data

**Theory.** Equivalence partitions group inputs expected to behave similarly. Boundary tests target the edges where validation mistakes commonly occur. Keep test fixtures explicit and create your own records rather than relying on another learner's state.

**Task.** As admin, create a sale. Quantity must be an integer from 1 to 10,000; unit price must be positive and no more than 1,000,000; discount is from 0 to 100 inclusive. Region must be one of the four documented values. Customer and product must contain non-whitespace characters, at most 100 characters. Invalid dates, extra fields, and invalid values return 422. A valid creation returns 201 and the persisted sale.

**Deliverable.** A parameterized validation matrix covering valid, invalid, and boundary inputs. Record created IDs for cleanup.

## 4. Own the lifecycle

**Theory.** A resource's lifecycle extends beyond its initial response. Verify persistence through an independent GET. PUT requires all editable fields in this API, except discount which defaults to zero. DELETE succeeds with 204 and no response body; a subsequent read of the same ID returns 404. Repeating DELETE for a missing ID returns 404 here.

**Task.** Create a sale with quantity 2, unit price 100, and discount 10. Verify revenue is 180. Update discount to 20; fetch again and verify revenue is 160. Delete the sale and confirm it is gone. Ensure cleanup also runs when an assertion fails.

**Deliverable.** An isolated CRUD workflow that can run repeatedly.

## 5. Who has access?

**Theory.** Authentication answers who you are; authorization answers what you may do. An absent or expired session returns 401. An authenticated user lacking permission receives 403. Hiding a UI button is not an authorization check; direct API calls must enforce the same rule.

**Task.** Sign in separately as admin, Sam (`analyst@atlas.test`), and Jordan (`jordan@atlas.test`). Everyone can read sales and reports. Only admins may create, update, and delete sales or change lab settings. Analysts can create reports and modify/delete their own reports; admins can modify/delete any report. Test Sam against a report created by Jordan. Log out and prove the old token no longer works.

**Deliverable.** A role/operation matrix and automated ownership tests.

## 6. Find the right records

**Theory.** Filtering changes the selected dataset; pagination partitions that dataset. Validate both records and metadata. Date boundaries are inclusive. Stable ordering matters when comparing adjacent pages. Invalid query values should fail explicitly instead of silently changing the intended query.

**Task.** Query sales by region, start date, and end date. The range January 1–January 1, 2026 contains one seeded sale in Europe. Walk every page using `total`; default page size is 10, maximum 100, and page numbers start at 1. Verify no duplicate or missing IDs. Order is ascending date, then ID. A start date after the end date returns 422. A valid query matching no sales returns an empty list and total zero.

**Deliverable.** A reusable pagination helper and boundary tests.

## 7. Follow the numbers

**Theory.** Aggregation tests need an independent expected result. Comparing two displays powered by the same incorrect calculation can miss a defect. Use decimal arithmetic in the test for currency and specify rounding. Here each sale's net revenue is rounded to two decimal places, then summed. The UI rounds displayed currency to whole dollars; use the API for cent-level assertions.

**Task.** Sum `quantity × unit_price × (1 − discount / 100)` over all filtered sales and compare to `/api/dashboard`. Verify monthly and regional subtotals sum to total revenue. Orders count matching sales, customers count distinct customer names, and average order equals net revenue / orders rounded to cents. With no sales, orders, revenue, customers, and average order are zero.

**Clean seeded oracle.** 120 orders; 5 distinct customers; net revenue 471,180.00; average order 3,926.50. These values apply only to an unmodified, unfiltered seed in clean mode.

**Deliverable.** Tests capable of detecting incorrect aggregation, with expected and actual figures in failures.

## 8. Tell the whole story

**Theory.** A workflow verifies that features cooperate. CSV serialization has a header, ordered fields, escaping rules, and a selected dataset. Reports here save filters rather than a frozen copy of data, so changes to sales affect later exports. Test evidence should let another person reproduce the failure without guessing.

**Task.** Create a Europe report for January 2026. Update its name. Export CSV and verify headers, IDs, region, date range, row count, and revenue against the corresponding sales query. Delete the report. Run your full suite in clean mode and with an instructor-selected challenge. Produce a defect report containing requirement, setup/mode, exact request, expected result, actual result, and supporting response.

**Deliverable.** A repeatable suite, execution report, and at least one reproducible intentional-defect report. Keep expected failures distinct from passing tests.

## Companion UI automation exercises

- Sign in with valid and invalid credentials; verify role-specific navigation and logout.
- Compare overview totals before and after selecting a region or date range.
- Add, edit, and delete a sale as admin; verify analyst controls are absent.
- Create and edit a report, download CSV, and confirm deletion through the dialog.
- Check empty-state feedback, page navigation, form validation, and a narrow viewport.
- Reset through the instructor lab on a dedicated instance; verify the session ends and baseline data returns.

Prefer accessible roles, labels, and visible names for selectors. KPI values also expose `data-testid` attributes: `net-revenue`, `sales-orders`, `active-customers`, and `average-order`. Do not share mutable test data across concurrent learners.
