// Static site builder for unimik.cz. No dependencies: `node build.mjs`.
// Reads src/pages/**.html (each starts with a <!--meta {json} --> block),
// wraps them in the shared layout, inlines minified CSS and writes dist/.
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const SRC = path.join(ROOT, "src");
const DIST = path.join(ROOT, "dist");
const site = JSON.parse(fs.readFileSync(path.join(SRC, "site.json"), "utf8"));
const SITE_URL = (process.env.SITE || site.url).replace(/\/$/, "");

// ---------- helpers ----------
const read = (p) => fs.readFileSync(p, "utf8");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const phones = site.phones;
const emergency = phones[site.emergencyPhoneIndex];

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]
  );
}

function copyDir(from, to) {
  for (const f of walk(from)) {
    const dest = path.join(to, path.relative(from, f));
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(f, dest);
  }
}

function minifyCss(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{}:;,>])\s*/g, "$1")
    .replace(/;}/g, "}")
    .trim();
}

function minifyHtml(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\n\s+/g, "\n")
    .replace(/>\n</g, "><")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

// Czech typography: non-breaking space after one-letter prepositions/conjunctions.
// Applied to <body> only, so CSS selectors and JSON-LD stay untouched.
function nbsp(html) {
  const i = html.indexOf("<body");
  const fix = (s) =>
    s.replace(/(>[^<]*)/g, (seg) => seg.replace(/(^|[\s(>])([vVkKsSzZoOuUaAiI])[ \n]+(?=\S)/g, "$1$2\u00a0"));
  // keep "non-stop" on one line (the font has no non-breaking hyphen glyph)
  return html.slice(0, i) + fix(html.slice(i)).replace(/(>[^<]*?)non-stop/g, '$1<span class="nw">non-stop</span>');
}

// ---------- icons (Lucide, ISC) ----------
const iconCache = {};
function icon(name, cls = "icon") {
  if (!iconCache[name]) {
    const raw = read(path.join(SRC, "icons", `${name}.svg`));
    const inner = raw.replace(/<!--[\s\S]*?-->/g, "").replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
    iconCache[name] = inner.replace(/\s+/g, " ").replace(/\s*\/>/g, "/>").trim();
  }
  return `<svg class="${cls}" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${iconCache[name]}</svg>`;
}

// ---------- responsive pictures ----------
const IMG_DIR = path.join(SRC, "assets", "img");
function picture(attrs) {
  const name = attrs.name;
  const widths = fs
    .readdirSync(IMG_DIR)
    .map((f) => f.match(new RegExp(`^${name}-(\\d+)\\.jpg$`)))
    .filter(Boolean)
    .map((m) => +m[1])
    .sort((a, b) => a - b);
  if (!widths.length) throw new Error(`No image variants for ${name}`);
  const largest = widths[widths.length - 1];
  const [w, h] = jpegSize(path.join(IMG_DIR, `${name}-${largest}.jpg`));
  const set = (ext) => widths.map((x) => `/assets/img/${name}-${x}.${ext} ${x}w`).join(", ");
  const sizes = attrs.sizes || "100vw";
  const eager = "priority" in attrs;
  const loading = eager ? 'fetchpriority="high" decoding="async"' : 'loading="lazy" decoding="async"';
  const cls = attrs.class ? ` class="${attrs.class}"` : "";
  return `<picture${cls}><source type="image/avif" srcset="${set("avif")}" sizes="${sizes}"><source type="image/webp" srcset="${set("webp")}" sizes="${sizes}"><img src="/assets/img/${name}-${widths[1] || largest}.jpg" srcset="${set("jpg")}" sizes="${sizes}" width="${w}" height="${h}" alt="${esc(attrs.alt || "")}" ${loading}></picture>`;
}

function jpegSize(file) {
  const b = fs.readFileSync(file);
  let i = 2;
  while (i < b.length) {
    if (b[i] !== 0xff) { i++; continue; }
    const marker = b[i + 1];
    const len = b.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xc3) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
    i += 2 + len;
  }
  throw new Error(`Cannot read size of ${file}`);
}

function parseAttrs(s) {
  const out = {};
  for (const m of s.matchAll(/(\w[\w-]*)(?:="([^"]*)")?/g)) out[m[1]] = m[2] ?? "";
  return out;
}

// ---------- template expansion ----------
const partials = Object.fromEntries(
  fs.readdirSync(path.join(SRC, "partials")).map((f) => [f.replace(/\.\w+$/, ""), read(path.join(SRC, "partials", f))])
);

const vars = {
  name: site.name,
  shortName: site.shortName,
  ico: site.ico,
  dic: site.dic,
  year: String(new Date().getFullYear()),
  seatStreet: site.seat.street,
  seatZip: site.seat.zip,
  seatCity: site.seat.city,
  officeStreet: site.office.street,
  officeZip: site.office.zip,
  officeCity: site.office.city,
  emergencyPhone: emergency.display,
  emergencyShort: emergency.short,
  emergencyTel: `tel:${emergency.tel}`,
  mapSeat: `https://mapy.cz/zakladni?q=${encodeURIComponent(`${site.seat.street}, ${site.seat.zip} ${site.seat.city}`)}`,
  mapOffice: `https://mapy.cz/zakladni?q=${encodeURIComponent(`${site.office.street}, ${site.office.zip} ${site.office.city}`)}`,
};
phones.forEach((p, i) => {
  vars[`phone${i}`] = p.display;
  vars[`phone${i}short`] = p.short;
  vars[`tel${i}`] = `tel:${p.tel}`;
});

function expand(html, page, depth = 0) {
  if (depth > 5) throw new Error("Partial recursion too deep");
  return html
    .replace(/\{\{include:([\w-]+)\}\}/g, (_, n) => {
      if (!(n in partials)) throw new Error(`Missing partial ${n}`);
      return expand(partials[n], page, depth + 1);
    })
    .replace(/\{\{if:email\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, inner) => (site.email ? inner : ""))
    .replace(/\{\{icon:([\w-]+)(?:\s+([\w-]+))?\}\}/g, (_, n, c) => icon(n, c ? `icon ${c}` : "icon"))
    .replace(/\{\{picture\s+([^}]*)\}\}/g, (_, a) => picture(parseAttrs(a)))
    .replace(/\{\{serviceList\}\}/g, () => serviceList(page))
    .replace(/\{\{related\}\}/g, () => related(page))
    .replace(/\{\{breadcrumb\}\}/g, () => breadcrumbHtml(page))
    .replace(/\{\{nav\}\}/g, () => navHtml(page))
    .replace(/\{\{email\}\}/g, site.email)
    .replace(/\{\{(\w+)\}\}/g, (m, k) => {
      if (!(k in vars)) throw new Error(`Unknown variable ${m} in ${page.file}`);
      return vars[k];
    });
}

function navHtml(page) {
  return site.nav
    .map((n) => {
      const current = n.href === page.path ? ' aria-current="page"' : "";
      return `<li><a href="${n.href}"${current}>${n.label}</a></li>`;
    })
    .join("");
}

function serviceList(page) {
  return site.services
    .map((s, i) => {
      const href = `/${s.slug}/`;
      const current = href === page.path ? ' aria-current="page"' : "";
      return `<li class="svc-row${s.slug === "havarijni-sluzba" ? " svc-row--alert" : ""}"><a href="${href}"${current}><span class="svc-num">${String(i + 1).padStart(2, "0")}</span>${icon(s.icon, "icon svc-icon")}<span class="svc-text"><span class="svc-name">${s.name}</span><span class="svc-teaser">${s.teaser}</span></span>${icon("arrow-right", "icon svc-arrow")}</a></li>`;
    })
    .join("");
}

function related(page) {
  const others = site.services.filter((s) => `/${s.slug}/` !== page.path);
  return `<ul class="related-list">${others
    .map((s) => `<li><a href="/${s.slug}/">${s.name}${icon("arrow-right", "icon")}</a></li>`)
    .join("")}</ul>`;
}

function breadcrumbHtml(page) {
  if (!page.breadcrumb) return "";
  const items = [{ name: "Úvod", path: "/" }, ...page.breadcrumb];
  return `<nav class="crumbs" aria-label="Drobečková navigace"><ol>${items
    .map((b, i) =>
      i === items.length - 1
        ? `<li><span aria-current="page">${b.name}</span></li>`
        : `<li><a href="${b.path}">${b.name}</a></li>`
    )
    .join("")}</ol></nav>`;
}

// ---------- structured data ----------
const orgId = `${SITE_URL}/#business`;
function localBusiness() {
  return {
    "@type": "LocalBusiness",
    "@id": orgId,
    name: site.name,
    url: `${SITE_URL}/`,
    logo: `${SITE_URL}/assets/logo-mark.png`,
    image: `${SITE_URL}/assets/img/og-image.jpg`,
    telephone: phones.map((p) => p.display),
    ...(site.email ? { email: site.email } : {}),
    foundingDate: site.founded,
    taxID: site.dic,
    identifier: { "@type": "PropertyValue", propertyID: "IČO", value: site.ico },
    address: {
      "@type": "PostalAddress",
      streetAddress: site.seat.street,
      postalCode: site.seat.zip,
      addressLocality: site.seat.city,
      addressRegion: site.seat.region,
      addressCountry: site.seat.country,
    },
    geo: { "@type": "GeoCoordinates", latitude: site.seat.geo.lat, longitude: site.seat.geo.lng },
    areaServed: site.areaServed.map((a) => ({ "@type": "AdministrativeArea", name: a })),
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: emergency.display,
        contactType: "emergency",
        availableLanguage: "cs",
        hoursAvailable: {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
          opens: "00:00",
          closes: "23:59",
        },
      },
    ],
  };
}

function jsonLd(page) {
  const graph = [localBusiness()];
  if (page.service) {
    graph.push({
      "@type": "Service",
      "@id": `${SITE_URL}${page.path}#service`,
      name: page.service.name,
      serviceType: page.service.type || page.service.name,
      description: page.description,
      url: `${SITE_URL}${page.path}`,
      provider: { "@id": orgId },
      areaServed: site.areaServed.map((a) => ({ "@type": "AdministrativeArea", name: a })),
    });
  }
  if (page.breadcrumb) {
    const items = [{ name: "Úvod", path: "/" }, ...page.breadcrumb];
    graph.push({
      "@type": "BreadcrumbList",
      itemListElement: items.map((b, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: b.name,
        item: `${SITE_URL}${b.path}`,
      })),
    });
  }
  return JSON.stringify({ "@context": "https://schema.org", "@graph": graph });
}

// ---------- build ----------
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

const css = minifyCss(read(path.join(SRC, "styles.css")));
const styleHash = createHash("sha256").update(css).digest("base64");
const layout = read(path.join(SRC, "layout.html"));

const pageFiles = walk(path.join(SRC, "pages")).filter((f) => f.endsWith(".html"));
const pages = pageFiles.map((file) => {
  const raw = read(file);
  const m = raw.match(/^<!--meta\s*([\s\S]*?)-->\s*/);
  if (!m) throw new Error(`Missing meta block in ${file}`);
  const meta = JSON.parse(m[1]);
  return { ...meta, file: path.relative(SRC, file), body: raw.slice(m[0].length) };
});

const problems = [];
for (const page of pages) {
  if (page.title.length > 60) problems.push(`title > 60 chars (${page.title.length}): ${page.path}`);
  if (page.description.length > 155) problems.push(`description > 155 chars (${page.description.length}): ${page.path}`);
  const canonical = page.path === "/404" ? "" : `${SITE_URL}${page.path}`;
  const head = {
    title: esc(page.title),
    description: esc(page.description),
    canonical: canonical ? `<link rel="canonical" href="${canonical}">` : "",
    robots: page.noindex ? '<meta name="robots" content="noindex">' : "",
    ogUrl: canonical || SITE_URL + "/",
    ogImage: `${SITE_URL}/assets/img/og-image.jpg`,
    css,
    jsonld: page.noindex ? "" : `<script type="application/ld+json">${jsonLd(page)}</script>`,
    bodyClass: page.bodyClass || "",
    themeColor: site.themeColor,
  };
  let html = layout.replace(/\{\{head:(\w+)\}\}/g, (_, k) => head[k] ?? "");
  html = html.replace("{{content}}", page.body);
  html = expand(html, page);
  html = minifyHtml(nbsp(html));
  const out =
    page.path === "/404" ? path.join(DIST, "404.html") : path.join(DIST, page.path, "index.html");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
}

// static assets
copyDir(path.join(SRC, "assets"), path.join(DIST, "assets"));
for (const f of ["favicon.svg", "favicon-32.png", "apple-touch-icon.png", "icon-192.png", "icon-512.png"]) {
  fs.copyFileSync(path.join(SRC, f), path.join(DIST, f));
}
fs.copyFileSync(path.join(SRC, "_redirects"), path.join(DIST, "_redirects"));

fs.writeFileSync(
  path.join(DIST, "site.webmanifest"),
  JSON.stringify(
    {
      name: site.name,
      short_name: site.shortName,
      lang: "cs",
      start_url: "/",
      display: "browser",
      background_color: "#F4F2ED",
      theme_color: site.themeColor,
      icons: [
        { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
        { src: "/favicon.svg", sizes: "any", type: "image/svg+xml" },
      ],
    },
    null,
    2
  )
);

const today = new Date().toISOString().slice(0, 10);
const indexable = pages.filter((p) => !p.noindex && p.path !== "/404");
fs.writeFileSync(
  path.join(DIST, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${indexable
    .map((p) => `  <url><loc>${SITE_URL}${p.path}</loc><lastmod>${today}</lastmod></url>`)
    .join("\n")}\n</urlset>\n`
);
fs.writeFileSync(path.join(DIST, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);

// Security + cache headers (Netlify and Cloudflare Pages both read _headers).
const csp = [
  "default-src 'none'",
  `style-src 'sha256-${styleHash}'`,
  "img-src 'self'",
  "connect-src 'self'",
  "font-src 'self'",
  "manifest-src 'self'",
  "form-action 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");
fs.writeFileSync(
  path.join(DIST, "_headers"),
  `/*
  Content-Security-Policy: ${csp}
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()
  X-Frame-Options: DENY
  Strict-Transport-Security: max-age=31536000

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/*.png
  Cache-Control: public, max-age=604800

/favicon.svg
  Cache-Control: public, max-age=604800
`
);

// ---------- link check ----------
const distFiles = new Set(walk(DIST).map((f) => "/" + path.relative(DIST, f).split(path.sep).join("/")));
function exists(href) {
  const clean = href.split("#")[0].split("?")[0];
  if (!clean) return true;
  if (distFiles.has(clean)) return true;
  if (clean.endsWith("/") && distFiles.has(clean + "index.html")) return true;
  return false;
}
for (const f of [...distFiles].filter((f) => f.endsWith(".html"))) {
  const html = read(path.join(DIST, f));
  for (const m of html.matchAll(/(?:href|src)="(\/[^"]*)"/g)) if (!exists(m[1])) problems.push(`${f}: broken ${m[1]}`);
  for (const m of html.matchAll(/srcset="([^"]*)"/g))
    for (const part of m[1].split(",")) {
      const u = part.trim().split(" ")[0];
      if (u.startsWith("/") && !exists(u)) problems.push(`${f}: broken ${u}`);
    }
  for (const m of html.matchAll(/href="#([^"]+)"/g))
    if (!new RegExp(`id="${m[1]}"`).test(html)) problems.push(`${f}: missing anchor #${m[1]}`);
  const h1 = (html.match(/<h1[\s>]/g) || []).length;
  if (h1 !== 1) problems.push(`${f}: ${h1} h1 elements`);
}

console.log(`Built ${pages.length} pages into dist/ (CSS ${css.length} B, style hash sha256-${styleHash})`);
if (problems.length) {
  console.error("Problems:\n  " + problems.join("\n  "));
  process.exitCode = 1;
}
