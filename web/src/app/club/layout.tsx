import type { ReactNode } from "react";

import { ClubShell } from "@/components/club-shell";
import { ClubProvider } from "@/lib/club-context";

export default function ClubLayout({ children }: { children: ReactNode }) {
  return (
    <ClubProvider>
      <ClubShell>{children}</ClubShell>
    </ClubProvider>
  );
}
