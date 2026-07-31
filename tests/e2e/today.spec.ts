import { expect, test } from "@playwright/test";

test.describe("Today command centre", () => {
  test.beforeEach(async ({ context }) => {
    const response = await context.request.post("/api/auth/demo", {
      headers: { referer: "http://127.0.0.1:4190/demo" },
    });
    expect(response.ok()).toBeTruthy();
  });

  test("focuses the next decision and keeps the queue actionable", async ({ page }) => {
    await page.goto("/today");

    await expect(page.getByRole("heading", { name: "Today", level: 1 })).toBeVisible();
    await expect(page.getByRole("region", { name: "How Today works" })).toBeVisible();
    await expect(page.getByRole("heading", {
      name: "Verify IGST rate changes for pharma intermediates",
      level: 2,
    })).toBeVisible();
    await expect(page.getByRole("link", { name: "Open client" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Prepare review" })).toBeVisible();

    await page.getByRole("button", { name: /Review overdue FSSAI transition confirmation/ }).click();
    await expect(page.getByRole("heading", {
      name: "Review overdue FSSAI transition confirmation",
      level: 2,
    })).toBeVisible();

    await page.getByRole("button", { name: "Mark reviewed" }).click();
    await expect(page.getByText("Review overdue FSSAI transition confirmation", { exact: true })).toHaveCount(0);
    await expect(page.getByText("3 after this")).toHaveCount(0);
  });
});
