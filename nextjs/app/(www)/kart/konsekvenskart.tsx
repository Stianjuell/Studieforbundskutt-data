"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Flag, Map as KartIkon, Newspaper, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { Karusell } from "./karusell";
import {
  beregnFylker,
  breaks,
  bucket,
  DATA_URL,
  datoKort,
  erHttps,
  fmt,
  FYLKESBY,
  LABEL,
  nf,
  OPPDATER_SEK,
  slug,
  sorterNyheter,
  tilXY,
  type Fylke,
  type Historie,
  type Konsekvensdata,
  type Metric,
  type Nyhet,
} from "./lib";

// Fulle klassenavn så Tailwind finner dem. Lys og mørk modus i samme streng.
const FILL = [
  "fill-[#F8E9EC] dark:fill-[#3A1F25]",
  "fill-[#EBB3BE] dark:fill-[#6B2633]",
  "fill-[#D16A7E] dark:fill-[#A41F35]",
  "fill-[#A41F35] dark:fill-[#D8576C]",
  "fill-[#6E1222] dark:fill-[#F2A5B2]",
];
const SWATCH = [
  "bg-[#F8E9EC] dark:bg-[#3A1F25]",
  "bg-[#EBB3BE] dark:bg-[#6B2633]",
  "bg-[#D16A7E] dark:bg-[#A41F35]",
  "bg-[#A41F35] dark:bg-[#D8576C]",
  "bg-[#6E1222] dark:bg-[#F2A5B2]",
];
const TEAL = "text-[#009890] dark:text-[#3CC4BB]";

type Pin = {
  type: "historie" | "nyhet";
  tittel: string;
  url: string;
  dato?: string;
  fylke: string;
  sted: string;
  x: number;
  y: number;
  tekst?: string;
  kilde?: string;
  bilde?: string;
  nasjonal?: boolean;
};

// Nasjonale saker spres utover kartet, én per sted, så de blir synlige.
const NASJ: [number, number][] = [
  [61.12, 10.47],
  [58.46, 8.77],
  [64.01, 11.5],
  [59.41, 5.27],
  [66.31, 14.14],
  [59.67, 9.65],
  [68.8, 16.54],
  [61.45, 5.85],
  [70.07, 29.75],
  [59.12, 11.39],
  [63.11, 7.73],
  [59.05, 10.03],
  [70.66, 23.68],
  [60.8, 10.69],
  [68.44, 17.43],
  [59.56, 9.26],
  [60.14, 11.17],
  [60.17, 10.26],
];

// Nasjonale saker fra studieforbund med kjent hovedkontor plasseres der.
const HOVEDKONTOR: Record<string, [string, number, number]> = {
  "Studieforbundet kultur og tradisjon": ["Vågå", 61.875, 9.1],
  "Frilynt Norge": ["Sandefjord", 59.131, 10.216],
  "Studieforbundet Livslang Læring": ["Bamble", 59.03, 9.7],
};

type VB = { x: number; y: number; w: number; h: number };

const sentence = (d: Fylke) =>
  `I ${d.n} vil kuttet i statsbudsjettet bety ${fmt("kr", d.kr)} mindre til studieforbundene. Det gir et potensielt tap av ${nf.format(d.tk)} kurs og ${nf.format(d.td)} deltakere.`;

function Label({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "mb-2 text-xs uppercase tracking-wider text-muted-foreground",
        className,
      )}
    >
      {children}
    </p>
  );
}

function Lenkeliste({
  items,
  kant,
}: {
  items: { tittel: string; url: string; under: string }[];
  kant: string;
}) {
  return (
    <ul className="grid gap-2.5">
      {items.map((n) => (
        <li
          key={n.url}
          className={cn("grid gap-0.5 border-l-[3px] pl-2.5", kant)}
        >
          <a
            href={erHttps(n.url) ? n.url : "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold hover:underline"
          >
            {n.tittel}
          </a>
          <span className="text-sm text-muted-foreground">{n.under}</span>
        </li>
      ))}
    </ul>
  );
}

export function Konsekvenskart(initial: Konsekvensdata) {
  const { kutt, kart } = initial;
  const [nyheter, setNyheter] = useState<Nyhet[]>(initial.nyheter);
  const [historier, setHistorier] = useState<Historie[]>(initial.historier);
  const [visning, setVisning] = useState<"kart" | "nyheter" | "krav">("kart");
  const [metric, setMetric] = useState<Metric>("kr");
  const [sel, setSel] = useState("50");
  const [pop, setPop] = useState<Pin[] | null>(null);
  const [visAlle, setVisAlle] = useState(false);
  const [vb, setVb] = useState<VB>({ x: 0, y: 0, w: kart.w, h: kart.h });
  const panelRef = useRef<HTMLDivElement>(null);
  const kartRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const anim = useRef(0);

  const fylker = useMemo(() => beregnFylker(kutt), [kutt]);
  const byId = useMemo(
    () => Object.fromEntries(fylker.map((f) => [f.id, f])),
    [fylker],
  );
  const d = byId[sel] ?? fylker[0];
  const b = useMemo(() => breaks(fylker, metric), [fylker, metric]);
  const rader = useMemo(
    () => [...fylker].sort((x, y) => y[metric] - x[metric]),
    [fylker, metric],
  );
  const total = (k: Metric) => fylker.reduce((a, f) => a + f[k], 0);
  const lo = Math.min(...fylker.map((f) => f[metric]));
  const hi = Math.max(...fylker.map((f) => f[metric]));
  const maxFb = Math.max(1, ...d.fb.map(([, v]) => v));
  const zoomet = vb.w < kart.w - 1;

  // Henter nye saker og historier jevnlig, så en skjerm som står på hele dagen holder seg oppdatert.
  useEffect(() => {
    const hent = async () => {
      const t = Math.floor(Date.now() / 3e5);
      const [n, h] = await Promise.all(
        ["nyheter", "historier"].map((f) =>
          fetch(`${DATA_URL}/${f}.json?t=${t}`, { cache: "no-store" })
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
        ),
      );
      if (Array.isArray(n) && n.length)
        setNyheter(n.filter((x: Nyhet) => x?.tittel && x?.url));
      if (Array.isArray(h) && h.length)
        setHistorier(
          h.filter((x: Historie) => x?.tittel && x?.url && x?.fylke),
        );
    };
    const t = setInterval(hent, OPPDATER_SEK * 1000);
    return () => clearInterval(t);
  }, []);

  /* ----- Zoom ----- */
  const animer = useCallback(
    (til: VB) => {
      cancelAnimationFrame(anim.current);
      if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
        setVb(til);
        return;
      }
      const fra = { ...vb };
      const t0 = performance.now();
      const steg = (nå: number) => {
        const p = Math.min(1, (nå - t0) / 500);
        const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        setVb({
          x: fra.x + (til.x - fra.x) * e,
          y: fra.y + (til.y - fra.y) * e,
          w: fra.w + (til.w - fra.w) * e,
          h: fra.h + (til.h - fra.h) * e,
        });
        if (p < 1) anim.current = requestAnimationFrame(steg);
      };
      anim.current = requestAnimationFrame(steg);
    },
    [vb],
  );

  const zoomTil = useCallback(
    (id: string) => {
      const p = svgRef.current?.querySelector<SVGPathElement>(
        `path[data-id="${id}"]`,
      );
      if (!p) return;
      const bb = p.getBBox();
      const R = kart.w / kart.h;
      let w = bb.width * 1.36,
        h = bb.height * 1.36;
      if (w / h > R) h = w / R;
      else w = h * R;
      if (w < kart.w * 0.16) {
        w = kart.w * 0.16;
        h = w / R;
      }
      if (w >= kart.w) return animer({ x: 0, y: 0, w: kart.w, h: kart.h });
      animer({
        x: bb.x + bb.width / 2 - w / 2,
        y: bb.y + bb.height / 2 - h / 2,
        w,
        h,
      });
    },
    [animer, kart.w, kart.h],
  );

  const zoomUt = () => {
    setPop(null);
    animer({ x: 0, y: 0, w: kart.w, h: kart.h });
  };

  const velg = useCallback(
    (id: string, opts?: { zoom?: boolean; scroll?: boolean }) => {
      setSel(id);
      setVisning("kart");
      const f = byId[id];
      if (f) {
        try {
          history.replaceState(null, "", `#${slug(f.n)}`);
        } catch {}
      }
      if (opts?.zoom !== false) requestAnimationFrame(() => zoomTil(id));
      if (opts?.scroll)
        setTimeout(
          () =>
            kartRef.current?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            }),
          50,
        );
    },
    [byId, zoomTil],
  );

  // Lenker som #trondelag eller #nyheter
  useEffect(() => {
    const t = setTimeout(() => {
      const h = location.hash.slice(1);
      if (h === "nyheter") setVisning("nyheter");
      if (h === "krav") setVisning("krav");
      const f = fylker.find((x) => slug(x.n) === h);
      if (f) velg(f.id);
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ----- Prikker ----- */
  const pins = useMemo(() => {
    const ut: Pin[] = [];
    for (const h of historier) {
      if (typeof h.lat !== "number" || typeof h.lon !== "number") continue;
      const [x, y] = tilXY(h.lat, h.lon);
      ut.push({
        type: "historie",
        tittel: h.tittel,
        url: h.url,
        dato: h.dato,
        fylke: h.fylke,
        sted: h.sted || h.fylke,
        x,
        y,
        tekst: h.ingress,
        bilde: h.bilde,
      });
    }
    let spredt = 0;
    sorterNyheter(nyheter)
      .filter((n) => !n.fylker?.length && typeof n.lat !== "number")
      .forEach((n) => {
        const hk = n.kilde ? HOVEDKONTOR[n.kilde] : undefined;
        let la: number, lo: number;
        if (hk) [, la, lo] = hk;
        else {
          const i = spredt++;
          const r = Math.floor(i / NASJ.length);
          la = NASJ[i % NASJ.length][0] + r * 0.3;
          lo = NASJ[i % NASJ.length][1] + r * 0.4;
        }
        const [x, y] = tilXY(la, lo);
        ut.push({
          type: "nyhet",
          nasjonal: true,
          tittel: n.tittel,
          url: n.url,
          dato: n.dato,
          fylke: "",
          sted: hk ? `Nasjonal sak, ${hk[0]}` : "Nasjonal sak",
          x,
          y,
          tekst: n.sammendrag,
          kilde: n.kilde,
          bilde: n.bilde,
        });
      });
    for (const n of nyheter) {
      const fy = n.fylker?.length === 1 ? n.fylker[0] : undefined;
      let lat = n.lat,
        lon = n.lon,
        sted = n.sted;
      if (typeof lat !== "number" || typeof lon !== "number") {
        if (!fy || !FYLKESBY[fy]) continue;
        [lat, lon] = FYLKESBY[fy];
        sted = fy;
      }
      const [x, y] = tilXY(lat, lon);
      ut.push({
        type: "nyhet",
        tittel: n.tittel,
        url: n.url,
        dato: n.dato,
        fylke: fy ?? n.fylker?.[0] ?? "",
        sted: sted || fy || "",
        x,
        y,
        tekst: n.sammendrag,
        kilde: n.kilde,
        bilde: n.bilde,
      });
    }
    const grupper: Record<string, { x: number; y: number; l: Pin[] }> = {};
    for (const p of ut) {
      const k = `${p.x.toFixed(0)},${p.y.toFixed(0)}`;
      (grupper[k] ??= { x: p.x, y: p.y, l: [] }).l.push(p);
    }
    return Object.values(grupper);
  }, [historier, nyheter]);

  const visPop = (l: Pin[]) => {
    const f = fylker.find((x) => x.n === l[0].fylke);
    if (f && !l.every((p) => p.nasjonal)) velg(f.id);
    setPop(
      [...l].sort(
        (a, c) =>
          (a.type === c.type ? 0 : a.type === "nyhet" ? -1 : 1) ||
          (c.dato ?? "").localeCompare(a.dato ?? ""),
      ),
    );
  };

  /* ----- Saker og historier i panelet ----- */
  const sortert = useMemo(() => sorterNyheter(nyheter), [nyheter]);
  const lokale = sortert.filter((n) => n.fylker?.includes(d.n));
  const nasjonale = sortert.filter((n) => !n.fylker?.length);
  const fylkeHist = historier
    .filter((h) => h.fylke === d.n)
    .sort((a, c) => c.dato.localeCompare(a.dato));

  const k = vb.w / kart.w; // skalering av prikker ved zoom

  return (
    <div className="grid gap-8">
      <div
        role="tablist"
        aria-label="Visning"
        className="flex max-w-full gap-1.5 justify-self-stretch rounded-full border bg-card p-1.5 sm:justify-self-start"
      >
        {(
          [
            ["kart", "Konsekvenskartet", KartIkon],
            ["nyheter", "Nyheter", Newspaper],
            ["krav", "Hva krever vi", Flag],
          ] as const
        ).map(([v, t, Ikon]) => (
          <button
            key={v}
            role="tab"
            aria-selected={visning === v}
            onClick={() => {
              setVisning(v);
              try {
                history.replaceState(
                  null,
                  "",
                  v === "kart" ? `#${slug(d.n)}` : `#${v}`,
                );
              } catch {}
            }}
            className={cn(
              "inline-flex min-w-0 flex-auto items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-1 py-2.5 text-[13px] font-bold min-[441px]:px-2 min-[441px]:text-sm transition-colors sm:flex-none sm:gap-2 sm:px-6 sm:py-3 sm:text-lg",
              visning === v
                ? "bg-primary text-primary-foreground"
                : "text-foreground hover:bg-muted",
            )}
          >
            <Ikon
              className="hidden h-4 w-4 min-[441px]:block sm:h-5 sm:w-5"
              aria-hidden="true"
            />
            {t}
          </button>
        ))}
      </div>

      {visning === "kart" ? (
        <div className="grid gap-8">
          <Karusell
            kutt={kutt}
            kart={kart}
            fylker={fylker}
            historier={historier}
            onVelgFylke={(id, scroll) => velg(id, { scroll })}
          />

          <section
            aria-label="Hele landet"
            className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border md:grid-cols-4"
          >
            {(
              [
                ["kr", "mindre i statstilskudd"],
                ["tk", "potensielt tap av kurs"],
                ["tt", "potensielt tap av kurstimer"],
                ["td", "potensielt tap av deltakere"],
              ] as const
            ).map(([m, tekst]) => (
              <div key={m} className="bg-card px-4 py-3">
                <b className="block font-serif text-2xl font-bold tabular-nums text-primary md:text-3xl">
                  {fmt(m, total(m))}
                </b>
                <span className="text-sm text-muted-foreground">{tekst}</span>
              </div>
            ))}
          </section>

          <div
            role="group"
            aria-label="Velg hva kartet viser"
            className="flex flex-wrap gap-1.5"
          >
            {(Object.keys(LABEL) as Metric[]).map((m) => (
              <Button
                key={m}
                size="sm"
                variant={metric === m ? "default" : "outline"}
                aria-pressed={metric === m}
                className="rounded-full"
                onClick={() => setMetric(m)}
              >
                {LABEL[m]}
              </Button>
            ))}
          </div>

          <div
            ref={kartRef}
            className="grid scroll-mt-4 items-start gap-6 md:grid-cols-[6fr_5fr]"
          >
            <div className="md:sticky md:top-4">
              <div className="relative">
                {zoomet && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute left-2 top-2 z-10"
                    onClick={zoomUt}
                  >
                    Vis hele landet
                  </Button>
                )}
                <svg
                  ref={svgRef}
                  viewBox={`${vb.x.toFixed(1)} ${vb.y.toFixed(1)} ${vb.w.toFixed(1)} ${vb.h.toFixed(1)}`}
                  role="img"
                  aria-label="Kart over Norge farget etter tap per fylke"
                  className="block h-auto max-h-[60vh] w-full md:max-h-[82vh]"
                >
                  {Object.entries(kart.p).map(([id, path]) => {
                    const f = byId[id];
                    return (
                      <path
                        key={id}
                        d={path}
                        data-id={id}
                        tabIndex={0}
                        role="button"
                        aria-label={f?.n ?? id}
                        aria-pressed={id === sel}
                        onClick={() => {
                          setPop(null);
                          velg(id);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            velg(id);
                          }
                        }}
                        strokeLinejoin="round"
                        className={cn(
                          "cursor-pointer outline-none transition-[fill,opacity] [vector-effect:non-scaling-stroke] motion-reduce:transition-none",
                          "hover:stroke-foreground focus-visible:stroke-foreground",
                          id === sel
                            ? "stroke-foreground [stroke-width:2]"
                            : "stroke-background [stroke-width:0.8]",
                          zoomet && id !== sel && "opacity-45",
                          f ? FILL[bucket(f[metric], b)] : "fill-muted",
                        )}
                      >
                        <title>{f?.n ?? id}</title>
                      </path>
                    );
                  })}
                  {pins.map((g) => {
                    const nyhet = g.l.some((p) => p.type === "nyhet");
                    const nh = g.l.filter((p) => p.type === "historie").length;
                    const nn = g.l.length - nh;
                    return (
                      <circle
                        key={`${g.x},${g.y}`}
                        cx={g.x}
                        cy={g.y}
                        r={Math.min(5 + g.l.length * 1.6, 12) * k}
                        tabIndex={0}
                        role="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          visPop(g.l);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            visPop(g.l);
                          }
                        }}
                        className={cn(
                          "cursor-pointer stroke-card [stroke-width:2] [vector-effect:non-scaling-stroke] hover:fill-foreground focus-visible:fill-foreground focus-visible:outline-none",
                          g.l.every((p) => p.nasjonal)
                            ? "fill-white stroke-foreground [stroke-width:2.5]"
                            : nyhet
                              ? "fill-primary"
                              : "fill-[#009890]",
                        )}
                      >
                        <title>
                          {`${g.l[0].sted}: ${[nh ? `${nh} ${nh === 1 ? "historie" : "historier"}` : "", nn ? `${nn} ${nn === 1 ? "mediesak" : "mediesaker"}` : ""].filter(Boolean).join(" og ")}`}
                        </title>
                      </circle>
                    );
                  })}
                </svg>

                {pop && (
                  <Card
                    role="dialog"
                    aria-label="Saker fra stedet"
                    className="absolute inset-x-2 bottom-2 z-20 max-h-[55%] overflow-auto p-4 shadow-lg"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <b className="font-serif text-xl">{pop[0].sted}</b>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => setPop(null)}
                        aria-label="Lukk"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <ul className="grid gap-3">
                      {pop.map((p) => (
                        <li key={p.url} className="grid gap-1">
                          {erHttps(p.bilde) && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={p.bilde}
                              alt=""
                              loading="lazy"
                              referrerPolicy="no-referrer"
                              className="mb-1 aspect-video w-full rounded object-cover"
                              onError={(e) => e.currentTarget.remove()}
                            />
                          )}
                          <span
                            className={cn(
                              "justify-self-start rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-white",
                              p.type === "nyhet"
                                ? "bg-primary"
                                : "bg-[#009890]",
                            )}
                          >
                            {p.nasjonal
                              ? "Nasjonal sak"
                              : p.type === "nyhet"
                                ? "Nyhet"
                                : "Historie"}
                          </span>
                          <a
                            href={erHttps(p.url) ? p.url : "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold hover:underline"
                          >
                            {p.tittel}
                          </a>
                          <small className="text-muted-foreground">
                            {[p.kilde, datoKort(p.dato)]
                              .filter(Boolean)
                              .join(" · ")}
                          </small>
                          {p.tekst && <p className="text-sm">{p.tekst}</p>}
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <span>{fmt(metric, lo)}</span>
                {SWATCH.map((c) => (
                  <i key={c} className={cn("inline-block h-2.5 w-[22px]", c)} />
                ))}
                <span>{fmt(metric, hi)}</span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <i className="inline-block h-2.5 w-2.5 rounded-full bg-[#009890]" />{" "}
                  Historier fra lagene
                </span>
                <span className="flex items-center gap-1.5">
                  <i className="inline-block h-2.5 w-2.5 rounded-full bg-primary" />{" "}
                  Lokale mediesaker
                </span>
                <span className="flex items-center gap-1.5">
                  <i className="inline-block h-2.5 w-2.5 rounded-full border-2 border-foreground bg-white" />{" "}
                  Nasjonale saker, spredt utover kartet
                </span>
                <span>Trykk på en prikk for å lese.</span>
              </div>
            </div>

            <Card
              ref={panelRef}
              aria-live="polite"
              className="grid min-w-0 gap-5 p-5"
            >
              <h2 className="font-serif text-3xl font-bold leading-none">
                {d.n}
              </h2>

              <div>
                <Label>Mindre i statstilskudd</Label>
                <div className="font-serif text-4xl font-bold leading-none tabular-nums text-primary md:text-5xl">
                  {fmt("kr", d.kr)}
                </div>
              </div>

              <div>
                <Label>Potensielt tap</Label>
                <div className="grid grid-cols-3 gap-3">
                  {(
                    [
                      [d.tk, "kurs", d.kurs],
                      [d.tt, "kurstimer", d.timer],
                      [d.td, "deltakere", d.delt],
                    ] as const
                  ).map(([v, navn, av]) => (
                    <div
                      key={navn}
                      className="border-t-2 border-foreground pt-1.5"
                    >
                      <b className="block font-serif text-2xl tabular-nums">
                        −{nf.format(v)}
                      </b>
                      <small className="block text-sm text-muted-foreground">
                        {navn} av {nf.format(av)}
                      </small>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>Tapt tilskudd per studieforbund</Label>
                <div className="grid gap-1.5">
                  {d.fb.map(([navn, v]) => (
                    <div
                      key={navn}
                      className="grid grid-cols-[7.5rem_minmax(0,1fr)_5.5rem] items-center gap-2 text-sm sm:grid-cols-[9.5rem_minmax(0,1fr)_6.5rem]"
                    >
                      <span>{navn}</span>
                      <span className="h-3 bg-muted">
                        <i
                          className="block h-full bg-primary"
                          style={{
                            width: `${((v / maxFb) * 100).toFixed(1)}%`,
                          }}
                        />
                      </span>
                      <span className="text-right tabular-nums">
                        {fmt("kr", v)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>Til lokalmedier</Label>
                <div className="border-l-[3px] border-primary bg-background px-3.5 py-2.5 text-[15px]">
                  {sentence(d)}
                </div>
              </div>

              {fylkeHist.length > 0 && (
                <div>
                  <Label>Dette står på spill i {d.n}</Label>
                  <Lenkeliste
                    kant="border-[#009890]"
                    items={fylkeHist.map((h) => ({
                      tittel: h.tittel,
                      url: h.url,
                      under: [h.sted, datoKort(h.dato)]
                        .filter(Boolean)
                        .join(" · "),
                    }))}
                  />
                </div>
              )}

              {(lokale.length > 0 || nasjonale.length > 0) && (
                <div>
                  {lokale.length > 0 && (
                    <>
                      <Label>Saker fra {d.n}</Label>
                      <Lenkeliste
                        kant="border-primary"
                        items={lokale.map((n) => ({
                          tittel: n.tittel,
                          url: n.url,
                          under: [n.kilde, datoKort(n.dato)]
                            .filter(Boolean)
                            .join(" · "),
                        }))}
                      />
                    </>
                  )}
                  {nasjonale.length > 0 && (
                    <>
                      <Label className={lokale.length ? "mt-4" : ""}>
                        Nasjonale saker
                      </Label>
                      <Lenkeliste
                        kant="border-border"
                        items={nasjonale.slice(0, 5).map((n) => ({
                          tittel: n.tittel,
                          url: n.url,
                          under: [n.kilde, datoKort(n.dato)]
                            .filter(Boolean)
                            .join(" · "),
                        }))}
                      />
                      {nasjonale.length > 5 && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3"
                          onClick={() => {
                            setVisning("nyheter");
                            scrollTo({ top: 0, behavior: "smooth" });
                          }}
                        >
                          Se alle {nasjonale.length} saker
                        </Button>
                      )}
                    </>
                  )}
                </div>
              )}
            </Card>
          </div>

          <section>
            <Label>Alle fylker</Label>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm tabular-nums">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="px-1 py-1.5 text-left font-semibold">
                      Fylke
                    </th>
                    <th className="px-1 py-1.5 text-right font-semibold">
                      {LABEL[metric]}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rader.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => velg(r.id, { scroll: true })}
                      className={cn(
                        "cursor-pointer border-b hover:bg-muted/50",
                        r.id === sel && "font-semibold text-primary",
                      )}
                    >
                      <td className="px-1 py-1.5">{r.n}</td>
                      <td className="px-1 py-1.5 text-right">
                        {fmt(metric, r[metric])}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <p className="max-w-prose text-sm text-muted-foreground">
            Grunnlag: {kutt.kilde} Deltakere telles per kurs. Tallene oppdateres
            fra{" "}
            <a
              className="underline"
              href="https://github.com/Stianjuell/Studieforbundskutt-data"
            >
              Vofos datalager
            </a>
            .
          </p>
        </div>
      ) : visning === "krav" ? (
        <section
          role="tabpanel"
          aria-labelledby="krav-h"
          className="grid gap-5 rounded-lg bg-[radial-gradient(120%_90%_at_15%_50%,#B8263F_0%,hsl(var(--primary))_45%,#7E1528_100%)] p-6 text-primary-foreground md:p-14"
        >
          <p className="text-sm font-semibold uppercase tracking-widest text-primary-foreground/85">
            Vofos krav
          </p>
          <h2
            id="krav-h"
            className="font-serif text-4xl font-bold leading-none md:text-6xl"
          >
            Dette er det vi krever
          </h2>
          <p className="max-w-[40ch] text-xl md:text-2xl">
            Full reversering av kuttet, med prisjustering.
          </p>
          <div className="mt-1 grid gap-4 sm:grid-cols-2">
            {(
              [
                [
                  "42,7 mill. kr",
                  "økning under Kultur- og likestillingsdepartementet",
                ],
                ["34,3 mill. kr", "økning under Kunnskapsdepartementet"],
              ] as const
            ).map(([tall, tekst]) => (
              <div
                key={tall}
                className="grid gap-1.5 border-t-4 border-white pt-3"
              >
                <b className="font-serif text-5xl leading-none md:text-7xl">
                  {tall}
                </b>
                <span className="text-lg text-primary-foreground/90">
                  {tekst}
                </span>
              </div>
            ))}
          </div>
          <div>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => {
                setVisning("kart");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              Se hva kuttet koster
            </Button>
          </div>
        </section>
      ) : (
        <section className="grid gap-6">
          <p className="max-w-prose text-muted-foreground">
            Saker om kuttene til studieforbundene. Lenkene åpner saken hos
            kilden.
          </p>
          <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(min(100%,18rem),1fr))]">
            {sortert.slice(0, visAlle ? undefined : 30).map((n) => (
              <a
                key={n.url}
                href={erHttps(n.url) ? n.url : "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="group grid grid-rows-[auto_1fr] overflow-hidden rounded-lg border bg-card text-card-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="relative aspect-video bg-primary/10">
                  <span className="absolute inset-x-3 bottom-2.5 font-serif text-xl font-bold leading-tight text-primary">
                    {n.kilde}
                  </span>
                  {erHttps(n.bilde) && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={n.bilde}
                      alt=""
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="absolute inset-0 h-full w-full object-cover"
                      onError={(e) => e.currentTarget.remove()}
                    />
                  )}
                </div>
                <div className="grid content-start gap-1.5 p-4">
                  <div className="flex flex-wrap gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                    <b className="font-semibold text-primary">{n.kilde}</b>
                    <span>{datoKort(n.dato)}</span>
                  </div>
                  <h3 className="text-balance font-serif text-lg font-bold leading-snug group-hover:underline">
                    {n.tittel}
                  </h3>
                  {n.sammendrag && (
                    <p className="text-sm text-muted-foreground">
                      {n.sammendrag}
                    </p>
                  )}
                </div>
              </a>
            ))}
          </div>
          {!visAlle && sortert.length > 30 && (
            <Button
              variant="outline"
              className="justify-self-start"
              onClick={() => setVisAlle(true)}
            >
              Vis alle {sortert.length} saker
            </Button>
          )}
          <p className={cn("text-sm", TEAL)}>
            <a
              className="underline"
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setVisning("kart");
              }}
            >
              Tilbake til kartet
            </a>
          </p>
        </section>
      )}
    </div>
  );
}
