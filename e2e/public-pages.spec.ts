import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const artifacts = resolve(process.env.TEMP ?? ".", "healthguard-public-pages-qa");
const teamMembers = ["Ankurak Roy", "Kinjal Pramanik", "Souvick Saha", "Aryan Chowdhury", "Sampad Chakraborty", "Sneha Sarkar"];
test.beforeAll(() => mkdirSync(artifacts, { recursive: true }));

async function expectNoOverflow(page: import("@playwright/test").Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
}

test("About and Emergency support are public and preserve the landing navigation flow", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.context().clearCookies();

  await page.goto("/");
  await page.getByRole("link", { name: "About", exact: true }).click();
  await expect(page).toHaveURL(/\/about$/);
  await expect(page).not.toHaveURL(/login/);
  await expect(page).toHaveTitle("Our developer team — HealthGuard");
  await expect(page.getByRole("heading", { level: 1, name: "The people behind HealthGuard" })).toBeVisible();
  await expect(page.locator(".about-developer-card")).toHaveCount(6);
  await expect(page.locator(".about-developer-portrait")).toHaveCount(6);
  for (const teamMember of teamMembers) {
    await expect(page.getByText(teamMember, { exact: true })).toBeVisible();
    await expect(page.getByRole("img", { name: `${teamMember} portrait` })).toBeVisible();
  }
  await page.locator(".about-developer-portrait").evaluateAll((images) =>
    Promise.all(images.map((image) => (image as HTMLImageElement).decode())),
  );
  expect(await page.locator(".about-developer-portrait").evaluateAll((images) =>
    images.every((image) => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0),
  )).toBe(true);
  await expectNoOverflow(page);
  await page.screenshot({ path: resolve(artifacts, "about-desktop.png"), fullPage: true });

  await page.getByRole("link", { name: "Emergency support", exact: true }).click();
  await expect(page).toHaveURL(/\/emergency-support$/);
  await expect(page).not.toHaveURL(/login/);
  await expect(page).toHaveTitle("Emergency support — HealthGuard");
  await expect(page.getByRole("heading", { level: 1, name: "Emergency support" })).toBeVisible();
  await expect(page.locator(".public-emergency-hero")).toHaveCount(0);
  await expect(page.locator(".first-aid-category-grid button")).toHaveCount(20);
  await expect(page.locator(".first-aid-results-heading")).toContainText("435 protocols");
  await page.waitForTimeout(450);
  await page.screenshot({ path: resolve(artifacts, "emergency-support-desktop.png"), fullPage: false });

  await page.getByLabel("Search first aid guidance").fill("sudden cardiac arrest");
  const detailTrigger = page.getByRole("button", { name: "Open Sudden Cardiac Arrest (SCA) guidance" });
  await expect(detailTrigger).toBeVisible();
  await detailTrigger.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog")).not.toContainText(/log in/i);
  await page.keyboard.press("Escape");
  await expect(detailTrigger).toBeFocused();
  await expectNoOverflow(page);
  await page.screenshot({ path: resolve(artifacts, "emergency-support-detail.png"), fullPage: false });

  await page.goto("/");
  await page.getByRole("link", { name: "Emergency support", exact: true }).click();
  await expect(page).toHaveURL(/\/emergency-support$/);
  expect(errors).toEqual([]);
});

test("public pages are responsive and honor reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/about");
  await expect(page.locator(".about-developer-card")).toHaveCount(6);
  await expect(page.locator(".about-developer-portrait")).toHaveCount(6);
  await expectNoOverflow(page);
  await page.screenshot({ path: resolve(artifacts, "about-mobile.png"), fullPage: false });

  await page.goto("/emergency-support");
  await expect(page.getByRole("heading", { level: 1, name: "Emergency support" })).toBeVisible();
  await expect(page.locator(".public-emergency-hero")).toHaveCount(0);
  await expectNoOverflow(page);
  await page.waitForTimeout(450);
  await page.screenshot({ path: resolve(artifacts, "emergency-support-mobile.png"), fullPage: false });

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/about");
  await expect.poll(() => page.locator(".about-public-page").evaluate((element) => getComputedStyle(element).animationName)).toBe("none");
  await expect.poll(() => page.locator(".about-developer-card").first().evaluate((element) => getComputedStyle(element).animationName)).toBe("none");
});
