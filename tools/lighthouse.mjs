// Lighthouse (mobile + desktop) for every page against the local server.
// Usage: node tools/lighthouse.mjs [outDir]   (server on :5216 must be running)
import * as chromeLauncher from "chrome-launcher";
import fs from "node:fs";
import path from "node:path";
import lighthouse from "lighthouse";
import desktopConfig from "lighthouse/core/config/desktop-config.js";
import { chromium } from "playwright";

const BASE = "http://localhost:5216";
const OUT = process.argv[2] || "qa";
const PAGES = [
  "/", "/cisteni-nadrzi/", "/revize-a-tesnostni-zkousky/", "/defektoskopie-a-mereni-tloustky/",
  "/likvidace-nadrzi-a-cerpacich-stanic/", "/havarijni-sluzba/", "/kontakt/", "/ochrana-osobnich-udaju/",
];
fs.mkdirSync(path.join(OUT, "lighthouse"), { recursive: true });

const chrome = await chromeLauncher.launch({ chromePath: chromium.executablePath(), chromeFlags: ["--headless=new"] });
const rows = [];
for (const formFactor of ["mobile", "desktop"]) {
  for (const p of PAGES) {
    const config = formFactor === "desktop" ? desktopConfig : undefined;
    const { lhr, report } = await lighthouse(BASE + p, { port: chrome.port, output: "html", logLevel: "error" }, config);
    const c = lhr.categories;
    const a = lhr.audits;
    const row = {
      page: p,
      formFactor,
      perf: Math.round(c.performance.score * 100),
      a11y: Math.round(c.accessibility.score * 100),
      bp: Math.round(c["best-practices"].score * 100),
      seo: Math.round(c.seo.score * 100),
      lcp: a["largest-contentful-paint"].displayValue,
      cls: a["cumulative-layout-shift"].displayValue,
      tbt: a["total-blocking-time"].displayValue,
      renderBlocking: a["render-blocking-resources"]?.details?.items?.length ?? 0,
      bytes: a["total-byte-weight"].displayValue,
    };
    rows.push(row);
    const failing = Object.values(a).filter((x) => x.score !== null && x.score < 0.9 && x.scoreDisplayMode !== "informative" && x.scoreDisplayMode !== "manual" && x.scoreDisplayMode !== "notApplicable");
    row.failing = failing.map((x) => x.id).join(", ");
    fs.writeFileSync(path.join(OUT, "lighthouse", `${formFactor}${p.replace(/\//g, "_")}.html`), report);
    console.log(`${formFactor.padEnd(7)} ${p.padEnd(40)} P${row.perf} A${row.a11y} BP${row.bp} SEO${row.seo}  LCP ${row.lcp}  CLS ${row.cls}  TBT ${row.tbt}  ${row.bytes}${row.failing ? "  ! " + row.failing : ""}`);
  }
}
await chrome.kill();
fs.writeFileSync(path.join(OUT, "lighthouse", "summary.json"), JSON.stringify(rows, null, 2));
