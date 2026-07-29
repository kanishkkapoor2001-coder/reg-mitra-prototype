import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const publicRoutes = ["/", "/about", "/pricing", "/faq", "/login"];
const productRoutes = [
  "/today",
  "/clients",
  "/clients/sharma",
  "/clients/new",
  "/briefings",
  "/calendar",
  "/assistant",
  "/regulations",
  "/settings",
  "/billing",
];

async function expectNoAccessibilityViolations(page: Page, route: string) {
  const pageOverflowsViewport = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(pageOverflowsViewport, `${route} overflows the viewport`).toBeFalsy();
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const details = results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    help: violation.help,
    targets: violation.nodes.map((node) => node.target.join(" ")),
  }));
  expect(details, `${route} has automated WCAG violations`).toEqual([]);
}

test.describe("public experience", () => {
  for (const route of publicRoutes) {
    test(`${route} has no automated WCAG AA violations`, async ({ page }) => {
      await page.goto(route);
      await expect(page.locator("body")).toBeVisible();
      await expect(page.locator("main h1")).toHaveCount(1);
      const mainText = (await page.locator("main").innerText()).replace(/\s+/g, " ").trim();
      expect(mainText.length, `${route} renders an empty product page`).toBeGreaterThan(80);
      await expectNoAccessibilityViolations(page, route);
    });
  }
});

test.describe("demo product experience", () => {
  test.beforeEach(async ({ request }) => {
    await request.post("/api/auth/demo", {
      headers: { referer: "http://127.0.0.1:4190/demo" },
    });
  });

  for (const route of productRoutes) {
    test(`${route} has no automated WCAG AA violations`, async ({ page, context }) => {
      const demoResponse = await context.request.post("/api/auth/demo", {
        headers: { referer: "http://127.0.0.1:4190/demo" },
      });
      expect(demoResponse.ok()).toBeTruthy();
      await page.goto(route);
      await expect(page.locator("body")).toBeVisible();
      await expectNoAccessibilityViolations(page, route);
    });
  }
});
