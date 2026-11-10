# API testing with Atlas

Eight 90-minute sessions. Explore with Postman, automate with Karate, and build a regression suite for this sales analytics API.

Eight sessions of 90 minutes (12 hours). API only; no UI exercises. Open Atlas → Learning path for navigation, copyable examples, self-check answers, and per-account browser progress.

## Preparation

- Use a dedicated Atlas instance per learner or team. Sales, reports, and defect settings are shared on an instance.
- Set baseUrl to the Atlas origin, without /api, in Postman and Karate. Open /docs for the live OpenAPI reference.
- Use analyst@atlas.test, jordan@atlas.test, or admin@atlas.test with password Training123!. Capture access_token from login; all operations except health and login require it.
- Start in clean mode. Reset is admin-only, requires RESET TRAINING DATA, deletes custom records, and revokes every session. Log in again afterward.
- Sessions 1–3 use Postman. Sessions 4–8 use Java 21, Maven, and the training/karate starter. The page tracks completion in this browser; execution reports come from your test project.

## Session 1: Understanding REST APIs

**Postman · 90 minutes**

Save authenticated requests and explain their responses.

### Learning objectives

- Identify methods, paths, headers, JSON values, and status codes.
- Capture a token and distinguish authentication failure from a missing resource.
- Compare a prediction with the actual response.

### Agenda

- 10 min · readiness and project brief
- 20 min · HTTP and JSON
- 15 min · instructor demonstration
- 35 min · request exploration
- 10 min · review and evidence

### Lesson

#### The API boundary

Atlas is a sales analytics service. Its UI and your test client call the same /api routes. GET reads a resource; POST creates a resource or performs an action; PUT replaces editable fields; DELETE removes a resource. The URL identifies the server and path, while headers carry metadata and credentials. A response supplies a status, headers, and sometimes a body.

#### Structure and identity

GET /api/sales returns an object with items, total, page, and page_size. The items property is an array. GET /api/sales/1 returns a single sale. A number differs from a quoted numeric string, and an omitted property differs from null. HTTP 200 alone cannot establish that you received the correct sale or the right data types.

#### Atlas authentication

GET /api/health is public. Log in with email and password to obtain access_token, then send Authorization: Bearer <token>. Missing or invalid credentials produce 401. An authenticated caller without a required permission receives 403. A connection error provides no ordinary HTTP response and needs a different investigation.

### Worked examples

#### Login request

```http
POST {{baseUrl}}/api/auth/login
Content-Type: application/json

{"email":"analyst@atlas.test","password":"Training123!"}
```

#### Postman post-response script

```javascript
pm.environment.unset("token");
pm.test("Login succeeds", () => pm.response.to.have.status(200));
if (pm.response.code === 200) {
  pm.environment.set("token", pm.response.json().access_token);
}
```

#### Authenticated read

```http
GET {{baseUrl}}/api/sales?page=1&page_size=10
Authorization: Bearer {{token}}
```

### Instructor demonstration

- Predict GET /api/health, then inspect its status and body.
- Log in, capture access_token, and read /api/auth/me and /api/sales.
- Compare a missing token, an unknown sale ID, and an unreachable port.

### Your API lab

- Create an Atlas Local environment with baseUrl and empty token and saleId variables.
- Save health, login, current user, first sales page, and unknown sale requests in one collection.
- For every request record the expected status before sending, then record headers and JSON structure.
- Check 401 without a token and 404 for /api/sales/999999 with a valid token.
- Add an exact health status assertion and an identity or type assertion to a read. Change one expectation to prove it fails, then restore it.

### Completion checks

- All saved requests use baseUrl, and the token is captured from a successful login.
- Explain the difference between a 401 response, a 404 response, and a connection failure.
- Show one useful assertion failing and then passing with its correct expectation.

**Deliverable:** An executable Postman exploration folder and a short request/response evidence log.

### Check your understanding

**Does 200 prove that the response is correct?**

No. Check the requested identity, required fields, types, and relevant business values.

**Where is the sales array?**

In response.items. The top-level response is a pagination envelope.



## Session 2: CRUD and authentication

**Postman · 90 minutes**

Create, replace, read, and delete a sale you own as test data.

### Learning objectives

- Use the administrator role for sales writes.
- Capture generated IDs and verify persisted changes through a fresh GET.
- Distinguish 401, 403, 404, and an empty 204 response.

### Agenda

- 10 min · recap
- 20 min · CRUD and roles
- 15 min · lifecycle demonstration
- 35 min · independent workflow
- 10 min · repeatability review

### Lesson

#### Resource ownership

Administrators can write sales. Analysts can read sales and create reports. A successful POST /api/sales returns 201 and a generated ID. Capture id only after verifying the create response. The next request replaces the response variable, so preserve the ID before continuing. Use a unique customer label to identify your records during cleanup.

#### Replacement and persistence

Atlas exposes PUT for sale updates. Send date, customer, region, product, quantity, and unit_price; discount is optional and defaults to zero. A partial replacement missing required fields returns 422. After an update, GET the sale independently to prove the fields persisted. For quantity 2, unit_price 100, and discount 10, net revenue is 180. At discount 20 it is 160.

#### Cleanup and sessions

DELETE returns 204 without a representation. A subsequent GET or repeated DELETE returns 404 here. An assertion failure before cleanup can leave a record behind, so document interrupted-run recovery. POST /api/auth/logout should revoke the token: a later /api/auth/me with that token must return 401.

### Worked examples

#### Create sale as administrator

```json
{
  "date": "2026-04-30",
  "customer": "Training learner 01",
  "region": "Europe",
  "product": "API lab",
  "quantity": 2,
  "unit_price": 100,
  "discount": 10
}
```

#### Capture the generated ID

```javascript
pm.environment.unset("saleId");
pm.test("Sale created", () => pm.response.to.have.status(201));
if (pm.response.code === 201) {
  pm.environment.set("saleId", pm.response.json().id);
  pm.expect(pm.response.json().revenue).to.equal(180);
}
```

### Instructor demonstration

- Log in as admin and create a sale. Capture its ID.
- PUT the complete body with discount 20, then GET and verify revenue 160.
- Delete, verify 404, and compare an analyst write returning 403.

### Your API lab

- Build login → create → read → full PUT → read → delete → verify missing as one ordered collection folder.
- Check the stored discount and revenue after PUT, rather than only the PUT response.
- Attempt an incomplete PUT; expect 422 and verify the stored sale is unchanged.
- Check a missing token returns 401 and an analyst sales write returns 403. Keep these cases separate from field validation.
- Log out a separate analyst token and prove it no longer works. Run the successful lifecycle twice without manual ID edits.

### Completion checks

- The lifecycle uses its own generated sale ID and leaves no successful fixture behind.
- A fresh GET proves both replacement fields and revenue persisted.
- Explain recovery when execution stops before DELETE.

**Deliverable:** A repeatable manual sales lifecycle and credential/permission checks.

### Check your understanding

**Why capture the ID?**

IDs are generated and may change between runs; a fixed ID may belong to another record.

**Should 204 be parsed as JSON?**

No. Postman exposes empty text; the supplied Karate version represents an absent response body as null.

**API challenge coverage:** API-07, API-09.

## Session 3: Test design and negative testing

**Postman · 90 minutes**

Derive boundary and contract checks from Atlas rules.

### Learning objectives

- Use equivalence classes and accepted/rejected boundaries.
- Separate syntax, field, permission, and dataset failures.
- Design precise pagination and inclusive date checks.

### Agenda

- 10 min · risk discussion
- 20 min · partitions and oracles
- 15 min · boundary demonstration
- 35 min · matrix and execution
- 10 min · peer review

### Lesson

#### Field rules

Quantity is a strict integer from 1 to 10,000. Unit price is greater than zero and at most 1,000,000. Discount accepts 0 through 100 inclusive. Customer and product contain non-whitespace text and at most 100 characters. Region is Europe, North America, Asia Pacific, or Latin America. Invalid dates, extra fields, and invalid values return 422. Atlas also uses FastAPI's 422 response for malformed JSON; inspect the detail field for validation errors.

#### Isolating the condition

Begin with a valid body and valid administrator credentials, then change one condition. Check quantity 0, 1, 10,000, and 10,001. Check discounts just outside and at 0 and 100. The string quantity '2' is a different type case from integer 2. A missing token can mask the field rule you intended to test. Successful accepted boundaries create records and need cleanup.

#### Dataset rules

Date ranges include both endpoints. In an unmodified seed, January 1 through January 1, 2026 selects one Europe sale. A reversed range returns 422. Valid filters matching no data return items [] and total 0. Page numbers start at 1; page_size defaults to 10 and has maximum 100. total describes the filtered dataset, and records are ordered by date then ID.

### Worked examples

#### Date boundary request

```http
GET {{baseUrl}}/api/sales?region=Europe&start_date=2026-01-01&end_date=2026-01-01
Authorization: Bearer {{token}}
```

#### Exact validation assertion

```javascript
pm.test("Invalid quantity is rejected", function () {
  pm.response.to.have.status(422);
  pm.expect(pm.response.json()).to.have.property("detail");
});
```

### Instructor demonstration

- Compare accepted quantity 1 with rejected quantity 0.
- Compare an empty valid date query with an invalid reversed range.
- Compare a Europe page's records with its total metadata.

### Your API lab

- Build at least 15 matrix cases with requirement, precondition, input, exact expected result, and cleanup.
- Cover accepted and rejected quantity/discount limits, whitespace names, invalid regions, strict quantity types, and extra fields.
- Execute at least eight negative cases in Postman with exact statuses and meaningful detail checks.
- Check the inclusive single-day seed query, an empty query, and a reversed range.
- Request all Europe records with page_size=100 and compare total with items.length on a fresh seed. Record why this equality would be wrong for a partially retrieved page.

### Completion checks

- Every expected status follows the Atlas contract, and each case changes one condition.
- Accepted boundary creates are removed.
- Fixture-specific seed assertions are labeled and run before mutations or after a coordinated reset.

**Deliverable:** A test matrix and a negative/boundary Postman folder with cleanup evidence.

### Check your understanding

**Is zero discount valid?**

Yes. Both 0 and 100 are accepted boundaries; unit price zero is invalid.

**Why is any 4xx too broad?**

A missing token or wrong route could make the test pass for an unrelated reason.

**API challenge coverage:** API-01, API-04, API-06.

## Session 4: Getting started with Karate

**Karate · 90 minutes**

Run readable smoke tests and interpret current execution reports.

### Learning objectives

- Run the training/karate Maven starter on Java 21.
- Assert status, schema, and relevant values.
- Diagnose an intentionally broken assertion and select @smoke cases.

### Agenda

- 10 min · environment readiness
- 20 min · feature syntax
- 15 min · report demonstration
- 35 min · smoke automation
- 10 min · diagnosis review

### Lesson

#### The starter project

training/karate contains a Maven build, JUnit runner, karate-config.js, and a smoke feature. Run mvn test from that folder while Atlas is running. It uses Karate core 2.1.4 and Java 21. The runner rejects empty discovery and writes HTML reports under target/karate-reports. A baseUrl system property overrides the origin when your instance uses another port.

#### Feature steps

Feature and Scenario describe tested behavior. url chooses the server, path chooses resource segments, request supplies a body, method sends the call, and status checks the exact result. match compares values or structure. #number checks a type, not a positive integer ID or a range. Save important response values before the next HTTP request overwrites response.

#### Evidence and smoke scope

A useful smoke subset quickly checks availability, login, and authenticated reads. Negative cases can pass by correctly observing an expected 404. A current failed match identifies an expected/actual difference; connection and parsing errors require different diagnosis. A green smoke run is evidence only for the cases actually executed.

### Worked examples

#### Authenticated smoke scenario

```gherkin
Feature: Atlas authenticated smoke
@smoke
Scenario: Analyst identity
  Given url baseUrl
  And path "api", "auth", "login"
  And request { email: "analyst@atlas.test", password: "Training123!" }
  When method post
  Then status 200
  * def token = response.access_token
  Given path "api", "auth", "me"
  And header Authorization = "Bearer " + token
  When method get
  Then status 200
  And match response.role == "analyst"
```

#### Local commands

```shell
cd training/karate
mvn test
mvn test "-Dkarate.options=--tags @smoke"
mvn test -DbaseUrl=http://127.0.0.1:8001
```

### Instructor demonstration

- Run the starter and open target/karate-reports/karate-summary.html.
- Change the expected role to admin, inspect the failure, then restore analyst.
- Show the discovered scenario count and the @smoke selection.

### Your API lab

- Run the starter's public health and authenticated read scenarios.
- Add list shape assertions for items, total, page, and page_size.
- Add an exact seed identity check and a missing sale case expecting 404.
- Introduce and restore one useful body mismatch; keep the current report as evidence.
- Run the full starter and @smoke subset, then explain which behavior each one establishes.

### Completion checks

- The suite runs requests against Atlas rather than a mock response.
- Assertions check structure and values beyond status.
- The learner can locate the request, response, and failing comparison in a current report.

**Deliverable:** A working Karate smoke feature, a deliberate failure, and restored passing evidence.

### Check your understanding

**What does Background do?**

It runs before each scenario in its feature. It must not reset shared data during another test.

**What does #number miss?**

Exact identity, integer restrictions, positivity, and other business rules require additional assertions.



## Session 5: Automating real Atlas workflows

**Karate · 90 minutes**

Automate sales and report lifecycles with independent fixtures.

### Learning objectives

- Capture dynamic tokens and IDs within a workflow.
- Verify persistence, report ownership, and CSV selection.
- Document cleanup after interrupted execution.

### Agenda

- 10 min · manual workflow recap
- 20 min · state and extraction
- 15 min · workflow demonstration
- 35 min · lifecycle automation
- 10 min · repeatability review

### Lesson

#### A scenario owns its state

Keep a dependent create/read/update/delete workflow together. Log in with the role needed for that action and capture generated IDs. Avoid a second scenario depending on a first scenario's record. The API has a shared SQLite dataset, so use one instance per team and run mutations serially. A unique customer label helps identify leftovers but is not an isolation boundary.

#### Reports and permissions

Reports save a name and optional region/date filters, not a frozen snapshot. All authenticated users can read reports. Analysts may modify or delete their own reports; administrators may modify or delete any report. Use Sam and Jordan to create a cross-owner check. Hiding an edit button cannot replace a direct API permission assertion.

#### CSV and persistence

Export /api/reports/{id}/export and compare its header, selected IDs, row count, dates, region, and revenue with the matching sales query. Expected fields are id,date,customer,region,product,quantity,unit_price,discount,revenue. Parse CSV rather than splitting on commas: quoted names and escaping matter. Fresh reads prove PUT changes persisted; the final DELETE only executes if earlier steps reach it.

### Worked examples

#### After successful create, replace the full sale

```gherkin
* def saleId = response.id
* set payload.discount = 20
Given path "api", "sales", saleId
And header Authorization = "Bearer " + adminToken
And request payload
When method put
Then status 200
Given path "api", "sales", saleId
And header Authorization = "Bearer " + adminToken
When method get
Then status 200
And match response.discount == 20
And match response.revenue == 160
```

#### Report input

```json
{"name":"Learner Europe January","region":"Europe",
 "start_date":"2026-01-01","end_date":"2026-01-31"}
```

### Instructor demonstration

- Create an owned sale and verify the stored discount after replacement.
- Create a report as one analyst and attempt modification/deletion as the other.
- Export the owned report and compare its selected rows with the corresponding sales query.

### Your API lab

- Build the complete sale lifecycle with generated IDs, revenue 180 then 160, cleanup, and final 404.
- Create a report as Sam, rename it with PUT, export it, and compare CSV selection with the API.
- Attempt to delete Jordan's report as Sam. Expect 403 and verify the report still exists.
- Delete your own successful report and sale fixtures, then run the workflow twice.
- Force a failure after create, inspect the owned leftover, recover it, and document the procedure. Do not claim end cleanup always executes.

### Completion checks

- Every dynamic value belongs to the scenario that established it.
- Fresh reads establish persisted replacement and unchanged state after rejected writes.
- CSV assertions compare data independently and check the intended region.

**Deliverable:** Repeatable sales/report workflows, ownership assertions, CSV evidence, and cleanup notes.

### Check your understanding

**Is a report a snapshot?**

No. It stores filters, so later sales changes affect later exports.

**Why check GET after PUT?**

The PUT response could claim a change that was not stored.

**API challenge coverage:** API-03, API-07, API-08.

## Session 6: Detecting controlled API defects

**Postman and Karate · 90 minutes**

Keep correct assertions while exposing deterministic wrong behavior.

### Learning objectives

- Separate the clean contract from an intentionally faulty observation.
- Use one API challenge at a time and record its identifier.
- Demonstrate a correct assertion passing, failing with injection, and passing after recovery.

### Agenda

- 10 min · clean baseline
- 20 min · independent oracles
- 15 min · challenge demonstration
- 35 min · defect investigation
- 10 min · evidence review

### Lesson

#### A bug can return success

Atlas challenges deliberately alter real application behavior. A response may have HTTP 200 but omit the final day, ignore the region, repeat a page record, or return a wrong total. An unauthorized delete may incorrectly return 204. The test should assert the correct contract and fail when the defect is active. Accepting the faulty result would hide the bug.

#### Controlled setup

An administrator chooses API challenges in Instructor Lab or PUT /api/training/defects. GET /api/training exposes active flags. Begin clean, enable one API defect, retain the same assertion, then disable it and repeat. Settings affect the whole instance. Use your own fixtures for destructive checks and restore any deleted record before comparing runs. Reset revokes sessions and must be coordinated.

#### A precise failure report

Record the requirement, active API challenge ID, role, fixtures, exact request, expected result, observed result, and current report. Use the documented Atlas settings and routes to reproduce the assigned challenge. Record the selected flag with the request evidence. The instructor's UI switches are separate from this API-only learning path.

### Worked examples

#### Keep this clean expectation when the date challenge is active

```gherkin
Given path "api", "sales"
And header Authorization = "Bearer " + token
And params { start_date: "2026-01-01", end_date: "2026-01-01" }
When method get
Then status 200
And match response.total == 1
```

#### Inspect the active mode

```http
GET {{baseUrl}}/api/training
Authorization: Bearer {{token}}

// Instructor-only updates use PUT /api/training/defects.
// Send all current flags, changing only the chosen challenge.
```

### Instructor demonstration

- Show a correct single-day assertion passing on an untouched clean seed.
- Enable API-01 and rerun without editing the assertion. Explain its failed total.
- Disable the flag and rerun. Compare current evidence and the recorded mode.

### Your API lab

- Choose an instructor-assigned API challenge and identify the contract assertion that should detect it.
- Capture a clean pass before enabling the defect. Keep the expectation unchanged during the failing run.
- For filters and pagination, inspect both the returned records and metadata. For aggregation, calculate an independent expected value.
- For ownership and logout cases, check forbidden or revoked access directly through the API.
- Disable the challenge, restore owned fixtures if needed, rerun, and write a reproducible defect report. Keep expected challenge failures out of the default clean CI gate.

### Completion checks

- Evidence includes clean pass, active challenge failure, and recovered pass.
- The failure names the correct expected behavior and the actual mismatch.
- No assertion has been weakened to accept the intentional bug.

**Deliverable:** A clean/fault/recovered evidence set and a reproducible API defect report.

### Check your understanding

**Should a detector accept a wrong total?**

Learner regression tests keep the correct total and fail. Maintainer checks separately verify that each selectable challenge can make that correct assertion fail.

**Does status 200 rule out a defect?**

No. Selection, identity, metadata, calculations, permissions, and persistence can still be wrong.

**API challenge coverage:** API-01, API-02, API-03, API-04, API-05, API-06, API-07, API-08, API-09, API-10.

## Session 7: Framework architecture and data checks

**Karate · 90 minutes**

Organize reusable setup, parameterized cases, and independent data oracles.

### Learning objectives

- Separate configuration, helpers, fixtures, and behavior.
- Walk every page without duplicate or missing IDs.
- Independently calculate net revenue and distinct customers.

### Agenda

- 10 min · duplication review
- 20 min · structure and oracles
- 15 min · helper demonstration
- 35 min · refactor and data checks
- 10 min · architecture review

### Lesson

#### Small, explicit helpers

Keep base URLs and timeouts in karate-config.js, representative JSON input in data files, and login in a focused @ignore called feature. Helpers remove repeated setup while leaving the operation and expected result visible. Use ordinary call while learning. Cached mutable state and a generated ID shared between scenarios can create hidden dependencies.

#### Complete datasets

Pagination metadata controls how many requests you need. Walk pages until the filtered total is covered, verify stable date/ID ordering, and check no duplicate or missing IDs. A calculation from only the first ten rows cannot validate the full dashboard. A filtered total must describe the selected dataset. Keep the instance stable during the scan.

#### Independent calculations

Compute each row's net revenue from quantity × unit_price × (1 − discount/100), round per row to two decimals, then sum. Do not simply compare two displays using the same faulty backend number. Distinct customers are counted by name, not by row. A fresh unfiltered clean seed has 120 orders, 5 customers, revenue 471180.00, and average_order 3926.50. These fixture values cease to apply after mutations. Currency tie-breaking beyond the supplied fixtures needs an agreed rounding contract.

### Worked examples

#### A focused reusable login feature

```gherkin
@ignore
Feature: Obtain an Atlas analyst token
Scenario:
  Given url baseUrl
  And path "api", "auth", "login"
  And request { email: "analyst@atlas.test", password: "Training123!" }
  When method post
  Then status 200
  * def token = response.access_token
```

#### Call it from a parent scenario

```gherkin
* def login = call read("classpath:atlas/common/login.feature")
* def token = login.token
* def payload = read("classpath:atlas/data/sale.json")
```

### Instructor demonstration

- Extract a working login without changing the behavior assertions.
- Compare page 1 and page 2 IDs, then collect the whole filtered dataset.
- Calculate discounts and unique customer names independently of dashboard fields.

### Your API lab

- Organize features into smoke, validation, lifecycles, permissions, filters, and analytics.
- Use a fresh valid JSON body in each Scenario Outline row. Keep accepted boundary cleanup explicit.
- Build a pagination helper and compare the full unique ID count with total.
- Compare independently calculated per-row net revenue, regional/monthly sums, customer count, and average order with /api/dashboard.
- Run individual features, @smoke, and the whole suite. Document serial data ownership and reset boundaries.

### Completion checks

- Every behavior feature can establish its own preconditions.
- The helper discovers all matching rows, not just one page.
- Expected calculations do not blindly reuse the returned revenue or customers values.

**Deliverable:** A readable framework with reusable setup, complete pagination, and independent analytics assertions.

### Check your understanding

**Why mark a helper @ignore?**

It stays callable but is excluded from normal standalone discovery.

**Does a unique customer label guarantee isolation?**

No. Sales, reports, flags, and reset remain shared on the instance. Coordinate or use separate instances.

**API challenge coverage:** API-02, API-05, API-06, API-10.

## Session 8: CI and final API challenge

**Karate and GitHub Actions · 90 minutes**

Deliver an independently runnable API project with traceable evidence.

### Learning objectives

- Run clean-mode checks after API readiness in CI.
- Preserve failed exit status and current reports.
- Demonstrate meaningful coverage and explain its limits.

### Agenda

- 10 min · readiness
- 20 min · CI and evidence
- 15 min · workflow demonstration
- 35 min · final challenge
- 10 min · assessment

### Lesson

#### Repeatable execution

The repository workflow starts Atlas with a dedicated CI database, waits for /api/health, and runs the training/karate starter on Java 21. Extend that project during the course. Starting a process is not proof of readiness. A bounded health loop produces a useful failure when startup fails instead of a cascade of unrelated test errors.

#### Reports and truthful results

Maven's nonzero exit status must fail the job. Upload reports with if: always() so a failing assertion leaves evidence. Do not suppress failures or count an empty suite as a success. Record the source revision, environment/mode, executed scenarios, result counts, and current reports. GitHub execution requires repository access; a local pass is not evidence of an unexecuted remote run.

#### Final assessment

Cover authentication and logout, roles/ownership, a full sales lifecycle, report/export workflow, field boundaries, inclusive dates, filtered pagination, and independent analytics. Run the clean suite twice, then demonstrate an assigned API challenge with the same correct assertion failing and passing after recovery. Document gaps instead of equating a green smoke subset with complete coverage.

### Worked examples

#### CI test and evidence steps

```yaml
- name: Run learner API suite
  run: mvn --batch-mode -f training/karate/pom.xml test
- name: Preserve Karate reports
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: atlas-karate-reports
    path: training/karate/target/karate-reports/
```

### Instructor demonstration

- Read the repository CI readiness, test, and report steps.
- Break one contract assertion on a training branch and inspect the failed result.
- Restore it and identify the source revision and evidence from the new passing run.

### Your API lab

- Complete the API coverage matrix and keep data ownership and cleanup reproducible.
- Run full and smoke suites locally, and run the sale/report lifecycle twice.
- Commit the learner features to training/karate and trigger the repository checks with access supplied by your instructor.
- Demonstrate a useful failed assertion with preserved reports, then restore and rerun it.
- Submit source, README, coverage matrix, current clean results, one API challenge defect report, and known gaps.

### Completion checks

- A fresh checkout can start Atlas and run the project using its instructions.
- A broken assertion fails CI and retains a report; the final restored run is green.
- Results distinguish clean regressions, intentional challenge failures, and pending/unexecuted checks.

**Deliverable:** An API regression project, clean CI evidence or a stated access blocker, and the final assessment submission.

### Check your understanding

**Why upload with always?**

Failure evidence must survive a failing test without converting that failure into success.

**What if GitHub access is unavailable?**

Submit local evidence and name the remote execution blocker explicitly.

**API challenge coverage:** API-01, API-02, API-03, API-04, API-05, API-06, API-07, API-08, API-09, API-10.
