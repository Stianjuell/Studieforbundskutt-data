import { cn } from "@/lib/utils";

import type { Kart } from "./lib";

/** Lite, statisk Norgeskart. Brukes i karusellen og i forsideblokken. */
export function Norgeskart({
  kart,
  markert,
  fyll,
  className,
}: {
  kart: Kart;
  markert?: string;
  fyll?: Record<string, string>;
  className?: string;
}) {
  return (
    <svg
      viewBox={`0 0 ${kart.w} ${kart.h}`}
      aria-hidden="true"
      className={cn("block h-full w-full", className)}
    >
      {Object.entries(kart.p).map(([id, d]) => (
        <path
          key={id}
          d={d}
          strokeLinejoin="round"
          className={cn(
            "stroke-primary [stroke-width:1] [vector-effect:non-scaling-stroke]",
            fyll?.[id] ?? (id === markert ? "fill-white" : "fill-[#8A1A2D]"),
          )}
        />
      ))}
    </svg>
  );
}
