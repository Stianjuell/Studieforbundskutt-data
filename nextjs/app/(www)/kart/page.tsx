import { Metadata } from "next";

import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderHeading,
} from "@/components/page-header";

import { hentKonsekvensdata } from "./data";
import { Konsekvenskart } from "./konsekvenskart";
import { mill } from "./lib";

// Dataene hentes fra GitHub og oppdateres hvert 15. minutt (ISR).
export const revalidate = 900;

export const metadata: Metadata = {
  title: "Konsekvenskartet",
  description:
    "Hva kuttet i tilskuddet til studieforbundene betyr for kurs, kurstimer og deltakere i hvert fylke.",
};

export default async function Page() {
  const data = await hentKonsekvensdata();
  const total = data
    ? Object.values(data.kutt.kutt).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <div className="container pb-12">
      <PageHeader>
        <PageHeaderHeading>Hva kuttet koster</PageHeaderHeading>
        <PageHeaderDescription>
          Regjeringen foreslår å kutte tilskuddet til studieforbundene med{" "}
          {total
            ? `${mill(total).replace(" mill.", "")} millioner`
            : "om lag 70 millioner"}{" "}
          kroner. Det er om lag en firedel av hele tilskuddet. Kartet viser hva
          det kan bety for kurs, kurstimer og deltakere i hvert fylke.
        </PageHeaderDescription>
      </PageHeader>

      {data ? (
        <Konsekvenskart {...data} />
      ) : (
        <p className="text-center text-muted-foreground">
          Kartet kunne ikke lastes akkurat nå. Prøv igjen om litt.
        </p>
      )}
    </div>
  );
}
