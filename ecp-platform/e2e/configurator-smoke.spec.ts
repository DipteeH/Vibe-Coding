import { expect, test } from "@playwright/test";

test("unauthenticated users are redirected to login when they try to save a quote", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("button", { name: /Atlas SUV/i })).toBeVisible();

  await page.getByRole("button", { name: /Atlas SUV/i }).click();
  await expect(page.getByText("Powertrain selection")).toBeVisible();

  await page.getByRole("button", { name: /9\. Review & Save/i }).click();
  await expect(page.getByRole("button", { name: "Save quote" })).toBeVisible();

  await page.getByRole("button", { name: "Save quote" }).click();

  await expect(page).toHaveURL(/\/login\?returnTo=/);
});