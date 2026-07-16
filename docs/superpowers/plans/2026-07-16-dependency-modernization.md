# Dependency Modernization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade every direct runtime and development dependency to the latest stable release available on 2026-07-16, migrate deprecated packages to their supported successors, and preserve existing application and Cloudflare deployment behavior.

**Architecture:** Upgrade dependencies in three independently reviewable groups: Nuxt platform packages, UI packages, then validation and deployment tooling. Each group updates `package.json` and `pnpm-lock.yaml`, applies only compatibility changes required by the new public APIs, passes a group-specific verification gate, and ends with an English Conventional Commit generated through `$commit-message en auto`.

**Tech Stack:** Nuxt 4, Vue 3, NuxtHub, nuxt-auth-utils, Tailwind CSS 4, shadcn-nuxt, Reka UI, Lucide Vue, Vitest, jsdom, Oxfmt, Oxlint, Wrangler, pnpm 10, Node.js 22.

## Global Constraints

- Upgrade all direct `dependencies` and `devDependencies` to the latest stable versions available during implementation.
- Replace deprecated `lucide-vue-next` with its supported successor `@lucide/vue` rather than retaining the deprecated package at version 1.0.0.
- Keep Node.js at `22.16.0` and pnpm at `10.25.0`; Nuxt 4.4.8 requires Node `^22.12.0`, so the declared runtime already satisfies the latest framework requirement.
- Preserve page structure, primary copy, GitHub OAuth authorization, R2 storage semantics, server API paths and payloads, and Cloudflare Workers deployment.
- Do not disable checks, remove valid tests, add broad lint suppressions, or introduce `any` to bypass compatibility failures.
- Keep each dependency group independently reviewable and commit every logical task with `$commit-message en auto`.
- Stop and provide reproducible evidence before pinning any direct dependency below latest because of an upstream defect.

## File Structure

- Modify `package.json`: declare latest direct dependency versions and replace the deprecated Lucide package.
- Modify `pnpm-lock.yaml`: resolve the complete dependency graph for each upgrade group.
- Modify `README.md`: keep the documented Nuxt version aligned with the installed framework.
- Modify `app/**/*.vue`: change Lucide imports from `lucide-vue-next` to `@lucide/vue`; otherwise touch application components only when a verified public API incompatibility requires it.
- Modify `nuxt.config.ts`: only if Nuxt, NuxtHub, color-mode, shadcn-nuxt, or Tailwind reports a removed or renamed configuration field.
- Modify `vitest.config.ts` and `test/setup.ts`: only if Vitest or jsdom requires an explicit compatibility adjustment verified by a failing test.
- Modify `.oxlintrc.json` or `.oxfmtrc.json`: only when the latest OXC schema rejects an existing field; preserve the current correctness and suspicious rule categories.
- Modify `wrangler.jsonc`: only when Wrangler rejects a currently supported field during dry-run; preserve `BLOB` and `ASSETS` bindings.

---

### Task 1: Upgrade the Nuxt platform dependencies

**Files:**

- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `README.md`
- Modify if required by verified errors: `nuxt.config.ts`
- Test: `test/server/github-authorization.spec.ts`
- Test: `test/server/blob-list.spec.ts`
- Test: `test/server/file-path.spec.ts`

**Interfaces:**

- Consumes: current Nuxt runtime configuration keys `allowedGithubUserIds` and `allowedOrigins`; `hub:blob` storage APIs; nuxt-auth-utils session helpers.
- Produces: a Nuxt 4.4.8-compatible application using `@nuxthub/core@0.10.8`, `nuxt-auth-utils@0.5.29`, and `@nuxtjs/color-mode@4.0.1` without changing existing routes or runtime configuration names.

- [ ] **Step 1: Record the framework baseline and runtime compatibility**

Run:

```bash
node --version
pnpm --version
pnpm list nuxt @nuxthub/core nuxt-auth-utils @nuxtjs/color-mode --depth 0
pnpm test --run test/server
```

Expected:

```text
Node reports v22.16.0 or another version satisfying ^22.12.0.
pnpm reports 10.25.0.
The three server test files pass with 20 tests total.
```

- [ ] **Step 2: Upgrade the framework group to the registry snapshot**

Run:

```bash
pnpm add nuxt@4.4.8 @nuxthub/core@0.10.8 nuxt-auth-utils@0.5.29 @nuxtjs/color-mode@4.0.1
```

Expected `package.json` declarations:

```json
{
  "dependencies": {
    "@nuxthub/core": "^0.10.8",
    "@nuxtjs/color-mode": "^4.0.1",
    "nuxt": "^4.4.8",
    "nuxt-auth-utils": "^0.5.29"
  }
}
```

- [ ] **Step 3: Regenerate Nuxt types and identify real compatibility failures**

Run:

```bash
pnpm exec nuxt prepare
pnpm typecheck
pnpm test --run test/server
```

Expected: Nuxt type generation succeeds, typecheck exits 0, and all 20 server tests pass.

If a command fails, use `superpowers:systematic-debugging` before editing. Restrict fixes to the public API surface reported by the failure:

```ts
// nuxt.config.ts must retain these application contracts.
runtimeConfig: {
  allowedGithubUserIds: "",
  allowedOrigins: "",
},
modules: ["@nuxthub/core", "@nuxtjs/color-mode", "nuxt-auth-utils", "shadcn-nuxt"],
hub: {
  blob: true,
},
```

- [ ] **Step 4: Update the documented framework version**

Change the README technology stack entry from:

```markdown
- Nuxt 4.2.2、Vue 3
```

to:

```markdown
- Nuxt 4.4.8、Vue 3
```

- [ ] **Step 5: Verify both production targets for the framework group**

Run:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test --run test/server
pnpm build
NITRO_PRESET=cloudflare_module pnpm build
```

Expected: every command exits 0; both builds generate `.output/server/index.mjs`; the Cloudflare build reports the `cloudflare-module` preset.

- [ ] **Step 6: Commit the framework upgrade**

Stage only the framework group:

```bash
git add package.json pnpm-lock.yaml README.md nuxt.config.ts
git diff --cached --check
```

Do not stage `nuxt.config.ts` when unchanged. Run `$commit-message en auto`; the expected commit intent is:

```text
chore(deps): upgrade Nuxt platform packages
```

---

### Task 2: Upgrade the UI stack and migrate Lucide

**Files:**

- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `app/pages/login.vue`
- Modify: `app/layouts/default.vue`
- Modify: `app/components/ThemeToggle.vue`
- Modify: `app/components/UserMenu.vue`
- Modify: `app/components/FolderTreeNode.vue`
- Modify: `app/components/file-manager/BatchMoveDialog.vue`
- Modify: `app/components/file-manager/FileList.vue`
- Modify: `app/components/file-manager/FileManagerToolbar.vue`
- Modify: `app/components/file-manager/MoveDialog.vue`
- Modify: `app/components/file-manager/PreviewDialog.vue`
- Modify: `app/components/file-manager/UploadDialog.vue`
- Modify: every `app/components/ui/**/*.vue` file returned by `rg -l 'lucide-vue-next' app`
- Modify if required by verified errors: `app/components/ui/**/*.vue`
- Modify if required by verified errors: `app/assets/css/main.css`
- Test: `test/file-manager/FileList.spec.ts`
- Test: `test/file-manager/FileManagerToolbar.spec.ts`
- Test: `test/file-manager/useFileMutations.spec.ts`
- Test: `test/file-manager/useFilePreview.spec.ts`
- Test: `test/file-manager/useFileSelection.spec.ts`
- Test: `test/file-manager/useFolderBrowser.spec.ts`
- Test: `test/file-manager/utils.spec.ts`

**Interfaces:**

- Consumes: current shadcn-vue wrapper component props and emitted events; existing icon component names; `cn()` using `tailwind-merge`; Tailwind CSS entry file.
- Produces: the same rendered component interfaces backed by Tailwind CSS 4.3.2, shadcn-nuxt 2.8.0, Reka UI 2.10.1, VueUse 14.3.0, tailwind-merge 3.6.0, and `@lucide/vue` 1.24.0.

- [ ] **Step 1: Upgrade the UI packages and replace the deprecated dependency**

Run:

```bash
pnpm remove lucide-vue-next
pnpm add @lucide/vue@1.24.0 @vueuse/core@14.3.0 reka-ui@2.10.1 shadcn-nuxt@2.8.0 tailwind-merge@3.6.0
pnpm add -D @tailwindcss/vite@4.3.2 tailwindcss@4.3.2
pnpm update --latest class-variance-authority clsx vue-sonner
```

Expected dependency replacement:

```json
{
  "dependencies": {
    "@lucide/vue": "^1.24.0"
  }
}
```

`lucide-vue-next` must no longer appear in `package.json` or the root lockfile importer.

- [ ] **Step 2: Migrate all Lucide imports to the supported package**

Find the exact files:

```bash
rg -l 'lucide-vue-next' app
```

For every returned file, change only the module specifier while preserving imported icon names. Example:

```ts
// Before
import { Home, FolderOpen } from "lucide-vue-next";

// After
import { Home, FolderOpen } from "@lucide/vue";
```

Verify the migration is complete:

```bash
rg -n 'lucide-vue-next' app package.json pnpm-lock.yaml
```

Expected: no output.

- [ ] **Step 3: Run focused component and composable tests**

Run:

```bash
pnpm test --run test/file-manager
pnpm typecheck
```

Expected: all 27 file-manager tests pass and typecheck exits 0.

If Reka UI or VueUse reports a changed prop, event, or helper signature, use `superpowers:systematic-debugging`, preserve the wrapper's existing external props and events, and update only the forwarding code. The preserved pattern is:

```ts
const forwarded = useForwardPropsEmits(props, emits);
```

or, for prop-only wrappers:

```ts
const delegatedProps = reactiveOmit(props, "class");
const forwarded = useForwardProps(delegatedProps);
```

- [ ] **Step 4: Verify UI compilation and generated styles**

Run:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test --run test/file-manager
pnpm build
NITRO_PRESET=cloudflare_module pnpm build
```

Expected: every command exits 0; no missing Lucide exports, Reka UI types, Tailwind utilities, or Vue template errors are reported.

- [ ] **Step 5: Commit the UI upgrade**

Stage the UI group:

```bash
git add package.json pnpm-lock.yaml app
git diff --cached --check
```

Run `$commit-message en auto`; the expected commit intent is:

```text
chore(deps): modernize the UI dependency stack
```

---

### Task 3: Upgrade test, type, OXC, and Cloudflare tooling

**Files:**

- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify if required by verified errors: `vitest.config.ts`
- Modify if required by verified errors: `test/setup.ts`
- Modify if required by verified errors: `.oxlintrc.json`
- Modify if required by verified errors: `.oxfmtrc.json`
- Modify if required by verified errors: `wrangler.jsonc`
- Test: `test/**/*.spec.ts`

**Interfaces:**

- Consumes: jsdom test environment, Vue Test Utils mounting APIs, Vitest globals, current OXC configuration, Cloudflare `BLOB` R2 binding and `ASSETS` binding.
- Produces: reproducible checks with Vitest 4.1.10, jsdom 29.1.1, vue-tsc 3.3.7, Wrangler 4.111.0, and the latest stable versions of all remaining direct development dependencies.

- [ ] **Step 1: Upgrade the validation and deployment toolchain**

Run:

```bash
pnpm add -D @vitejs/plugin-vue@6.0.8 @vue/test-utils@2.4.11 jsdom@29.1.1 vitest@4.1.10 vue-tsc@3.3.7 wrangler@4.111.0
pnpm update --latest @testing-library/jest-dom @testing-library/vue oxfmt oxlint
```

Expected declarations include:

```json
{
  "devDependencies": {
    "@vitejs/plugin-vue": "^6.0.8",
    "@vue/test-utils": "^2.4.11",
    "jsdom": "^29.1.1",
    "vitest": "^4.1.10",
    "vue-tsc": "^3.3.7",
    "wrangler": "4.111.0"
  }
}
```

Oxfmt remains `0.59.0` and Oxlint remains `1.74.0` when the registry reports those versions as latest.

- [ ] **Step 2: Verify the test environment before changing configuration**

Run:

```bash
pnpm test --run
pnpm typecheck
```

Expected: 10 test files and 47 tests pass; typecheck exits 0.

Only if the failing output identifies a removed Vitest or jsdom default, update `vitest.config.ts` while retaining this contract:

```ts
export default defineConfig({
  plugins: [vue()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./test/setup.ts",
    include: ["test/**/*.spec.ts"],
    css: true,
  },
});
```

- [ ] **Step 3: Verify OXC configuration against the latest schemas**

Run:

```bash
pnpm format:check
pnpm lint
```

Expected: Oxfmt checks all matched files and Oxlint exits with zero diagnostics. Preserve these Oxlint categories if a schema migration is required:

```json
{
  "categories": {
    "correctness": "error",
    "suspicious": "error"
  }
}
```

- [ ] **Step 4: Verify Wrangler with the generated Nitro configuration**

Run:

```bash
NITRO_PRESET=cloudflare_module pnpm build
pnpm exec wrangler deploy --dry-run
```

Expected Wrangler output contains:

```text
env.BLOB
env.ASSETS
--dry-run: exiting now.
```

Do not alter the binding names. If Wrangler rejects a configuration field, use `superpowers:systematic-debugging`, confirm the field is removed in Wrangler 4.111.0, then update only that field.

- [ ] **Step 5: Commit the tooling upgrade**

Stage the tooling group:

```bash
git add package.json pnpm-lock.yaml vitest.config.ts test/setup.ts .oxlintrc.json .oxfmtrc.json wrangler.jsonc
git diff --cached --check
```

Do not stage unchanged optional files. Run `$commit-message en auto`; the expected commit intent is:

```text
chore(deps): upgrade validation and deployment tooling
```

---

### Task 4: Audit all direct dependencies and run the final release gate

**Files:**

- Verify: `package.json`
- Verify: `pnpm-lock.yaml`
- Verify: `.tool-versions`
- Verify: `README.md`
- Verify: `nuxt.config.ts`
- Verify: `wrangler.jsonc`
- Verify: `app/**/*`
- Verify: `server/**/*`
- Verify: `test/**/*`

**Interfaces:**

- Consumes: all outputs from Tasks 1-3.
- Produces: a clean branch whose direct dependencies are current, lockfile is reproducible, application behavior is preserved, and Cloudflare deployment passes dry-run.

- [ ] **Step 1: Confirm no direct dependency remains outdated or deprecated**

Run:

```bash
pnpm outdated --format json
rg -n 'lucide-vue-next' package.json pnpm-lock.yaml app
pnpm list --depth 0
```

Expected:

```text
pnpm outdated returns no outdated direct dependency entries.
The deprecated package search returns no output.
Every package.json dependency resolves at the declared latest version.
```

- [ ] **Step 2: Verify frozen installation from the committed lockfile**

Run:

```bash
pnpm install --frozen-lockfile
git status --short
```

Expected: installation exits 0 and does not modify `package.json` or `pnpm-lock.yaml`.

- [ ] **Step 3: Run the complete quality gate**

Run:

```bash
pnpm check
pnpm build
NITRO_PRESET=cloudflare_module pnpm build
pnpm exec wrangler deploy --dry-run
```

Expected:

```text
Oxfmt passes.
Oxlint reports zero diagnostics.
Nuxt typecheck exits 0.
Vitest reports 10 passed files and 47 passed tests or a higher count if migration regressions required new tests.
Both Nuxt builds exit 0.
Wrangler recognizes BLOB and ASSETS and exits after dry-run.
```

- [ ] **Step 4: Inspect the final branch diff for scope and generated artifacts**

Run:

```bash
git diff --check main...HEAD
git diff --stat main...HEAD
git status --short --branch
git diff main...HEAD -- app server test package.json nuxt.config.ts | rg '^\+.*(\bany\b|eslint|prettier|lucide-vue-next)'
```

Expected: no whitespace errors, no unintended generated files, no new `any`, no restored ESLint or Prettier configuration, no deprecated Lucide imports, and a clean worktree.

- [ ] **Step 5: Review commit boundaries**

Run:

```bash
git log --oneline main..HEAD
```

Expected history contains the design commit plus separate framework, UI, and tooling dependency commits. If final verification required an additional compatibility fix, stage only that fix and run `$commit-message en auto` with a `fix(<affected-area>)` message derived from the staged diff.
