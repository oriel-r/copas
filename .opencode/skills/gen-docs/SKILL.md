---
description: >-
  Scaffold new atomic documentation files in the copas repo via `pnpm gen doc`.
  Use when the user wants to create or add a doc, mentions scaffolding a
  markdown file, or asks for a concept/decision/convention/roadmap/meta/raw_data/media_script
  document; also fires when another skill needs a new doc scaffolded.
---

# gen-docs

Scaffold a new atomic documentation file in the copas repo using the
`doc` generator defined in `plopfile.ts` (the `pnpm gen doc` script). The
generator writes `generator/doc/template.hbs` to `<title>.md` with standardized
frontmatter and a heading. Run it non-interactively so it never hangs on a
prompt — pass every answer on the command line.

Documents are **atomic**: one concept, decision, convention, roadmap, or raw
record per file. A document answers exactly the question its `type` denotes —
nothing more.

## Steps

### 1. Resolve the five fields

The `doc` generator has five prompts in this fixed order (see `plopfile.ts`):
`title`, `type`, `producer`, `status`, `expires`. Resolve every one before
running anything.

- `title` — the file path relative to repo root, **without** the `.md`
  extension, in `snake_case`. Choose the top directory by domain
  ([`meta/domains.md`](/meta/domains.md)): `docs/` for business documentation,
  `code/` for implementation-tied technical docs, `scripts/` for audiovisual
  content scripts. Examples: `docs/decisions/use_tailwind`,
  `code/packages/ui/api_usage`, `scripts/reels/launch`.
- `type` — one of the seven below, chosen by the question the document
  answers ([`meta/types.md`](/meta/types.md) for full semantics).
- `producer` — author.
  - **Agent-authored** (this skill fired on its own, or another skill did):
    `agent/<model>`, where `<model>` is the last path segment of the model id
    you are running as, in a human-legible form (e.g. from `nvidia/z-ai/glm-5.2`
    → `agent/glm-5.2`). Detect the model in runtime — never hardcode it.
  - **Human-authored** (the human asked for the doc directly): `oriel`.
- `status` — `draft` by default. The generator only accepts `draft` or
  `active`; pick `draft` for new scaffolds.
- `expires` — ISO `YYYY-MM-DD` optional. Empty unless the user gives one.

**Done when**: all five fields are resolved, each as one of the values above,
and none is left to be answered interactively.

### 2. Run the generator in bypass mode

Pass all five answers by position, in the order above, so plop never opens a
prompt. Empty strings for unset fields.

```
pnpm gen doc "<title>" "<type>" "<producer>" "<status>" "<expires>"
```

Run it from the repo root. Quotes protect paths with slashes and spaces.

**Done when**: the command exits without hanging and `<title>.md` exists at the
resolved path.

### 3. Verify the scaffold

Open `<title>.md`. Confirm:

- Frontmatter is present and has all nine fields: `type`, `producer`, `status`,
  `created`, `updated`, `expires`, `deprecatedReason`, `supersededBy` (the four
  not supplied by the prompt come from `template.hbs`).
- The `# heading` is the last `_`-segment of `title` with underscores turned
  to spaces, title-cased (e.g. `docs/decisions/use_tailwind` → `# Use Tailwind`).
- `created` is an ISO timestamp set by the generator.

**Done when**: the file exists with valid frontmatter and a heading matching the
last segment of `title`. If anything is off, stop — the scaffold is broken, do
not paper over it.

### 4. Draft the atomic body

Under the `# heading`, write the document's body. Keep it **atomic**: one
concept, decision, convention, roadmap, or raw record — never an aggregate. A
document should answer the question its `type` poses (see `meta/types.md`) and
no other.

- **What is determined**, write it. Conventions, decisions, definitions, raw
  data — whatever the `type` calls for, filled from what the user gave you or
  from the repo.
- **What is not determined**, leave **explicitly as a question inside the
  file**, never invented, never omitted. Mark it so a human reader sees what is
  open, e.g.:
  ```
  <!-- TODO: what dependencies does this decision introduce? -->
  ```
  A question-in-file is the record that the work is open; a blank or vague body
  hides the gap.

If you edited the body, set `updated:` to today's ISO date (`YYYY-MM-DD`).
`created:` stays as the generator set it.

**Done when**: the body under the heading either answers the document's
`type`-question, or marks each unresolved point with an explicit question —
never empty, never a vague placeholder, never invented content.

## Reference

### `type` — the seven values

Each type answers a specific question (`meta/types.md` for the source of
truth).

| Value          | Answers             |
|----------------|---------------------|
| `concept`      | What is X?          |
| `decision`     | Why do we do X?     |
| `convention`   | How do we do X?     |
| `roadmap`      | Where are we going? |
| `raw_data`     | Raw, unprocessed business data |
| `media_script` | Scripts for audiovisual content |
| `meta`         | Documentation about the documentation system itself |

### `status` — lifecycle

The generator prompt accepts `draft` or `active`. The full lifecycle
(`draft` → `active` → `deprecated`/`superseded`/`archived`) lives in
[`meta/lifecycle.md`](/meta/lifecycle.md). New scaffolds start at `draft`.

### Frontmatter fields

See [`meta/template.md`](/meta/template.md) for the authoritative field table.
Terminal states (`deprecated`, `superseded`) require `deprecatedReason`, and
`superseded` also requires `supersededBy` — but a freshly scaffolded document is
always `draft`, so those stay empty strings.
