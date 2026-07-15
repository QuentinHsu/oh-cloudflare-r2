# Cloudflare Dependency Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove redundant Tailwind and Vercel dependencies, repair the Cloudflare deployment script, and document Cloudflare R2 as the only supported production platform.

**Architecture:** Keep the existing NuxtHub Cloudflare R2 provider and Tailwind CSS 4 Vite integration unchanged. Restrict the change to package metadata, the lockfile, and deployment documentation so application runtime behavior and storage APIs remain stable.

**Tech Stack:** Nuxt 4.2.2, NuxtHub 0.10.1, Tailwind CSS 4.1.18, pnpm 10.25.0, Wrangler 4.54.0, Cloudflare Workers, Cloudflare R2

## Global Constraints

- Communicate with the user in Chinese, while commit messages are English.
- Support Cloudflare Workers and Cloudflare R2 only; do not preserve Vercel deployment support.
- Do not upgrade Nuxt, NuxtHub, Wrangler, Tailwind CSS, or unrelated dependencies.
- Keep `@tailwindcss/vite`, `tailwindcss`, the `tailwindcss()` Vite plugin, and `@import "tailwindcss"` unchanged.
- Do not modify authentication, file management behavior, R2 response shapes, public Blob routes, or UI interactions.
- Do not trigger a real remote deployment; Wrangler verification must use `--dry-run`.
- At the end of every task, stage only that task's files and invoke the installed `commit-message` skill in `en auto` mode. It must normalize the message with `/Users/quentin/.agents/skills/commit-message/scripts/format_commit_message.py` and commit with `git commit -F`.

---

## File Map

- `package.json`: declares the Cloudflare-only deployment command and removes duplicate or unsupported platform dependencies.
- `pnpm-lock.yaml`: records the dependency graph after the two direct dependencies are removed.
- `README.md`: states the supported production platform and removes the Vercel deployment command.

### Task 1: Clean package dependencies and repair Cloudflare deployment

**Files:**

- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**

- Consumes: the existing `@tailwindcss/vite` integration from `nuxt.config.ts` and the `BLOB` binding from `wrangler.jsonc`.
- Produces: a `deploy-cloudflare` script equal to `NITRO_PRESET=cloudflare_module pnpm build && wrangler deploy` and a dependency graph without direct `@nuxtjs/tailwindcss` or `@vercel/blob` entries.

- [ ] **Step 1: Prove the package metadata violates the Cloudflare-only design**

Run:

```bash
node --input-type=module -e '
  import packageJson from "./package.json" with { type: "json" };
  const forbiddenDependencies = ["@nuxtjs/tailwindcss", "@vercel/blob"];
  const present = forbiddenDependencies.filter((name) => packageJson.dependencies?.[name]);
  const expectedDeploy = "NITRO_PRESET=cloudflare_module pnpm build && wrangler deploy";
  if (present.length || packageJson.scripts?.["deploy-vercel"] || packageJson.scripts?.["deploy-cloudflare"] !== expectedDeploy) {
    throw new Error("package metadata still contains legacy deployment configuration");
  }
'
```

Expected: FAIL with `package metadata still contains legacy deployment configuration`.

- [ ] **Step 2: Remove duplicate and unsupported platform dependencies**

Run:

```bash
pnpm remove @nuxtjs/tailwindcss @vercel/blob
```

Expected: `package.json` removes both dependency keys and `pnpm-lock.yaml` is regenerated without those direct importer entries. Existing dependency versions must not be intentionally upgraded.

- [ ] **Step 3: Replace the deployment scripts**

Update the `scripts` section of `package.json` so its deployment entries are exactly:

```json
{
  "deploy-cloudflare": "NITRO_PRESET=cloudflare_module pnpm build && wrangler deploy"
}
```

Delete the `deploy-vercel` key. Keep every other script unchanged.

- [ ] **Step 4: Verify package metadata and lockfile importer**

Run the Step 1 Node assertion again.

Expected: PASS with exit code 0 and no output.

Run:

```bash
if sed -n '/^  \.:$/,/^packages:$/p' pnpm-lock.yaml | rg "^      '@(nuxtjs/tailwindcss|vercel/blob)':$"; then
  exit 1
fi
```

Expected: PASS with exit code 0 and no matching direct importer keys. Peer-context version strings may still mention `@vercel/blob` because `unstorage` declares it as an optional peer; those strings do not make it a direct project dependency.

- [ ] **Step 5: Verify a clean frozen installation**

Run:

```bash
pnpm install --frozen-lockfile
```

Expected: PASS with `Lockfile is up to date` and Nuxt types generated successfully.

- [ ] **Step 6: Verify Tailwind and Cloudflare integration after dependency removal**

Run:

```bash
NITRO_PRESET=cloudflare_module pnpm build
pnpm exec wrangler deploy --dry-run
```

Expected:

- Nuxt reports `hub:blob using cloudflare-r2 driver`.
- Nitro reports `preset: cloudflare-module` and completes the build.
- Wrangler reports `Using redirected Wrangler configuration`.
- Wrangler lists `env.BLOB` as an R2 Bucket and `env.ASSETS` as Assets.
- Wrangler exits with `--dry-run: exiting now` and does not modify remote resources.

- [ ] **Step 7: Auto-commit the dependency and deployment cleanup**

Stage only:

```bash
git add package.json pnpm-lock.yaml
```

Invoke `$commit-message en auto`. The expected classification is `chore(deps)` with an English subject describing the Cloudflare-only dependency cleanup. Confirm Git reports a successful commit before continuing.

---

### Task 2: Document the Cloudflare-only platform and run regression gates

**Files:**

- Modify: `README.md`

**Interfaces:**

- Consumes: the `deploy-cloudflare` script produced by Task 1.
- Produces: public documentation that names Cloudflare Workers and R2 as the only supported production platform and contains no Vercel deployment instructions.

- [ ] **Step 1: Prove the README still advertises unsupported deployment**

Run:

```bash
if rg -n 'Vercel|deploy-vercel' README.md; then
  exit 1
fi
```

Expected: FAIL after printing the existing Vercel deployment lines.

- [ ] **Step 2: State the platform boundary near the project description**

After the introductory sentence, add:

```markdown
生产部署目标为 Cloudflare Workers + R2。本项目不再提供 Vercel Blob 或其他存储平台的部署支持。
```

- [ ] **Step 3: Remove the unsupported command from the common commands section**

Keep the Cloudflare deployment entry:

```markdown
# 部署 Cloudflare（包含 NITRO_PRESET=cloudflare_module）

pnpm run deploy-cloudflare
```

Delete these lines:

```markdown
# 部署 Vercel

pnpm run deploy-vercel
```

- [ ] **Step 4: Verify the documentation boundary and formatting**

Run:

```bash
if rg -n 'deploy-vercel' README.md; then
  exit 1
fi
rg -n 'Cloudflare Workers \+ R2|pnpm run deploy-cloudflare' README.md
pnpm exec oxfmt --check README.md
```

Expected:

- No `deploy-vercel` match.
- The platform boundary and Cloudflare deployment command are both found.
- Oxfmt reports that `README.md` uses the correct format.

- [ ] **Step 5: Run the full project quality gate**

Run:

```bash
pnpm check
```

Expected: formatting, Oxlint, Nuxt typecheck, all 5 Vitest files and 26 tests, and the Cloudflare preset build pass with exit code 0.

- [ ] **Step 6: Verify the normal build and final Cloudflare dry-run**

Run:

```bash
pnpm build
NITRO_PRESET=cloudflare_module pnpm build
pnpm exec wrangler deploy --dry-run
```

Expected:

- Both Nuxt builds complete successfully.
- The Cloudflare build uses the `cloudflare-r2` Blob driver.
- Wrangler lists the R2 and Assets bindings, then exits because of `--dry-run`.

- [ ] **Step 7: Check the final diff for accidental scope expansion**

Run:

```bash
git status --short
git diff --check
git diff -- README.md
```

Expected: only `README.md` is uncommitted, no whitespace errors are reported, and the diff contains only the platform statement and Vercel command removal.

- [ ] **Step 8: Auto-commit the documentation update**

Stage only:

```bash
git add README.md
```

Invoke `$commit-message en auto`. The expected classification is `docs(deployment)` with an English subject describing Cloudflare-only deployment documentation. Confirm Git reports a successful commit.

---

## Final Verification

After both task commits, run:

```bash
git status --short --branch
git log --oneline --decorate -4
```

Expected:

- The worktree is clean on `codex/cloudflare-dependency-cleanup`.
- The latest commits are the Task 2 documentation commit, the Task 1 dependency cleanup commit, the plan commit, and the design commit.
