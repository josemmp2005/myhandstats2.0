import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="flex flex-1 flex-col">
      {/* Top bar */}
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <span className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-petrol-bright text-sm font-bold text-bg">
            MH
          </span>
          MyHandStats
        </span>
        <nav className="flex items-center gap-3 text-sm">
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 text-muted transition hover:text-ink"
          >
            Entrar
          </Link>
          <Link
            href="/registro"
            className="rounded-lg bg-cyan px-4 py-2 font-medium text-bg transition hover:opacity-90"
          >
            Crear cuenta
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-6 py-20 text-center">
        <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-4 py-1.5 text-xs font-medium text-cyan">
          <span className="h-1.5 w-1.5 rounded-full bg-lime" />
          Balonmano · análisis táctico en tiempo real
        </span>

        <h1 className="max-w-3xl text-balance text-5xl font-bold leading-tight tracking-tight sm:text-6xl">
          El control total de tu club,
          <span className="bg-gradient-to-r from-cyan to-petrol-bright bg-clip-text text-transparent">
            {" "}
            jugada a jugada
          </span>
        </h1>

        <p className="mt-6 max-w-xl text-pretty text-lg text-muted">
          Gestiona equipos, jugadores y temporadas, y toma estadísticas en
          directo desde la grada. Todo en una sola plataforma.
        </p>

        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/registro"
            className="w-full rounded-xl bg-cyan px-8 py-3.5 text-center font-semibold text-bg transition hover:opacity-90 sm:w-auto"
          >
            Empezar gratis
          </Link>
          <Link
            href="/login"
            className="w-full rounded-xl border border-border bg-surface/60 px-8 py-3.5 text-center font-semibold text-ink transition hover:bg-surface-2 sm:w-auto"
          >
            Ya tengo cuenta
          </Link>
        </div>
      </section>

      <footer className="mx-auto w-full max-w-6xl px-6 py-8 text-center text-sm text-muted">
        © {new Date().getFullYear()} MyHandStats · MVP
      </footer>
    </main>
  );
}
