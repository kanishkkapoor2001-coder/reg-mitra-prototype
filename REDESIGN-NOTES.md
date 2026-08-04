# Redesign notes

## N-001 — Mobile shell is not responsive

Found in Phase 0. At 390×844, the fixed 240px sidebar remains fully visible and
leaves roughly 150px for content. Home, Clients, Assistant, and the Sharma
workspace all become functionally unusable; text collapses into vertical
columns and controls overflow. There is no compact/mobile navigation
replacement.

Evidence:

- `docs/redesign/baseline/mobile/home-390x844.png`
- `docs/redesign/baseline/mobile/clients-390x844.png`
- `docs/redesign/baseline/mobile/assistant-390x844.png`
- `docs/redesign/baseline/mobile/sharma-workspace-390x844.png`

Deferred because Phase 0 permits documentation only. Must be addressed as a
shell prerequisite before accepting any later mobile visual phase.
