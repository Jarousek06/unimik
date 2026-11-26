// QA run against the local server (node tools/serve.mjs 5216 must be running).
// - screenshots of every page at 320..1440 px in Chromium and WebKit
// - horizontal overflow, fixed call bar overlap, tap target size checks
// - axe-core accessibility scan (WCAG 2.1 A/AA) in Chromium
// - every tel:/mailto:/internal link and button inventory
// Usage: node tools/check.mjs [outDir]
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
import path from "node:path";
import { chromium, webkit } from "playwright";

const BASE = "http://localhost:5216";
const OUT = process.argv[2] || "qa";
const PAGES = [
  "/", "/cisteni-nadrzi/", "/revize-a-tesnostni-zkousky/", "/defektoskopie-a-mereni-tloustky/",
  "/likvidace-nadrzi-a-cerpacich-stanic/", "/havarijni-sluzba/", "/kontakt/", "/ochrana-osobnich-udaju/",
  "/dekujeme/", "/neexistuje/",
];
const WIDTHS = [320, 375, 414, 768, 1024, 1440];
fs.mkdirSync(path.join(OUT, "shots"), { recursive: true });

const report = { overflow: [], overlap: [], smallTargets: [], axe: {}, links: {}, consoleErrors: [] };

async function pageChecks(page, url, width, engine) {
  const r = await page.evaluate(() => {
    const doc = document.documentElement;
    const overflow = doc.scrollWidth > doc.clientWidth ? doc.scrollWidth - doc.clientWidth : 0;
    const wide = [...document.querySelectorAll("body *")]
      .filter((el) => el.getBoundingClientRect().right > doc.clientWidth + 1)
      .slice(0, 5)
      .map((el) => el.tagName + "." + el.className);
    const small = [...document.querySelectorAll("a, button, input, select, textarea, summary")]
      .filter((el) => el.offsetParent !== null && !el.closest(".hp"))
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .filter(({ el, r }) => (r.height < 44 || r.width < 44) && !(el.type === "checkbox"))
      // inline links inside running text are exempt under WCAG 2.5.8
      .filter(({ el }) => !el.closest("p, li.more, .prose ul, address, dd, .todo-note, label"))
      .map(({ el, r }) => `${el.tagName} "${(el.textContent || el.name || "").trim().slice(0, 30)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
    const bar = document.querySelector(".callbar");
    const barVisible = bar && getComputedStyle(bar).display !== "none";
    const pad = parseFloat(getComputedStyle(document.body).paddingBottom);
    const barH = barVisible ? bar.getBoundingClientRect().height : 0;
    return { overflow, wide, small, barVisible, pad, barH };
  });
  if (r.overflow) report.overflow.push(`${engine} ${width}px ${url}: +${r.overflow}px ${r.wide.join(", ")}`);
  if (r.barVisible && r.pad + 0.5 < r.barH) report.overlap.push(`${engine} ${width}px ${url}: body padding ${r.pad} < bar ${r.barH}`);
  for (const s of r.small) report.smallTargets.push(`${engine} ${width}px ${url}: ${s}`);
}

for (const [engineName, engine] of [["chromium", chromium], ["webkit", webkit]]) {
  const browser = await engine.launch();
  for (const width of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width, height: width < 768 ? 800 : 900 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on("console", (m) => m.type() === "error" && report.consoleErrors.push(`${engineName} ${page.url()}: ${m.text()}`));
    for (const url of PAGES) {
      await page.goto(BASE + url, { waitUntil: "networkidle" });
      await pageChecks(page, url, width, engineName);
      const shotName = `${engineName}-${width}-${url.replace(/\//g, "_") || "home"}.png`;
      const wantShot = engineName === "chromium" || url === "/" || url === "/havarijni-sluzba/";
      if (wantShot) await page.screenshot({ path: path.join(OUT, "shots", shotName), fullPage: true });
    }
    await ctx.close();
  }
  await browser.close();
}

// axe + link inventory (Chromium, mobile and desktop)
const browser = await chromium.launch();
for (const width of [375, 1440]) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await ctx.newPage();
  for (const url of PAGES) {
    await page.goto(BASE + url, { waitUntil: "networkidle" });
    const res = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"]).analyze();
    report.axe[`${width} ${url}`] = res.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length}× ${v.nodes.slice(0, 2).map((n) => n.target.join(" ")).join(" | ")}`);
    if (width === 1440) {
      report.links[url] = await page.evaluate(() =>
        [...document.querySelectorAll("a[href], button")].map((a) => `${a.tagName === "BUTTON" ? "button" : a.getAttribute("href")} → "${a.textContent.trim().replace(/\s+/g, " ").slice(0, 40)}"`)
      );
    }
  }
  await ctx.close();
}

// Follow every internal link once and record its HTTP status.
const ctx = await browser.newContext();
const req = ctx.request;
const internal = new Set(Object.values(report.links).flat().map((l) => l.split(" → ")[0]).filter((h) => h.startsWith("/")));
report.linkStatus = {};
for (const href of internal) {
  const r = await req.get(BASE + href.split("#")[0], { maxRedirects: 0 });
  report.linkStatus[href] = r.status();
}
await browser.close();

fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
const axeCount = Object.values(report.axe).flat().length;
console.log(`overflow: ${report.overflow.length}, overlap: ${report.overlap.length}, small targets: ${report.smallTargets.length}, axe violations: ${axeCount}, console errors: ${report.consoleErrors.length}`);
console.log(`internal links checked: ${internal.size}, non-200: ${Object.entries(report.linkStatus).filter(([, s]) => s !== 200).map(([h, s]) => `${h}=${s}`).join(", ") || "none"}`);
