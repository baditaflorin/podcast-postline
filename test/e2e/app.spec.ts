import { expect, test } from "@playwright/test";

test("loads processing app with project links and build metadata", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Post-production line" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "GitHub" })).toHaveAttribute(
    "href",
    "https://github.com/baditaflorin/podcast-postline",
  );
  await expect(page.getByRole("link", { name: "PayPal" })).toHaveAttribute(
    "href",
    "https://www.paypal.com/paypalme/florinbadita",
  );
  await expect(page.getByText(/^v0\.1\.0$/)).toBeVisible();
  await expect(page.getByText(/^commit /)).toBeVisible();
});
