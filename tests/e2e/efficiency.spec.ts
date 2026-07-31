import { expect, test } from "@playwright/test";

test.describe("explainers and efficiency value", () => {
  test.beforeEach(async ({ context }) => {
    const response = await context.request.post("/api/auth/demo", {
      headers: { referer: "http://127.0.0.1:4190/demo" },
    });
    expect(response.ok()).toBeTruthy();
  });

  test("explains unfamiliar labels and tracks completed product usage", async ({ page }) => {
    await page.goto("/today");
    const startHereTip = page.getByRole("button", { name: "Explain how Start here is selected" });
    await startHereTip.hover();
    await expect(page.getByRole("tooltip").filter({ hasText: "highest-priority unreviewed item" })).toHaveCSS("opacity", "1");

    await page.getByRole("button", { name: "Mark reviewed" }).click();

    await page.goto("/assistant");
    await page.getByLabel("Prepare with Reg Mitra").fill("Prepare a short internal review checklist.");
    await page.getByRole("button", { name: "Prepare", exact: true }).click();
    await expect(page.getByText("Preparing a draft for review")).toHaveCount(0, { timeout: 10_000 });

    await page.goto("/settings");
    await page.getByText("Efficiency & value", { exact: true }).click();
    await expect(page.getByText("Value tracked from completed work")).toBeVisible();
    await expect(page.getByText("1 answers · 0 drafts")).toHaveCount(0);
    await expect(page.getByText("0 answers · 1 drafts")).toBeVisible();
    await expect(page.getByText("Decisions recorded").locator("..").getByText("1", { exact: true })).toBeVisible();

    await page.getByRole("spinbutton", { name: /Internal draft/ }).fill("20");
    await page.getByRole("button", { name: "Save baseline" }).click();
    await expect(page.getByText("Estimated time reclaimed").locator("..").getByText(/19 min|20 min/)).toBeVisible();
  });
});
