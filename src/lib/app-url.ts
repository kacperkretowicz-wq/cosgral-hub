/** Publiczny URL aplikacji — używany w linkach dla klientów. */
export function getAppBaseUrl(request?: Request): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");

  if (configured && !configured.includes("localhost") && !configured.includes("127.0.0.1")) {
    return configured;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  if (request) {
    const host =
      request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    const proto = request.headers.get("x-forwarded-proto") ?? "https";
    if (host && !host.includes("localhost") && !host.includes("127.0.0.1")) {
      return `${proto}://${host}`;
    }
  }

  return configured ?? "http://127.0.0.1:3000";
}

export function getOfferUrl(token: string, request?: Request): string {
  return `${getAppBaseUrl(request)}/o/${token}`;
}

export function getMaterialsUrl(token: string, request?: Request): string {
  return `${getAppBaseUrl(request)}/o/${token}/materialy`;
}

export function isLocalUrl(url: string): boolean {
  return url.includes("localhost") || url.includes("127.0.0.1");
}
