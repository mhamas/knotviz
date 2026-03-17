# Graph Sharing via URL — Exploration Notes

> **Status: Exploration only — not planned for implementation yet.**
> These are ideas collected during a brainstorm. No decisions have been made.

---

## Problem

Share a graph visualization with others via URL, so they can open it directly in the app without needing the JSON file. Must also support private/sensitive graphs.

---

## Options

### 1. `?url=` query param (public graphs, no backend)

Load graph from any hosted URL: `app.com/?url=https://raw.githubusercontent.com/.../graph.json`

- **Pros:** Simplest to implement, works with any static host (S3, GitHub raw, etc.)
- **Cons:** Requires CORS on the host, graph must be publicly accessible

### 2. GitHub Gist integration (public graphs, no backend)

`app.com/?gist=abc123` — fetch via GitHub API.

- **Pros:** Free hosting, versioned, no CORS issues, easy to update
- **Cons:** Requires GitHub account, only public gists work without auth

### 3. LZ-compressed URL hash (small graphs, no server)

Compress JSON with lz-string, encode into URL fragment: `app.com/#data=eJy...`

- **Pros:** Zero infrastructure, works offline, data never hits a server
- **Cons:** URL length limit (~8KB in modern browsers) restricts to ~100-200 nodes

### 4. Encrypted + hosted anywhere (private graphs, no backend)

Encrypt JSON client-side, upload ciphertext to any public host, share URL with decryption key in hash fragment: `app.com/?url=https://...#key=xyz`

- **Pros:** Works with any file size, no backend needed, host only sees encrypted data, key in hash fragment never sent to server
- **Cons:** Requires user to upload encrypted file somewhere, slightly more complex UX

### 5. Encrypted paste-bin backend (private graphs, best UX)

Serverless function stores encrypted JSON, returns short share ID: `app.com/s/abc123#key=xyz`

- **Pros:** Best UX (short URLs, one-click sharing), server never sees plaintext
- **Cons:** Requires backend infrastructure (Netlify/Vercel function + storage)

---

## Recommendation (tentative)

Combine **#1** (`?url=`) for public graphs with **#4** (encrypt + host) for private graphs. Covers most use cases with zero backend. Add **#5** later if polished UX becomes important.
