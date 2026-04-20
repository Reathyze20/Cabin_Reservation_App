---
description: "Use when updating docs, checklists, PRDs, repo memory, or architecture notes. Covers canonical sources, memory hygiene, and how to keep documentation aligned with the live codebase."
applyTo: "docs/**/*.md, memories/**/*.md"
---

# Docs and Memory Hygiene

- Stable facts belong in concise repo memory shards; long reasoning belongs in docs.
- If a long-form doc and a short verified facts file disagree, update the long-form doc.
- Mark new canonical fact files with `Verified:` and `Scope:` near the top.
- Prefer updating existing operational docs instead of creating overlapping variants.
- Checklists should reflect current repo state, not aspirational state.