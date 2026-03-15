# MongoDB Vector Index Setup

Create a **Vector Search** index on the `chunks` collection.

**Atlas UI:** Database → Collections → `shreechem.chunks` → Search Indexes → Create Index

**Index Definition (JSON):**

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 3072,
      "similarity": "cosine"
    }
  ]
}
```

**Index name:** `vector_index`

> `text-embedding-001` (Gemini API) = 3072 dims.
