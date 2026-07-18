# Schema Drift Investigation

## Supabase client type

**File:** `web/lib/server/supabase.ts`

```ts
const supabaseKey = process.env.SUPABASE_SERVICE_KEY
export const db = createClient(supabaseUrl, supabaseKey)
```

Uses **service-role key** — every API route bypasses all RLS policies. RLS is only enforced when the extension queries Supabase directly via the anon key (through `SupabaseClient` in `src/infrastructure/supabase/`).

## Live schema vs schema.sql vs API routes

I queried the production Supabase instance (`https://ptyogubndwyanjaenmzy.supabase.co`) via REST and compared every table.

### projects

| schema.sql | API route (`projects/route.ts`) | Live DB |
|---|---|---|
| `id` | — | ✅ |
| `owner_id` | — | ✅ |
| `title` | — | ✅ |
| `base_url` | — | ✅ |
| `share_token` | — | ✅ |
| `created_at` | — | ✅ |
| — | `org_id` | ❌ column does not exist |
| — | `name` | ❌ column does not exist |
| — | `url` | ❌ column does not exist |

**Verdict:** schema.sql is live. The API route's GET filters by `org_id` and POST inserts `{ org_id, name, url }` — none of these columns exist. Querying them returns `"column projects.org_id does not exist"`.

### nikkels

| schema.sql | API route (`reviews/[reviewId]/nikkels/route.ts`) | Live DB |
|---|---|---|
| `id` | — | ✅ |
| `review_id` | `review_id` | ✅ |
| `owner_id` | — | ✅ (nullable, null by default) |
| `page_url` | `page_url` | ✅ |
| `dom_selector` | — | ✅ |
| `x` | — | ✅ |
| `y` | — | ✅ |
| `viewport_w` | — | ✅ |
| `viewport_h` | — | ✅ |
| `tag` | — | ✅ |
| `element_text` | `element_text` | ✅ |
| `comment` | — | ✅ |
| `idx` | — | ✅ |
| `created_at` | — | ✅ |
| — | `selector` | ❌ does not exist |
| — | `coord_x` | ❌ does not exist |
| — | `coord_y` | ❌ does not exist |
| — | `element_tag` | ❌ does not exist |
| — | `comment_text` | ❌ does not exist |
| — | `screenshot_url` | ❌ does not exist |
| — | `author_id` | ❌ does not exist |
| — | `author_name` | ❌ does not exist |

**Sample row from live DB:**

```json
{
  "id": "4900a0e4-...",
  "review_id": "79305915-...",
  "owner_id": null,
  "page_url": "https://example.com/",
  "dom_selector": "p",
  "x": 640,
  "y": 183,
  "viewport_w": 1646,
  "viewport_h": 860,
  "tag": "p",
  "element_text": "This domain is for use in...",
  "comment": "asdads",
  "idx": 1,
  "created_at": "2026-07-03T04:37:08.389151+00:00"
}
```

**Verdict:** schema.sql is live. The API route's POST inserts `{ selector, coord_x, coord_y, element_tag, comment_text, screenshot_url, author_id, author_name }` — none of these columns exist.

### reviews

| schema.sql | Live DB |
|---|---|
| `id` | ✅ |
| `project_id` | ✅ |
| `owner_id` | ✅ |
| `share_token` | ✅ |
| `visibility` | ✅ |
| `created_at` | ✅ |
| `shared_by_name` (ALTER TABLE) | ✅ |
| `shared_by_email` (ALTER TABLE) | ✅ |
| `shared_by_avatar` (ALTER TABLE) | ✅ |

**Verdict:** matches.

### profiles

| schema.sql | Live DB |
|---|---|
| `id` | ✅ |
| `name` | ✅ |
| `email` | ✅ |
| `avatar_url` | ✅ |
| `created_at` | ✅ |
| `updated_at` | ✅ |

**Verdict:** matches.

### replies

| schema.sql | Live DB |
|---|---|
| `id` | ✅ |
| `nikkel_id` | ✅ |
| `user_id` | ✅ |
| `author_name` | ✅ |
| `author_email` | ✅ |
| `body` | ✅ |
| `is_client` | ✅ |
| `created_at` | ✅ |
| `updated_at` | ✅ |

**Verdict:** matches.

## Root cause

Both broken routes were introduced in commit `9e68a7c` ("refactor: migrate backend from Railway to Vercel route handlers"), present on the `migrate/vercel-backend` branch and merged into `master`. The routes define column names from an older or different schema that was never applied to the live Supabase instance.

## Summary

- **`schema.sql` IS the live schema** — it accurately reflects production.
- **`web/app/api/projects/route.ts`** — completely broken (queries/inserts `org_id`, `name`, `url` which don't exist).
- **`web/app/api/reviews/[reviewId]/nikkels/route.ts`** — broken POST (inserts nonexistent columns), GET works because it selects `*` and `replies(*)` which do exist.
- **`web/lib/server/supabase.ts`** uses the **service-role key** — API routes bypass all RLS.
