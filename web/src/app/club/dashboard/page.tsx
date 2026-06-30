"use client";

export default function ClubDashboardPage() {
  return (
    <>
      <header className="flex items-center justify-between border-b border-border px-6 py-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted">Resumen de tu club</p>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-6 p-6">
        {/* KPIs vacíos (placeholders) */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {["Equipos", "Jugadores", "Temporada activa", "Próximo partido"].map(
            (label) => (
              <div
                key={label}
                className="rounded-2xl border border-border bg-surface/60 p-5"
              >
                <p className="text-sm text-muted">{label}</p>
                <p className="mt-2 text-2xl font-semibold text-muted/40">—</p>
              </div>
            ),
          )}
        </div>

        {/* Empty state */}
        <div className="grid flex-1 place-items-center rounded-2xl border border-dashed border-border bg-surface/30 p-12 text-center">
          <div className="max-w-sm">
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-petrol-bright/20 text-xl">
              📊
            </div>
            <h2 className="text-lg font-semibold">Aún no hay datos</h2>
            <p className="mt-2 text-sm text-muted">
              Cuando empieces a crear equipos, jugadores y partidos, aquí verás
              el resumen de actividad de tu club.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
