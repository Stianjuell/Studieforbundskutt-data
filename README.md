# Studieforbundskutt-data

Data til Konsekvenskartet (Vofo), statsbudsjettet 2027.

- `nyheter.json`: mediesaker om kuttet i studieforbundene, oppdateres av Budsjettkampradaren hver hverdag morgen.
- `historier.json`: læringshistorier fra vofo.no med sted og koordinater.

vofo.no/kart henter filene direkte fra
https://raw.githubusercontent.com/Stianjuell/Studieforbundskutt-data/main/nyheter.json
og
https://raw.githubusercontent.com/Stianjuell/Studieforbundskutt-data/main/historier.json

`side/vofo.html` er selve Konsekvenskartet. vofo.no/kart er en liten laster som henter denne filen, så endringer i utseende og tekst publiseres ved å oppdatere den.

## Tallgrunnlag
- `kutt.json`: kuttet per studieforbund og fylke (KUD 37,5 mill., KD 32,5 mill.) med kurs, kurstimer og deltakere fra SSB 2025 og beregnet potensielt tap.
- `kart.json`: fylkesgrensene som SVG-stier (UTM 33).

## Next.js-kode til vofo.no
Mappen `nextjs/` inneholder siden `app/(www)/kart` og forsideblokken `components/konsekvenskart-banner.tsx`, skrevet for vofo-no/website (Tailwind, shadcn, Inter og Gelasio). Siden henter dataene over med ISR hvert 15. minutt.
