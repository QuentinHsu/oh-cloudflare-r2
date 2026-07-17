# File Row Quick Copy Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Promote raw-link and Markdown copy controls from the file overflow menu to persistent inline row actions.

**Architecture:** Keep the existing `FileTable.vue` event contract and clipboard flow unchanged. Reshape only the file action cell so direct copy buttons emit the existing `copy-url` payloads, while the overflow menu retains less frequent operations.

**Tech Stack:** Nuxt 4, Vue 3, TypeScript, shadcn-vue, Tailwind CSS 4, Vitest, Vue Test Utils.

## Global Constraints

- Do not change file APIs, public URLs, clipboard formatting, or `CopyUrlPayload`.
- Raw-link copy is available for every file; Markdown copy is available only for images.
- Direct copy controls remain visible without hover and have localized accessible names.
- Mobile targets are at least 44 by 44 CSS pixels; desktop targets may be 36 by 36 pixels.
- Folder rows do not expose copy actions.

---

### Task 1: Promote copy controls to inline file actions

**Files:**

- Modify: `test/file-manager/FileTable.spec.ts`
- Modify: `app/components/file-manager/FileTable.vue`

**Interfaces:**

- Consumes: existing `copy-url` emit with `CopyUrlPayload`.
- Produces: direct controls marked with `data-action="copy-raw"` and `data-action="copy-markdown"`; the overflow menu no longer contains those actions.

- [ ] **Step 1: Write the failing component tests**

Update the image-action test to locate the file row and assert the direct action group sits outside the overflow menu stub:

```ts
const row = wrapper.get(`[data-file="${imageFile.pathname}"]`);
const directActions = row.get("[data-direct-actions]");

await directActions.get('[data-action="copy-raw"]').trigger("click");
await directActions.get('[data-action="copy-markdown"]').trigger("click");

expect(row.find('[data-overflow-actions] [data-action="copy-raw"]').exists()).toBe(false);
expect(row.find('[data-overflow-actions] [data-action="copy-markdown"]').exists()).toBe(false);
```

Add a non-image case:

```ts
const textFile = { ...imageFile, pathname: "notes.txt", contentType: "text/plain" };
const wrapper = mountTable({ folders: [], files: [textFile] });
const directActions = wrapper.get("[data-direct-actions]");

expect(directActions.find('[data-action="copy-raw"]').exists()).toBe(true);
expect(directActions.find('[data-action="copy-markdown"]').exists()).toBe(false);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
pnpm test --run test/file-manager/FileTable.spec.ts
```

Expected: FAIL because `data-direct-actions` and `data-overflow-actions` are not present and the copy actions still live inside the overflow menu.

- [ ] **Step 3: Implement persistent inline copy buttons**

In the file action cell, add an inline group before `DropdownMenu`:

```vue
<div data-direct-actions class="flex items-center justify-end gap-1">
  <Tooltip>
    <TooltipTrigger as-child>
      <Button
        variant="ghost"
        size="icon"
        class="size-11 md:size-9"
        data-action="copy-raw"
        :aria-label="t('files.actions.copyRaw')"
        @click="emit('copy-url', { pathname: file.pathname, type: 'raw' })"
      >
        <Link class="size-4" aria-hidden="true" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>{{ t("files.actions.copyRaw") }}</TooltipContent>
  </Tooltip>

  <Tooltip v-if="isImage(file)">
    <TooltipTrigger as-child>
      <Button
        variant="ghost"
        size="icon"
        class="size-11 md:size-9"
        data-action="copy-markdown"
        :aria-label="t('files.actions.copyMarkdown')"
        @click="emit('copy-url', { pathname: file.pathname, type: 'markdown' })"
      >
        <Image class="size-4" aria-hidden="true" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>{{ t("files.actions.copyMarkdown") }}</TooltipContent>
  </Tooltip>

  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button
        variant="ghost"
        size="icon"
        class="size-11 md:size-9"
        :aria-label="t('files.actions.menu', { name: getFileName(file.pathname) })"
      >
        <MoreHorizontal class="size-4" aria-hidden="true" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent data-overflow-actions align="end">
      <!-- preview, rename, move, delete only -->
    </DropdownMenuContent>
  </DropdownMenu>
</div>
```

Remove `copy-raw` and `copy-markdown` items from `DropdownMenuContent`. Set the action header and file action cell to `w-[8.75rem] md:w-[7.25rem]`, which fits three 44-pixel mobile targets or three 36-pixel desktop targets plus two 4-pixel gaps.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run:

```bash
pnpm test --run test/file-manager/FileTable.spec.ts test/file-manager/FileManager.spec.ts
```

Expected: PASS with the existing raw and Markdown payload assertions unchanged.

- [ ] **Step 5: Run the full verification gate**

Run:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test --run
pnpm build
NITRO_PRESET=cloudflare_module pnpm build
git diff --check
```

Expected: all commands exit 0; only known upstream sourcemap, PURE annotation, and MIME ESM warnings may remain.

- [ ] **Step 6: Commit and update PR #9**

```bash
git add app/components/file-manager/FileTable.vue test/file-manager/FileTable.spec.ts
/commit-message en auto
git push origin codex/dashboard-ux-ui
```

Expected header: `perf(file-table): promote common copy actions`.
