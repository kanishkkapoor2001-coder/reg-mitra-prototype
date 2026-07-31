import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";

const VERSION = "0.1.0";
const HOST = "127.0.0.1";
const PORT = Number(process.env.REGMITRA_COMPANION_PORT ?? 47831);
const TALLY_URL = process.env.REGMITRA_TALLY_URL ?? "http://127.0.0.1:9000";
const pairingToken = process.env.REGMITRA_PAIRING_TOKEN ?? randomBytes(24).toString("base64url");
const allowedOrigins = new Set(
  (process.env.REGMITRA_ALLOWED_ORIGINS
    ?? "https://reg-mitra-migration.vercel.app,http://127.0.0.1:4190,http://localhost:4190")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);

if (!Number.isInteger(PORT) || PORT < 1024 || PORT > 65535) {
  throw new Error("REGMITRA_COMPANION_PORT must be a valid non-privileged port.");
}

const listCompaniesRequest = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>DATA</TYPE>
    <ID>List of Companies</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
    </DESC>
  </BODY>
</ENVELOPE>`;

function originHeaders(origin) {
  if (!origin || !allowedOrigins.has(origin)) return null;
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Private-Network": "true",
    "Cache-Control": "no-store",
    "Vary": "Origin",
  };
}

function sendJson(response, status, body, headers = {}) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
    ...headers,
  });
  response.end(JSON.stringify(body));
}

function tokenMatches(header) {
  const supplied = header?.startsWith("Bearer ") ? header.slice(7) : "";
  const suppliedHash = createHash("sha256").update(supplied).digest();
  const expectedHash = createHash("sha256").update(pairingToken).digest();
  return timingSafeEqual(suppliedHash, expectedHash);
}

function extractCompanyNames(xml) {
  const names = [];
  const matcher = /<(?:NAME|COMPANYNAME)(?:\s[^>]*)?>(?:<!\[CDATA\[)?([^<\]]+)(?:\]\]>)?<\/(?:NAME|COMPANYNAME)>/gi;
  for (const match of xml.matchAll(matcher)) {
    const name = match[1]?.trim();
    if (name && !names.includes(name)) names.push(name);
    if (names.length >= 50) break;
  }
  return names;
}

async function checkTally() {
  const result = await fetch(TALLY_URL, {
    method: "POST",
    headers: { "Content-Type": "text/xml; charset=utf-8" },
    body: listCompaniesRequest,
    signal: AbortSignal.timeout(5_000),
  });
  if (!result.ok) throw new Error(`tally_http_${result.status}`);
  const xml = await result.text();
  if (!xml.includes("<ENVELOPE")) throw new Error("tally_response_invalid");
  const companies = extractCompanyNames(xml);
  return {
    available: true,
    companies,
    companyCount: companies.length,
    responseFingerprint: createHash("sha256").update(xml).digest("hex"),
  };
}

const server = createServer(async (request, response) => {
  const origin = request.headers.origin;
  const cors = originHeaders(origin);

  if (origin && !cors) {
    return sendJson(response, 403, { error: "origin_not_allowed" });
  }
  if (request.method === "OPTIONS") {
    response.writeHead(204, cors ?? {});
    return response.end();
  }
  if (request.url === "/v1/health" && request.method === "GET") {
    return sendJson(response, 200, {
      service: "reg-mitra-local-companion",
      version: VERSION,
      ready: true,
    }, cors ?? {});
  }
  if (!tokenMatches(request.headers.authorization)) {
    return sendJson(response, 401, { error: "pairing_required" }, cors ?? {});
  }
  if (request.url === "/v1/tally/status" && request.method === "POST") {
    try {
      const status = await checkTally();
      return sendJson(response, 200, {
        ...status,
        connectorVersion: VERSION,
        mode: "read_only",
      }, cors ?? {});
    } catch (error) {
      const safeCode = error instanceof Error && /^[a-z0-9_]+$/i.test(error.message)
        ? error.message
        : "tally_unavailable";
      return sendJson(response, 503, {
        available: false,
        error: safeCode,
        connectorVersion: VERSION,
      }, cors ?? {});
    }
  }

  return sendJson(response, 404, { error: "not_found" }, cors ?? {});
});

server.listen(PORT, HOST, () => {
  console.log(`Reg Mitra local companion ${VERSION}`);
  console.log(`Listening only on http://${HOST}:${PORT}`);
  console.log(`Pairing token: ${pairingToken}`);
  console.log("No passwords, OTPs, CAPTCHAs, or raw portal pages are collected.");
});
