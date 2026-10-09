import "server-only";

import {
  DATA_URL,
  OPPDATER_SEK,
  type Historie,
  type Kart,
  type Konsekvensdata,
  type Kutt,
  type Nyhet,
} from "./lib";

async function hent<T>(fil: string): Promise<T | null> {
  try {
    const res = await fetch(`${DATA_URL}/${fil}`, {
      next: { revalidate: OPPDATER_SEK, tags: ["konsekvenskart"] },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** Henter alle data til Konsekvenskartet. Returnerer null hvis tallgrunnlaget mangler. */
export async function hentKonsekvensdata(): Promise<Konsekvensdata | null> {
  const [kutt, kart, nyheter, historier] = await Promise.all([
    hent<Kutt>("kutt.json"),
    hent<Kart>("kart.json"),
    hent<Nyhet[]>("nyheter.json"),
    hent<Historie[]>("historier.json"),
  ]);
  if (!kutt || !kart) return null;
  return {
    kutt,
    kart,
    nyheter: Array.isArray(nyheter)
      ? nyheter.filter((n) => n?.tittel && n?.url)
      : [],
    historier: Array.isArray(historier)
      ? historier.filter((h) => h?.tittel && h?.url && h?.fylke)
      : [],
  };
}
