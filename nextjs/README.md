# Konsekvenskartet i vofo-no/website

Filene her er skrevet for https://github.com/vofo-no/website og erstatter `app/(www)/kart`.

- `app/(www)/kart/page.tsx`: serverkomponent med ISR (`revalidate = 900`).
- `app/(www)/kart/data.ts`: henter `kutt.json`, `kart.json`, `nyheter.json` og `historier.json` fra dette lageret (raw.githubusercontent.com) med `next: { revalidate: 900 }`.
- `app/(www)/kart/lib.ts`: typer og beregninger (fylker, forbund, kartprojeksjon).
- `app/(www)/kart/konsekvenskart.tsx`: klientkomponent med kart, prikker, fylkespanel, rangering og fanen «I mediene». Henter nye saker og historier i nettleseren hvert 15. minutt, så en skjerm som står på holder seg oppdatert.
- `app/(www)/kart/karusell.tsx` og `karusell.module.css`: karusellen «Dette jobber vi for å bevare» på shadcn Carousel (embla), med autoavspilling, fullskjerm og vekkelås.
- `app/(www)/kart/norgeskart.tsx`: lite statisk kart.
- `components/konsekvenskart-banner.tsx`: serverkomponent til forsiden (`<KonsekvenskartBanner />`), henter tallene fra samme lager.

Bruker bare avhengigheter som allerede finnes (lucide-react, embla via components/ui/carousel, Button, Card, PageHeader) og temaets farger (primary) og fonter (font-serif/font-sans). Ingen nye pakker.

`konsekvenskart.patch` er det samme som en git-diff mot main (c2862db): `git apply nextjs/konsekvenskart.patch`.

Kontrollert med `tsc --noEmit`, `eslint` og `prettier --check`, og kjørt med `next dev`.
