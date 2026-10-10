"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Pause,
  Play,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";

import styles from "./karusell.module.css";
import {
  beregnForbund,
  erHttps,
  mill,
  nf,
  type Fylke,
  type Historie,
  type Kart,
  type Kutt,
} from "./lib";
import { Norgeskart } from "./norgeskart";

const VARIGHET = 7000; // ms per lysbilde
const PAUSE_ETTER_BRUK = 15000; // ms pause etter at noen blar selv
const VEDTAK = new Date("2026-12-15T12:00:00");

const ORD = [
  "korps",
  "husflid",
  "jakt",
  "idrett",
  "helse",
  "språk",
  "førstehjelp",
  "trosopplæring",
  "politikk",
  "organisasjon",
  "lederskap",
  "dans",
  "teater",
  "kystkultur",
  "friluftsliv",
  "beredskap",
  "håndverk",
  "musikk",
  "fellesskap",
];

type Lysbilde =
  | { type: "fakta"; key: string; node: React.ReactNode }
  | { type: "historie"; key: string; h: Historie };

/* ---------- Byggeklosser ---------- */

function Fakta({
  over,
  tittel,
  children,
  className,
}: {
  over?: string;
  tittel?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-full flex-col justify-center gap-3 overflow-hidden rounded-lg bg-primary p-6 text-primary-foreground md:px-10 md:py-7",
        className,
      )}
    >
      {over && (
        <p className="text-xs font-semibold uppercase tracking-widest text-primary-foreground/80">
          {over}
        </p>
      )}
      {tittel && (
        <h3 className="max-w-[24ch] text-balance font-serif text-3xl font-bold leading-tight md:text-4xl group-data-[fs=true]:text-6xl">
          {tittel}
        </h3>
      )}
      {children}
    </div>
  );
}

function Tall({ tall }: { tall: [string, string][] }) {
  return (
    <div className="grid gap-5 sm:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))]">
      {tall.map(([n, l]) => (
        <div key={l}>
          <b className="block font-serif text-4xl font-bold leading-none tabular-nums md:text-5xl group-data-[fs=true]:text-8xl">
            {n}
          </b>
          <span className="mt-1 block text-base text-primary-foreground/90 group-data-[fs=true]:text-2xl">
            {l}
          </span>
        </div>
      ))}
    </div>
  );
}

function Fotnote({
  children,
  skjul,
}: {
  children: React.ReactNode;
  skjul?: boolean;
}) {
  return (
    <p
      className={cn(
        "max-w-prose text-sm text-primary-foreground/75 group-data-[fs=true]:text-lg",
        skjul && "hidden group-data-[fs=true]:block",
      )}
    >
      {children}
    </p>
  );
}

function Stolper({ rader }: { rader: [string, number][] }) {
  const max = Math.max(1, ...rader.map(([, v]) => v));
  return (
    <div className="gap-x-10 sm:columns-2">
      {rader.map(([n, v]) => (
        <div
          key={n}
          className="mb-1.5 grid break-inside-avoid grid-cols-[minmax(7rem,11rem)_minmax(0,1fr)_5rem] items-center gap-2.5 text-sm group-data-[fs=true]:mb-3 group-data-[fs=true]:text-xl"
        >
          <span className="truncate">{n}</span>
          <i
            className="block h-2.5 bg-white"
            style={{ width: `${((v / max) * 100).toFixed(1)}%` }}
          />
          <em className="text-right not-italic tabular-nums">{mill(v)}</em>
        </div>
      ))}
    </div>
  );
}

function OrdBilde({ deltakere }: { deltakere: number }) {
  return (
    <div className="relative flex h-full flex-col justify-center overflow-hidden rounded-lg bg-[radial-gradient(120%_90%_at_15%_50%,#B8263F_0%,hsl(var(--primary))_45%,#7E1528_100%)] p-6 text-primary-foreground md:px-10 md:py-7">
      <div className="relative z-10 grid gap-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary-foreground/80">
          Læring i hele landet
        </p>
        <p className="font-serif text-2xl md:text-4xl group-data-[fs=true]:text-5xl">
          Hver uke lærer folk
        </p>
        <span
          aria-label={ORD.join(", ")}
          className="inline-grid h-[1.12em] overflow-hidden font-serif text-5xl font-bold italic leading-[1.1] tracking-tight md:text-7xl group-data-[fs=true]:text-[11rem]"
        >
          {ORD.map((o, i) => (
            <span
              key={o}
              className={styles.ord}
              style={{ animationDelay: `${i * 1.8}s` }}
            >
              {o}
              <span className="not-italic text-[#F2A5B2]">.</span>
            </span>
          ))}
        </span>
        <p className="max-w-prose text-base text-primary-foreground/90 md:text-lg group-data-[fs=true]:text-2xl">
          <b className="text-white">{nf.format(deltakere)} deltakere</b> i 2025,
          i alle landets kommuner. Statstilskuddet til studieforbundene gjør det
          mulig.
        </p>
      </div>
    </div>
  );
}

function HistorieBilde({
  h,
  fylkeId,
  onKart,
  eager,
}: {
  h: Historie;
  fylkeId?: string;
  onKart: (id: string) => void;
  eager: boolean;
}) {
  return (
    <div className="grid h-full overflow-hidden rounded-lg border bg-card text-card-foreground md:grid-cols-[7fr_5fr]">
      <div className="relative aspect-video bg-primary/10 md:aspect-auto md:min-h-0">
        <span className="absolute inset-x-4 bottom-3 font-serif text-2xl font-bold text-primary">
          {h.sted || h.fylke}
        </span>
        {erHttps(h.bilde) && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={h.bilde}
            alt=""
            loading={eager ? "eager" : "lazy"}
            referrerPolicy="no-referrer"
            className="absolute inset-0 h-full w-full object-cover"
            onError={(e) => e.currentTarget.remove()}
          />
        )}
      </div>
      <div className="flex flex-col justify-center gap-3 p-6 md:p-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#009890]">
          {h.sted}
          {h.fylke && h.fylke !== h.sted ? ` · ${h.fylke}` : ""}
        </p>
        <h3 className="text-balance font-serif text-2xl font-bold leading-tight md:text-3xl group-data-[fs=true]:text-5xl">
          {h.tittel}
        </h3>
        {h.ingress && (
          <p className="line-clamp-5 text-muted-foreground group-data-[fs=true]:text-xl">
            {h.ingress}
          </p>
        )}
        <div className="mt-1 flex flex-wrap gap-2">
          <Button asChild>
            <a
              href={erHttps(h.url) ? h.url : "#"}
              target="_blank"
              rel="noopener noreferrer"
            >
              Les historien
            </a>
          </Button>
          {fylkeId && (
            <Button variant="outline" onClick={() => onKart(fylkeId)}>
              Se {h.fylke} i kartet
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Karusellen ---------- */

export function Karusell({
  kutt,
  kart,
  fylker,
  historier,
  onVelgFylke,
}: {
  kutt: Kutt;
  kart: Kart;
  fylker: Fylke[];
  historier: Historie[];
  onVelgFylke: (id: string, scroll?: boolean) => void;
}) {
  const seksjon = useRef<HTMLElement>(null);
  const [api, setApi] = useState<CarouselApi>();
  const [aktiv, setAktiv] = useState(0);
  const [antall, setAntall] = useState(0);
  const [spiller, setSpiller] = useState(true);
  const [fs, setFs] = useState(false);
  const [dager, setDager] = useState<number | null>(null);
  const sistBrukt = useRef(0);
  const velgRef = useRef(onVelgFylke);
  useEffect(() => {
    velgRef.current = onVelgFylke;
  }, [onVelgFylke]);
  const onVelg = useCallback(
    (id: string, scroll?: boolean) => velgRef.current(id, scroll),
    [],
  );

  const idFor = useCallback(
    (navn: string) => fylker.find((f) => f.n === navn)?.id,
    [fylker],
  );

  // Tall som bare kan regnes ut i nettleseren (unngår ulik tekst mellom server og klient).
  useEffect(() => {
    const oppdater = () =>
      setDager(Math.max(0, Math.ceil((VEDTAK.getTime() - Date.now()) / 864e5)));
    const start = setTimeout(() => {
      oppdater();
      if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)
        setSpiller(false);
    }, 0);
    const t = setInterval(oppdater, 3600e3);
    return () => {
      clearTimeout(start);
      clearInterval(t);
    };
  }, []);

  const lysbilder = useMemo<Lysbilde[]>(() => {
    const sum = (k: "kurs" | "timer" | "delt" | "tk" | "tt" | "td") =>
      fylker.reduce((a, f) => a + f[k], 0);
    const forbund = beregnForbund(kutt);
    const total = kutt.kutt.KUD + kutt.kutt.KD;
    const fyl = [...fylker].sort((a, b) => b.kr - a.kr);

    const hs = [...historier].sort(
      (a, b) =>
        Number(!!b.bilde) - Number(!!a.bilde) || b.dato.localeCompare(a.dato),
    );
    const brukt = new Set<Historie>();
    const par: Record<string, Historie> = {};
    for (const f of fylker) {
      const h = hs.find((x) => x.fylke === f.n && !brukt.has(x));
      if (h) {
        par[f.id] = h;
        brukt.add(h);
      }
    }
    const rest = hs.filter((h) => !brukt.has(h));
    let pi = 0;
    const q = Math.ceil(rest.length / 4);
    const ut: Lysbilde[] = [];
    const ta = (n: number) => {
      for (let k = 0; k < n && pi < rest.length; k++, pi++)
        ut.push({ type: "historie", key: rest[pi].url, h: rest[pi] });
    };
    const fakta = (key: string, node: React.ReactNode) =>
      ut.push({ type: "fakta", key, node });

    fakta(
      "aar",
      <Fakta
        over="Studieforbundene i 2025"
        tittel="Dette lærte Norge sammen i fjor"
      >
        <Tall
          tall={[
            [nf.format(sum("kurs")), "kurs"],
            [mill(sum("timer")), "kurstimer"],
            [nf.format(sum("delt")), "deltakere"],
          ]}
        />
        <Fotnote>
          Kurs i regi av studieforbundene i hele landet. Kilde: SSBs
          kursstatistikk for 2025. Deltakere telles per kurs.
        </Fotnote>
      </Fakta>,
    );
    ta(q);
    fakta("ord", <OrdBilde deltakere={sum("delt")} />);
    ta(q);
    fakta(
      "spill",
      <Fakta
        over="Dette står på spill"
        tittel={`Regjeringen foreslår å kutte ${mill(total).replace(" mill.", "")} millioner kroner`}
      >
        <Tall
          tall={[
            [
              mill(kutt.kutt.KUD),
              "kutt under Kultur- og likestillingsdepartementet",
            ],
            [mill(kutt.kutt.KD), "kutt under Kunnskapsdepartementet"],
          ]}
        />
        <Fotnote>Forslag til statsbudsjett for 2027.</Fotnote>
      </Fakta>,
    );
    fakta(
      "kons",
      <Fakta
        over="Konsekvensene"
        tittel="Hvis aktiviteten faller like mye som tilskuddet"
      >
        <Tall
          tall={[
            [nf.format(sum("tk")), "kurs kan forsvinne"],
            [nf.format(sum("tt")), "kurstimer kan forsvinne"],
            [nf.format(sum("td")), "deltakere kan miste tilbudet"],
          ]}
        />
        <Fotnote>
          Beregnet ut fra SSBs kursstatistikk for 2025 og kuttet per
          studieforbund.
        </Fotnote>
      </Fakta>,
    );
    ta(q);
    fakta(
      "forbund",
      <Fakta
        over="Kuttet per studieforbund"
        tittel="Slik rammes studieforbundene"
      >
        <Stolper rader={forbund.map((f) => [f.s, f.kr])} />
      </Fakta>,
    );
    fakta(
      "tabell",
      <Fakta over="Studieforbundene nasjonalt" className="gap-2 md:py-6">
        <h3 className="font-serif text-2xl font-bold leading-tight group-data-[fs=true]:text-5xl">
          Konsekvensene per studieforbund
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12px] tabular-nums group-data-[fs=true]:text-xl">
            <thead>
              <tr className="border-b border-white/40 text-primary-foreground/75">
                <th className="py-1 pr-2 text-left font-semibold">
                  Studieforbund
                </th>
                <th className="px-2 py-1 text-right font-semibold">Kutt</th>
                <th className="hidden px-2 py-1 text-right font-semibold sm:table-cell">
                  Kurs 2025
                </th>
                <th className="px-2 py-1 text-right font-semibold">
                  Færre kurs
                </th>
                <th className="hidden px-2 py-1 text-right font-semibold sm:table-cell">
                  Deltakere 2025
                </th>
                <th className="py-1 pl-2 text-right font-semibold">
                  Færre deltakere
                </th>
              </tr>
            </thead>
            <tbody>
              {forbund.map((f) => (
                <tr key={f.s} className="border-b border-white/15">
                  <td className="py-px group-data-[fs=true]:py-1 pr-2 font-semibold">
                    {f.s}
                  </td>
                  <td className="px-2 py-px group-data-[fs=true]:py-1 text-right font-semibold">
                    {mill(f.kr)}
                  </td>
                  <td className="hidden px-2 py-px group-data-[fs=true]:py-1 text-right text-primary-foreground/80 sm:table-cell">
                    {nf.format(f.kurs)}
                  </td>
                  <td className="px-2 py-px group-data-[fs=true]:py-1 text-right font-semibold">
                    {nf.format(Math.round(f.tk))}
                  </td>
                  <td className="hidden px-2 py-px group-data-[fs=true]:py-1 text-right text-primary-foreground/80 sm:table-cell">
                    {nf.format(f.delt)}
                  </td>
                  <td className="py-px group-data-[fs=true]:py-1 pl-2 text-right font-semibold">
                    {nf.format(Math.round(f.td))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Fotnote skjul>
          Potensielt tap hvis aktiviteten faller like mye som tilskuddet. Kilde:
          SSBs kursstatistikk for 2025 og Vofos beregning av kuttet per
          studieforbund.
        </Fotnote>
      </Fakta>,
    );
    ta(q);
    fakta(
      "fylker",
      <Fakta over="Kuttet per fylke" tittel="Kuttet treffer alle fylker">
        <Stolper rader={fyl.map((f) => [f.n, f.kr])} />
        <div>
          <Button variant="secondary" onClick={() => onVelg(fyl[0].id, true)}>
            Utforsk kartet
          </Button>
        </div>
      </Fakta>,
    );
    for (const f of fyl) {
      fakta(
        `fylke-${f.id}`,
        <Fakta className="md:grid md:grid-cols-[3fr_2fr] md:items-center">
          <div className="grid gap-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary-foreground/80">
              Fylke for fylke · {f.n}
            </p>
            <h3 className="max-w-[24ch] text-balance font-serif text-2xl font-bold leading-tight md:text-3xl group-data-[fs=true]:text-6xl">
              {mill(f.kr)} kroner mindre til kurs i {f.n}
            </h3>
            <div className="grid grid-cols-[auto_1fr] items-baseline gap-x-4 gap-y-1">
              {(
                [
                  [f.tk, "færre kurs"],
                  [f.tt, "færre kurstimer"],
                  [f.td, "færre deltakere"],
                ] as const
              ).map(([v, l]) => (
                <div key={l} className="contents">
                  <b className="text-right font-serif text-2xl font-bold leading-none tabular-nums md:text-4xl group-data-[fs=true]:text-7xl">
                    {nf.format(v)}
                  </b>
                  <span className="group-data-[fs=true]:text-2xl">{l}</span>
                </div>
              ))}
            </div>
            <Fotnote skjul>
              Potensielt tap hvis aktiviteten faller like mye som tilskuddet. I
              2025 hadde {f.n} {nf.format(f.kurs)} kurs og {nf.format(f.delt)}{" "}
              deltakere i studieforbundene.
            </Fotnote>
            <div>
              <Button variant="secondary" onClick={() => onVelg(f.id, true)}>
                Se {f.n} i kartet
              </Button>
            </div>
          </div>
          <div className="hidden h-[18rem] md:block group-data-[fs=true]:h-[60vh]">
            <Norgeskart kart={kart} markert={f.id} />
          </div>
        </Fakta>,
      );
      if (par[f.id])
        ut.push({ type: "historie", key: par[f.id].url, h: par[f.id] });
    }
    ta(rest.length);
    fakta(
      "snu",
      <Fakta over="Veien til vedtak" tittel="Dette skal vi snu">
        {dager !== null && (
          <div className="flex flex-wrap items-baseline gap-3">
            <b className="font-serif text-6xl font-bold leading-none tabular-nums md:text-7xl group-data-[fs=true]:text-9xl">
              {dager}
            </b>
            <span className="text-lg group-data-[fs=true]:text-3xl">
              {dager === 1 ? "dag" : "dager"} igjen til Stortinget vedtar
              budsjettet
            </span>
          </div>
        )}
        <div className="grid gap-5 sm:grid-cols-3">
          {[
            [
              "Oktober",
              "Budsjetthøringer i Stortingets komiteer. Organisasjonene gir innspill.",
            ],
            [
              "November",
              "Forhandlinger om budsjettet. Rammevedtak i Stortinget senest 27. november.",
            ],
            [
              "Desember",
              "Endelig vedtak av budsjettet for 2027 senest 15. desember.",
            ],
          ].map(([m, t]) => (
            <div key={m} className="border-t-4 border-white pt-2.5">
              <b className="block font-serif text-2xl group-data-[fs=true]:text-4xl">
                {m}
              </b>
              <span className="mt-1 block text-primary-foreground/90 group-data-[fs=true]:text-xl">
                {t}
              </span>
            </div>
          ))}
        </div>
        <p className="text-primary-foreground/90 group-data-[fs=true]:text-2xl">
          Hver sak, hvert møte og hver historie kan flytte en stemme.
        </p>
      </Fakta>,
    );
    return ut;
  }, [kutt, kart, fylker, historier, dager, onVelg]);

  // Teller og autoavspilling
  useEffect(() => {
    if (!api) return;
    const sync = () => {
      setAktiv(api.selectedScrollSnap());
      setAntall(api.scrollSnapList().length);
    };
    const bruk = () =>
      (sistBrukt.current = Date.now() + PAUSE_ETTER_BRUK - VARIGHET);
    sync();
    api.on("select", sync);
    api.on("reInit", sync);
    api.on("pointerDown", bruk);
    return () => {
      api.off("select", sync);
      api.off("reInit", sync);
      api.off("pointerDown", bruk);
    };
  }, [api]);

  useEffect(() => {
    if (!api || !spiller) return;
    sistBrukt.current = Date.now();
    const t = setInterval(() => {
      if (document.hidden || Date.now() - sistBrukt.current < VARIGHET) return;
      sistBrukt.current = Date.now();
      api.scrollNext();
    }, 500);
    return () => clearInterval(t);
  }, [api, spiller]);

  const bla = (retning: 1 | -1) => {
    sistBrukt.current = Date.now() + PAUSE_ETTER_BRUK - VARIGHET;
    if (retning === 1) api?.scrollNext();
    else api?.scrollPrev();
  };

  // Fullskjerm, med vekkelås så skjermen ikke slukker på stand
  useEffect(() => {
    let lås: WakeLockSentinel | null = null;
    const onEndring = async () => {
      const på = document.fullscreenElement === seksjon.current;
      setFs(på);
      try {
        if (på && !lås && "wakeLock" in navigator)
          lås = await navigator.wakeLock.request("screen");
        if (!på && lås) {
          await lås.release();
          lås = null;
        }
      } catch {
        /* nettleseren tillater ikke vekkelås */
      }
      requestAnimationFrame(() => api?.reInit());
    };
    document.addEventListener("fullscreenchange", onEndring);
    return () => {
      document.removeEventListener("fullscreenchange", onEndring);
      lås?.release().catch(() => {});
    };
  }, [api]);

  const fullskjerm = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else {
      seksjon.current?.requestFullscreen?.().catch(() => {});
      setSpiller(true);
    }
  };

  return (
    <section
      ref={seksjon}
      data-fs={fs}
      aria-labelledby="bevar-h"
      className="group grid min-w-0 gap-3 data-[fs=true]:flex data-[fs=true]:flex-col data-[fs=true]:bg-background data-[fs=true]:p-6"
    >
      <h2
        id="bevar-h"
        className="font-serif text-3xl md:text-4xl group-data-[fs=true]:text-5xl"
      >
        Dette jobber vi for å bevare
      </h2>
      <p className="max-w-prose text-muted-foreground group-data-[fs=true]:hidden">
        Kor, dans, teater, håndverk, kystkultur, trosopplæring, beredskap og
        fellesskap over hele landet. Hver uke møtes folk for å lære noe nytt
        sammen. Her er noen av historiene.
      </p>

      <Carousel
        setApi={setApi}
        opts={{ loop: true }}
        className="min-w-0 group-data-[fs=true]:min-h-0 group-data-[fs=true]:flex-1 [&>div>div]:h-full [&>div]:h-full"
      >
        <CarouselContent className="items-stretch">
          {lysbilder.map((l, i) => (
            <CarouselItem
              key={l.key}
              className="md:h-[25rem] group-data-[fs=true]:md:h-full"
              aria-label={`${i + 1} av ${lysbilder.length}`}
            >
              {l.type === "fakta" ? (
                l.node
              ) : (
                <HistorieBilde
                  h={l.h}
                  fylkeId={idFor(l.h.fylke)}
                  onKart={(id) => {
                    if (document.fullscreenElement)
                      document.exitFullscreen().catch(() => {});
                    onVelg(id, true);
                  }}
                  eager={i < 3}
                />
              )}
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => bla(-1)}
          aria-label="Forrige"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-[4.5rem] text-center text-sm tabular-nums text-muted-foreground">
          {antall ? `${aktiv + 1} / ${antall}` : ""}
        </span>
        <Button
          variant="outline"
          size="icon"
          onClick={() => bla(1)}
          aria-label="Neste"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (!spiller) bla(1);
            setSpiller((s) => !s);
          }}
          aria-pressed={!spiller}
        >
          {spiller ? (
            <Pause className="mr-1.5 h-4 w-4" />
          ) : (
            <Play className="mr-1.5 h-4 w-4" />
          )}
          {spiller ? "Pause" : "Spill av"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto"
          onClick={fullskjerm}
        >
          {fs ? (
            <Minimize2 className="mr-1.5 h-4 w-4" />
          ) : (
            <Maximize2 className="mr-1.5 h-4 w-4" />
          )}
          {fs ? "Avslutt fullskjerm" : "Start fullskjerm"}
        </Button>
      </div>
    </section>
  );
}
