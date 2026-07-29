# Reg Mitra local companion

The companion runs on the CA's computer and talks to TallyPrime over its official
local HTTP interface. It binds only to `127.0.0.1`, requires a pairing token, and
allows requests only from approved Reg Mitra origins.

## Pilot setup

1. Install Node.js 20 or newer.
2. In this directory, run `npm start`.
3. Copy the one-time pairing token printed in the terminal.
4. In Reg Mitra → Settings → TallyPrime, paste the token and select **Check Tally**.
5. In TallyPrime, enable its HTTP server and keep the intended company loaded.
   Tally's documented default is port `9000`.

The current pilot performs a read-only company-list check. It does not import,
alter, or delete Tally data. The pairing token remains in the browser session and
is not uploaded to Reg Mitra.

Official reference:
https://help.tallysolutions.com/xml-integration/
