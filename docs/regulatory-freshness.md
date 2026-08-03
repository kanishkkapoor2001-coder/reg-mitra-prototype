# Regulatory freshness workflow

The assistant's structural advantage over general chatbots is a corpus that is
current to the notification, with explicit effective dates and supersession. This
document describes how that stays true.

## Daily monitor

```bash
npm run corpus:monitor
```

- Re-fetches every source in `data/regulatory/source-registry.json` (canonical +
  mirror URLs, browser-faithful headers).
- Compares the extracted text against the `officialTextHash` captured at the last
  `corpus:build`.
- Writes `data/regulatory/pending-changes.json` and prints changed / unreachable /
  unchanged. Exit code 2 when anything needs attention (cron/CI friendly).

**Detection is automated; classification is human.** For each changed source decide:

| Change | Registry action |
|---|---|
| Cosmetic page change | Nothing — rebuild refreshes the hash |
| Content amended | Update `seedText`/dates; consider `amends: [id]` edge |
| Superseded by a new document | Add the new source; give it `supersedes: [old-id]`; set old `status` |
| New relevant publication in an index | Add a new registry entry |

Then:

```bash
npm run corpus:build     # re-ingest + re-chunk + resolve supersession
npm run rag:evaluate     # retrieval regression (27 cases)
npm run eval:answers     # answer-level golden eval (needs dev server + gateway key)
```

## Answer-level golden eval

`npm run eval:answers` runs ~60 cases through the real `/api/chat` pipeline
(retrieval → rerank → prompt → stream → groundedness verification) and scores with
deterministic checks + a gateway LLM judge. Headline metrics: hallucination count
(non-zero fails), citation precision, refusal correctness. **Run it before shipping
any prompt, model, retrieval, or corpus change.** Cases live in
`data/regulatory/answer-evaluation.json` — add cases whenever a new source or a new
failure mode appears.

## Scheduling (suggested)

GitHub Action (or any cron) once a day:

```yaml
# .github/workflows/corpus-monitor.yml (sketch)
on:
  schedule: [{ cron: "30 2 * * *" }]   # 08:00 IST
jobs:
  monitor:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: sudo apt-get install -y poppler-utils   # pdftotext
      - run: npm ci && npm run corpus:monitor
      # non-zero exit -> failed run -> notification; review pending-changes.json
```

## Deterministic computations

Statutory arithmetic never runs in the model. `src/lib/tools/calculators.ts` holds
pure functions for interest under sections 234A/234B/234C and 201(1A), the section
234F fee, GST interest (section 50) and late fee (section 47), GST return due dates,
and the advance-tax schedule. Each returns its working, statutory basis and caveats.

Flow per question: `src/lib/tools/plan.ts` makes one fast gateway call with the tool
declarations, the model selects a calculator and extracts parameters, the code
computes, and the verified working is injected into the answer prompt. The prompt
forbids recomputation. If a parameter is missing, no function is called and the
assistant explains the method and asks for the fact — it never estimates.

Adding a calculator: write the pure function + tests in `calculators.ts`, declare it
in `registry.ts` (declaration + executor), and add a case to
`data/regulatory/answer-evaluation.json` under the `computation` category.

```bash
npm run tools:test      # 12 calculator unit tests
```

## Notice reading

`POST /api/notices/extract` accepts a PDF (≤10 MB) and returns structured fields —
authority, notice type, provision, DIN/reference, taxpayer, period, amounts, reply
due date and its basis, allegations. The file is held in memory for the request only
and is never written to disk or the database.

The extractor treats the document as **untrusted data** and is instructed never to
follow instructions found inside it. The professional then reviews and edits the
fields in the UI before attaching them; `sanitizeNotice` re-clamps every field
server-side, and `noticeAsContext` frames them as data, not instructions. An attached
notice also contributes its provision terms to the retrieval query.

## Known gaps

- **GST 2.0 rate notifications** (Notification 9/2025-CT(R) and companions,
  effective 22-09-2025) live on `taxinformation.cbic.gov.in`, which does not respond
  from the build network. Until ingested, the assistant refuses restructured-rate
  questions (eval case `gst20-rates-gap` enforces this). Revisit host reachability
  or add an official mirror.
- **FSSAI** deployed a JavaScript bot-challenge (2026-07-31); its five sources ride
  on last-known-good cached text (see build warnings). The monitor reports them
  unreachable until the challenge changes or an alternate official path is found.
- **CGST Act / Rules text is as-enacted (2017)** — later amendments (e.g. s.74A) are
  not in the page CBIC serves; seed summaries carry this caveat and the assistant is
  prompted to say when an amendment must be checked.
