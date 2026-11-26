import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const browserErrors = new WeakMap<Page, string[]>();

test.beforeEach(({ page }) => {
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error") errors.push(message.text());
  });
});

test.afterEach(({ page }) => {
  expect(browserErrors.get(page)).toEqual([]);
});

async function checkAccessibility(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(violations.map(({ id, nodes }) => ({ id, targets: nodes.map(node => node.target) }))).toEqual([]);
}

async function checkPageWidth(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

test("the landing page exposes the full catalog and keyboard navigation", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText("Indonesia highlighted")).toBeVisible();
  await expect(page.getByTestId("globe-scene").locator("canvas")).toHaveCount(0);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await expect(page.locator("#products li a")).toHaveCount(12);
  await checkPageWidth(page);
  await checkAccessibility(page);
  await testInfo.attach("landing", { body: await page.screenshot(), contentType: "image/png" });
});

test("the coffee view presents the same loading treatment and dated analysis", async ({ page }, testInfo) => {
  let attempts = 0;
  await page.route("**/api/ai/coffee-outlook/*", route => {
    attempts++;
    if (attempts > 1) return route.fulfill({ json: {
      state: "data", generatedAt: null, coverage: "2022–2025",
      sections: ["Observed import values", "Potential research", "Compare trade quantities"],
    } });
    return route.fulfill({ json: {
      state: "outdated",
      generatedAt: "2026-11-26T00:00:00Z",
      coverage: "2022–2025",
      sections: [
        "If recent trade patterns persist, the United States could remain one of the largest covered markets in 2026.",
        "China’s import value grew 45.93% per year over 2022–2025.",
        "Rising import value can reflect higher prices, larger orders, or both.",
      ],
    } });
  });
  await page.goto("/mulai/090111");
  await expect(page.locator('[aria-labelledby="coffee-leaders"] li')).toHaveCount(3);
  await expect(page.locator('[aria-labelledby="destinations"] a')).toHaveCount(10);
  const button = page.getByRole("button", { name: /Predict with AI/ });
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Preparing AI insights…")).toBeVisible();
  expect(await page.locator(".ai-spinner").evaluate(element => getComputedStyle(element).animationName)).toBe("ai-spin");
  await expect(page.getByText("Outdated analysis")).toBeVisible();
  await expect(page.locator("time")).toContainText("2026-11-26 UTC");

  await checkPageWidth(page);
  await checkAccessibility(page);
  await testInfo.attach("coffee-outlook", { body: await page.screenshot(), contentType: "image/png" });
  await button.click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await button.click();
  await expect(page.getByText("AI unavailable")).toBeVisible();
  expect(await page.locator(".analysis-reveal").evaluate(element => getComputedStyle(element).animationName)).toBe("none");
});

test("market research displays a chart and accessible annual values", async ({ page }, testInfo) => {
  await page.goto("/mulai/090111?market=276&compare=156");
  await expect(page.getByRole("heading", { name: "Import history" })).toBeVisible();
  await expect(page.getByTestId("import-chart").locator("svg.recharts-surface").first()).toBeVisible();
  await expect(page.locator(".recharts-line-curve")).toHaveCount(2);
  if (testInfo.project.name === "desktop") {
    await page.getByTestId("import-chart").locator(".recharts-wrapper").hover({ position: { x: 130, y: 100 } });
    await expect(page.getByText(/^Trade year 202[2-5]$/)).toBeVisible();
  }
  await checkPageWidth(page);
  await page.getByText("View Germany history and suppliers").click();
  await expect(page.getByRole("table", { name: "Germany import history" })).toBeVisible();
  await checkAccessibility(page);
  await testInfo.attach("market-comparison", { body: await page.screenshot(), contentType: "image/png" });
  await page.getByRole("link", { name: "Open Germany data and score breakdown" }).click();
  await expect(page.getByRole("heading", { name: "Import value by year" })).toBeVisible();
  await page.getByText("View chart data table").click();
  await expect(page.getByRole("table", { name: "Annual imports in United States dollars" })).toBeVisible();
  await checkPageWidth(page);
  await testInfo.attach("ranked-market", { body: await page.screenshot(), contentType: "image/png" });
});
