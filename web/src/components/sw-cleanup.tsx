"use client";

import { useEffect } from "react";

/**
 * MyHandStats no usa Service Workers. Si el origen (localhost:PORT) tiene uno
 * registrado por una app anterior, intercepta la navegación y sirve contenido
 * cacheado obsoleto. Este guard lo desregistra y limpia sus cachés al cargar.
 */
export function SwCleanup() {
  useEffect(() => {
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => regs.forEach((r) => r.unregister()))
        .catch(() => {});
    }
    if (typeof caches !== "undefined") {
      caches
        .keys()
        .then((keys) => keys.forEach((k) => caches.delete(k)))
        .catch(() => {});
    }
  }, []);

  return null;
}
