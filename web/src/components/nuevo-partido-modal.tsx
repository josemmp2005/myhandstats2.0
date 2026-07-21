"use client";

import { useState } from "react";

import { Button, ErrorMessage, LabeledInput, LabeledSelect, Modal } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import {
  LOCALIZACIONES,
  LOCALIZACION_LABEL,
  MODOS_TOMA_DATOS,
  MODO_TOMA_DATOS_LABEL,
  type Competicion,
  type Equipo,
  type ModoTomaDatos,
  type Partido,
  type TipoLocalizacionPartido,
} from "@/lib/types";

export function NuevoPartidoModal({
  open,
  onClose,
  clubId,
  equipos,
  rivales,
  competiciones,
  onCompeticionCreada,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  clubId: string;
  equipos: Equipo[];
  rivales: Equipo[];
  competiciones: Competicion[];
  onCompeticionCreada: (c: Competicion) => void;
  onCreated: (partido: Partido) => void;
}) {
  const [equipoId, setEquipoId] = useState(equipos[0]?.id ?? "");
  const [rivalEquipoId, setRivalEquipoId] = useState("");
  const [rivalNombre, setRivalNombre] = useState("");
  const [competicionId, setCompeticionId] = useState("");
  const [modoTomaDatos, setModoTomaDatos] = useState<ModoTomaDatos>("EQUIPO_PROPIO");
  const [tipoLocalizacion, setTipoLocalizacion] =
    useState<TipoLocalizacionPartido>("LOCAL");
  const [pabellon, setPabellon] = useState("");
  const [fecha, setFecha] = useState("");
  const [notas, setNotas] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // El modal no se desmonta al cerrarse (el padre solo alterna `open`), así que
  // reseteamos el equipo por defecto al reabrir ajustando el estado durante el
  // render en vez de en un efecto (evita el patrón desaconsejado setState-en-efecto).
  const [openAnterior, setOpenAnterior] = useState(open);
  if (open !== openAnterior) {
    setOpenAnterior(open);
    if (open) setEquipoId((prev) => prev || equipos[0]?.id || "");
  }

  function elegirRival(id: string) {
    setRivalEquipoId(id);
    const rival = rivales.find((r) => r.id === id);
    if (rival) setRivalNombre(rival.nombre);
  }

  const scoutingSinRival = modoTomaDatos === "SCOUTING_COMPLETO" && !rivalEquipoId;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!equipoId || scoutingSinRival) return;
    setError(null);
    setSaving(true);
    try {
      const partido = await apiFetch<Partido>(`/clubes/${clubId}/partidos`, {
        method: "POST",
        token: getToken(),
        body: {
          equipo_id: equipoId,
          rival_equipo_id: rivalEquipoId || null,
          rival_nombre: rivalNombre,
          competicion_id: competicionId || null,
          modo_toma_datos: modoTomaDatos,
          tipo_localizacion: tipoLocalizacion,
          pabellon: pabellon || null,
          fecha_partido: fecha,
          notas: notas || null,
        },
      });
      setRivalEquipoId("");
      setRivalNombre("");
      setCompeticionId("");
      setPabellon("");
      setFecha("");
      setNotas("");
      onCreated(partido);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el partido");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nuevo partido">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <LabeledSelect
            label="Nuestro equipo"
            value={equipoId}
            onChange={setEquipoId}
            options={equipos.map((eq) => ({ value: eq.id, label: eq.nombre }))}
          />
          <LabeledSelect
            label="Localización"
            value={tipoLocalizacion}
            onChange={(v) => setTipoLocalizacion(v as TipoLocalizacionPartido)}
            options={LOCALIZACIONES.map((l) => ({
              value: l,
              label: LOCALIZACION_LABEL[l],
            }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <LabeledSelect
            label="Equipo rival (opcional)"
            value={rivalEquipoId}
            onChange={elegirRival}
            options={[
              { value: "", label: "Sin equipo rival registrado" },
              ...rivales.map((r) => ({ value: r.id, label: r.nombre })),
            ]}
          />
          <LabeledInput
            label="Nombre del rival"
            value={rivalNombre}
            onChange={setRivalNombre}
            placeholder="BM Norte"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <LabeledSelect
            label="Modo de toma de datos"
            value={modoTomaDatos}
            onChange={(v) => setModoTomaDatos(v as ModoTomaDatos)}
            options={MODOS_TOMA_DATOS.map((m) => ({
              value: m,
              label: MODO_TOMA_DATOS_LABEL[m],
            }))}
          />
          <LabeledInput
            label="Fecha y hora"
            type="datetime-local"
            value={fecha}
            onChange={setFecha}
            required
          />
        </div>
        {scoutingSinRival && (
          <ErrorMessage message="El scouting completo requiere seleccionar un equipo rival registrado." />
        )}

        <CompeticionField
          clubId={clubId}
          temporadaId={equipos.find((eq) => eq.id === equipoId)?.temporada_id ?? ""}
          competiciones={competiciones}
          value={competicionId}
          onChange={setCompeticionId}
          onCreated={onCompeticionCreada}
        />

        <LabeledInput
          label="Pabellón (opcional)"
          value={pabellon}
          onChange={setPabellon}
          placeholder="Pabellón Municipal"
        />
        <LabeledInput label="Notas (opcional)" value={notas} onChange={setNotas} />

        <ErrorMessage message={error} />

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving || !equipoId || scoutingSinRival}>
            {saving ? "Creando…" : "Crear partido"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function CompeticionField({
  clubId,
  temporadaId,
  competiciones,
  value,
  onChange,
  onCreated,
}: {
  clubId: string;
  temporadaId: string;
  competiciones: Competicion[];
  value: string;
  onChange: (v: string) => void;
  onCreated: (c: Competicion) => void;
}) {
  const [creando, setCreando] = useState(false);
  const [nombre, setNombre] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function crear() {
    if (!nombre.trim() || !temporadaId) return;
    setSaving(true);
    setError(null);
    try {
      const c = await apiFetch<Competicion>(`/clubes/${clubId}/competiciones`, {
        method: "POST",
        token: getToken(),
        body: { temporada_id: temporadaId, nombre },
      });
      onCreated(c);
      onChange(c.id);
      setNombre("");
      setCreando(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la competición");
    } finally {
      setSaving(false);
    }
  }

  if (creando) {
    return (
      <div className="space-y-2">
        <span className="mb-1.5 block text-sm font-medium text-ink">Nueva competición</span>
        <div className="flex gap-2">
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Liga Territorial"
            className="w-full rounded-xl border border-border bg-bg/60 px-4 py-2.5 text-ink outline-none placeholder:text-muted/60 focus:border-cyan"
          />
          <Button type="button" onClick={crear} disabled={saving || !nombre.trim()}>
            {saving ? "…" : "Añadir"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setCreando(false)}>
            ✕
          </Button>
        </div>
        <ErrorMessage message={error} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[1fr_auto] items-end gap-2">
      <LabeledSelect
        label="Competición (opcional)"
        value={value}
        onChange={onChange}
        options={[
          { value: "", label: "Sin competición" },
          ...competiciones.map((c) => ({ value: c.id, label: c.nombre })),
        ]}
      />
      <Button type="button" variant="ghost" onClick={() => setCreando(true)}>
        + Nueva
      </Button>
    </div>
  );
}
