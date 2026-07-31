# Reg Mitra regulatory retrieval

## What this is

Reg Mitra uses retrieval-augmented generation, not fine-tuning, for regulatory research.
The language model receives only the highest-ranked official evidence for each question and
is instructed to cite that evidence inline. The interface then displays the exact sources,
applicability, dates, status and citation coverage for professional review.

This distinction matters: circulars change. Baking old circulars into model weights would make
freshness, supersession and auditability harder to control. Retrieval keeps the source corpus
versioned and inspectable.

## Current vertical slice

- 20 registered official sources across CBDT, Income Tax, CBIC, GSTN, ICAI, SEBI and EPFO.
- 166 searchable chunks.
- 14 sources ingested as official full text.
- 6 sources retained as clearly labeled verified summaries because the publisher blocked or
  removed the automated-download URL.
- 134 full-text or summary chunks embedded with `gemini-embedding-2` at 768 dimensions.
- Official index pages remain lexical-only and are not treated as substantive proof.

The registry lives in `data/regulatory/source-registry.json`. The generated, versioned search
artifact lives in `data/regulatory/corpus.json`.

## Retrieval pipeline

1. The latest user question plus up to two user follow-ups form the retrieval query.
2. The query receives a semantic embedding when the embedding service is available.
3. BM25-style lexical scoring finds exact forms, sections, circular numbers and domain terms.
4. Semantic similarity finds conceptually related passages.
5. Metadata ranking boosts the expected authority, exact circular number, active status and
   direct full text.
6. Historical, superseded and index-only material is demoted for current-law questions.
7. Results are grouped by source so one long PDF cannot crowd out every other authority.
8. The top evidence is labeled `[S1]`, `[S2]`, and so on and supplied to the answer model.
9. The response is checked to ensure every citation identifier exists in the retrieved set.
10. The product shows a citation-coverage state instead of silently presenting unsupported prose.

Semantic retrieval is an enhancement, not a single point of failure. If query embedding fails,
the same route falls back to the lexical and metadata ranker.

## Answer contract

The model may not use its general memory as authority for a current regulatory proposition.
Every rule, deadline, form, threshold, authority, exception or legal consequence must end with
one or more supplied citations. If the evidence is insufficient, the answer must say what is
missing instead of completing the gap from memory.

The UI distinguishes:

- `active`: potentially current, still subject to applicability review;
- `historical`: time-bound or expired relief retained for period-specific research;
- `superseded`: replaced material, never preferred for a current-law answer;
- `index`: discovery/freshness evidence, not substantive legal support.

## Local corpus operations

```bash
npm run corpus:build
npm run corpus:embed
npm run corpus:check
npm run rag:test
```

The build job downloads allow-listed official domains, extracts PDFs with `pdftotext`, strips
HTML, chunks the text, hashes every chunk, and preserves existing embeddings when the content
hash has not changed. The embedding job is resumable and checkpoints after each batch.

`GET /api/corpus/health` returns source, chunk, full-text, authority and embedding coverage
without exposing document content or credentials.

## Production expansion required

This repository now contains a working, auditable vertical slice. It does **not** yet claim every
Indian circular ever published.

Before selling “complete and continuously current” coverage:

- add regulator-specific discovery adapters for every in-scope archive and current index;
- store raw immutable files and checksums in private object storage;
- use a persistent database/vector index rather than a checked-in JSON search artifact;
- run scheduled discovery at least daily, with faster polling for high-priority authorities;
- detect amendment, rescission and supersession relationships;
- send ingestion failures and source-layout changes to an operations queue;
- require a named domain reviewer for material metadata changes;
- maintain retrieval golden sets for common CA questions and period-specific edge cases;
- show an explicit corpus cut-off time in every production answer;
- add tenant permissions, query audit logs, retention controls and protected client context.

The source registry and retrieval contracts in this vertical slice are designed so those storage
and scheduler layers can replace the local artifact without changing the chat evidence UX.
