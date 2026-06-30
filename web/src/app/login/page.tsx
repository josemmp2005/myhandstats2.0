"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { apiFetch } from "@/lib/api";
import { setToken } from "@/lib/auth";
import { AuthShell, Field } from "@/components/auth-shell";

type TokenResponse = { access_token: string; token_type: string };

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await apiFetch<TokenResponse>("/auth/login", {
        method: "POST",
        body: { email, password },
      });
      setToken(data.access_token);
      router.push("/portal");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo iniciar sesión",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Bienvenido de nuevo"
      subtitle="Entra para gestionar tu club"
      footer={
        <>
          ¿No tienes cuenta?{" "}
          <Link href="/registro" className="font-medium text-cyan hover:underline">
            Crear cuenta
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
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
          placeholder="••••••••"
          autoComplete="current-password"
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
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </AuthShell>
  );
}
