import type { ReactNode } from "react";

import { ClubProvider } from "@/lib/club-context";

/**
 * Layout de Live Stats: solo el ClubProvider (acceso a club/rol), sin el
 * ClubShell oscuro del panel de gestión. Live Stats tiene su propio tema
 * claro y su propio layout de pantalla completa (ver mockups).
 */
export default function LiveLayout({ children }: { children: ReactNode }) {
  return (
    <ClubProvider>
      <div className="min-h-screen bg-slate-50 text-slate-900">{children}</div>
    </ClubProvider>
  );
}
