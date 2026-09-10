import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const artifacts = resolve(process.env.TEMP ?? ".", "healthguard-sep08-qa");
test.beforeAll(() => mkdirSync(artifacts, { recursive: true }));
async function login(page: Page, email = "demo@healthguard.local", password = "HealthGuard!2026") {
  await page.goto("/login");
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page.locator("#auth-password").fill(password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page).toHaveURL(/dashboard|admin|driver|first-aid/);
}
async function navigate(page: Page, route: string) {
  const mobileMenu = page.getByRole("button", { name: "Open menu", exact: true });
  if (await mobileMenu.isVisible()) {
    await mobileMenu.click();
    await page.locator(`.mobile-drawer a[href="/${route}"]`).click();
  } else {
    await page.locator(`.sidebar a[href="/${route}"]`).last().click();
  }
  await expect(page).toHaveURL(new RegExp(`/${route}(\\?|$)`));
  const titles: Record<string, RegExp> = { dashboard: /^Welcome,/, hospitals: /^Hospitals$/, ambulance: /^Ambulance Operations$/, "first-aid": /^First Aid Guidance$/, "my-health": /^My Health$/, ai: /HealthGuard AI/, doctors: /^Doctors$/, academy: /Academy/, emergency: /Emergency center/i };
  if (titles[route]) await expect(page.getByRole("heading", { level: 1, name: titles[route] })).toBeVisible();
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
}

test("first aid search, filters, details, bookmarks, emergency actions and mobile drawer", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/first-aid");
  await expect(page).toHaveURL(/login/);
  await login(page);
  await page.locator(".sidebar").getByRole("link", { name: "First Aid Guidance", exact: true }).click();
  await expect(page.getByRole("heading", { name: "First Aid Guidance", exact: true })).toBeVisible();
  await expect(page).toHaveTitle("First Aid Guidance — HealthGuard");
  await expect(page.locator(".sidebar").getByRole("link", { name: "About", exact: true })).toHaveCount(0);
  await expect(page.locator(".sidebar").getByText("Product", { exact: true })).toHaveCount(0);
  await expect(page.locator(".first-aid-category-grid button")).toHaveCount(20);
  await expect(page.locator(".first-aid-card")).toHaveCount(12);
  await expect(page.locator(".first-aid-results-heading")).toContainText("435 protocols");
  await page.getByRole("button", { name: "Next first aid page" }).click();
  await expect(page).toHaveURL(/page=2/);
  await page.getByRole("button", { name: "Reset filters" }).click();
  await page.getByLabel("Search first aid guidance").fill("sudden cardiac arrest");
  await expect(page.getByRole("button", { name: "Open Sudden Cardiac Arrest (SCA) guidance" })).toBeVisible();
  await page.getByRole("button", { name: "Save Sudden Cardiac Arrest (SCA)", exact: true }).click();
  const open = page.getByRole("button", { name: "Open Sudden Cardiac Arrest (SCA) guidance" });
  await open.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(".first-aid-reference ol li")).toHaveCount(6);
  await expect(dialog.getByRole("heading", { name: "Do not — source cautions" })).toBeVisible();
  await expect(dialog.getByRole("link", { name: "Call 112" })).toHaveAttribute("href", "tel:112");
  await page.screenshot({ path: resolve(artifacts, "first-aid-detail.png") });
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(open).toBeFocused();
  await page.reload();
  await expect(page.getByRole("button", { name: "Unsave Sudden Cardiac Arrest (SCA)", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Clear first aid search" }).click();
  await page.getByRole("button", { name: "Saved (1)", exact: true }).click();
  await expect(page.locator(".first-aid-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Unsave Sudden Cardiac Arrest (SCA)", exact: true }).click();
  await expect(page.getByText("No saved guidance matches")).toBeVisible();
  await page.getByRole("button", { name: "Clear filters", exact: true }).click();
  await page.locator(".first-aid-category-grid button").filter({ hasText: "Dental" }).click();
  await expect(page.locator(".first-aid-category-name").first()).toHaveText("Dental");
  await page.getByLabel("Severity", { exact: true }).selectOption("moderate");
  expect(await page.locator(".first-aid-card .first-aid-severity").allTextContents()).toEqual(expect.arrayContaining(["moderate"]));
  await page.getByLabel("Search first aid guidance").fill("zzzzmissing");
  await expect(page.getByText("No guidance found", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Reset filters" }).click();
  await page.screenshot({ path: resolve(artifacts, "first-aid-light.png") });
  await page.getByRole("button", { name: /Theme preference/ }).click();
  await page.getByRole("button", { name: /Theme preference/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.screenshot({ path: resolve(artifacts, "first-aid-dark.png") });
  expect(await page.locator(".sidebar .brand").evaluate((element) => getComputedStyle(element).backgroundColor)).toBe("rgba(0, 0, 0, 0)");
  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow(page);
  await page.getByRole("button", { name: "Open menu", exact: true }).click();
  await page.getByRole("dialog", { name: "All navigation" }).getByRole("link", { name: "First Aid Guidance", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "All navigation" })).toHaveCount(0);
  await page.screenshot({ path: resolve(artifacts, "first-aid-mobile.png") });
  expect(errors).toEqual([]);
});

test("typography, logo and existing pages remain usable at desktop and mobile sizes", async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("link", { name: /Privacy Policy|Terms of Service/ })).toHaveCount(0);
  expect(await page.locator(".family-footer .brand").evaluate((element) => getComputedStyle(element).backgroundColor)).toBe("rgba(0, 0, 0, 0)");
  await page.locator(".family-footer").screenshot({ path: resolve(artifacts, "landing-footer.png") });
  await login(page);
  for (const [width, height] of [[1920,1080],[1600,900],[1440,900],[1366,768],[1280,720],[768,1024],[390,844]]) {
    await page.setViewportSize({ width, height });
    for (const route of ["dashboard", "hospitals", "ambulance", "first-aid"]) {
      await navigate(page, route);
      await expect(page.locator("h1")).toBeVisible();
      await noOverflow(page);
      await expect.poll(() => page.locator("h1").evaluate((element) => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(28);
      await expect.poll(() => page.locator("h1").evaluate((element) => parseFloat(getComputedStyle(element).fontSize))).toBeLessThanOrEqual(40);
      if (route === "hospitals") {
        await expect(page.locator(".hospital-card").first()).toBeVisible();
        expect(await page.locator(".hospital-card-aside strong").first().evaluate((element) => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(14);
      }
      if (route === "ambulance") {
        await expect(page.getByText("SIMULATION MODE", { exact: true })).toBeVisible();
        await expect(page.locator(".simulation-banner")).toHaveCount(0);
      }
      if (width === 1440 || width === 390) await page.screenshot({ path: resolve(artifacts, `${route}-${width}.png`) });
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const route of ["my-health", "ai", "doctors", "academy", "emergency"]) {
    await navigate(page, route);
    await expect(page.locator("h1")).toBeVisible();
    await noOverflow(page);
    await page.screenshot({ path: resolve(artifacts, `${route}-desktop.png`) });
  }
  expect(errors).toEqual([]);
});

for (const role of ["admin", "driver"] as const) {
  test(`${role} operational page remains accessible`, async ({ page }) => {
    await login(page, `${role}@healthguard.local`, role === "admin" ? "HealthGuardAdmin!2026" : "HealthGuardDriver!2026");
    await page.goto(`/${role}`);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.getByText("Access denied", { exact: true })).toHaveCount(0);
    await noOverflow(page);
    await page.screenshot({ path: resolve(artifacts, `${role}-desktop.png`) });
  });
}
