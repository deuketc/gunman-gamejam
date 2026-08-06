declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

// Safe no-op if gtag failed to load (ad blockers, offline dev, etc.) rather
// than throwing and interrupting whatever gameplay moment triggered it.
export function trackEvent(name: string, params?: Record<string, unknown>) {
  window.gtag?.("event", name, params);
}
