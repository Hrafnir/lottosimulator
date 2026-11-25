# Lottosimulator

Spill de samme ti rekkene gjennom 1–52 000 simulerte uker. Velg tall selv eller behold de tilfeldig genererte rekkene. Kupongen lagres i nettleseren. Hver kjøring er en ny periode. Du kan bla i trekningene og se treff på hver rekke, samlet innsats, gevinst og nettoresultat.

## Premiemodell for 2026

Ti rekker à 5 kr gir 50 kr i innsats per uke. Hver uke trekkes sju forskjellige hovedtall og ett tilleggstall fra 1 til 34. Bare høyeste premie per rekke teller.

| Treff | Andel av premiepotten | Anslått premie |
| --- | ---: | ---: |
| 7 rette | 37,2 % | 5 003 040 kr |
| 6 rette med tilleggstall | 5,25 % | 100 865 kr |
| 6 rette | 5,5 % | 4 060 kr |
| 5 rette | 6,0 % | 105 kr |
| 4 rette | 38,7 % | 50 kr |

Halvparten av innsatsen går til premiepotten. Anslaget per vinnerrekke er 2,50 kr multiplisert med klassens andel og dividert med sannsynligheten for den aktuelle treffklassen, avrundet ned til nærmeste femmer. Av 5 379 616 mulige rekker er det henholdsvis 1, 7, 182, 7 371 og 102 375 utfall i disse klassene. I et virkelig spill deles potten på faktiske vinnerrekker og kan bli overført mellom uker. De siste 7,35 % går til den separate Supertrekningen, som er utelatt fra simuleringen.

[Norsk Tippings spilleregler, punkt 3.2](https://www.norsk-tipping.no/bli-kunde/no/kundevilkaar-og-spilleregler)

## Kjør lokalt

Start en statisk filserver fra prosjektmappen med `python3 -m http.server 8000`, og åpne `http://localhost:8000/`. Kjør motortestene med `node --test engine.test.mjs`. Siden krever ingen byggeprosess, eksterne tjenester eller API-nøkler.

GitHub Pages kan publisere filene direkte fra rotmappen på hovedgrenen. Lexend er distribuert med SIL Open Font License i `assets/OFL.txt`.
