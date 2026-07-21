"use client";

export type HeatPoint = { x: number; y: number; peso?: number };

/**
 * Mapa de calor de solo lectura sobre media pista o portería. Aproxima la
 * densidad superponiendo círculos translúcidos (sin dependencias nuevas) en
 * vez de un cálculo de kernel real — suficiente para una lectura visual rápida.
 */
export function CourtHeatmap({ puntos, className = "" }: { puntos: HeatPoint[]; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={`w-full ${className}`} style={{ aspectRatio: "1 / 1" }} aria-hidden>
      <rect x={2} y={2} width={96} height={96} rx={3} fill="#faf5ff" stroke="#e9d5ff" strokeWidth={0.6} />
      <rect x={40} y={0} width={20} height={3} fill="none" stroke="#4c1d95" strokeWidth={1} />
      <path d="M 22 2 A 38 38 0 0 0 78 2" fill="none" stroke="#c4b5fd" strokeWidth={0.8} />
      <path d="M 8 2 A 58 58 0 0 0 92 2" fill="none" stroke="#ddd6fe" strokeWidth={0.6} strokeDasharray="2,2" />
      <HeatDots puntos={puntos} />
    </svg>
  );
}

/** Portería dividida en 3x3, sombreada por densidad de puntos (goles/paradas por zona). */
export function GoalHeatmap({ puntos, className = "" }: { puntos: HeatPoint[]; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={`w-full ${className}`} style={{ aspectRatio: "1.4 / 1" }} aria-hidden>
      <rect x={2} y={2} width={96} height={96} rx={3} fill="#faf5ff" stroke="#c4b5fd" strokeWidth={1.2} />
      {[0, 1, 2].map((row) =>
        [0, 1, 2].map((col) => (
          <line
            key={`v${row}-${col}`}
            x1={2 + ((col + 1) * 96) / 3}
            y1={2}
            x2={2 + ((col + 1) * 96) / 3}
            y2={98}
            stroke="#e9d5ff"
            strokeWidth={0.5}
          />
        )),
      )}
      <line x1={2} y1={2 + 96 / 3} x2={98} y2={2 + 96 / 3} stroke="#e9d5ff" strokeWidth={0.5} />
      <line x1={2} y1={2 + (2 * 96) / 3} x2={98} y2={2 + (2 * 96) / 3} stroke="#e9d5ff" strokeWidth={0.5} />
      <HeatDots puntos={puntos} radio={7} />
    </svg>
  );
}

function HeatDots({ puntos, radio = 6 }: { puntos: HeatPoint[]; radio?: number }) {
  return (
    <>
      {puntos.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={radio} fill="#7c3aed" opacity={0.16} />
      ))}
    </>
  );
}
