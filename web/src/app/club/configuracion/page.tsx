"use client";

import { useEffect, useState } from "react";

import { Button, ErrorMessage, LabeledInput } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { useClub } from "@/lib/club-context";
import type { Club } from "@/lib/types";

export default function ConfiguracionPage() {
  const { club, role, loading: clubLoading, refresh } = useClub();
  const isAdmin = role === "GESTOR_CLUB";

  if (clubLoading) return null;

  if (!isAdmin) {
    return (
      <div className="grid flex-1 place-items-center p-12 text-center text-muted">
        <p className="max-w-sm text-sm">
          Solo el gestor del club puede editar la información del club.
        </p>
      </div>
    );
  }

  if (!club) return null;

  return (
    <>
      <header className="border-b border-border px-6 py-5">
        <h1 className="text-xl font-semibold tracking-tight">
          Configuración del club
        </h1>
        <p className="text-sm text-muted">{club.nombre}</p>
      </header>

      <div className="flex flex-1 flex-col gap-6 p-6">
        <ClubForm club={club} onSaved={refresh} />
      </div>
    </>
  );
}

function ClubForm({
  club,
  onSaved,
}: {
  club: Club;
  onSaved: () => Promise<void>;
}) {
  const [nombre, setNombre] = useState(club.nombre);
  const [slug, setSlug] = useState(club.slug);
  const [ciudad, setCiudad] = useState(club.ciudad ?? "");
  const [pais, setPais] = useState(club.pais ?? "");
  const [logoUrl, setLogoUrl] = useState(club.logo_url ?? "");
  const [colorPrimario, setColorPrimario] = useState(club.color_primario ?? "");
  const [colorSecundario, setColorSecundario] = useState(
    club.color_secundario ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // El club activo puede cambiar (selector de varios clubes): recarga el formulario.
  useEffect(() => {
    setNombre(club.nombre);
    setSlug(club.slug);
    setCiudad(club.ciudad ?? "");
    setPais(club.pais ?? "");
    setLogoUrl(club.logo_url ?? "");
    setColorPrimario(club.color_primario ?? "");
    setColorSecundario(club.color_secundario ?? "");
    setSaved(false);
  }, [club]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      await apiFetch(`/clubes/${club.id}`, {
        method: "PATCH",
        token: getToken(),
        body: {
          nombre,
          slug,
          ciudad: ciudad.trim() || null,
          pais: pais.trim() || null,
          logo_url: logoUrl.trim() || null,
          color_primario: colorPrimario.trim() || null,
          color_secundario: colorSecundario.trim() || null,
        },
      });
      await onSaved();
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="max-w-xl space-y-4 rounded-2xl border border-border bg-surface/50 p-6"
    >
      <LabeledInput label="Nombre" value={nombre} onChange={setNombre} required />
      <LabeledInput
        label="Slug"
        value={slug}
        onChange={setSlug}
        placeholder="mi-club"
        required
      />
      <div className="grid grid-cols-2 gap-3">
        <LabeledInput label="Ciudad" value={ciudad} onChange={setCiudad} />
        <LabeledInput label="País" value={pais} onChange={setPais} />
      </div>
      <LabeledInput
        label="Logo (URL)"
        value={logoUrl}
        onChange={setLogoUrl}
        placeholder="https://…"
      />
      <div className="grid grid-cols-2 gap-3">
        <ColorInput
          label="Color primario"
          value={colorPrimario}
          onChange={setColorPrimario}
        />
        <ColorInput
          label="Color secundario"
          value={colorSecundario}
          onChange={setColorSecundario}
        />
      </div>

      <ErrorMessage message={error} />
      {saved && !error && (
        <p className="text-sm text-lime">Cambios guardados.</p>
      )}

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const isValidHex = /^#[0-9a-fA-F]{6}$/.test(value);
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      <div className="flex items-center gap-2">
        <span
          className="h-9 w-9 shrink-0 rounded-lg border border-border"
          style={{ backgroundColor: isValidHex ? value : "transparent" }}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#0F2A3D"
          className="w-full rounded-xl border border-border bg-bg/60 px-4 py-2.5 text-ink outline-none transition placeholder:text-muted/60 focus:border-cyan focus:ring-2 focus:ring-cyan/30"
        />
      </div>
    </label>
  );
}
