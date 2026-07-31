const supportedHosts = new Map([
  ["www.mca.gov.in", "MCA"],
  ["services.gst.gov.in", "GST"],
  ["www.incometax.gov.in", "Income Tax"],
]);

chrome.runtime.onMessage.addListener((message, _sender, respond) => {
  if (message?.type !== "INSPECT_ACTIVE_PORTAL") return false;

  let parsed;
  try {
    parsed = new URL(message.url);
  } catch {
    respond({ ok: false, message: "Open a supported official portal page first." });
    return false;
  }

  const portal = supportedHosts.get(parsed.hostname);
  if (!portal || !message.tabId) {
    respond({ ok: false, message: "This is not an approved portal origin." });
    return false;
  }

  // Production adapters are deliberately disabled until each page contract,
  // permission, and evidence field is verified. Never fall back to broad DOM
  // scraping: it could capture credentials or taxpayer data.
  respond({
    ok: false,
    portal,
    message: `${portal} is recognised. Its read-only status adapter is awaiting verification.`,
  });
  return false;
});
