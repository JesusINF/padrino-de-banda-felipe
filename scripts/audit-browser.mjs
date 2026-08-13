import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const baseUrl = process.argv[2] ?? "http://localhost:4174";
const viewports = [
  { name: "mobile-360", width: 360, height: 800 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "desktop-1280", width: 1280, height: 800 }
];

await mkdir("audit", { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
});
const results = [];

for (const viewport of viewports) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const consoleErrors = [];
  const failedRequests = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("requestfailed", (request) => failedRequests.push(`${request.url()} :: ${request.failure()?.errorText}`));

  const response = await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 30000 });
  await page.screenshot({ path: `audit/${viewport.name}-top.png` });

  if (viewport.name === "mobile-390") {
    const heroHeight = await page.locator(".hero").evaluate((element) => element.offsetHeight);
    await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), Math.round(heroHeight * .48));
    await page.waitForTimeout(250);
    await page.screenshot({ path: "audit/mobile-390-name.png" });
    await page.locator(".ask").scrollIntoViewIfNeeded();
    await page.waitForTimeout(250);
    await page.screenshot({ path: "audit/mobile-390-accept.png" });
    await page.locator(".meaning").scrollIntoViewIfNeeded();
    await page.waitForTimeout(900);
    await page.screenshot({ path: "audit/mobile-390-meaning.png" });
    await page.locator(".date-card").scrollIntoViewIfNeeded();
    await page.waitForTimeout(700);
    await page.screenshot({ path: "audit/mobile-390-date.png" });
  }

  const metrics = await page.evaluate(() => {
    const button = document.querySelector("#accept-trigger");
    const buttonRect = button.getBoundingClientRect();
    const images = [...document.images].map((image) => ({
      src: image.getAttribute("src"),
      complete: image.complete,
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight
    }));
    return {
      viewport: { width: document.documentElement.clientWidth, height: window.innerHeight },
      horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      button: { width: buttonRect.width, height: buttonRect.height, disabled: button.disabled },
      images,
      revealedNotes: document.querySelectorAll("[data-note].is-visible").length
    };
  });

  results.push({
    name: viewport.name,
    status: response?.status(),
    consoleErrors,
    failedRequests,
    metrics
  });
  await context.close();
}

await browser.close();
await writeFile("audit/results.json", JSON.stringify(results, null, 2));

const failures = results.flatMap((result) => {
  const list = [];
  if (result.status !== 200) list.push(`${result.name}: HTTP ${result.status}`);
  if (result.consoleErrors.length) list.push(`${result.name}: ${result.consoleErrors.length} errores de consola`);
  if (result.failedRequests.length) list.push(`${result.name}: ${result.failedRequests.length} cargas fallidas`);
  if (result.metrics.horizontalOverflow !== 0) list.push(`${result.name}: overflow ${result.metrics.horizontalOverflow}px`);
  if (result.metrics.button.height < 44) list.push(`${result.name}: botón menor a 44px`);
  if (result.metrics.images.some((image) => !image.complete || image.naturalWidth === 0)) list.push(`${result.name}: imagen incompleta`);
  return list;
});

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(JSON.stringify(results, null, 2));
