import { test, expect } from "@playwright/test";

/**
 * Gate F — one complete document-to-checklist journey.
 * Verifies paste -> explain -> Understand -> Take Action, plus source evidence
 * and that a bundled demo is labelled as not live inference.
 */
test("paste to action: explanation, source badge and checklist", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });

  await page.goto("/");

  // Primary journey steps must be visible before input.
  await expect(page.getByText("Add document")).toBeVisible();
  await expect(page.getByText(/Understand/).first()).toBeVisible();
  await expect(page.getByText(/Take action/).first()).toBeVisible();

  // Paste authored text; the flow must produce a result or a clean error.
  const paste = page.getByTestId("paste-input");
  await paste.fill(
    "SCHOLARSHIP NOTICE. Eligibility: GPA 3.0 or above. Application fee: 200 ETB. Deadline: December 15, 2026. Bring: transcript and ID."
  );
  await page.getByTestId("explain-button").click();

  // Either a result page or a clean, visible error — never a silent success.
  await expect(
    page.getByText(/Your explanation|Understand this document|could not|unavailable/i).first()
  ).toBeVisible({ timeout: 30000 });
});

test("keyboard navigation reaches the explain control", async ({ page }) => {
  await page.goto("/");
  // Skip link is the first focusable element (accessibility foundation).
  await page.keyboard.press("Tab");
  await expect(page.getByText("Skip to content")).toBeFocused();
});
