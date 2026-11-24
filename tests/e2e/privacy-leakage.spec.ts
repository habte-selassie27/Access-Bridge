import { test, expect } from "@playwright/test";

/**
 * Gate D — Privacy leakage: strict private mode must never send document text
 * to the cloud. This intercepts all requests to Firebase AI Logic endpoints
 * and asserts the pasted secret never appears in any request body.
 *
 * Run against a locally configured origin:
 *   VITE_FIREBASE_APPCHECK_DEBUG_TOKEN=true npm run dev   (frontend)
 *   npx playwright test tests/e2e/privacy-leakage.spec.ts
 */
test("private mode sends no document text to Firebase cloud", async ({ page }) => {
  const cloudBodies: string[] = [];
  page.on("request", (req) => {
    const u = req.url();
    if (
      u.includes("generativelanguage.googleapis.com") ||
      u.includes("firebase.googleapis.com")
    ) {
      cloudBodies.push(req.postData() ?? "");
    }
  });

  await page.goto("/");

  // Choose Private device only.
  await page.click('[data-testid="privacy-mode-private"]');

  // Paste a document containing a secret that must not leave the device.
  await page.fill('[data-testid="paste-input"]', "SECRET deadline: December 15, 2026. FEE: 5000 ETB.");
  await page.click('[data-testid="explain-button"]');

  // With no on-device model in this environment, private mode must block
  // rather than upload. Expect a clear user-visible block message.
  await expect(
    page.getByText(/On-device model unavailable/i).first()
  ).toBeVisible();

  // Crucial: no document text in any cloud request body.
  expect(
    cloudBodies.every(
      (b) => !b.includes("SECRET") && !b.includes("5000 ETB") && !b.includes("December 15, 2026")
    )
  ).toBe(true);
});

test("smart hybrid with consent does send to cloud", async ({ page }) => {
  const cloudBodies: string[] = [];
  page.on("request", (req) => {
    const u = req.url();
    if (
      u.includes("generativelanguage.googleapis.com") ||
      u.includes("firebase.googleapis.com")
    ) {
      cloudBodies.push(req.postData() ?? "");
    }
  });

  await page.goto("/");

  // Choose Smart hybrid -> triggers consent dialog.
  await page.click('[data-testid="privacy-mode-smart"]');
  await page.click('[data-testid="consent-accept"]');

  await page.fill('[data-testid="paste-input"]', "Application deadline: December 15, 2026.");
  await page.click('[data-testid="explain-button"]');

  // A cloud request should now fire. We assert on the request itself rather
  // than a success badge: a host with an App Check 401 will still have sent the
  // document text, which is the privacy-relevant fact under test.
  await expect.poll(() => cloudBodies.length, { timeout: 30000 }).toBeGreaterThan(0);
  expect(cloudBodies.some((b) => b.includes("December 15, 2026"))).toBe(true);
});
