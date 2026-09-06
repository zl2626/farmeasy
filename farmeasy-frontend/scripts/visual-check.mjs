import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";

const executablePath = process.env.BROWSER_EXECUTABLE || "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const baseUrl = process.env.VISUAL_BASE_URL || "http://127.0.0.1:5175";
const outputDir = path.resolve(process.env.VISUAL_OUTPUT_DIR || "visual-artifacts");
const cases = [
  { name: "home-mobile", path: "/home", width: 375, height: 812 },
  { name: "market-mobile", path: "/market-prices", width: 375, height: 812 },
  { name: "schemes-tablet", path: "/agri-schemes", width: 768, height: 1024 },
  { name: "crops-desktop", path: "/crops", width: 1440, height: 900 },
];

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ executablePath, headless: true });
let failed = false;

for (const testCase of cases) {
  const page = await browser.newPage({ viewport: { width: testCase.width, height: testCase.height } });
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${baseUrl}${testCase.path}`, { waitUntil: "networkidle" });
  const layout = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
  }));
  await page.screenshot({ path: path.join(outputDir, `${testCase.name}.png`), fullPage: false });
  const overflow = Math.max(layout.scrollWidth, layout.bodyScrollWidth) > layout.innerWidth;
  console.log(`${testCase.name}: viewport=${layout.innerWidth}, scroll=${Math.max(layout.scrollWidth, layout.bodyScrollWidth)}, consoleErrors=${errors.length}`);
  if (overflow || errors.length) failed = true;
  await page.close();
}

await browser.close();
if (failed) process.exitCode = 1;
