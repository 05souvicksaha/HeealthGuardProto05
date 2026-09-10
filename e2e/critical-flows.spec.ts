import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const artifactDirectory = resolve("artifacts/qa");

test.beforeAll(() => mkdirSync(artifactDirectory, { recursive: true }));

test("landing account and product calls to action route as requested", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Your Family's Health, Organised, Understood, And Protected" })).toBeVisible();
  await expect(page.locator(".family-header .healthguard-logo")).toHaveAttribute("src", "/assets/healthguard-logo.png");
  await page.screenshot({ path: resolve(artifactDirectory, "landing-desktop.png"), fullPage: true });

  const verifyArrowOnlyRail = async (railSelector: string, nextLabel: string, previousLabel: string) => {
    const rail = page.locator(railSelector);
    await expect(rail).toBeVisible();

    const scrollbarStyles = await rail.evaluate((element) => ({
      standardsWidth: getComputedStyle(element).scrollbarWidth,
      webkitDisplay: getComputedStyle(element, "::-webkit-scrollbar").display
    }));
    expect(scrollbarStyles.standardsWidth).toBe("none");
    expect(scrollbarStyles.webkitDisplay).toBe("none");

    const initialScrollLeft = await rail.evaluate((element) => element.scrollLeft);
    await page.getByRole("button", { name: nextLabel }).click();
    await expect.poll(() => rail.evaluate((element) => element.scrollLeft)).toBeGreaterThan(initialScrollLeft + 10);

    const advancedScrollLeft = await rail.evaluate((element) => element.scrollLeft);
    await page.getByRole("button", { name: previousLabel }).click();
    await expect.poll(() => rail.evaluate((element) => element.scrollLeft)).toBeLessThan(advancedScrollLeft - 10);
  };

  await verifyArrowOnlyRail(".family-feature-rail", "Show next platform feature", "Show previous platform feature");
  await verifyArrowOnlyRail(".family-story-rail", "Show next family workflow", "Show previous family workflow");

  for (const label of ["Explore the platform", "Emergency support", "Explore my health", "Get started"]) {
    await page.goto("/");
    await page.getByRole("link", { name: label, exact: false }).first().click();
    await expect(page).toHaveURL(/\/login$/);
  }

  await page.goto("/");
  await page.getByRole("link", { name: "Sign Up", exact: true }).click();
  await expect(page).toHaveURL(/\/register$/);
  await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();

  await page.goto("/");
  await page.getByRole("link", { name: "Login", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Welcome back to HealthGuard" })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(hasHorizontalOverflow).toBe(false);
  await page.screenshot({ path: resolve(artifactDirectory, "landing-mobile.png"), fullPage: true });
});

test("authenticated health, assistant, Academy, and ambulance workflows remain truthful and responsive", async ({ page }) => {
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];

  await page.setViewportSize({ width: 900, height: 1000 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Your Family's Health, Organised, Understood, And Protected" })).toBeVisible();
  await page.getByRole("link", { name: "Login", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Welcome back to HealthGuard" })).toBeVisible();
  await expect(page.locator(".auth-v3-header .healthguard-logo")).toBeVisible();
  await page.screenshot({ path: resolve(artifactDirectory, "login-desktop.png"), fullPage: true });
  await page.getByRole("link", { name: "Sign up", exact: true }).click();
  await page.getByLabel("Full name").fill("E2E Care Owner");
  await page.getByLabel("Email address").fill(`e2e-${Date.now()}@healthguard.local`);
  await page.locator("#auth-password").fill("HealthGuard!2026");
  await page.locator("#auth-confirm").fill("HealthGuard!2026");
  await page.getByRole("button", { name: "Create secure account" }).click();
  await expect(page.getByRole("heading", { name: "OTP verification" })).toBeVisible();
  await page.getByRole("button", { name: /Use local preview code/ }).click();
  await page.getByRole("button", { name: "Verify code" }).click();
  await expect(page.getByRole("heading", { name: "Tell us about yourself" })).toBeVisible();
  await expect(page.getByText("Step 2: Complete your profile (2 of 3)")).toBeVisible();
  await expect(page.getByText("Devices", { exact: true })).toHaveCount(0);
  await page.screenshot({ path: resolve(artifactDirectory, "profile-setup-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByLabel("Date of birth").fill("1990-01-01");
  await page.getByLabel("Blood group").selectOption("O+");
  await page.getByLabel("Primary phone number").fill("9000000000");
  await page.getByRole("button", { name: "Save & continue" }).click();
  await expect(page.getByRole("heading", { name: /Welcome/ })).toBeVisible({ timeout: 10_000 });
  await expect(page.locator(".sidebar .healthguard-logo")).toBeVisible();
  await expect(page.getByText("No device connected", { exact: true })).toHaveCount(0);
  await expect(page.locator('img[src="/assets/health-wearables.webp"]')).toHaveCount(0);
  const biometricBackdrop = page.locator(".dashboard-biometric-backdrop");
  await expect(biometricBackdrop).toBeVisible();
  await expect(biometricBackdrop).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator(".dashboard-edge-dna")).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator(".dashboard-edge-dna-rail")).toHaveCount(2);
  await expect(page.locator(".sidebar .nav-group-raised").filter({ hasText: "HealthGuard AI" })).toHaveCount(1);
  expect(await page.locator(".dashboard-heartbeat-flow").evaluate((element) => getComputedStyle(element).animationName)).toBe("dashboard-heartbeat-travel");
  expect(await page.locator(".dashboard-heartbeat-glow").evaluate((element) => getComputedStyle(element).animationName)).toBe("dashboard-heartbeat-breathe");
  expect(await page.locator(".dashboard-edge-dna-track").first().evaluate((element) => getComputedStyle(element).animationName)).toBe("dashboard-dna-descend");
  const scrollbar = await page.evaluate(() => ({
    color: getComputedStyle(document.documentElement).scrollbarColor,
    width: getComputedStyle(document.documentElement).scrollbarWidth,
    webkitWidth: getComputedStyle(document.documentElement, "::-webkit-scrollbar").width
  }));
  expect(scrollbar.color).not.toBe("auto");
  expect(scrollbar.width).toBe("thin");
  expect(scrollbar.webkitWidth).toBe("4px");
  const sidebarScrollbar = await page.locator(".sidebar").evaluate((element) => ({
    width: getComputedStyle(element).scrollbarWidth,
    webkitDisplay: getComputedStyle(element, "::-webkit-scrollbar").display,
    overflowY: getComputedStyle(element).overflowY
  }));
  expect(sidebarScrollbar.width).toBe("none");
  expect(sidebarScrollbar.webkitDisplay).toBe("none");
  expect(sidebarScrollbar.overflowY).toBe("auto");
  expect(await page.locator(".dashboard-heartbeat-flow").getAttribute("d")).toContain("L1580 72");
  await expect(page.locator(".dashboard-heartbeat-nodes circle")).toHaveCount(4);
  expect(await page.locator(".dashboard-dna-nodes circle").count()).toBeGreaterThan(0);
  expect((await page.context().cookies()).some((cookie) => cookie.name === "hg_refresh")).toBe(true);
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("requestfailed", (request) => {
    if (request.failure()?.errorText !== "net::ERR_ABORTED") failedRequests.push(`${request.method()} ${request.url()} — ${request.failure()?.errorText}`);
  });

  await page.screenshot({ path: resolve(artifactDirectory, "dashboard-desktop.png"), fullPage: true });

  await page.getByRole("link", { name: "Hospitals", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Hospitals", exact: true })).toBeVisible();
  const specialtyFilters = page.locator(".specialty-spectrum-grid .specialty-filter");
  await expect(specialtyFilters).toHaveCount(20);
  const specialtyColors = await specialtyFilters.evaluateAll((elements) => elements.map((element) => getComputedStyle(element).getPropertyValue("--specialty-color").trim()));
  expect(new Set(specialtyColors).size).toBe(20);
  await page.getByLabel("Type").selectOption("private");
  await expect(page.getByText("50 matching hospitals", { exact: true })).toBeVisible();
  await page.locator(".hospital-card-link").first().click();
  await expect(page.locator(".hospital-profile-dialog")).toBeVisible();
  await expect(page.locator(".hospital-profile-type")).toContainText("Private");
  expect(await page.locator(".hospital-profile-specialty-grid .specialty-chip").count()).toBeGreaterThan(0);
  await page.screenshot({ path: resolve(artifactDirectory, "hospital-profile-private.png"), fullPage: true });
  await page.getByRole("button", { name: "Close profile" }).click();

  await page.getByRole("link", { name: "My Health", exact: true }).click();
  await expect(page.getByRole("heading", { name: "My Health" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "E2E Care Owner", exact: true })).toBeVisible();
  await expect(page.locator(".tab-strip button > span")).toHaveCount(0);

  await page.getByRole("link", { name: "HealthGuard AI", exact: true }).click();
  await expect(page.getByRole("heading", { name: "How can I help you today?" })).toBeVisible();
  await expect(page.getByText("Risk assessment", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Report analysis", { exact: true })).toHaveCount(0);
  await page.getByRole("textbox", { name: "Ask HealthGuard" }).fill("What should I prepare before a hospital visit?");
  await page.getByRole("button", { name: "Ask HealthGuard" }).click();
  await expect(page.locator(".assistant-error")).toBeVisible();

  await page.getByRole("link", { name: "Academy", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Emergency flashcards" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Flashcards" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Progress" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "MCQs" })).toHaveCount(0);
  await expect(page.getByRole("tab", { name: "Scenarios" })).toHaveCount(0);
  const firstFlashcard = page.locator(".reference-flashcard").first();
  await expect(firstFlashcard).toBeVisible();
  await firstFlashcard.click();
  await expect(firstFlashcard).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("link", { name: "Ambulance", exact: true }).click();
  await page.getByLabel("Pickup point").fill("Salt Lake Sector V, Kolkata");
  await page.getByLabel("Destination").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Start simulated request" }).click();
  await expect(page.getByText("Request active")).toBeVisible();
  await page.getByRole("button", { name: /Advance simulation/ }).click();
  await expect(page.getByText("Simulation unit assigned", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Home", exact: true }).click();
  await expect(page.getByRole("heading", { name: /Welcome/ })).toBeVisible();
  const themeButton = page.getByRole("button", { name: /Theme preference/ });
  await themeButton.click();
  await themeButton.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator(".toast")).toHaveCount(0, { timeout: 7_000 });
  await page.screenshot({ path: resolve(artifactDirectory, "dashboard-dark.png"), fullPage: true });

  for (const viewport of [
    { width: 768, height: 1024, name: "tablet" },
    { width: 375, height: 812, name: "mobile" }
  ]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(page.getByRole("heading", { name: /Welcome/ })).toBeVisible();
    expect(await page.locator(".dashboard-heartbeat-flow").evaluate((element) => getComputedStyle(element).animationName)).toBe("none");
    expect(await page.locator(".dashboard-heartbeat-glow").evaluate((element) => getComputedStyle(element).animationName)).toBe("none");
    expect(await page.locator(".dashboard-edge-dna-track").first().evaluate((element) => getComputedStyle(element).animationName)).toBe("none");
    const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    expect(hasHorizontalOverflow, `${viewport.name} should not overflow horizontally`).toBe(false);
    await page.screenshot({ path: resolve(artifactDirectory, `dashboard-${viewport.name}.png`), fullPage: true });
  }

  await page.reload();
  await expect(page.getByRole("heading", { name: /Welcome/ })).toBeVisible({ timeout: 10_000 });

  const unexpectedConsoleErrors = consoleErrors.filter(
    (message) => !message.includes("503 (Service Unavailable)")
  );
  expect(unexpectedConsoleErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
});
