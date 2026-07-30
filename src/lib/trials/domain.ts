const publicEmailDomains = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "icloud.com",
  "me.com",
  "yahoo.com",
  "proton.me",
  "protonmail.com",
]);

export function normalizeEmail(value: string): string | null {
  const email = value.trim().toLowerCase();
  if (
    email.length < 3
    || email.length > 254
    || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) return null;
  return email;
}

export function emailDomain(email: string): string | null {
  const normalized = normalizeEmail(email);
  return normalized?.split("@")[1] ?? null;
}

export function normalizeOrganizationDomain(value: string): string | null {
  const raw = value.trim().toLowerCase();
  if (!raw || raw.length > 253) return null;

  let hostname: string;
  try {
    hostname = new URL(raw.includes("://") ? raw : `https://${raw}`).hostname;
  } catch {
    return null;
  }

  hostname = hostname.replace(/^www\./, "").replace(/\.$/, "");
  if (
    hostname.length < 3
    || hostname.length > 253
    || !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(hostname)
  ) return null;
  return hostname;
}

export function resolveOrganizationDomain(
  email: string,
  suppliedDomain: string,
): { domain: string | null; reason?: "invalid_email" | "organization_required" | "domain_mismatch" } {
  const workEmailDomain = emailDomain(email);
  if (!workEmailDomain) return { domain: null, reason: "invalid_email" };

  const explicitDomain = suppliedDomain.trim()
    ? normalizeOrganizationDomain(suppliedDomain)
    : null;

  if (suppliedDomain.trim() && !explicitDomain) {
    return { domain: null, reason: "organization_required" };
  }

  if (publicEmailDomains.has(workEmailDomain)) {
    return explicitDomain
      ? { domain: explicitDomain }
      : { domain: null, reason: "organization_required" };
  }

  if (explicitDomain && explicitDomain !== workEmailDomain) {
    return { domain: null, reason: "domain_mismatch" };
  }

  return { domain: workEmailDomain };
}

export function isPublicEmailDomain(domain: string): boolean {
  return publicEmailDomains.has(domain.toLowerCase());
}
