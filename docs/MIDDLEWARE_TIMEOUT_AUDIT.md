# Middleware 504 MIDDLEWARE_INVOCATION_TIMEOUT – Audit

## 1. Diagnosis

**Root cause:** The middleware performs a **Supabase `getUser()` call on every matched request**. That call runs on Vercel Edge and involves:

- Creating a Supabase server client
- **Network round-trip** (or remote JWT/session validation) to Supabase

Vercel Edge middleware has a **short execution limit** (often ~10s, sometimes less). Under load, cold starts, or slow Supabase responses, this single `await supabase.auth.getUser()` can exceed the limit and produce:

- **504 GATEWAY_TIMEOUT**
- **Code: MIDDLEWARE_INVOCATION_TIMEOUT**

**Why production only:** Local Node has no such strict limit; Edge has a hard cap and different network path to Supabase, so timeouts show up in production.

---

## 2. Exact risky lines

| Lines | Issue | Severity |
|-------|--------|----------|
| **86–98** | `createServerClient(...)` + `await supabase.auth.getUser()` – **network/I/O on Edge**; primary cause of timeout | **Critical** |
| **57** | `isApiRoute` is computed but **never used** – dead code | Low |
| **16** | `console.log` on every cold start – minor overhead | Low |

**Not problematic:**

- **14, 61–65:** `BLOCKED_BOTS.test(ua)` – simple regex, cheap.
- **24–26, 29–39:** Header reads and redirect logic – synchronous, no I/O.
- **41–49:** Cookie set for `/en` – synchronous.
- **51–55:** Cron bypass – synchronous (and currently unreachable because matcher excludes `/api/*`; kept for future safety).
- **Matcher (108–112):** Correctly excludes `api`, `_next`, static assets, etc. – not too broad.

---

## 3. Redirect loops / same-URL redirects

- **www → non-www:** Redirect goes to `latamtcg.com` (different host). Next request has `host = latamtcg.com`, so no redirect. **No loop.**
- **HTTP → HTTPS:** Redirect changes protocol only. Next request is HTTPS. **No loop.**
- No redirect targets the same URL as the request.

---

## 4. Conditions always true?

- No condition is always true. Bot block runs only when `NODE_ENV === 'production'` and `ALLOW_BOTS !== 'true'`.

---

## 5. Matcher

- Matcher correctly excludes: `api`, `_next`, `_vercel`, files with extensions, `favicon.ico`, `robots.txt`, `sitemap.xml`, `manifest.*`, `assets`, `images`.
- Middleware does **not** run on static assets or API routes. Good.

---

## 6. Auth headers from middleware are unused

- Middleware sets `x-user-id` and `x-user-email` on the **response**.
- **No code in the repo reads these headers.** All auth uses `getSessionUser()` from `@/lib/supabase` in Server Components and API routes, which call Supabase there.
- So the Supabase block in middleware is redundant and only adds latency and timeout risk.

---

## 7. Refactor: where heavy logic should live

| Logic | Move to |
|-------|--------|
| **Supabase auth (getUser)** | Already implemented in **Server Components** and **Route Handlers** via `getSessionUser()` in `src/lib/supabase.ts`. No need in middleware. |
| Canonical redirects (www, HTTP→HTTPS) | Keep in middleware (sync, fast). |
| Bot blocking | Keep in middleware (sync regex). |
| /en cookie, cron bypass | Keep in middleware (sync). |

---

## 8. Why it times out on Vercel Edge

- Middleware runs in the **Edge runtime**, not Node.
- Edge has **strict CPU and wall-clock limits**; middleware must finish quickly.
- `getUser()` does **outbound I/O** to Supabase (or remote validation). That I/O can be slow due to:
  - Supabase latency
  - Edge ↔ Supabase network
  - Cold starts
- Once the limit is exceeded, Vercel returns **504** with **MIDDLEWARE_INVOCATION_TIMEOUT**.

**Fix:** Remove all Supabase usage from middleware. Keep only synchronous, Edge-safe logic (redirects, cookie, bot block, cron bypass).
