import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("open client workspace", () => {
  test("creates, edits, manages, remembers, and archives a client", async ({ page }) => {
    await page.goto("/clients");
    await page.getByRole("button", { name: "Add client" }).click();
    await page.getByLabel("Legal name").fill("Acme Advisory Private Limited");
    await page.getByLabel("Working name").fill("Acme Advisory");
    await page.getByLabel("Sector").fill("Professional services");
    await page.getByLabel("Primary location").fill("Mumbai, Maharashtra");
    await page.getByLabel("Registrations").fill("GSTIN 27ABCDE1234F1Z5");
    await page.getByRole("button", { name: "Create client" }).click();

    await expect(page.getByRole("link", { name: "Acme Advisory" })).toBeVisible();
    await page.getByRole("link", { name: "Acme Advisory" }).click();
    await expect(page.getByRole("heading", { name: "Acme Advisory", level: 1 })).toBeVisible();
    await expect(page.getByText("What deserves your attention")).toBeVisible();

    await page.getByRole("button", { name: "Edit client" }).click();
    await page.getByLabel("Working name").fill("Acme CA");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("heading", { name: "Acme CA", level: 1 })).toBeVisible();

    await page.getByLabel("New task").fill("Review GST reconciliation");
    await page.getByRole("button", { name: "Add task" }).click();
    await expect(page.getByText("Review GST reconciliation")).toBeVisible();

    await page.getByLabel("Client-specific Assistant memory").fill("Monthly GST filer. Partner prefers one-page briefs.");
    await page.getByRole("button", { name: "Save memory" }).click();
    await page.reload();
    await expect(page.getByLabel("Client-specific Assistant memory")).toHaveValue(
      "Monthly GST filer. Partner prefers one-page briefs.",
    );

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);

    await page.getByRole("button", { name: "Archive client" }).click();
    await expect(page).toHaveURL(/\/clients$/);
    await expect(page.getByRole("link", { name: "Acme CA" })).toHaveCount(0);
  });
});
