// Felles typer og beregninger for Konsekvenskartet. Brukes både på server og klient.
// Dataene ligger i https://github.com/Stianjuell/Studieforbundskutt-data og oppdateres derfra.

export const DATA_URL =
  "https://raw.githubusercontent.com/Stianjuell/Studieforbundskutt-data/main";

/** Hvor ofte siden henter nye data (sekunder). */
export const OPPDATER_SEK = 900;

export type Departement = "KUD" | "KD";

export type Rad = {
  f: string; // fylkesnummer
  s: string; // studieforbund
  d: Departement;
  kurs: number;
  timer: number;
  delt: number;
  kr: number; // tapt tilskudd
  tk: number; // potensielt tap av kurs
  tt: number; // potensielt tap av kurstimer
  td: number; // potensielt tap av deltakere
};

export type Kutt = {
  oppdatert: string;
  kutt: Record<Departement, number>;
  kilde: string;
  fylker: { id: string; n: string }[];
  rader: Rad[];
};

export type Kart = { w: number; h: number; p: Record<string, string> };

export type Nyhet = {
  tittel: string;
  url: string;
  kilde: string;
  dato?: string;
  sammendrag?: string;
  viktig?: boolean;
  bilde?: string;
  fylker?: string[];
  sted?: string;
  lat?: number;
  lon?: number;
  nederst?: boolean;
};

export type Historie = {
  tittel: string;
  url: string;
  dato: string;
  fylke: string;
  sted?: string;
  lat?: number;
  lon?: number;
  ingress?: string;
  bilde?: string;
};

export type Konsekvensdata = {
  kutt: Kutt;
  kart: Kart;
  nyheter: Nyhet[];
  historier: Historie[];
};

export type Metric = "kr" | "tk" | "tt" | "td";

export type Fylke = {
  id: string;
  n: string;
  kurs: number;
  timer: number;
  delt: number;
  kr: number;
  tk: number;
  tt: number;
  td: number;
  fb: [string, number][];
};

export const LABEL: Record<Metric, string> = {
  kr: "Tapt tilskudd",
  tk: "Potensielt tap av kurs",
  tt: "Potensielt tap av kurstimer",
  td: "Potensielt tap av deltakere",
};

export const nf = new Intl.NumberFormat("nb-NO");

export const mill = (v: number) =>
  `${(v / 1e6).toLocaleString("nb-NO", { maximumFractionDigits: 1 })} mill.`;

export const fmt = (m: Metric, v: number) =>
  m === "kr"
    ? v >= 1e6
      ? `${mill(v)} kr`
      : `${nf.format(v)} kr`
    : nf.format(v);

export const datoKort = (iso?: string) =>
  iso
    ? new Date(`${iso}T12:00`).toLocaleDateString("nb-NO", {
        day: "numeric",
        month: "short",
      })
    : "";

export function beregnFylker(kutt: Kutt): Fylke[] {
  return kutt.fylker.map((m) => {
    const o = { kurs: 0, timer: 0, delt: 0, kr: 0, tk: 0, tt: 0, td: 0 };
    const fb: Record<string, number> = {};
    for (const r of kutt.rader) {
      if (r.f !== m.id) continue;
      o.kurs += r.kurs;
      o.timer += r.timer;
      o.delt += r.delt;
      o.kr += r.kr;
      o.tk += r.tk;
      o.tt += r.tt;
      o.td += r.td;
      if (r.kr > 0) fb[r.s] = (fb[r.s] ?? 0) + r.kr;
    }
    return {
      ...m,
      ...o,
      kr: Math.round(o.kr),
      tk: Math.round(o.tk),
      tt: Math.round(o.tt),
      td: Math.round(o.td),
      fb: Object.entries(fb).sort((a, b) => b[1] - a[1]),
    };
  });
}

export type Forbund = {
  s: string;
  kr: number;
  kurs: number;
  delt: number;
  tk: number;
  td: number;
};

export function beregnForbund(kutt: Kutt): Forbund[] {
  const m: Record<string, Forbund> = {};
  for (const r of kutt.rader) {
    const o = (m[r.s] ??= { s: r.s, kr: 0, kurs: 0, delt: 0, tk: 0, td: 0 });
    o.kr += r.kr;
    o.kurs += r.kurs;
    o.delt += r.delt;
    o.tk += r.tk;
    o.td += r.td;
  }
  return Object.values(m).sort((a, b) => b.kr - a.kr);
}

export function breaks(fylker: Fylke[], metric: Metric) {
  const v = fylker.map((d) => d[metric]).sort((a, b) => a - b);
  return [0.2, 0.4, 0.6, 0.8].map((q) => v[Math.floor(q * (v.length - 1))]);
}

export function bucket(v: number, b: number[]) {
  let i = 0;
  while (i < b.length && v > b[i]) i++;
  return i;
}

export const slug = (n: string) =>
  n
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "o")
    .replace(/å/g, "a")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const erHttps = (u?: string): u is string =>
  !!u && /^https:\/\//.test(u);

export function sorterNyheter(n: Nyhet[]) {
  return [...n].sort(
    (a, b) =>
      Number(!!a.nederst) - Number(!!b.nederst) ||
      (b.dato ?? "").localeCompare(a.dato ?? "") ||
      Number(!!b.viktig) - Number(!!a.viktig),
  );
}

// Kartet er projisert i UTM 33 (EPSG:25833) og skalert til SVG-koordinater.
const PROJ = { minx: -60250, maxy: 7939090, s: 0.0005104862381418301 };

function utm33(lat: number, lon: number): [number, number] {
  const a = 6378137,
    f = 1 / 298.257222101,
    k0 = 0.9996,
    e2 = f * (2 - f),
    ep2 = e2 / (1 - e2),
    r = Math.PI / 180;
  const phi = lat * r,
    lam = (lon - 15) * r,
    N = a / Math.sqrt(1 - e2 * Math.sin(phi) ** 2),
    T = Math.tan(phi) ** 2,
    C = ep2 * Math.cos(phi) ** 2,
    A = Math.cos(phi) * lam;
  const M =
    a *
    ((1 - e2 / 4 - (3 * e2 * e2) / 64 - (5 * e2 ** 3) / 256) * phi -
      ((3 * e2) / 8 + (3 * e2 * e2) / 32 + (45 * e2 ** 3) / 1024) *
        Math.sin(2 * phi) +
      ((15 * e2 * e2) / 256 + (45 * e2 ** 3) / 1024) * Math.sin(4 * phi) -
      ((35 * e2 ** 3) / 3072) * Math.sin(6 * phi));
  const x =
    k0 *
      N *
      (A +
        ((1 - T + C) * A ** 3) / 6 +
        ((5 - 18 * T + T * T + 72 * C - 58 * ep2) * A ** 5) / 120) +
    500000;
  const y =
    k0 *
    (M +
      N *
        Math.tan(phi) *
        ((A * A) / 2 +
          ((5 - T + 9 * C + 4 * C * C) * A ** 4) / 24 +
          ((61 - 58 * T + T * T + 600 * C - 330 * ep2) * A ** 6) / 720));
  return [x, y];
}

export function tilXY(lat: number, lon: number): [number, number] {
  const [x, y] = utm33(lat, lon);
  return [(x - PROJ.minx) * PROJ.s, (PROJ.maxy - y) * PROJ.s];
}

export const FYLKESBY: Record<string, [number, number]> = {
  Østfold: [59.22, 10.93],
  Akershus: [59.96, 11.05],
  Oslo: [59.91, 10.75],
  Innlandet: [60.79, 11.07],
  Buskerud: [59.74, 10.2],
  Vestfold: [59.27, 10.41],
  Telemark: [59.21, 9.61],
  Agder: [58.15, 7.99],
  Rogaland: [58.97, 5.73],
  Vestland: [60.39, 5.32],
  "Møre og Romsdal": [62.47, 6.15],
  Trøndelag: [63.43, 10.39],
  Nordland: [67.28, 14.4],
  Troms: [69.65, 18.96],
  Finnmark: [69.97, 23.27],
};
