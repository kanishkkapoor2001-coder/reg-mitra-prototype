# Reg Mitra Portal Bridge

This Manifest V3 extension is the security boundary for user-initiated portal
read-back. It requests access only to MCA, GST and Income Tax official origins.

The first checked-in version recognises approved origins but intentionally ships
with all status parsers disabled. An adapter can be enabled only after:

1. its official integration or portal terms are reviewed;
2. the exact status fields and freshness policy are documented;
3. test fixtures cover layout changes and failure states;
4. the adapter proves it cannot read input, password, OTP or CAPTCHA fields;
5. Reg Mitra stores only normalized evidence and a hash—not the raw page.

The extension must never submit a form or silently run on every page.
