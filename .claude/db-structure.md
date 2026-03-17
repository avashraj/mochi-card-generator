# Mochi Database Structure

**Path:** `~/Library/Application Support/mochi/mochi.db`
**Format:** PouchDB-over-SQLite (CouchDB-compatible, append-only with revision tracking)

---

## Tables

### `by-sequence` — Primary data store
The main table. Every document write appends a new row.

| Column | Type | Description |
|--------|------|-------------|
| `seq` | INTEGER PK AUTOINCREMENT | Monotonically increasing sequence number |
| `json` | TEXT | Transit-encoded JSON document |
| `deleted` | TINYINT(1) | 1 if document is deleted |
| `doc_id` | TEXT | Logical document ID (e.g. `3z8Y6qVX`) |
| `rev` | TEXT | Revision string (e.g. `1-<md5hash>`) |

### `document-store` — Document revision index
Tracks the winning revision and sequence for each document.

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT UNIQUE | Document ID |
| `json` | TEXT | Revision tree metadata |
| `winningseq` | INTEGER | `seq` of the current winning revision |
| `max_seq` | INTEGER UNIQUE | Highest `seq` seen for this doc |

### `by-sequence` indexes
- `by-seq-deleted-idx` on `(seq, deleted)`
- `by-seq-doc-id-rev` UNIQUE on `(doc_id, rev)`
- `doc-winningseq-idx` on `winningseq`

### `local-store` — Local PouchDB metadata
Stores PouchDB-internal state (dependent DBs, sync checkpoints).

| Column | Description |
|--------|-------------|
| `id` | Key |
| `rev` | Revision |
| `json` | Value JSON |

### `metadata-store` — Database version
| Column | Description |
|--------|-------------|
| `dbid` | UUID identifying this DB instance |
| `db_version` | PouchDB internal version (currently `7`) |

### `attach-store` / `attach-seq-store` — Attachments
Currently empty. Would store binary attachments keyed by digest.

---

## Document Types (in `by-sequence.json`)

All documents use **Transit JSON** encoding:
- `~:keyword` → Clojure keyword
- `~#dt` → timestamp (milliseconds since epoch, e.g. `{"~#dt": 1657804528639}`)
- `~#set` → set (e.g. `{"~#set": ["~:tag1"]}`)

### `card`
**IMPORTANT:** `transit-data` must come before `type` in the JSON object. Verified by diffing Mochi-written cards against externally-written ones.

```json
{
  "transit-data": {
    "~:updated-at": {"~#dt": 1657804528639},
    "~:tags": {"~#set": []},
    "~:content": "Front text\n---\nBack text",
    "~:name": "Front text",
    "~:deck-id": "~:3a2zyAgp",
    "~:cloze/indexes": {"~#set": []},
    "~:pos": "U",
    "~:references": {"~#set": []},
    "~:id": "~:3z8Y6qVX",
    "~:reviews": [],
    "~:created-at": {"~#dt": 1656957293168},
    "~:new?": false,
    "~:template-id": null
  },
  "type": "card"
}
```

**Content format:** `"Front\n---\nBack"` — no `##` heading prefix. For front-only cards, just `"Front text"`.

**`~:new?` must be `false`** — setting `true` causes cards to be invisible in Mochi's deck view.

### `deck`
```json
{
  "type": "deck",
  "transit-data": {
    "~:id": "~:3a2zyAgp",
    "~:name": "Flashcards",
    "~:sort": 1,
    "~:template-id": "~:Aa6XFZ2G",
    "~:show-sides?": true,
    "~:settings": {"~:show-sides?": true},
    "~:archived?": false
  }
}
```

### `template`
```json
{
  "type": "template",
  "transit-data": {
    "~:id": "~:Aa6XFZ2G",
    "~:name": "Basic Flashcard",
    "~:content": "## << Front >>\n---\n<< Back >>",
    "~:pos": "U",
    "~:fields": {
      "~:name": {"~:id": "~:name", "~:name": "Front", "~:pos": "a", "~:options": {"~:multi-line?": true}},
      "~:V72yjxYh": {"~:id": "~:V72yjxYh", "~:name": "Back", "~:pos": "m", "~:options": {"~:multi-line?": true}}
    },
    "~:style": {"~:text-alignment": "~:center"}
  }
}
```

---

## Known Deck & Template IDs

| ID | Type | Name |
|----|------|------|
| `3a2zyAgp` | deck | Flashcards (active, uses Basic Flashcard template) |
| `pE7ZVbYm` | deck | Notes (archived) |
| `Aa6XFZ2G` | template | Basic Flashcard (`Front` / `Back` fields) |

---

## Inserting a New Card

To add a card, two rows must be written:

1. **`by-sequence`** — append the new document with the next `seq`, a new `rev` (`1-<md5 of json>`), and `deleted=0`.
2. **`document-store`** — upsert the document's revision tree, `winningseq`, and `max_seq`.

### Card content format
The `~:content` field is Markdown. For a Basic Flashcard template:
```
## Front text
---
Back text
```

### ID generation
Document IDs are short random alphanumeric strings (e.g. `3z8Y6qVX`, 8 chars). Generate with any random base-62 scheme.

### Revision format
`<N>-<md5hex of json string>` where `N` starts at `1` for new documents.
