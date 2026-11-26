# TODO pro klienta (UNIMIK s.r.o.)

Co na webu chybí nebo čeká na potvrzení. Nic z toho jsme nevymýšleli.

## Údaje, které potřebujeme

- [ ] **E-mail firmy.** Na webu teď není. Po doplnění do `src/site.json` se objeví všude (odkazy `mailto:`, patička, kontakt, schema).
- [ ] **Havarijní číslo.** Teď je všude +420 603 416 025. Které číslo je pro havárie a které pro poptávky?
- [ ] **Oblast působení.** Web uvádí Ústecký kraj (Štětí, Litoměřice, Roudnice n. L.). Jezdíte i jinam? Celá ČR?
- [ ] **Velikosti nádrží**, na které jste vybavení (objem v m³, průměr vstupu…).
- [ ] **Certifikace a oprávnění** (ISO, oprávnění k revizím, ČSN, odpady). Bez nich je nesmíme uvádět.
- [ ] **Protokol po čištění / revizi / měření.** Vydáváte? Jaký dokument zákazník dostane?
- [ ] **Postup čištění.** Na webu je obecná verze v 5 krocích (domluva, obhlídka, odčerpání, čištění, předání). Potvrďte nebo upravte (např. měření koncentrace plynů, protokol).
- [ ] **Havarijní služba:** dojezdové časy, oblast, jestli opravdu 24/7 včetně svátků.
- [ ] **Likvidace čerpacích stanic:** rozsah (zemní práce, rekultivace, dokumentace pro úřady).
- [ ] **Defektoskopie:** metody a vybavení.
- [ ] **Autodoprava:** starý web uvádí „Ford Transit do 3,5 t, po celé ČR“. Platí to? Nový web zatím uvádí jen „Ford Transit“.
- [ ] **Rok založení.** Starý web píše „založen v roce 1991“, firma UNIMIK s.r.o. vznikla 2018. Má se uvádět historie předchozí firmy? Pokud ano, jak přesně.
- [ ] **Geo souřadnice sídla.** Teď střed obce Bechlín (50.4164, 14.3403). Doplnit přesné souřadnice č. p. 216 do `src/site.json`.
- [ ] **Text ochrany osobních údajů** (`/ochrana-osobnich-udaju/`) zkontrolovat, případně s právníkem. Doba uchování (navrženo 12 měsíců), poskytovatel hostingu.

## Reference

Sekce referencí se nevykresluje, dokud ji nepotvrdíte. Na starém webu jsou tyto názvy – potvrďte, zda je smíme uvést a co se u nich dělalo:

- [ ] Loděnice Děčín
- [ ] Mondi (reaktor)
- [ ] SDT Mělník (renovace nádrží)
- [ ] Klíčany
- [ ] trafoolej Kadaň
- [ ] ZZN Polabí Chotětov
- [ ] Škoda Mladá Boleslav

Formát na webu: jednoduchá tabulka „zákazník – co se dělalo“, bez log.

## Fotky

Teď jsou na webu stock fotky z Unsplash (černobílé, viz `CREDITS.md`). Vlastní fotky z provozu působí mnohem důvěryhodněji.
Starý web má fotky zakázek (renovace nádrží SDT Mělník, čerpací stanice, Klíčany, Kadaň, Chotětov) – můžeme je použít, pokud jsou vaše.

| Účel | Kde | Poměr / min. rozměr | Co na fotce |
|---|---|---|---|
| Hlavní fotka | úvod nahoře | 4:3, 2000×1500 | vaše auto/technika u nádrže nebo technik v ochranné výstroji při práci |
| Čištění | /cisteni-nadrzi/ | 3:2, 2000×1333 | čištění nádrže zevnitř, hadice, odčerpávání |
| Vagony | úvod, /defektoskopie… | 3:2, 2000×1333 | čištění železničního cisternového vozu |
| Cisterny | úvod | 3:2, 2000×1333 | silniční cisterna při čištění |
| Měření | /defektoskopie… | 3:2, 2000×1333 | ultrazvukový tloušťkoměr na stěně nádrže |
| Likvidace ČS | /likvidace… | 3:2, 2000×1333 | demontáž stojanu nebo vyzvednutá nádrž |
| Před / po | budoucí sekce | 3:2, páry | stejná nádrž před a po čištění |

Bez čitelných log cizích firem a bez SPZ. Postup výměny: `README.md` → Výměna fotek.

## Logo a barvy

- [ ] Web má nové jednoduché logo (nádoba s hladinou). Pokud máte vlastní logo a barvy (starý web používal zelenou #268E2C), pošlete je v křivkách (SVG/PDF). Logo je v `brand/`.

## Přesměrování starých URL

Hotovo pro známé stránky starého webu (`src/_redirects`): `/index.html`, `/kontakt.html`, `/autodoprava.html`, `/reference.html`.

- [ ] Projít Google Search Console starého webu a doplnit další URL (např. odkazované fotky), pokud na ně vedou odkazy.

## Po spuštění webu (SEO, udělat sami nebo s námi)

- [ ] **Google Business Profile:** založit nebo upravit. Stejný název, adresa a telefon jako na webu (UNIMIK s.r.o., Bechlín 216, 411 86 Bechlín, +420 603 416 025). Kategorie např. „Čištění průmyslových zařízení“, popis služeb, fotky z provozu.
- [ ] **Firmy.cz (Seznam):** založit/upravit profil se stejnými údaji, odkaz na web.
- [ ] **Mapy.cz:** ověřit, že firma je na mapě (profil Firmy.cz se tam propisuje).
- [ ] **Google Search Console** a **Bing Webmaster Tools:** přidat web, ověřit doménu, odeslat `https://unimik.cz/sitemap.xml`.
- [ ] **Recenze:** požádat skutečné zákazníky o hodnocení na Googlu a Firmy.cz. Nikdy nevymýšlet.
- [ ] Ověřit doménu: produkce `https://unimik.cz` (bez www). Pokud www, změnit `url` v `src/site.json`.

## Formulář

- [ ] Po nasazení na Netlify zapnout Forms a e-mailové notifikace (návod v `README.md`) a jednou otestovat odeslání.
