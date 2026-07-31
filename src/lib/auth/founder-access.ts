import { createHash, timingSafeEqual } from "node:crypto";

function normalizeCode(value: string | null | undefined) {
  return value?.trim().toUpperCase() ?? "";
}

export function getFounderAccessEmails(
  configuredEmails = process.env.FOUNDER_ACCESS_EMAILS,
) {
  return (configuredEmails ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isValidFounderAccessCode(
  submittedCode: string | null | undefined,
  configuredCode = process.env.FOUNDER_ACCESS_CODE,
) {
  const submitted = normalizeCode(submittedCode);
  const configured = normalizeCode(configuredCode);
  if (!submitted || !configured) return false;

  const submittedDigest = createHash("sha256").update(submitted).digest();
  const configuredDigest = createHash("sha256").update(configured).digest();
  return timingSafeEqual(submittedDigest, configuredDigest);
}
