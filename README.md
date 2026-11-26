# unimik.cz

Statický web firmy UNIMIK s.r.o. Čisté HTML a CSS, žádný JavaScript, žádný framework, žádné externí služby.
Malý skript `build.mjs` (Node 18+, bez závislostí) skládá stránky ze sdílené hlavičky a patičky do složky `dist/`.

## Struktura

```
src/
  site.json          firemní údaje: telefony, adresy, IČO, e-mail, seznam služeb, menu
  pages/             obsah stránek (každá stránka = jeden soubor)
  partials/          sdílené bloky: hlavička, patička, formulář, havarijní pás, mobilní pruh
  layout.html        kostra stránky (<head>, meta, JSON-LD)
  styles.css         jediný stylopis (build ho minifikuje a vloží do stránky)
  icons/             ikony Lucide (jen použité)
  assets/            font, obrázky, logo
  _redirects         přesměrování starých URL
img-src/             originály fotek a font (nenasazují se)
brand/               logo pro tisk a sociální sítě (nenasazuje se)
tools/               zpracování obrázků, loga, lokální server, testy
build.mjs            sestavení webu do dist/
netlify.toml         nastavení Netlify
```

## Sestavení a náhled

```powershell
node build.mjs
node tools/serve.mjs 5216
```

Web pak běží na http://localhost:5216. Build zároveň kontroluje rozbité odkazy, chybějící kotvy, počet H1 a délku title/description.

## Úprava textů

- **Telefony, adresy, IČO, e-mail:** jen v `src/site.json`. Projeví se v hlavičce, patičce, formuláři, kontaktu i ve strukturovaných datech.
  - E-mail: vyplňte `"email": "info@…"`. Odkazy `mailto:` se pak objeví všude automaticky.
  - Havarijní číslo: `"emergencyPhoneIndex"` (0 = první telefon, 1 = druhý).
- **Texty stránek:** `src/pages/<stránka>/index.html`. Blok `<!--meta … -->` nahoře obsahuje `title` (do 60 znaků) a `description` (do 155 znaků).
- Zástupné značky: `{{phone0}}`, `{{tel0}}`, `{{emergencyPhone}}`, `{{icon:phone}}`, `{{picture name="tanks" alt="…"}}`, `{{include:callback}}`.

## Výměna fotek

1. Vlastní fotku uložte do `img-src/` pod stejným názvem (`tanks.jpg`, `railcar.jpg`, `tanker.jpg`, `valves.jpg`, `pump.jpg`). Ideálně aspoň 2000 px na šířku.
2. Spusťte `pip install pillow fonttools brotli` (jednou) a `python tools/images.py`.
3. Skript ořízne fotku na správný poměr, převede do černobílé a vytvoří AVIF, WebP a JPEG v šířkách 480/800/1200 a obrázek pro sdílení `og-image.jpg`.
4. Ořez upravíte v `tools/images.py` v tabulce `PHOTOS` (poměr stran, bod zájmu x/y).
5. Nová fotka: přidejte řádek do `PHOTOS` a na stránce použijte `{{picture name="nazev" alt="Popis fotky" sizes="…"}}`. Alt piště česky a popisně.
6. Upravte `CREDITS.md`.

## Nová stránka služby

1. Zkopírujte např. `src/pages/cisteni-nadrzi/` do nové složky (název = URL bez diakritiky).
2. Upravte blok `meta`: `path`, `title`, `description`, `breadcrumb`, `service`.
3. Přepište obsah (150–250 slov, jedno H1).
4. Přidejte službu do `services` v `src/site.json` (objeví se v seznamu na úvodu, na 404 a v „Dalších službách“) a do patičky `src/partials/footer.html`.
5. `node build.mjs`. Stránka se sama dostane do `sitemap.xml`.

## Formulář „Zavolejte mi zpět“

Používá **Netlify Forms** (bez JavaScriptu, bez captchy, ochrana proti spamu honeypotem `web`).

1. Nasaďte web na Netlify (viz níže).
2. V Netlify: *Site configuration → Forms → Enable form detection*, pak znovu nasaďte.
3. *Forms → Form notifications → Add notification → Email notification*: zadejte e-mail firmy. Každá žádost přijde e-mailem.
4. Otestujte odeslání. Po odeslání se zobrazí `/dekujeme/`.

Vedle formuláře jsou vždy klikací telefony, takže web funguje i bez formuláře.

**Cloudflare Pages místo Netlify:** Netlify Forms tam nefungují. Je potřeba přidat Pages Function `functions/dekujeme.js`, která přijme POST a pošle e-mail (např. přes Resend nebo MailChannels). Hlavičky (`_headers`) i přesměrování (`_redirects`) fungují na Cloudflare beze změny.

## Nasazení

**Netlify (doporučeno):** propojte repozitář. `netlify.toml` nastaví `node build.mjs` a složku `dist`. Bez repozitáře: `node build.mjs` a složku `dist` přetáhněte na https://app.netlify.com/drop (ZIP balit Pythonem, ne Compress-Archive).

**Doména:** produkční adresa je v `src/site.json` (`url`). Podle ní se generuje canonical, Open Graph, sitemap a JSON-LD. Pro jinou adresu: `$env:SITE="https://…"; node build.mjs`.

**Bezpečnostní hlavičky** generuje build do `dist/_headers`: CSP (bez inline skriptů, styl povolen hashem), `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options`, HSTS. Hash stylu se při každé změně CSS přepočítá sám.

## Testy

```powershell
cd tools; npm install; npx playwright install chromium webkit; cd ..
node tools/serve.mjs 5216
node tools/check.mjs qa        # screenshoty 320–1440 px (Chromium + WebKit), přetečení, tap cíle, axe
node tools/lighthouse.mjs qa   # Lighthouse mobil + desktop pro všechny stránky
```

## Pohyb

Jen CSS: naplnění „hladiny“ v logu, odkrytí hlavní fotky, jemné vysunutí sekcí při scrollu (jen v prohlížečích s `animation-timeline`), výplň řádku služby při najetí myší. Vše je vypnuté při `prefers-reduced-motion: reduce`.
