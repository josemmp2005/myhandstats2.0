"use client";

import { useRef } from "react";

import type { ZonaPorteria } from "@/lib/types";

const FILAS: ZonaPorteria[][] = [
  ["ALTA_IZQUIERDA", "ALTA_CENTRO", "ALTA_DERECHA"],
  ["MEDIA_IZQUIERDA", "MEDIA_CENTRO", "MEDIA_DERECHA"],
  ["BAJA_IZQUIERDA", "BAJA_CENTRO", "BAJA_DERECHA"],
];

const ANCHO = 150;
const ALTO = 100;
const MARGEN = 6;
const ANCHO_UTIL = ANCHO - 2 * MARGEN;
const ALTO_UTIL = ALTO - 2 * MARGEN;

function zonaEnPunto(px: number, py: number): ZonaPorteria {
  const col = Math.min(2, Math.max(0, Math.floor(((px - MARGEN) / ANCHO_UTIL) * 3)));
  const fila = Math.min(2, Math.max(0, Math.floor(((py - MARGEN) / ALTO_UTIL) * 3)));
  return FILAS[fila][col];
}

/**
 * Portería de balonmano interactiva (marco + red) para marcar a qué zona fue
 * dirigido el lanzamiento. Un único toque sobre el dibujo elige la zona más
 * cercana, en vez de nueve botones sueltos en forma de cuadrícula.
 */
export function GoalTargetSelector({
  value,
  onChange,
  disabled = false,
}: {
  value: ZonaPorteria | null;
  onChange: (zona: ZonaPorteria) => void;
  disabled?: boolean;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  function handlePick(e: React.PointerEvent<SVGSVGElement>) {
    if (disabled || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * ANCHO;
    const py = ((e.clientY - rect.top) / rect.height) * ALTO;
    onChange(zonaEnPunto(px, py));
  }

  const seleccion = value
    ? (() => {
        const fila = FILAS.findIndex((f) => f.includes(value));
        const col = FILAS[fila].indexOf(value);
        const w = ANCHO_UTIL / 3;
        const h = ALTO_UTIL / 3;
        return { x: MARGEN + col * w, y: MARGEN + fila * h, w, h, cx: MARGEN + col * w + w / 2, cy: MARGEN + fila * h + h / 2 };
      })()
    : null;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${ANCHO} ${ALTO}`}
      role="img"
      aria-label="Portería: toca para marcar la zona del lanzamiento"
      onPointerDown={disabled ? undefined : handlePick}
      className={`w-full rounded-lg bg-slate-50 ${disabled ? "opacity-60" : "cursor-crosshair"}`}
      style={{ aspectRatio: `${ANCHO} / ${ALTO}`, touchAction: "none" }}
    >
      {/* Red: patrón de rombos */}
      <g stroke="#cbd5e1" strokeWidth={0.6} opacity={0.9}>
        {Array.from({ length: 9 }).map((_, i) => {
          const x = MARGEN + ((i + 1) * ANCHO_UTIL) / 10;
          return <line key={`v${i}`} x1={x} y1={MARGEN} x2={x} y2={ALTO - MARGEN} />;
        })}
        {Array.from({ length: 6 }).map((_, i) => {
          const y = MARGEN + ((i + 1) * ALTO_UTIL) / 7;
          return <line key={`h${i}`} x1={MARGEN} y1={y} x2={ANCHO - MARGEN} y2={y} />;
        })}
      </g>

      {/* Zona seleccionada */}
      {seleccion && (
        <g>
          <rect x={seleccion.x} y={seleccion.y} width={seleccion.w} height={seleccion.h} fill="#7c3aed" opacity={0.2} />
          <circle cx={seleccion.cx} cy={seleccion.cy} r={5} fill="#7c3aed" stroke="white" strokeWidth={1} />
        </g>
      )}

      {/* Divisiones sutiles de las 9 zonas objetivo */}
      <g stroke="#a855f7" strokeWidth={0.4} strokeDasharray="2,2" opacity={0.35}>
        <line x1={MARGEN + ANCHO_UTIL / 3} y1={MARGEN} x2={MARGEN + ANCHO_UTIL / 3} y2={ALTO - MARGEN} />
        <line x1={MARGEN + (2 * ANCHO_UTIL) / 3} y1={MARGEN} x2={MARGEN + (2 * ANCHO_UTIL) / 3} y2={ALTO - MARGEN} />
        <line x1={MARGEN} y1={MARGEN + ALTO_UTIL / 3} x2={ANCHO - MARGEN} y2={MARGEN + ALTO_UTIL / 3} />
        <line x1={MARGEN} y1={MARGEN + (2 * ALTO_UTIL) / 3} x2={ANCHO - MARGEN} y2={MARGEN + (2 * ALTO_UTIL) / 3} />
      </g>

      {/* Palos y larguero, por encima de la red */}
      <rect x={MARGEN} y={MARGEN} width={ANCHO_UTIL} height={ALTO_UTIL} fill="none" stroke="#1e293b" strokeWidth={4} />
    </svg>
  );
}
