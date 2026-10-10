import Link from "next/link";

import { Button } from "@/components/ui/button";
import { hentKonsekvensdata } from "@/app/(www)/kart/data";
import { beregnFylker, breaks, bucket, mill, nf } from "@/app/(www)/kart/lib";
import { Norgeskart } from "@/app/(www)/kart/norgeskart";

// Fulle klassenavn så Tailwind finner dem.
const FYLL = [
  "fill-[#C9566A]",
  "fill-[#D97A8B]",
  "fill-[#E8A3B0]",
  "fill-[#F4CDD4]",
  "fill-white",
];

/** Blokk til forsiden som lenker til /kart. Tallene hentes fra datalageret. */
export async function KonsekvenskartBanner() {
  const data = await hentKonsekvensdata();
  if (!data) return null;
  const fylker = beregnFylker(data.kutt);
  const b = breaks(fylker, "kr");
  const fyll = Object.fromEntries(
    fylker.map((f) => [f.id, FYLL[bucket(f.kr, b)]]),
  );
  const total = data.kutt.kutt.KUD + data.kutt.kutt.KD;
  const sum = (k: "tk" | "td") => fylker.reduce((a, f) => a + f[k], 0);

  return (
    <section
      aria-labelledby="kkb-h"
      className="grid items-center gap-6 overflow-hidden rounded-lg bg-primary p-6 text-primary-foreground md:grid-cols-[3fr_2fr] md:p-12"
    >
      <div>
        <p className="mb-2.5 text-xs font-semibold uppercase tracking-widest text-primary-foreground/80">
          Statsbudsjettet 2027
        </p>
        <h2
          id="kkb-h"
          className="mb-3 font-serif text-3xl font-bold leading-tight md:text-5xl"
        >
          Hva kuttet koster
        </h2>
        <p className="max-w-[46ch] text-primary-foreground/90 md:text-lg">
          Regjeringen foreslår å kutte {mill(total).replace(" mill.", "")}{" "}
          millioner kroner i studieforbundene. Se hva det kan bety for kurs og
          deltakere der du bor.
        </p>
        <div className="my-6 flex flex-wrap gap-x-9 gap-y-4">
          <div>
            <b className="block font-serif text-4xl leading-none">
              {nf.format(sum("tk"))}
            </b>
            <span className="mt-1 block text-sm text-primary-foreground/90">
              kurs kan forsvinne
            </span>
          </div>
          <div>
            <b className="block font-serif text-4xl leading-none">
              {nf.format(sum("td"))}
            </b>
            <span className="mt-1 block text-sm text-primary-foreground/90">
              deltakere kan miste tilbudet
            </span>
          </div>
        </div>
        <Button asChild variant="secondary" size="lg">
          <Link href="/kart">Se konsekvenskartet</Link>
        </Button>
      </div>
      <Link
        href="/kart"
        tabIndex={-1}
        aria-hidden="true"
        className="hidden h-80 md:block"
      >
        <Norgeskart kart={data.kart} fyll={fyll} />
      </Link>
    </section>
  );
}
