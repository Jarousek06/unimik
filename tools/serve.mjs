// Local preview server for dist/ that mimics the hosting setup:
// directory indexes, 404.html, and the global headers from dist/_headers.
// Usage: node tools/serve.mjs [port]
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1")), "..", "dist");
const PORT = +(process.argv[2] || 5216);
const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".avif": "image/avif", ".woff2": "font/woff2",
  ".xml": "application/xml", ".txt": "text/plain; charset=utf-8", ".webmanifest": "application/manifest+json",
};

function globalHeaders() {
  const out = {};
  const txt = fs.readFileSync(path.join(ROOT, "_headers"), "utf8");
  const block = txt.split(/\n(?=\S)/)[0];
  for (const line of block.split("\n").slice(1)) {
    const m = line.match(/^\s+([\w-]+):\s*(.+)$/);
    if (m && m[1] !== "Strict-Transport-Security") out[m[1]] = m[2].replace("upgrade-insecure-requests", "").replace(/;\s*$/, "");
  }
  return out;
}

http
  .createServer((req, res) => {
    const url = decodeURIComponent(req.url.split("?")[0]);
    if (req.method === "POST") {
      res.writeHead(303, { Location: "/dekujeme/" });
      return res.end();
    }
    let file = path.join(ROOT, url);
    if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
      if (!url.endsWith("/")) { res.writeHead(301, { Location: url + "/" }); return res.end(); }
      file = path.join(file, "index.html");
    }
    let status = 200;
    if (!fs.existsSync(file)) { file = path.join(ROOT, "404.html"); status = 404; }
    res.writeHead(status, {
      ...globalHeaders(),
      "Content-Type": TYPES[path.extname(file)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    fs.createReadStream(file).pipe(res);
  })
  .listen(PORT, "127.0.0.1", () => console.log(`Serving ${ROOT} on http://localhost:${PORT}`));
