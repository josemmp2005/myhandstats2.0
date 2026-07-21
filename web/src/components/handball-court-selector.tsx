"use client";

import { useRef } from "react";

export type CourtPoint = { x: number; y: number };

/**
 * Campo de balonmano interactivo (media pista de ataque). Coordenadas
 * normalizadas 0-100 en ambos ejes, con y=0 en la línea de gol.
 */
export function HandballCourtSelector({
  value,
  onChange,
  disabled = false,
}: {
  value: CourtPoint | null;
  onChange: (point: CourtPoint) => void;
  disabled?: boolean;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  function handlePick(e: React.PointerEvent<SVGSVGElement>) {
    if (disabled || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = Math.min(Math.max(((e.clientX - rect.left) / rect.width) * 100, 0), 100);
    const y = Math.min(Math.max(((e.clientY - rect.top) / rect.height) * 100, 0), 100);
    onChange({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 });
  }

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 100 100"
      role="img"
      aria-label="Campo de balonmano: toca para marcar el punto de lanzamiento"
      onPointerDown={disabled ? undefined : handlePick}
      className={`w-full rounded-xl border border-slate-200 bg-emerald-50 ${
        disabled ? "opacity-60" : "cursor-crosshair"
      }`}
      style={{ aspectRatio: "1 / 1", touchAction: "none" }}
    >
      {/* Límites de la media pista */}
      <rect x={2} y={2} width={96} height={96} fill="none" stroke="#94a3b8" strokeWidth={0.6} />

      {/* Portería */}
      <rect x={40} y={0} width={20} height={3} fill="none" stroke="#1e293b" strokeWidth={1} />

      {/* Área de 6 metros (aprox.) */}
      <path
        d="M 22 2 A 38 38 0 0 0 78 2"
        fill="none"
        stroke="#0ea5e9"
        strokeWidth={0.8}
      />
      {/* Línea de 9 metros (discontinua) */}
      <path
        d="M 8 2 A 58 58 0 0 0 92 2"
        fill="none"
        stroke="#7c3aed"
        strokeWidth={0.6}
        strokeDasharray="2,2"
      />
      {/* Marca de 7 metros */}
      <line x1={48} y1={19} x2={52} y2={19} stroke="#1e293b" strokeWidth={1} />

      {/* Zona pivote */}
      <text x={50} y={13} textAnchor="middle" fontSize={3.2} fill="#64748b">
        6m
      </text>
      <text x={50} y={31} textAnchor="middle" fontSize={3.2} fill="#64748b">
        9m
      </text>

      {value && (
        <g>
          <circle cx={value.x} cy={value.y} r={2.6} fill="#7c3aed" stroke="white" strokeWidth={0.6} />
        </g>
      )}
    </svg>
  );
}
