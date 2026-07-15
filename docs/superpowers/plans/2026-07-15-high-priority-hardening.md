# High-Priority Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restrict dashboard access to configured GitHub user IDs, return complete R2 listings beyond 1000 objects, and replace ESLint with an OXC-only formatting and lint toolchain.

**Architecture:** Authorization and R2 pagination logic are extracted into small pure or dependency-injected server utilities so behavior can be driven by unit tests. Existing API response shapes and frontend file-manager interactions remain unchanged. Oxfmt owns formatting, Oxlint owns semantic linting, and Nuxt typecheck remains the Vue/TypeScript correctness gate.

**Tech Stack:** Nuxt 4, Vue 3, NuxtHub Blob, nuxt-auth-utils, Vitest 4, Oxlint 1.74.0, Oxfmt 0.59.0, pnpm 10.

## Global Constraints

- Communicate with the user in Chinese, while commit messages are English.
- Do not upgrade Nuxt or unrelated dependencies in this work.
- Do not introduce D1, KV, a new pagination UI, Prettier, ESLint, or experimental Oxlint type-aware mode.
- Authorization uses `NUXT_ALLOWED_GITHUB_USER_IDS` with comma-separated positive GitHub numeric IDs.
- Missing, empty, or partially invalid authorization configuration fails closed and denies every user.
- Preserve the existing `/api/files` and `/api/files/folders` response shapes.
- Every production behavior change follows red-green-refactor: add a failing test, confirm the expected failure, implement minimally, and confirm green.
- At the end of every task, stage only that task's files and invoke the installed `commit-message` skill in `en auto` mode. It must read `git diff --cached`, normalize the English Conventional Commit message with `/Users/quentin/.agents/skills/commit-message/scripts/format_commit_message.py`, and commit with `git commit -F`.
- Keep pure Oxfmt output in its own commit so formatting does not obscure behavior changes.

---

## File Map

- `.oxlintrc.json`: Oxlint plugins, categories, and ignores.
- `.oxfmtrc.json`: Oxfmt ignores and formatter ownership.
- `package.json`: OXC scripts and dependencies.
- `nuxt.config.ts`: private authorization runtime config; no ESLint module.
- `shared/types/auth.d.ts`: nuxt-auth-utils user/session augmentation.
- `server/utils/github-authorization.ts`: parse and evaluate GitHub ID allowlists.
- `server/utils/blob-list.ts`: exhaust cursor-based NuxtHub Blob listing.
- `server/utils/file-path.ts`: normalize directory prefixes and folded folder paths.
- `server/api/auth/github.get.ts`: authorize GitHub users before creating a session.
- `server/middleware/auth.ts`: enforce `authorized: true` on protected APIs.
- `app/middleware/auth.ts`: redirect stale or unauthorized client sessions.
- `app/pages/login.vue`: display the unauthorized login result.
- `server/api/files/index.get.ts`: folded, complete current-directory listing.
- `server/api/files/folders.get.ts`: complete all-folder discovery across every page.
- `server/routes/images/[...pathname].get.ts`: reject a missing pathname before serving.
- `test/server/github-authorization.spec.ts`: authorization policy tests.
- `test/server/blob-list.spec.ts`: cursor pagination tests.
- `test/server/file-path.spec.ts`: prefix and folder conversion tests.

---

### Task 1: Replace ESLint with OXC tooling

**Files:**
- Create: `.oxlintrc.json`
- Create: `.oxfmtrc.json`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `nuxt.config.ts`
- Modify: `README.md`
- Modify: `app/components/FileManager.vue`
- Modify: `app/components/file-manager/FileList.vue`
- Modify: `server/api/files/index.get.ts`
- Modify: `server/api/files/folders.get.ts`
- Delete: `eslint.config.mjs`

**Interfaces:**
- Produces: `pnpm lint`, `pnpm lint:fix`, `pnpm format`, and `pnpm format:check`.
- Produces: Oxlint configuration with Vue, TypeScript, Unicorn, OXC, and Vitest plugins.

- [ ] **Step 1: Replace dependencies**

Run:

```bash
pnpm remove eslint @nuxt/eslint @nuxt/eslint-config
pnpm add -D oxlint@1.74.0 oxfmt@0.59.0
```

Expected: `package.json` and `pnpm-lock.yaml` remove the three ESLint packages and add the two OXC packages.

- [ ] **Step 2: Add OXC configuration**

Create `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["typescript", "unicorn", "oxc", "vue", "vitest"],
  "categories": {
    "correctness": "error",
    "suspicious": "error"
  },
  "rules": {},
  "env": {
    "builtin": true
  },
  "ignorePatterns": [".nuxt/**", ".output/**", ".wrangler/**", "node_modules/**"]
}
```

Create `.oxfmtrc.json`:

```json
{
  "ignorePatterns": [".nuxt/**", ".output/**", ".wrangler/**", "node_modules/**", "pnpm-lock.yaml"]
}
```

- [ ] **Step 3: Replace package scripts**

Set these scripts in `package.json`:

```json
{
  "lint": "oxlint .",
  "lint:fix": "oxlint --fix .",
  "format": "oxfmt .",
  "format:check": "oxfmt --check .",
  "check": "pnpm format:check && pnpm lint && pnpm typecheck && pnpm test --run && NITRO_PRESET=cloudflare_module pnpm build"
}
```

Keep the existing `dev`, `build`, deployment, `postinstall`, `test`, and `typecheck` scripts unchanged.

- [ ] **Step 4: Remove Nuxt ESLint integration**

Delete `eslint.config.mjs`. Remove `'@nuxt/eslint'` from `modules` and remove the entire `eslint` block from `nuxt.config.ts`.

- [ ] **Step 5: Run Oxlint and confirm the expected baseline failure**

Run:

```bash
pnpm lint
```

Expected: FAIL only on existing semantic diagnostics, including function scoping, mutating sort, or the unnecessary regex escape. The command must prove Oxlint parses Vue SFC files before fixes are applied.

- [ ] **Step 6: Fix the Oxlint diagnostics without changing behavior**

Apply these minimal changes:

```ts
// app/components/file-manager/FileList.vue
function pad(value: number) {
  return value.toString().padStart(2, '0')
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}
```

Use `toSorted()` instead of mutating `sort()` in both file-list endpoints. Change `/[\/\\]/` to `/[/\\]/` in `FileManager.vue`.

- [ ] **Step 7: Update README tooling commands**

Replace the Biome/ESLint wording with OXC and document:

```bash
pnpm lint
pnpm lint:fix
pnpm format
pnpm format:check
pnpm check
```

Do not claim that `check` currently passes until Task 5 verification is complete.

- [ ] **Step 8: Verify Oxlint**

Run:

```bash
pnpm lint
```

Expected: PASS with exit code 0.

- [ ] **Step 9: Auto-commit with commit-message**

Stage only Task 1 files. Invoke `$commit-message en auto`; expected classification is `chore(oxc)` with an English subject describing the ESLint-to-OXC migration. Confirm Git reports a successful commit before marking the task complete.

---

### Task 2: Apply the Oxfmt baseline

**Files:**
- Modify: all Oxfmt-supported tracked source, configuration, CSS, JSON/JSONC, and Markdown files selected by `oxfmt .`

**Interfaces:**
- Consumes: `pnpm format` and `.oxfmtrc.json` from Task 1.
- Produces: repository-wide Oxfmt baseline with no behavior changes.

- [ ] **Step 1: Confirm formatting is not yet compliant**

Run:

```bash
pnpm format:check
```

Expected: FAIL and list existing files that differ from Oxfmt output.

- [ ] **Step 2: Apply Oxfmt**

Run:

```bash
pnpm format
```

Expected: Oxfmt rewrites supported tracked files while ignoring generated directories, dependencies, and `pnpm-lock.yaml`.

- [ ] **Step 3: Verify the formatting-only result**

Run:

```bash
pnpm format:check
pnpm lint
pnpm test --run
git diff --check
```

Expected: every command passes. Inspect `git diff --stat` and representative Vue, TypeScript, JSONC, and Markdown diffs to confirm changes are mechanical formatting only.

- [ ] **Step 4: Auto-commit with commit-message**

Stage all and only Oxfmt output. Invoke `$commit-message en auto`; expected classification is `style(global)` with an English subject describing the Oxfmt baseline. Confirm Git reports a successful commit.

---

### Task 3: Enforce the GitHub user ID allowlist

**Files:**
- Create: `shared/types/auth.d.ts`
- Create: `server/utils/github-authorization.ts`
- Create: `test/server/github-authorization.spec.ts`
- Modify: `nuxt.config.ts`
- Modify: `.env.example`
- Modify: `README.md`
- Modify: `server/api/auth/github.get.ts`
- Modify: `server/middleware/auth.ts`
- Modify: `app/middleware/auth.ts`
- Modify: `app/pages/login.vue`

**Interfaces:**
- Produces: `parseAllowedGithubUserIds(value: unknown): Set<number> | null`.
- Produces: `isGithubUserAllowed(userId: number, value: unknown): boolean`.
- Produces: runtime config `allowedGithubUserIds: string`.
- Produces: session field `authorized: boolean`.

- [ ] **Step 1: Write failing authorization tests**

Create `test/server/github-authorization.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  isGithubUserAllowed,
  parseAllowedGithubUserIds,
} from '../../server/utils/github-authorization'

describe('GitHub authorization', () => {
  it('parses positive numeric IDs and removes duplicates', () => {
    expect(parseAllowedGithubUserIds(' 123,456,123 ')).toEqual(new Set([123, 456]))
  })

  it.each([undefined, null, '', '   ', '123,invalid', '0', '-1', '1.5'])(
    'treats %j as invalid configuration',
    (value) => {
      expect(parseAllowedGithubUserIds(value)).toBeNull()
    },
  )

  it('allows only IDs in a valid configuration', () => {
    expect(isGithubUserAllowed(123, '123,456')).toBe(true)
    expect(isGithubUserAllowed(999, '123,456')).toBe(false)
  })

  it('fails closed for invalid configuration', () => {
    expect(isGithubUserAllowed(123, '123,invalid')).toBe(false)
  })
})
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
pnpm test --run test/server/github-authorization.spec.ts
```

Expected: FAIL because `server/utils/github-authorization.ts` does not exist.

- [ ] **Step 3: Implement the minimal authorization utility**

Create `server/utils/github-authorization.ts`:

```ts
export function parseAllowedGithubUserIds(value: unknown): Set<number> | null {
  if (typeof value !== 'string' || !value.trim()) return null

  const values = value.split(',').map((item) => item.trim())
  if (values.some((item) => !/^\d+$/.test(item))) return null

  const ids = values.map(Number)
  if (ids.some((id) => !Number.isSafeInteger(id) || id <= 0)) return null

  return new Set(ids)
}

export function isGithubUserAllowed(userId: number, value: unknown): boolean {
  return parseAllowedGithubUserIds(value)?.has(userId) ?? false
}
```

- [ ] **Step 4: Run authorization tests and verify GREEN**

Run:

```bash
pnpm test --run test/server/github-authorization.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Add typed runtime and session configuration**

Add to `nuxt.config.ts` private runtime config:

```ts
allowedGithubUserIds: '',
```

Create `shared/types/auth.d.ts`:

```ts
declare module '#auth-utils' {
  interface User {
    id: number
    login: string
    avatar_url: string
  }

  interface UserSession {
    authorized: boolean
  }
}

export {}
```

- [ ] **Step 6: Enforce authorization in the OAuth callback**

Read `NUXT_ALLOWED_GITHUB_USER_IDS` from `event.context.cloudflare?.env` first, then `useRuntimeConfig(event).allowedGithubUserIds`. Before `setUserSession`, call `isGithubUserAllowed(user.id, configuredValue)`.

For a denied user:

```ts
await clearUserSession(event)
return sendRedirect(event, '/login?error=unauthorized')
```

For an allowed user, preserve the existing user fields and add:

```ts
authorized: true
```

Do not log the configured IDs.

- [ ] **Step 7: Enforce authorization on client and server requests**

In `server/middleware/auth.ts`, retain the existing public paths. For protected APIs:

```ts
if (!session.user) {
  throw createError({ statusCode: 401, message: 'Unauthorized' })
}

if (session.authorized !== true) {
  throw createError({ statusCode: 403, message: 'Forbidden' })
}
```

In `app/middleware/auth.ts`, read both `loggedIn` and `session`. Redirect to `/login?error=unauthorized` when a session exists without `authorized: true`; retain `/login` for a missing login.

- [ ] **Step 8: Display the unauthorized result and document configuration**

In `app/pages/login.vue`, derive the error message so `error=unauthorized` displays `该 GitHub 用户无权访问`, while other errors display `登录失败，请重试`.

Add a fake example to `.env.example` and README:

```text
NUXT_ALLOWED_GITHUB_USER_IDS=12345678,87654321
```

Document that production fails closed when the variable is missing and that the private consumer repository must add the real value to its root `wrangler.jsonc` before deploying this version.

- [ ] **Step 9: Verify authorization changes**

Run:

```bash
pnpm format
pnpm test --run test/server/github-authorization.spec.ts
pnpm lint
pnpm format:check
```

Expected: authorization tests, lint, and format check pass. Full typecheck remains deferred until the known R2 and public-image pathname errors are fixed in Tasks 4 and 5.

- [ ] **Step 10: Auto-commit with commit-message**

Stage only Task 3 files. Invoke `$commit-message en auto`; expected classification is `feat(auth)` with an English subject describing GitHub user ID access restrictions. Confirm Git reports a successful commit.

---

### Task 4: Return complete paginated R2 listings

**Files:**
- Create: `server/utils/blob-list.ts`
- Create: `server/utils/file-path.ts`
- Create: `test/server/blob-list.spec.ts`
- Create: `test/server/file-path.spec.ts`
- Modify: `server/api/files/index.get.ts`
- Modify: `server/api/files/folders.get.ts`

**Interfaces:**
- Produces: `listAllBlobs(storage, options)` returning merged `blobs` and unique `folders`.
- Produces: `normalizeDirectoryPrefix(value: unknown): string`.
- Produces: `toRelativeFolderName(folderPath: string, prefix: string): string | null`.

- [ ] **Step 1: Write failing pagination tests**

Create `test/server/blob-list.spec.ts` with structural fake storage and these behaviors:

```ts
import { describe, expect, it, vi } from 'vitest'
import { listAllBlobs } from '../../server/utils/blob-list'

describe('listAllBlobs', () => {
  it('returns a single page', async () => {
    const list = vi.fn().mockResolvedValue({ blobs: [{ pathname: 'a' }], folders: ['docs/'], hasMore: false })
    await expect(listAllBlobs({ list })).resolves.toEqual({ blobs: [{ pathname: 'a' }], folders: ['docs/'] })
  })

  it('follows cursors and merges unique folders', async () => {
    const list = vi.fn()
      .mockResolvedValueOnce({ blobs: [{ pathname: 'a' }], folders: ['docs/'], hasMore: true, cursor: 'next' })
      .mockResolvedValueOnce({ blobs: [{ pathname: 'b' }], folders: ['docs/', 'images/'], hasMore: false })

    await expect(listAllBlobs({ list }, { prefix: 'root/', folded: true })).resolves.toEqual({
      blobs: [{ pathname: 'a' }, { pathname: 'b' }],
      folders: ['docs/', 'images/'],
    })
    expect(list).toHaveBeenNthCalledWith(2, { prefix: 'root/', folded: true, cursor: 'next' })
  })

  it('rejects a truncated page without a cursor', async () => {
    const list = vi.fn().mockResolvedValue({ blobs: [], hasMore: true })
    await expect(listAllBlobs({ list })).rejects.toThrow('Blob listing returned hasMore without a cursor')
  })
})
```

- [ ] **Step 2: Write failing path tests**

Create `test/server/file-path.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { normalizeDirectoryPrefix, toRelativeFolderName } from '../../server/utils/file-path'

describe('file paths', () => {
  it.each([
    [undefined, ''],
    ['', ''],
    ['/', ''],
    ['/photos//2026/', 'photos/2026/'],
    ['photos', 'photos/'],
  ])('normalizes %j to %j', (input, expected) => {
    expect(normalizeDirectoryPrefix(input)).toBe(expected)
  })

  it('converts folded paths to direct child names', () => {
    expect(toRelativeFolderName('photos/2026/', 'photos/')).toBe('2026')
    expect(toRelativeFolderName('docs/', '')).toBe('docs')
    expect(toRelativeFolderName('photos/', 'photos/')).toBeNull()
  })
})
```

- [ ] **Step 3: Run both tests and verify RED**

Run:

```bash
pnpm test --run test/server/blob-list.spec.ts test/server/file-path.spec.ts
```

Expected: FAIL because both utility modules are missing.

- [ ] **Step 4: Implement cursor exhaustion**

Create `server/utils/blob-list.ts` using structural types so tests do not require a real R2 binding:

```ts
import type { BlobListOptions } from '@nuxthub/core/blob'

interface BlobListPage<T> {
  blobs: T[]
  folders?: string[]
  hasMore: boolean
  cursor?: string
}

interface BlobLister<T> {
  list: (options?: BlobListOptions) => Promise<BlobListPage<T>>
}

export async function listAllBlobs<T>(
  storage: BlobLister<T>,
  options: Omit<BlobListOptions, 'cursor'> = {},
): Promise<{ blobs: T[]; folders: string[] }> {
  const blobs: T[] = []
  const folders = new Set<string>()
  let cursor: string | undefined

  do {
    const page = await storage.list({ ...options, ...(cursor ? { cursor } : {}) })
    blobs.push(...page.blobs)
    page.folders?.forEach((folder) => folders.add(folder))

    if (!page.hasMore) break
    if (!page.cursor) throw new Error('Blob listing returned hasMore without a cursor')
    cursor = page.cursor
  } while (true)

  return { blobs, folders: [...folders] }
}
```

- [ ] **Step 5: Implement path normalization**

Create `server/utils/file-path.ts`:

```ts
export function normalizeDirectoryPrefix(value: unknown): string {
  if (typeof value !== 'string') return ''
  const normalized = value.split('/').filter(Boolean).join('/')
  return normalized ? `${normalized}/` : ''
}

export function toRelativeFolderName(folderPath: string, prefix: string): string | null {
  const relativePath = prefix && folderPath.startsWith(prefix)
    ? folderPath.slice(prefix.length)
    : folderPath
  return relativePath.split('/').find(Boolean) ?? null
}
```

- [ ] **Step 6: Run utility tests and verify GREEN**

Run:

```bash
pnpm test --run test/server/blob-list.spec.ts test/server/file-path.spec.ts
```

Expected: PASS.

- [ ] **Step 7: Integrate the current-directory endpoint**

In `server/api/files/index.get.ts`:

- normalize `query.prefix`;
- call `listAllBlobs(blob, { prefix, folded: true })`;
- convert folded paths with `toRelativeFolderName`;
- discard null values, deduplicate, and use `toSorted()`;
- sort blobs by `uploadedAt` descending with `toSorted()`;
- return the unchanged `folders`, `files`, and `currentPath` keys.

- [ ] **Step 8: Integrate the all-folders endpoint**

In `server/api/files/folders.get.ts`, replace the single `blob.list()` call with `listAllBlobs(blob)`. Preserve the existing parent-folder construction and return a `toSorted()` array.

- [ ] **Step 9: Verify R2 behavior**

Run:

```bash
pnpm format
pnpm test --run test/server/blob-list.spec.ts test/server/file-path.spec.ts
pnpm test --run
pnpm lint
pnpm format:check
```

Expected: every listed command passes. Full typecheck remains deferred until Task 5 fixes the known public-image pathname error.

- [ ] **Step 10: Auto-commit with commit-message**

Stage only Task 4 files. Invoke `$commit-message en auto`; expected classification is `fix(files)` with an English subject describing complete cursor-based R2 listings. Confirm Git reports a successful commit.

---

### Task 5: Close remaining type gaps and run the complete gate

**Files:**
- Modify: `server/routes/images/[...pathname].get.ts`

**Interfaces:**
- Produces: complete `pnpm check` gate.
- Produces: explicit 400 response when the public image route lacks a pathname.

- [ ] **Step 1: Confirm the remaining typecheck failure**

Run:

```bash
pnpm typecheck
```

Expected before the route fix: FAIL because `pathname` can be undefined in `server/routes/images/[...pathname].get.ts`.

- [ ] **Step 2: Add the missing pathname guard**

Update the image route before `blob.serve`:

```ts
const pathname = getRouterParam(event, 'pathname')

if (!pathname) {
  throw createError({ statusCode: 400, message: 'Pathname is required' })
}
```

Keep the existing Content-Security-Policy header and pass the validated string to `blob.serve`.

- [ ] **Step 3: Verify the focused type fix**

Run:

```bash
pnpm format
pnpm typecheck
pnpm lint
```

Expected: all commands pass.

- [ ] **Step 4: Auto-commit with commit-message**

Stage only Task 5 fixes. Invoke `$commit-message en auto`; expected classification is `fix(routes)` with an English subject describing validation of public image pathnames. Confirm Git reports a successful commit.

- [ ] **Step 5: Run the complete fresh verification gate**

Run exactly:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test --run
pnpm build
NITRO_PRESET=cloudflare_module pnpm build
git status --short
```

Expected:

- format check exits 0;
- Oxlint exits 0;
- Nuxt typecheck exits 0;
- all tests pass;
- Node preset build exits 0;
- Cloudflare module build exits 0;
- Git status is clean.

- [ ] **Step 6: Review acceptance criteria**

Confirm against the design document:

- unlisted and invalidly configured GitHub users cannot establish authorized sessions;
- protected APIs require `authorized: true`;
- R2 cursor pagination is exhausted for both listing endpoints;
- folded folder paths remain compatible with the current frontend;
- ESLint and Prettier are absent;
- Oxfmt and Oxlint are the sole formatter and linter;
- the private consumer repository is documented as requiring a real `NUXT_ALLOWED_GITHUB_USER_IDS` value before deployment.
