# Connector implementation

## Product promise

Reg Mitra reports what is prepared, what an external system accepted, and what
that system currently reports. These are different facts and must never collapse
into a single user-controlled “done” checkbox.

## Architecture

```text
TallyPrime ──local HTTP──> Local companion ──normalized evidence──┐
                                                                 │
GST approved API/GSP ─────────────────────────────────────────────┤
                                                                 ├─> Connector service
Income Tax ERI API ───────────────────────────────────────────────┤      │
                                                                 │      ├─> append-only observations
MCA authenticated tab ──user click──> Browser bridge ────────────┘      ├─> source receipts
                                                                        └─> action truth
                                                                               │
                                                                               └─> client workspace
```

The language model receives only the normalized facts needed for an answer. It
does not receive a Tally database, a raw portal page, a password, an OTP, a
CAPTCHA, or the local pairing token.

## Implemented in the foundation

- Supabase tables for connector accounts, sync runs and append-only observations.
- Database checks that reject `submitted` without a receipt and
  `verified_complete` without source read-back.
- A deterministic action-state engine with freshness handling.
- A local Tally companion bound only to `127.0.0.1`.
- Pairing-token authentication and an explicit origin allowlist.
- A read-only Tally company-list health check using its official local HTTP
  interface.
- A Chrome Manifest V3 portal bridge with narrow official host permissions.
- Portal parsers fail closed until each adapter is verified.
- A settings experience that exposes health, safe connection routes and the
  action-truth progression.

## Integration decisions

### TallyPrime

Use the official local HTTP interface. The pilot reads the list of loaded
companies and records connector health. Transaction export is the next adapter;
write/import operations remain out of scope.

Official references:

- https://help.tallysolutions.com/xml-integration/
- https://help.tallysolutions.com/pre-requisites-for-integrations/
- https://help.tallysolutions.com/tally-prime-integration-using-json-1/

### GST

Use an approved GSTN/GSP or other authorized API relationship for production.
The portal's ARN is submission evidence; a later return-status read-back is
completion evidence. Browser automation is not the primary production route.

Official references:

- https://www.gstn.org.in/assets/mainDashboard/Pdf/Faq/Agreement_GSP_legal_standard_draft.pdf
- https://tutorial.gst.gov.in/userguide/returns/Manual_GSTR4.htm

### Income Tax

Use the Income Tax Department's ERI APIs. Client access requires consent. An
approved ERI integration is a commercial and operational prerequisite.

Official references:

- https://www.incometax.gov.in/iec/foportal/api-specifications
- https://www.incometax.gov.in/iec/foportal/servicesavailable

### MCA

Use a user-initiated bridge only for an allowlisted, tested status page. The
bridge never submits a form. The first release recognises the official origin but
has no active parser because a stable, permitted source contract has not yet been
established.

Official references:

- https://www.mca.gov.in/content/dam/mca/mca-forms-instruction-kit/Instruction%20Kit_Form%20No%20DIR%203%20KYC.pdf
- https://www.mca.gov.in/content/dam/mca/documents/WebsiteFAQ.pdf

## Reliability and safety

- Every observation has `observed_at`, `fresh_until`, connector version and an
  evidence hash.
- Old green states become `stale`; they are never silently preserved.
- Source observations are written only by trusted connector services.
- A browser user cannot manufacture a verified result.
- Connector errors use safe codes and never store raw credentials or pages.
- Irreversible actions require named professional approval and a separate
  submission service.

## Trade-offs

- Local Tally access preserves data control but requires a companion process on
  the CA's computer.
- Approved API programs take longer to establish but are more reliable and
  supportable than broad portal scraping.
- A browser bridge covers gaps but is fragile; it therefore stays read-only,
  user-initiated and adapter-specific.
- Append-only evidence costs more storage than mutable status rows but provides
  the audit history a professional product needs.

## Next production slice

1. Package and sign the local companion for macOS and Windows.
2. Add a consented Tally transaction adapter for invoice, accounting, due and
   payment dates.
3. Contract with a GSP and register the Income Tax ERI integration.
4. Validate one MCA Director KYC status adapter with test accounts and legal
   review.
5. Run the slice with one CA firm and one client before expanding scope.
