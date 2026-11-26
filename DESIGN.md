# UNIMIK – návrh konceptu

1. **Princip:** web se čte jako technický list. Silné vodorovné linky, číslované řádky, žádné karty ani stíny. Telefon je vždy nejsilnější prvek na obrazovce.
2. **Typografie:** nadpisy Barlow Condensed Bold (jeden self-hostovaný woff2, 14,7 kB, latin + čeština, `font-display: swap`). Verzálky, těsné řádkování, velké velikosti. Tělo textu systémové písmo (`system-ui`), 18 px, řádek 1,55.
3. **Barvy (3):** inkoust `#16181B` (text, tmavé plochy), papír `#F4F2ED` (pozadí), signální oranžová `#FF6A13` (jen havárie a jeden akcent). Oranžová nikdy jako text na světlém pozadí (kontrast), jen jako plocha s černým textem nebo text na inkoustu.
4. **Rozložení:** zarovnání vlevo, 12sloupcová mřížka, hodně vzduchu. Hero rozdělený: vlevo nadpis + 2 tlačítka, vpravo černobílá fotka nádrží. Sekce oddělené 2px linkou a malým číslem sekce.
5. **Fotky:** všechny převedené do černobílé, aby působily jako jedna sada a oranžová havárie vynikla. Klientské fotky projdou stejným skriptem.
6. **Typy nádrží:** tabulková mřížka bez ikon (číslo, název, jedna věta, odkaz). Ikony jen u hlavních služeb a kontaktu.
7. **Logo:** značka „U“ jako průřez nádrží (nádoba) s oranžovou čárou hladiny uvnitř, vedle slovo UNIMIK v Barlow Condensed převedené na křivky. Favicon = značka na inkoustovém čtverci.
8. **Havarijní cesta:** v hlavičce samostatný oranžový blok „Havárie non-stop“ s číslem, na mobilu oranžové tlačítko ve spodním pruhu, na úvodu celá oranžová sekce s obřím číslem a třemi věcmi, které má volající říct. Vlastní stránka /havarijni-sluzba/.
9. **Mobil:** spodní fixní pruh se dvěma tlačítky (Zavolat / Havárie), výška 64 px, stránka má dole odsazení, aby nic nepřekryl. Menu přes `<details>` bez JavaScriptu.
10. **Pohyb:** žádné animace kromě změny barvy tlačítek při najetí; vše vypnuté při `prefers-reduced-motion`. Web nepotřebuje žádný JavaScript.
