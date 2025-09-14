import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";

(async () => {
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 400 });
  await page.goto("http://localhost:5173", { waitUntil: "networkidle0" });
  const out = path.resolve("scroller-screenshot.png");
  await page.screenshot({ path: out });
  console.log("Saved", out);
  await browser.close();
})();
