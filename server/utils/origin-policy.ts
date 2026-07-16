export function parseAllowedOrigins(value: unknown) {
  if (typeof value !== "string") return [];
  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function getRequestOrigin(origin: string | undefined, referer: string | undefined) {
  const value = origin ?? referer;
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function parseWildcardOrigin(value: string): { protocol?: string; domain: string } | null {
  if (value.startsWith("*.")) return { domain: value.slice(2) };

  const match = /^([a-z][a-z\d+.-]*:)\/\/\*\.(.+)$/i.exec(value);
  if (!match?.[1] || !match[2]) return null;
  return { protocol: match[1].toLowerCase(), domain: match[2] };
}

export function isOriginAllowed(requestOrigin: string, allowedOrigins: readonly string[]) {
  if (allowedOrigins.includes("*")) return true;

  let url: URL;
  try {
    url = new URL(requestOrigin);
  } catch {
    return false;
  }

  return allowedOrigins.some((allowed) => {
    const wildcard = parseWildcardOrigin(allowed);
    if (wildcard) {
      if (wildcard.protocol && url.protocol !== wildcard.protocol) return false;
      return url.hostname === wildcard.domain || url.hostname.endsWith(`.${wildcard.domain}`);
    }

    try {
      return url.origin === new URL(allowed).origin;
    } catch {
      return false;
    }
  });
}
