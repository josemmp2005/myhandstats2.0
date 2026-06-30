"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { apiFetch } from "@/lib/api";
import { setToken } from "@/lib/auth";
import { AuthShell, Field } from "@/components/auth-shell";

type TokenResponse = { access_token: string; token_type: string };

export default function RegistroPage() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // 1) Crear usuario
      await apiFetch("/usuarios", {
        method: "POST",
        body: { nombre, apellidos: apellidos || null, email, password },
      });
      // 2) Auto-login
      const data = await apiFetch<TokenResponse>("/auth/login", {
        method: "POST",
        body: { email, password },
      });
      setToken(data.access_token);
      router.push("/portal");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo crear la cuenta",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Crea tu cuenta"
      subtitle="Empieza a gestionar tu club en minutos"
      footer={
        <>
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-medium text-cyan hover:underline">
            Entrar
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nombre" value={nombre} onChange={setNombre} placeholder="Juan" />
          <Field
            label="Apellidos"
            value={apellidos}
            onChange={setApellidos}
            placeholder="García"
          />
        </div>
        <Field
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="tu@email.com"
          autoComplete="email"
        />
        <Field
          label="Contraseña"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="Mínimo 8 caracteres"
          autoComplete="new-password"
        />

        {error && (
          <p className="rounded-lg border border-coral/40 bg-coral/10 px-3 py-2 text-sm text-coral">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-cyan px-4 py-3 font-semibold text-bg transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Creando cuenta…" : "Crear cuenta"}
        </button>
      </form>
    </AuthShell>
  );
}
