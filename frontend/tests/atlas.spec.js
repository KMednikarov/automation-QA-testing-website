// Maintainer regression checks, separate from the API-only learner course.
import { test, expect } from "@playwright/test";

async function login(request, email = "admin@atlas.test") {
  const result = await request.post("/api/auth/login", { data: { email, password: "Training123!" } });
  expect(result.status()).toBe(200);
  return (await result.json()).access_token;
}
const headers = token => ({ Authorization: `Bearer ${token}` });

test.beforeEach(async ({ request }) => {
  const token = await login(request);
  const reset = await request.post("/api/training/reset", { headers: headers(token), data: { confirmation: "RESET TRAINING DATA" } });
  expect(reset.status()).toBe(200);
});

async function open(page, request, defect) {
  const token = await login(request);
  if (defect) {
    const state = await (await request.get("/api/training", { headers: headers(token) })).json();
    const result = await request.put("/api/training/defects", { headers: headers(token), data: { ...state.defects, [defect]: true } });
    expect(result.status()).toBe(200);
  }
  await page.addInitScript(value => sessionStorage.setItem("atlas-token", value), token);
  await page.goto("/");
  await expect(page.getByTestId("net-revenue")).toBeVisible();
  await expect(page.getByText("Updating workspace…")).toBeHidden();
  return token;
}
const nav = (page, name) => page.locator("aside nav").getByRole("button", { name: name === "Learning path" ? /^Learning path(?: 8)?$/ : name, exact: true }).click();
const report = page => page.locator(".report").filter({ has: page.getByRole("heading", { name: "European growth overview", exact: true }) });
const cases = [
  ["UI-01", "ui_revenue_offset", async page => {
    return () => expect(page.getByTestId("net-revenue")).toHaveText("$471,180");
  }],
  ["UI-02", "ui_orders_from_customers", async page => {
    return () => expect(page.getByTestId("sales-orders")).toHaveText("120");
  }],
  ["UI-03", "ui_wrong_region", async page => {
    await page.getByLabel("Region", { exact: true }).selectOption("Europe");
    return () => expect(page.getByLabel("Region", { exact: true })).toHaveValue("Europe");
  }],
  ["UI-04", "ui_stuck_next_page", async page => {
    await nav(page, "Sales data");
    await page.getByRole("button", { name: "Next", exact: true }).click();
    return () => expect(page.locator(".pagination")).toContainText("Page 2");
  }],
  ["UI-05", "ui_zero_discount", async (page, request, token) => {
    await nav(page, "Sales data");
    await page.getByRole("button", { name: "Add sale", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Customer", { exact: true }).fill("UI discount fixture");
    await dialog.getByLabel("Product", { exact: true }).fill("Testing");
    await dialog.getByRole("combobox", { name: "Region", exact: true }).selectOption("Europe");
    await dialog.getByLabel("Quantity", { exact: true }).fill("2");
    await dialog.getByLabel("Discount (%)", { exact: true }).fill("10");
    const response = page.waitForResponse(r => r.url().endsWith("/api/sales") && r.request().method() === "POST");
    await dialog.getByRole("button", { name: "Save changes" }).click();
    const created = await (await response).json();
    const saved = await (await request.get(`/api/sales/${created.id}`, { headers: headers(token) })).json();
    return () => expect(saved.discount).toBe(10);
  }],
  ["UI-06", "ui_report_name_prefill", async page => {
    await nav(page, "Reports");
    await report(page).getByRole("button", { name: "Edit", exact: true }).click();
    return () => expect(page.getByRole("dialog").getByLabel("Report name")).toHaveValue("European growth overview");
  }],
  ["UI-07", "ui_cancel_deletes", async (page, request, token) => {
    await nav(page, "Reports");
    await report(page).getByRole("button", { name: "Delete European growth overview", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    const response = await request.get("/api/reports/1", { headers: headers(token) });
    return () => expect(response.status()).toBe(200);
  }],
  ["UI-08", "ui_hide_filter_error", async page => {
    await page.getByLabel("Start date", { exact: true }).fill("2026-04-30");
    const response = page.waitForResponse(r => r.url().includes("/api/dashboard?") && r.status() === 422);
    await page.getByLabel("End date", { exact: true }).fill("2026-01-01");
    await response;
    return () => expect(page.getByRole("alert")).toBeVisible();
  }],
  ["UI-09", "ui_csv_extension", async page => {
    await nav(page, "Reports");
    const download = page.waitForEvent("download");
    await report(page).getByRole("button", { name: "Export CSV" }).click();
    const filename = (await download).suggestedFilename();
    return () => expect(filename).toMatch(/\.csv$/);
  }],
  ["UI-10", "ui_escape_ignored", async page => {
    await nav(page, "Sales data");
    await page.getByRole("button", { name: "Add sale" }).click();
    await page.keyboard.press("Escape");
    return () => expect(page.getByRole("dialog")).toBeHidden();
  }],
];

for (const [id, key, prepare] of cases) {
  for (const enabled of [false, true]) {
    test(`${id}: ${enabled ? "enabled defect is detected" : "clean contract passes"}`, async ({ page, request }) => {
      const token = await open(page, request, enabled ? key : undefined);
      const assertCorrectBehavior = await prepare(page, request, token);
      if (enabled) await expect(async () => assertCorrectBehavior()).rejects.toThrow();
      else await assertCorrectBehavior();
    });
  }
}

test("all eight API lessons navigate, progress persists, and themes work", async ({ page, request }) => {
  await open(page, request);
  await nav(page, "Learning path");
  const sessions = page.getByRole("navigation", { name: "Course sessions" }).getByRole("button");
  await expect(sessions).toHaveCount(8);
  for (let i = 0; i < 8; i++) {
    await sessions.nth(i).click();
    await expect(page.locator(".course-lesson-heading")).toContainText(`SESSION ${i + 1} OF 8`);
    await expect(page.getByRole("heading", { name: "Your API lab", exact: true })).toBeVisible();
    await expect(page.locator(".course-example pre").first()).toBeVisible();
  }
  await page.getByLabel("Mark session 8 complete").check();
  await page.reload();
  await nav(page, "Learning path");
  await expect(page.getByText("1 of 8 marked complete")).toBeVisible();
  await page.getByRole("button", { name: /Switch to .* theme/ }).click();
  const theme = await page.locator("html").getAttribute("data-theme");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
  await nav(page, "Learning path");
  await expect(page.locator(".api-course")).not.toContainText("Your UI lab");
});

test("learning path fits a narrow screen without horizontal scrolling", async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page, request);
  await nav(page, "Learning path");
  await page.getByRole("navigation", { name: "Course sessions" }).getByRole("button").nth(3).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(await page.locator(".course-nav").evaluate(nav => nav.scrollWidth <= nav.clientWidth)).toBe(true);
  await expect(page.getByRole("heading", { name: "Getting started with Karate", exact: true })).toBeVisible();
});

test("instructor can switch all 20 challenges and return to clean without reset", async ({ page, request }) => {
  const token = await open(page, request);
  await nav(page, "Instructor lab");
  await expect(page.getByRole("switch")).toHaveCount(20);
  const toggle = page.getByRole("switch", { name: /^API-01:/ });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  await page.getByRole("button", { name: "Return to clean mode" }).click();
  await expect(toggle).toHaveAttribute("aria-checked", "false");
  expect((await request.get("/api/auth/me", { headers: headers(token) })).status()).toBe(200);
  await expect(page.getByRole("switch", { name: /^UI-10:/ })).toHaveAttribute("aria-checked", "false");
});
