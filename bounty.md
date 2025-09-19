# Mini PRD — Bounty.directory: fetch + ISR + Redis + Postgres + Drizzle + per-user webhook alerts

Short summary: build a background fetcher that discovers GitHub issues labeled `💎 Bounty` (global search), upserts canonical rows into Postgres (Neon), keeps Redis as the fast snapshot cache & notification dedupe, exposes precomputed JSON snapshots to Vercel/Next.js (served via ISR/Cached API), and provides a logged-in user settings page where users can register GitHub repo webhooks (or repo patterns) and enable Discord alerts or email on new bounty issues.

---

## Goals

1. Keep site data fresh **hourly** and cheaply serve to 30k visitors via CDN/ISR.
2. Persist canonical data in Postgres for queries, history, and admin.
3. Use Redis for hot snapshots and dedupe/coordination.
4. Allow users to subscribe to webhook-style alerts from repos or catch-all searches, and deliver alerts (Discord, email, webhook) when new matching issues appear.
5. Secure, auditable, and easy to extend.

---

## High-level architecture

* **Hourly Fetcher (worker)**

  * Poll GitHub Search API: `label:"💎 Bounty" state:open created:>=<30d>` (per\_page=100), use `If-None-Match` ETags, stop paging on cutoff.
  * Upsert found issues into **Neon (Postgres)**.
  * Refresh materialized views or run snapshot queries.
  * Publish JSON snapshots to **Redis** (`snapshots:latest`, `snapshots:top100`) with TTL=3600.
  * Diff against `bounty:notified` Redis set → push alerts to user subscriptions and mark notified.

* **Vercel Next.js frontend**

  * Public pages fetch snapshot via `/api/snapshots/latest` (reads Redis; fallback to Postgres matview).
  * Use ISR/Edge cache headers: `Cache-Control: public, max-age=60, stale-while-revalidate=300`, `ETag`.
  * Settings page (authenticated) to manage subscriptions / webhooks.

* **Redis (Upstash or managed Redis)**

  * `snapshots:latest` (JSON), `bounty:notified` (SET), `ratelimit:*`, per-user subscription queues.

* **Postgres (Neon)**

  * Canonical `issues` table + materialized views for precomputed payloads.

* **Notifier**

  * Worker sends to Discord webhooks, user-provided webhook URLs, or email via provider.

---

## Data & keys

### Redis keys

* `snapshots:latest` → JSON payload (TTL 3600)
* `snapshots:top100` → JSON payload (TTL 3600)
* `bounty:notified` → SET of `gh:<issue_id>` (expire 30d)
* `user:subscriptions:<user_id>` → SET or HASH (stores subscription objects)
* `ratelimit:remaining` / `ratelimit:reset` → monitoring values

### Postgres tables (Drizzle schemas below)

* `issues` — canonical issue data (one row per GitHub issue.id)
* `users` — auth users (Vercel + OAuth)
* `subscriptions` — per-user subscription rules (repo OR query, delivery method, active flag)
* `notifications` — event history (audit: which user got which alert + status)

---

## Drizzle schema (TypeScript)

```ts
// db/schema.ts
import { pgTable, serial, text, bigint, timestamp, jsonb, integer, boolean } from "drizzle-orm/pg-core";

export const issues = pgTable("issues", {
  id: bigint("id").primaryKey(),
  repo: text("repo").notNull(),
  number: integer("number").notNull(),
  title: text("title"),
  body: text("body"),
  html_url: text("html_url"),
  user_login: text("user_login"),
  created_at: timestamp("created_at"),
  updated_at: timestamp("updated_at"),
  labels: jsonb("labels").$type<string[]>(),
  raw: jsonb("raw").$type<Record<string, any>>(),
  first_seen: timestamp("first_seen").defaultNow(),
  last_notified: timestamp("last_notified")
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  display_name: text("display_name"),
  github_login: text("github_login"),
  created_at: timestamp("created_at").defaultNow()
});

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id),
  // either a repo (owner/repo) OR a global search query
  repo: text("repo"),
  query: text("query"),
  delivery_method: text("delivery_method").notNull(), // 'discord', 'webhook', 'email'
  destination: text("destination").notNull(), // webhook URL or discord webhook or email
  active: boolean("active").default(true),
  created_at: timestamp("created_at").defaultNow()
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  subscription_id: integer("subscription_id").references(() => subscriptions.id),
  issue_id: bigint("issue_id").references(() => issues.id),
  delivered: boolean("delivered").default(false),
  delivered_at: timestamp("delivered_at"),
  payload: jsonb("payload").$type<Record<string, any>>(),
  created_at: timestamp("created_at").defaultNow()
});
```

Notes:

* `subscriptions` supports either per-repo (`repo`) or a search `query` (e.g., `label:"💎 Bounty" author:projectdiscovery/*`) — worker will evaluate both.
* `notifications` is your audit trail.

---

## Fetch + upsert flow (worker)

1. Compute `created_cutoff = today - 30d`. Construct `q = label:"💎 Bounty" state:open created:>=YYYY-MM-DD`. Optionally use `created:>${lastSeen}` for delta.
2. For page=1..MAX\_PAGES (max 5), do:

   * Send request with `If-None-Match` using saved ETag for that page.
   * If `304` → read cached page from Redis and continue.
   * If `200` → save new ETag and body in Redis, parse items.
   * For each item:

     * If `created_at < cutoff` → stop.
     * Upsert into `issues` (Drizzle query `insert(...).onConflictDoUpdate(...)`).
3. After pages done, run matview refresh or SELECT to build payload:

   * `latest = SELECT ... FROM issues WHERE created_at >= now() - interval '30 days' ORDER BY created_at DESC LIMIT 1000`
4. `redis.set('snapshots:latest', JSON.stringify(latest), EX, 3600)`
5. Diff newly inserted issue IDs vs `bounty:notified` → for every new issue, evaluate subscriptions:

   * Find subscriptions matching `repo` or whose `query` matches the issue (simple strategy: evaluate `query` server-side as a string match or pre-compile queries).
   * Create `notifications` rows & attempt delivery; on successful delivery mark `delivered=true`, add `gh:<id>` to `bounty:notified`.

---

## ISR + Vercel behavior

* **Public pages**: Next.js pages call `fetch('/api/snapshots/latest')` at runtime (client) or use `getStaticProps` with `revalidate: 3600` if you prefer server-rendered HTML.
* **API route `/api/snapshots/latest`**:

  * Try `redis.get('snapshots:latest')`. If present, return JSON with:

    * `Cache-Control: public, max-age=60, stale-while-revalidate=300`
    * `ETag: "<sha256>"` (optional)
  * If Redis miss, query Postgres matview (`SELECT payload FROM latest_bounties`) and set Redis.
* **ISR note**: If you choose to use `getStaticProps/revalidate`, Vercel will rebuild pages on revalidate; but since snapshots are central, prefer client fetch + CDN for minimal origin hits. If you want HTML-level ISR, set `revalidate: 3600` and run the worker to refresh DB each hour.

---

## Settings page (logged-in user) — UX & endpoints

User flows:

1. **Add subscription**

   * UI: form with two options: `Repo subscription` (owner/repo) or `Query subscription` (free text).
   * Delivery method: `Discord webhook` (paste URL) / `Webhook URL` / `Email`.
   * Validate destination (test ping for webhook / send confirmation email).
   * Endpoint: `POST /api/subscriptions` → create `subscriptions` row.

2. **Manage subscriptions**

   * List subscriptions, toggle `active`, edit `destination`, delete.
   * Endpoint: `GET /api/subscriptions` → list for current user. `PUT/DELETE` to update.

3. **Repo webhook helper (optional)**

   * For repos the user controls, offer a “Install webhook” button:

     * Use GitHub OAuth with `repo` scope to create a webhook on the repo via GitHub REST API that points to your global webhook receiver (`/api/webhooks/github`) with secret.
     * Endpoint: `POST /api/github/install-webhook` that makes authenticated call to GitHub to add webhook. Save that mapping in `subscriptions` as `repo` + `installed_via_platform=true`.
   * If user can’t install webhook, fall back to search-based subscription (works globally).

4. **Delivery history**

   * Page shows recent notifications (success/failure) from `notifications` table.
   * Endpoint: `GET /api/notifications?limit=50`.

5. **Security**

   * Only show subscriptions for logged-in user.
   * Store webhook URLs encrypted at rest (or hashed) and validate on creation.

---

## Webhook receiver (global) — Next.js API route

* Endpoint `/api/webhooks/github` receives per-repo `issues` events for repos where a webhook was installed by a user (or you have permission).
* Verify signature `X-Hub-Signature-256` with stored secret.
* If event is `opened` or `labeled`, normalize labels and upsert issue into Postgres, `redis.set` snapshot refresh or queue snapshot rebuild, and evaluate subscriptions for matching users → deliver notifications.

This complements the global Search poller (Search finds issues for repos you don’t control; webhooks give instant updates for repos you DO control).

---

## Security & rate-limit considerations

* Use a single GitHub PAT for Search API; store in secrets. Use GitHub App if you need higher throughput.
* Respect `X-RateLimit-Remaining`; worker should abort early if below threshold and retry after reset. Save rate values in Redis.
* Validate webhook signatures for repo webhooks.
* Throttle outbound notification requests (Discord, user webhooks) and queue them. Exponential backoff on failure.
* For user-provided webhook URLs, perform a verification ping to ensure legitimacy.

---

## Monitoring & metrics (this is not for public but for internal use)

* Track metrics per run: pages fetched, requests made, items upserted, notifications sent, rate-limit remaining. Expose a `/admin/status` page that reads Redis `ratelimit:*` and last run timestamp.
* Alert on worker failures (Slack/email) and on `ratelimit:remaining` < 100.

---

## Success criteria / MVP acceptance

* Hourly worker runs reliably and updates Redis snapshot with new bounties.
* Vercel front-end loads snapshot via CDN with <200ms median load for 30k visitors/day.
* Users can setup discord webhook url and get notified whenever there's a new bounty issue.
* Postgres contains canonical rows with history and notification audit.


## Example code snippets (quick)

### Drizzle insert/upsert (pseudo)

```ts
await db.insert(issues).values({
  id: item.id,
  repo: repoFullName,
  number: item.number,
  title: item.title,
  body: item.body,
  html_url: item.html_url,
  user_login: item.user.login,
  created_at: new Date(item.created_at),
  updated_at: new Date(item.updated_at),
  labels: item.labels.map(l=>l.name),
  raw: item
}).onConflictDoUpdate({
  target: issues.id,
  set: {
    title: db.raw`EXCLUDED.title`,
    body: db.raw`EXCLUDED.body`,
    updated_at: db.raw`EXCLUDED.updated_at`,
    raw: db.raw`EXCLUDED.raw`
  }
});
```

### Next.js API (snapshot)

```ts
// pages/api/snapshots/latest.ts
import { NextResponse } from 'next/server';
export async function GET() {
  const payload = await redis.get('snapshots:latest');
  if (payload) {
    const etag = sha256(payload);
    // handle If-None-Match from headers...
    return new Response(payload, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
        'ETag': etag
      }
    });
  }
  // fallback to Postgres matview...
}
```
