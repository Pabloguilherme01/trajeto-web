export function isStandaloneApp() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

export async function shareText(text: string, url: string, title = "Trajeto") {
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    await navigator.share({ title, text, url });
    return;
  }

  if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    await navigator.clipboard.writeText(text + "\n" + url);
    return;
  }

  throw new Error("Compartilhamento indisponível neste navegador.");
}

export function openNavigation(lat: number, lng: number, label?: string) {
  const encoded = encodeURIComponent(label ?? (lat + "," + lng));
  const google = "https://www.google.com/maps/dir/?api=1&destination=" + lat + "," + lng + "&travelmode=driving";
  const waze = "https://www.waze.com/ul?ll=" + lat + "%2C" + lng + "&navigate=yes&zoom=17&q=" + encoded;
  return { google, waze };
}

export function vibration(pattern: number | number[] = 12) {
  try { navigator.vibrate?.(pattern); } catch {}
}
