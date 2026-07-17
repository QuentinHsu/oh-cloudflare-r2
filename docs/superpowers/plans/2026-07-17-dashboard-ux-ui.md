# Dashboard UX/UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the authenticated R2 file manager with the shadcn-vue `dashboard-01` shell, a responsive folder sidebar, current-directory summary cards, a discoverable file table, light/dark themes, and persistent Simplified Chinese/English localization.

**Architecture:** Keep `FileManager.vue` as the orchestration boundary and preserve every existing file API/composable contract. Add a presentation layer for locale-aware formatting and directory statistics, then compose focused shell, sidebar, summary, state, table, and bulk-action components around the existing upload and mutation workflows. Use shadcn-vue primitives for structure and accessibility, but keep sorting and selection in the existing focused composables instead of adding TanStack Table.

**Tech Stack:** Nuxt 4.4.8, Vue 3, TypeScript, Tailwind CSS 4, shadcn-vue 2.8.0, reka-ui 2.10.1, `@nuxtjs/i18n` 10.4.1, `vue-i18n` 11.4.6, `@nuxtjs/color-mode` 4.0.1, Vitest 4.1.10, Vue Test Utils.

## Global Constraints

- Keep the existing file API contracts and public `/api/blob/**` and `/images/**` URLs unchanged.
- Do not add charts, a database, KV, TanStack Table, or a global storage-statistics endpoint.
- Summary cards describe only the currently loaded directory and use unfiltered source data.
- Folder rows navigate but are not selectable; batch operations continue to target files only.
- Preserve upload, drag/drop, preview, copy URL, copy Markdown, rename, move, delete, batch move, and batch delete behavior.
- Preserve the 50-file upload limit, 100-operation batch limit, strict path validation, and no-overwrite behavior.
- Support `light`, `dark`, and `system` themes exclusively through semantic color tokens.
- Support `zh-CN` and `en`; first visit follows browser preference, explicit selection persists, and routes remain unprefixed.
- Critical actions must work with keyboard, mouse, and touch; no critical action may depend on hover.
- Mobile interactive targets must be at least 44 by 44 CSS pixels.
- Use `/commit-message en auto` for every implementation commit.

---

## File Structure

### Configuration and locale resources

- Modify `package.json` and `pnpm-lock.yaml` to add Nuxt i18n dependencies.
- Modify `nuxt.config.ts` to register locale detection and no-prefix routing.
- Create `i18n/locales/en.json` and `i18n/locales/zh-CN.json` as the only sources of user-facing copy.
- Create `test/utils/i18n.ts` to mount localized components consistently.

### Presentation utilities

- Create `app/composables/file-manager/useFilePresentation.ts` for locale-aware name, type, size, date, relative-time, and current-directory summary formatting.
- Create `test/file-manager/useFilePresentation.spec.ts` for pure presentation behavior.

### Application shell

- Replace `app/layouts/default.vue` with the global `TooltipProvider`; `FileManager.vue` owns `SidebarProvider` and `SidebarInset` because it owns folder and upload state.
- Create `app/components/AppSidebar.vue` for brand, upload, folder navigation, locale, theme, and account controls.
- Create `app/components/LanguageToggle.vue` for persistent locale selection.
- Reshape `app/components/FolderTreeNode.vue`, `app/components/ThemeToggle.vue`, and `app/components/UserMenu.vue` for sidebar use.
- Create `app/components/file-manager/FileDashboardHeader.vue` for the sidebar trigger and breadcrumb.

### File dashboard content

- Create `app/components/file-manager/FileStats.vue` for four source-directory summary cards.
- Create `app/components/file-manager/FileStatePanel.vue` for loading, error, empty, and no-results states.
- Create `app/components/file-manager/FileBulkToolbar.vue` for always-available selection workflows.
- Replace `app/components/file-manager/FileList.vue` with `app/components/file-manager/FileTable.vue`.
- Remove `app/components/file-manager/FileManagerToolbar.vue` and `app/components/file-manager/FileViewControls.vue` after integration.
- Modify `app/composables/file-manager/useFileSelection.ts` to remove selection mode.
- Modify `app/components/FileManager.vue` to orchestrate the new components.

### Dialogs and global surfaces

- Localize and restyle all file dialogs, the drop overlay, login page, metadata, theme menu, user menu, and toasts.
- Replace `window.confirm` with controlled shadcn `AlertDialog` confirmation state in the file-operation composables.

### Shadcn primitives

- Generate missing components under `app/components/ui/`: `sidebar`, `breadcrumb`, `table`, `checkbox`, `badge`, `skeleton`, `tooltip`, `collapsible`, and `alert-dialog`.
- Modify `app/assets/css/main.css` only for shared semantic tokens, body typography, sidebar variables, responsive defaults, and focus/contrast corrections.

---

### Task 1: Establish the localization foundation

**Files:**

- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `nuxt.config.ts`
- Create: `i18n/locales/en.json`
- Create: `i18n/locales/zh-CN.json`
- Create: `test/utils/i18n.ts`
- Create: `test/file-manager/i18n.spec.ts`

**Interfaces:**

- Produces: Nuxt auto-imports `useI18n()` and `$t`; locale codes are exactly `"en" | "zh-CN"`.
- Produces: `mountWithI18n(component, options, locale?)` for later component tests.
- Persistence contract: cookie key `r2_locale`, browser detection only when no explicit cookie exists.

- [ ] **Step 1: Write the failing i18n configuration test**

Create `test/file-manager/i18n.spec.ts`:

```ts
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const en = JSON.parse(readFileSync("i18n/locales/en.json", "utf8"));
const zhCN = JSON.parse(readFileSync("i18n/locales/zh-CN.json", "utf8"));

function flattenKeys(value: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return child && typeof child === "object" && !Array.isArray(child)
      ? flattenKeys(child as Record<string, unknown>, path)
      : [path];
  });
}

describe("dashboard locales", () => {
  it("keeps English and Simplified Chinese key sets identical", () => {
    expect(flattenKeys(zhCN)).toEqual(flattenKeys(en));
  });

  it("contains critical file workflows in both languages", () => {
    for (const messages of [en, zhCN]) {
      expect(messages.sidebar.upload).toBeTruthy();
      expect(messages.files.actions.delete).toBeTruthy();
      expect(messages.files.states.retry).toBeTruthy();
      expect(messages.dialogs.batchMove.title).toBeTruthy();
      expect(messages.errors.partial.title).toBeTruthy();
    }
  });
});
```

- [ ] **Step 2: Run the test and verify the locale files are missing**

Run: `pnpm test --run test/file-manager/i18n.spec.ts`

Expected: FAIL with `ENOENT` for `i18n/locales/en.json`.

- [ ] **Step 3: Install i18n dependencies and configure Nuxt**

Run:

```bash
pnpm add @nuxtjs/i18n@^10.4.1 vue-i18n@^11.4.6
```

Add `@nuxtjs/i18n` to `modules` and add this exact configuration to `nuxt.config.ts`:

```ts
i18n: {
  strategy: "no_prefix",
  defaultLocale: "en",
  langDir: "locales",
  locales: [
    { code: "en", language: "en", name: "English", file: "en.json" },
    {
      code: "zh-CN",
      language: "zh-CN",
      name: "简体中文",
      file: "zh-CN.json",
    },
  ],
  detectBrowserLanguage: {
    useCookie: true,
    cookieKey: "r2_locale",
    fallbackLocale: "en",
    redirectOn: "root",
  },
},
```

- [ ] **Step 4: Create complete, structurally identical locale resources**

Create both JSON files with the same nested keys. The English file must contain at least this complete contract; the Chinese file translates every leaf without changing interpolation names:

```json
{
  "app": {
    "name": "R2 Dashboard",
    "description": "Manage files stored in Cloudflare R2"
  },
  "sidebar": {
    "files": "Files",
    "root": "All files",
    "upload": "Upload files",
    "appearance": "Appearance",
    "language": "Language",
    "account": "Account",
    "collapse": "Collapse sidebar",
    "expand": "Expand sidebar"
  },
  "theme": {
    "light": "Light",
    "dark": "Dark",
    "system": "System",
    "toggle": "Change theme"
  },
  "locale": {
    "en": "English",
    "zhCN": "Simplified Chinese",
    "toggle": "Change language"
  },
  "files": {
    "title": "{name}",
    "rootTitle": "All files",
    "description": "Manage files and folders in this directory",
    "search": "Search this folder…",
    "clearSearch": "Clear search",
    "results": "{count} results",
    "selected": "{count} selected",
    "columns": {
      "name": "Name",
      "type": "Type",
      "size": "Size",
      "updatedAt": "Updated"
    },
    "sort": {
      "field": "Sort field",
      "name": "Name",
      "uploadedAt": "Updated",
      "size": "Size",
      "ascending": "Sort ascending",
      "descending": "Sort descending"
    },
    "actions": {
      "menu": "Open actions for {name}",
      "preview": "Preview",
      "copyRaw": "Copy link",
      "copyMarkdown": "Copy Markdown",
      "rename": "Rename",
      "move": "Move",
      "delete": "Delete",
      "clearSelection": "Clear selection"
    },
    "states": {
      "loading": "Loading files…",
      "errorTitle": "Files could not be loaded",
      "errorDescription": "Check the connection and try again.",
      "retry": "Try again",
      "emptyTitle": "This folder is empty",
      "emptyDescription": "Upload files to start using this folder.",
      "noResultsTitle": "No matching files or folders",
      "noResultsDescription": "No results for “{query}”."
    }
  },
  "stats": {
    "files": "Files",
    "images": "{count} images",
    "storage": "Storage",
    "folders": "Folders",
    "latest": "Latest update",
    "never": "No updates"
  },
  "upload": {
    "title": "Upload {count} files",
    "target": "Target folder",
    "pathPlaceholder": "Enter a path or use the current folder",
    "dropTitle": "Drop to upload",
    "dropDescription": "You can upload multiple files at once",
    "uploading": "Uploading…",
    "confirm": "Upload",
    "cancel": "Cancel"
  },
  "dialogs": {
    "rename": {
      "title": "Rename file",
      "current": "Current name",
      "next": "New name",
      "placeholder": "Enter a new file name",
      "working": "Renaming…",
      "confirm": "Rename"
    },
    "move": {
      "title": "Move file",
      "target": "Target folder",
      "placeholder": "Enter a path or move to the root",
      "working": "Moving…",
      "confirm": "Move"
    },
    "batchMove": {
      "title": "Move {count} files",
      "working": "Moving…",
      "confirm": "Move"
    },
    "delete": {
      "title": "Delete file?",
      "description": "“{name}” will be permanently deleted.",
      "confirm": "Delete",
      "working": "Deleting…"
    },
    "batchDelete": {
      "title": "Delete {count} files?",
      "description": "The selected files will be permanently deleted.",
      "confirm": "Delete",
      "working": "Deleting…"
    },
    "preview": {
      "title": "Preview {name}",
      "copyRaw": "Copy link",
      "copyMarkdown": "Copy Markdown"
    },
    "cancel": "Cancel"
  },
  "auth": {
    "title": "R2 Dashboard",
    "description": "Sign in to manage your files",
    "github": "Continue with GitHub",
    "unauthorized": "This GitHub account does not have access",
    "failed": "Sign-in failed. Try again.",
    "logout": "Sign out",
    "githubUser": "GitHub user"
  },
  "errors": {
    "partial": {
      "title": "Some operations did not complete",
      "description": "{completed} completed and {failed} failed."
    }
  }
}
```

- [ ] **Step 5: Add the reusable i18n mount helper**

Create `test/utils/i18n.ts`:

```ts
import { mount, type ComponentMountingOptions } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import en from "../../i18n/locales/en.json";
import zhCN from "../../i18n/locales/zh-CN.json";

export function mountWithI18n<T>(
  component: T,
  options: ComponentMountingOptions<T> = {},
  locale: "en" | "zh-CN" = "en",
) {
  const i18n = createI18n({
    legacy: false,
    locale,
    fallbackLocale: "en",
    messages: { en, "zh-CN": zhCN },
  });
  return mount(component, {
    ...options,
    global: {
      ...options.global,
      plugins: [...(options.global?.plugins ?? []), i18n],
    },
  });
}
```

- [ ] **Step 6: Run focused tests and type generation**

Run:

```bash
pnpm test --run test/file-manager/i18n.spec.ts
pnpm exec nuxt prepare
```

Expected: locale tests PASS and Nuxt type generation exits 0.

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml nuxt.config.ts i18n test/utils/i18n.ts test/file-manager/i18n.spec.ts
/commit-message en auto
```

Expected header: `feat(i18n): add persistent Chinese and English locales`.

---

### Task 2: Add locale-aware file presentation and summary data

**Files:**

- Create: `app/composables/file-manager/useFilePresentation.ts`
- Create: `test/file-manager/useFilePresentation.spec.ts`
- Modify: `app/components/file-manager/utils.ts`
- Modify: `test/file-manager/utils.spec.ts`

**Interfaces:**

- Produces: `DirectorySummary` with `fileCount`, `imageCount`, `folderCount`, `totalSize`, and `latestFile`.
- Produces: `createFilePresentation(locale, translate)` with `formatSize`, `formatDate`, `formatRelativeTime`, `formatFileType`, and `summarizeDirectory`.
- Consumes: `BlobFile` and direct-child folder names from the current directory response.

- [ ] **Step 1: Write failing presentation tests**

Create `test/file-manager/useFilePresentation.spec.ts` with these assertions:

```ts
import { describe, expect, it } from "vitest";
import { createFilePresentation } from "../../app/composables/file-manager/useFilePresentation";
import type { BlobFile } from "../../app/components/file-manager/types";

const files: BlobFile[] = [
  {
    pathname: "hero.png",
    contentType: "image/png",
    size: 1536,
    uploadedAt: "2026-07-17T08:00:00Z",
  },
  {
    pathname: "notes.txt",
    contentType: "text/plain",
    size: 512,
    uploadedAt: "2026-07-16T08:00:00Z",
  },
];

const t = (key: string, values?: Record<string, unknown>) =>
  values ? `${key}:${JSON.stringify(values)}` : key;

describe("createFilePresentation", () => {
  it("summarizes unfiltered current-directory data", () => {
    const presentation = createFilePresentation("en", t, () => new Date("2026-07-17T09:00:00Z"));
    expect(presentation.summarizeDirectory(["docs", "images"], files)).toEqual({
      fileCount: 2,
      imageCount: 1,
      folderCount: 2,
      totalSize: 2048,
      latestFile: files[0],
    });
  });

  it("formats bytes and dates using the active locale", () => {
    const en = createFilePresentation("en", t);
    const zh = createFilePresentation("zh-CN", t);
    expect(en.formatSize(1536)).toMatch(/1\.5\s?kB/i);
    expect(zh.formatDate("2026-07-17T08:00:00Z")).not.toBe(en.formatDate("2026-07-17T08:00:00Z"));
  });

  it("uses MIME content for readable file types", () => {
    const presentation = createFilePresentation("en", t);
    expect(presentation.formatFileType(files[0])).toBe("PNG");
    expect(presentation.formatFileType(files[1])).toBe("TXT");
  });
});
```

- [ ] **Step 2: Run the test and verify the module is missing**

Run: `pnpm test --run test/file-manager/useFilePresentation.spec.ts`

Expected: FAIL with module resolution error.

- [ ] **Step 3: Implement the pure presentation factory**

Create `useFilePresentation.ts` with these exact public types and functions:

```ts
import type { BlobFile } from "../../components/file-manager/types";
import { getFileName } from "../../components/file-manager/utils";

export type DirectorySummary = {
  fileCount: number;
  imageCount: number;
  folderCount: number;
  totalSize: number;
  latestFile?: BlobFile;
};

type Translate = (key: string, values?: Record<string, unknown>) => string;

export function createFilePresentation(
  locale: string,
  t: Translate,
  now: () => Date = () => new Date(),
) {
  const number = new Intl.NumberFormat(locale);
  const size = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });
  const relative = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${number.format(bytes)} B`;
    if (bytes < 1024 ** 2) return `${size.format(bytes / 1024)} kB`;
    if (bytes < 1024 ** 3) return `${size.format(bytes / 1024 ** 2)} MB`;
    return `${size.format(bytes / 1024 ** 3)} GB`;
  }

  function formatDate(value: string): string {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : date.format(parsed);
  }

  function formatRelativeTime(value: string): string {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    const minutes = Math.round((parsed.getTime() - now().getTime()) / 60_000);
    if (Math.abs(minutes) < 60) return relative.format(minutes, "minute");
    const hours = Math.round(minutes / 60);
    if (Math.abs(hours) < 24) return relative.format(hours, "hour");
    return relative.format(Math.round(hours / 24), "day");
  }

  function formatFileType(file: BlobFile): string {
    const extension = getFileName(file.pathname).split(".").pop();
    if (extension && extension !== getFileName(file.pathname))
      return extension.toLocaleUpperCase(locale);
    return file.contentType.split("/").pop()?.toLocaleUpperCase(locale) ?? t("files.typeUnknown");
  }

  function summarizeDirectory(
    folders: readonly string[],
    files: readonly BlobFile[],
  ): DirectorySummary {
    const latestFile = files.toSorted(
      (left, right) => Date.parse(right.uploadedAt) - Date.parse(left.uploadedAt),
    )[0];
    return {
      fileCount: files.length,
      imageCount: files.filter((file) => file.contentType.startsWith("image/")).length,
      folderCount: folders.length,
      totalSize: files.reduce((total, file) => total + file.size, 0),
      latestFile,
    };
  }

  return { formatSize, formatDate, formatRelativeTime, formatFileType, summarizeDirectory };
}
```

Add the missing `files.typeUnknown` key to both locale files with values `"File"` and `"文件"`.

- [ ] **Step 4: Remove duplicate size/date formatting from the old list utility path**

Delete component-local `formatSize`, `pad`, and `formatDate` logic from `FileList.vue` only when Task 6 replaces that file. For this task, add tests to `utils.spec.ts` ensuring `getFileName` remains the single filename extractor and do not move locale formatting back into `utils.ts`.

- [ ] **Step 5: Run focused tests**

Run:

```bash
pnpm test --run test/file-manager/useFilePresentation.spec.ts test/file-manager/utils.spec.ts
pnpm typecheck
```

Expected: focused tests PASS and typecheck exits 0.

- [ ] **Step 6: Commit**

```bash
git add app/composables/file-manager/useFilePresentation.ts app/components/file-manager/utils.ts i18n/locales test/file-manager/useFilePresentation.spec.ts test/file-manager/utils.spec.ts
/commit-message en auto
```

Expected header: `feat(file-view): add locale-aware file presentation`.

---

### Task 3: Generate shadcn dashboard primitives and semantic theme tokens

**Files:**

- Create: `app/components/ui/sidebar/**`
- Create: `app/components/ui/breadcrumb/**`
- Create: `app/components/ui/table/**`
- Create: `app/components/ui/checkbox/**`
- Create: `app/components/ui/badge/**`
- Create: `app/components/ui/skeleton/**`
- Create: `app/components/ui/tooltip/**`
- Create: `app/components/ui/collapsible/**`
- Create: `app/components/ui/alert-dialog/**`
- Modify: `app/assets/css/main.css`
- Create: `test/file-manager/theme-tokens.spec.ts`

**Interfaces:**

- Produces: standard shadcn-vue exports from every generated component directory.
- Produces: sidebar semantic variables consumed by `SidebarProvider` and `AppSidebar`.
- Does not produce business state or copy.

- [ ] **Step 1: Write the failing theme-token contract test**

Create `test/file-manager/theme-tokens.spec.ts`:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("app/assets/css/main.css", "utf8");

describe("dashboard theme tokens", () => {
  it.each([
    "--sidebar",
    "--sidebar-foreground",
    "--sidebar-primary",
    "--sidebar-primary-foreground",
    "--sidebar-accent",
    "--sidebar-accent-foreground",
    "--sidebar-border",
    "--sidebar-ring",
  ])("defines %s in light and dark themes", (token) => {
    expect(css.match(new RegExp(token, "g"))).toHaveLength(2);
  });

  it("maps sidebar variables into Tailwind theme colors", () => {
    expect(css).toContain("--color-sidebar: var(--sidebar)");
    expect(css).toContain("--color-sidebar-foreground: var(--sidebar-foreground)");
  });
});
```

- [ ] **Step 2: Run the test and verify sidebar tokens are absent**

Run: `pnpm test --run test/file-manager/theme-tokens.spec.ts`

Expected: FAIL because sidebar variables are missing.

- [ ] **Step 3: Generate the exact shadcn-vue primitives**

Run:

```bash
pnpm dlx shadcn-vue@2.8.0 add sidebar breadcrumb table checkbox badge skeleton tooltip collapsible alert-dialog
```

Review generated imports and keep the repository's existing `~/components` and `~/lib/utils` aliases. Do not customize generated business copy.

- [ ] **Step 4: Add dashboard semantic tokens**

Extend `@theme inline`, `:root`, and `.dark` in `main.css` with the sidebar variables generated by the official component. Keep the generated neutral palette, retain the current destructive token, set `body` to `min-height: 100vh`, and add:

```css
@layer base {
  html {
    font-feature-settings:
      "rlig" 1,
      "calt" 1;
  }

  body {
    @apply min-h-screen bg-background text-foreground antialiased;
  }

  button,
  [role="button"],
  a,
  input,
  select,
  textarea {
    @apply focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background;
  }
}
```

- [ ] **Step 5: Verify the generated primitives and tokens**

Run:

```bash
pnpm test --run test/file-manager/theme-tokens.spec.ts
pnpm format:check
pnpm typecheck
```

Expected: PASS with no unresolved generated imports.

- [ ] **Step 6: Commit**

```bash
git add app/components/ui app/assets/css/main.css test/file-manager/theme-tokens.spec.ts
/commit-message en auto
```

Expected header: `feat(ui): add dashboard component primitives`.

---

### Task 4: Build the responsive dashboard shell and folder sidebar

**Files:**

- Create: `app/components/AppSidebar.vue`
- Create: `app/components/LanguageToggle.vue`
- Create: `app/components/file-manager/FileDashboardHeader.vue`
- Modify: `app/components/file-manager/types.ts`
- Modify: `app/components/FolderTreeNode.vue`
- Modify: `app/components/ThemeToggle.vue`
- Modify: `app/components/UserMenu.vue`
- Modify: `app/layouts/default.vue`
- Create: `test/file-manager/AppSidebar.spec.ts`
- Create: `test/file-manager/FileDashboardHeader.spec.ts`
- Create: `test/file-manager/LanguageToggle.spec.ts`
- Modify: `test/file-manager/useFolderBrowser.spec.ts`

**Interfaces:**

- `AppSidebar` consumes `folderTree`, `currentPath`, `expandedFolders`, `isUploading` and emits `navigate`, `toggle-folder`, and `files-selected`.
- `FileDashboardHeader` consumes `pathParts` and emits `navigate`.
- `LanguageToggle` consumes no props and changes `useI18n().locale` with `setLocale`.
- `FolderTreeNode` keeps `select(path)` and `toggle(path)` events, with accessible button semantics.

- [ ] **Step 1: Write failing shell component tests**

Cover these exact behaviors:

```ts
it("navigates to the selected folder from the sidebar", async () => {
  const wrapper = mountSidebar();
  await wrapper.get('[data-folder-path="images/campaign"]').trigger("click");
  expect(wrapper.emitted("navigate")?.at(-1)).toEqual(["images/campaign"]);
});

it("emits selected files from the primary upload input", async () => {
  const wrapper = mountSidebar();
  const input = wrapper.get('input[type="file"]');
  // assign a FileList-like object exactly as existing FileManagerToolbar tests do
  await input.trigger("change");
  expect(wrapper.emitted("files-selected")).toHaveLength(1);
});

it("changes locale without navigating", async () => {
  const wrapper = mountLanguageToggle("en");
  await wrapper.get('[data-locale="zh-CN"]').trigger("click");
  expect(wrapper.vm.$i18n.locale).toBe("zh-CN");
});

it("emits root and path breadcrumb navigation", async () => {
  const wrapper = mountHeader(["images", "campaign"]);
  await wrapper.get('[data-path-index="-1"]').trigger("click");
  await wrapper.get('[data-path-index="0"]').trigger("click");
  expect(wrapper.emitted("navigate")).toEqual([[-1], [0]]);
});
```

- [ ] **Step 2: Run tests and verify components are missing**

Run:

```bash
pnpm test --run test/file-manager/AppSidebar.spec.ts test/file-manager/FileDashboardHeader.spec.ts test/file-manager/LanguageToggle.spec.ts
```

Expected: FAIL with missing component modules.

- [ ] **Step 3: Add direct-path navigation to `useFolderBrowser`**

Add:

```ts
function navigateToDirectory(path: string) {
  currentPath.value = path;
  expandPathParents(path);
}
```

Return `navigateToDirectory` and test that selecting `images/campaign` updates `currentPath` and expands `images`.

- [ ] **Step 4: Implement `LanguageToggle.vue`**

Use a localized dropdown with two stable controls:

```vue
<script setup lang="ts">
import { Languages } from "@lucide/vue";

const { locale, locales, setLocale, t } = useI18n();
type SupportedLocale = "en" | "zh-CN";

function selectLocale(code: SupportedLocale) {
  return setLocale(code);
}
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button
        variant="ghost"
        size="icon"
        class="size-11 md:size-8"
        :aria-label="t('locale.toggle')"
      >
        <Languages class="size-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuRadioGroup
        :model-value="locale"
        @update:model-value="selectLocale($event as SupportedLocale)"
      >
        <DropdownMenuRadioItem
          v-for="item in locales"
          :key="item.code"
          :value="item.code"
          :data-locale="item.code"
        >
          {{ item.name }}
        </DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
```

- [ ] **Step 5: Implement the sidebar, folder rows, and header**

Use `Sidebar`, `SidebarHeader`, `SidebarContent`, `SidebarGroup`, `SidebarMenu`, `SidebarFooter`, `SidebarRail`, `Collapsible`, and `Tooltip`. Requirements:

- Primary upload button owns a hidden unrestricted `multiple` file input.
- Root and folder items expose `data-folder-path` and `aria-current="page"` when active.
- Expansion and navigation are separate buttons so toggling does not navigate.
- Theme, locale, and user controls remain reachable when the sidebar is collapsed.
- `FileDashboardHeader` uses `SidebarTrigger`, `Breadcrumb`, and a horizontally scrollable breadcrumb list.

Use these exact component contracts:

```ts
export interface FileListLike extends Array<File> {
  item(index: number): File | null;
}

type AppSidebarProps = {
  folderTree: FolderNode[];
  currentPath: string;
  expandedFolders: string[];
  isUploading: boolean;
};

type AppSidebarEmits = {
  navigate: [path: string];
  "toggle-folder": [path: string];
  "files-selected": [files: FileListLike];
};
```

Move `FileListLike` from the old toolbar into `app/components/file-manager/types.ts` so the sidebar, FileManager, and tests share one public type.

- [ ] **Step 6: Replace the default layout shell**

`default.vue` becomes:

```vue
<template>
  <TooltipProvider>
    <slot />
  </TooltipProvider>
</template>
```

`FileManager.vue` will own `SidebarProvider`, `AppSidebar`, and `SidebarInset` in Task 8 because it already owns the folder and upload state. Do not move file API state into the layout.

- [ ] **Step 7: Run shell tests and typecheck**

Run:

```bash
pnpm test --run test/file-manager/AppSidebar.spec.ts test/file-manager/FileDashboardHeader.spec.ts test/file-manager/LanguageToggle.spec.ts test/file-manager/useFolderBrowser.spec.ts
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add app/components/AppSidebar.vue app/components/LanguageToggle.vue app/components/FolderTreeNode.vue app/components/ThemeToggle.vue app/components/UserMenu.vue app/components/file-manager/FileDashboardHeader.vue app/components/file-manager/types.ts app/layouts/default.vue app/composables/file-manager/useFolderBrowser.ts test/file-manager
/commit-message en auto
```

Expected header: `perf(navigation): add responsive folder sidebar`.

---

### Task 5: Add current-directory statistics and explicit file states

**Files:**

- Create: `app/components/file-manager/FileStats.vue`
- Create: `app/components/file-manager/FileStatePanel.vue`
- Create: `test/file-manager/FileStats.spec.ts`
- Create: `test/file-manager/FileStatePanel.spec.ts`

**Interfaces:**

- `FileStats` consumes `summary: DirectorySummary`, `formatSize`, and `formatRelativeTime`.
- `FileStatePanel` consumes one discriminated `state` and emits `retry`, `upload`, or `clear-search` when applicable.

- [ ] **Step 1: Write failing component tests**

Use these cases:

```ts
it("renders four current-directory metrics", () => {
  const wrapper = mountStats({
    fileCount: 3,
    imageCount: 2,
    folderCount: 1,
    totalSize: 2048,
    latestFile: {
      pathname: "hero.png",
      contentType: "image/png",
      size: 1024,
      uploadedAt: "2026-07-17",
    },
  });
  expect(wrapper.findAll("[data-stat-card]")).toHaveLength(4);
  expect(wrapper.text()).toContain("3");
  expect(wrapper.text()).toContain("2 kB");
  expect(wrapper.text()).toContain("hero.png");
});

it.each(["loading", "error", "empty", "no-results"] as const)(
  "renders the %s state without showing a misleading table",
  (kind) => {
    const wrapper = mountState({ kind, query: kind === "no-results" ? "cat" : undefined });
    expect(wrapper.attributes("data-state")).toBe(kind);
  },
);
```

- [ ] **Step 2: Run tests and verify components are missing**

Run: `pnpm test --run test/file-manager/FileStats.spec.ts test/file-manager/FileStatePanel.spec.ts`

Expected: FAIL with missing component modules.

- [ ] **Step 3: Implement `FileStats.vue` with semantic cards**

Render exactly four `Card` elements with `data-stat-card` values `files`, `storage`, `folders`, and `latest`. Use `Badge` for image count, locale formatters passed as props, `getFileName` for the latest file, and `stats.never` when `latestFile` is absent. Do not read filtered table results.

- [ ] **Step 4: Implement a discriminated state component**

Use:

```ts
type FilePanelState =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "empty" }
  | { kind: "no-results"; query: string; count: 0 };
```

Loading renders summary and table `Skeleton`s. Error renders a retry button. Empty renders upload. No-results renders the escaped query and clear-search button. Every root includes `data-state` and an appropriate `aria-live` value.

- [ ] **Step 5: Run tests and accessibility assertions**

Run:

```bash
pnpm test --run test/file-manager/FileStats.spec.ts test/file-manager/FileStatePanel.spec.ts
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/components/file-manager/FileStats.vue app/components/file-manager/FileStatePanel.vue test/file-manager/FileStats.spec.ts test/file-manager/FileStatePanel.spec.ts
/commit-message en auto
```

Expected header: `perf(file-view): clarify directory summary and states`.

---

### Task 6: Build a discoverable file table and bulk toolbar

**Files:**

- Create: `app/components/file-manager/FileBulkToolbar.vue`
- Create: `app/components/file-manager/FileTable.vue`
- Create: `test/file-manager/FileBulkToolbar.spec.ts`
- Create: `test/file-manager/FileTable.spec.ts`

**Interfaces:**

- `FileTable` owns search/sort controls as controlled props and emits business intent only.
- `FileBulkToolbar` consumes selected count and busy state, and emits move, delete, and clear.
- Existing list, toolbar, view controls, and selection-mode APIs remain untouched until Task 8 performs the atomic integration.

- [ ] **Step 1: Write failing table and bulk-toolbar tests**

The table tests must verify:

```ts
it("keeps row menus visible and emits every applicable image action", async () => {
  const wrapper = mountTable({ files: [imageFile], folders: [] });
  expect(wrapper.get('[aria-label="Open actions for cat.png"]').isVisible()).toBe(true);
  await openRowMenu(wrapper, "cat.png");
  await wrapper.get('[data-action="copy-raw"]').trigger("click");
  await wrapper.get('[data-action="copy-markdown"]').trigger("click");
  await wrapper.get('[data-action="rename"]').trigger("click");
  await wrapper.get('[data-action="move"]').trigger("click");
  await wrapper.get('[data-action="delete"]').trigger("click");
  expect(wrapper.emitted("copy-url")).toEqual([
    [{ pathname: imageFile.pathname, type: "raw" }],
    [{ pathname: imageFile.pathname, type: "markdown" }],
  ]);
});

it("navigates folder rows but never renders a folder checkbox", async () => {
  const wrapper = mountTable({ files: [], folders: ["docs"] });
  expect(wrapper.find('[data-folder="docs"] input[type="checkbox"]').exists()).toBe(false);
  await wrapper.get('[data-folder="docs"]').trigger("click");
  expect(wrapper.emitted("navigate-folder")).toEqual([["docs"]]);
});

it("shows mobile-priority cells independently from optional metadata", () => {
  const wrapper = mountTable();
  expect(wrapper.get('[data-column="name"]').classes()).not.toContain("hidden");
  expect(wrapper.get('[data-column="size"]').classes()).toContain("hidden");
  expect(wrapper.get('[data-column="updatedAt"]').classes()).toContain("hidden");
});
```

The bulk toolbar test verifies that it renders only when `selectedCount > 0` and emits `move`, `delete`, and `clear`.

- [ ] **Step 2: Run the component tests and verify the modules are missing**

Run:

```bash
pnpm test --run test/file-manager/FileBulkToolbar.spec.ts test/file-manager/FileTable.spec.ts
```

Expected: FAIL with missing component modules.

- [ ] **Step 3: Implement `FileBulkToolbar.vue`**

Use `Badge`, `Button`, and localized labels. Root requirements:

```ts
type Props = {
  selectedCount: number;
  isMoving: boolean;
  isDeleting: boolean;
};

type Emits = {
  move: [];
  delete: [];
  clear: [];
};
```

Render the destructive button with a 44px mobile height and do not hide actions behind hover.

- [ ] **Step 4: Implement `FileTable.vue`**

Use controlled props matching the existing view state:

```ts
type Props = {
  folders: string[];
  files: BlobFile[];
  selectedFiles: Set<string>;
  allSelected: boolean;
  searchQuery: string;
  sortField: SortField;
  sortDirection: SortDirection;
  hasActiveSearch: boolean;
  resultCount: number;
  formatSize: (bytes: number) => string;
  formatDate: (value: string) => string;
  formatFileType: (file: BlobFile) => string;
};
```

Emits:

```ts
type Emits = {
  "update:search-query": [value: string];
  "update:sort-field": [value: SortField];
  "toggle-sort-direction": [];
  "clear-search": [];
  "navigate-folder": [folder: string];
  "toggle-select-all": [];
  "toggle-file": [pathname: string];
  "open-preview": [file: BlobFile];
  "copy-url": [payload: CopyUrlPayload];
  rename: [file: BlobFile];
  move: [file: BlobFile];
  delete: [pathname: string];
};
```

Implementation rules:

- Use shadcn `Table`, `Checkbox`, `DropdownMenu`, `Select`, `Input`, and `Button`.
- Render folder rows first and file rows in the order received.
- Give every row action trigger an accessible translated label.
- Keep `name` and actions visible at all widths; hide size before updated time at small breakpoints.
- Image name click emits preview; non-image names remain plain text.
- Do not implement pagination because the API does not paginate.
- Do not add folder checkboxes or folder mutation actions.

- [ ] **Step 5: Run focused component tests and typecheck**

Run:

```bash
pnpm test --run test/file-manager/FileBulkToolbar.spec.ts test/file-manager/FileTable.spec.ts
pnpm typecheck
```

Expected: PASS. The new components compile independently while the existing screen continues to use the old list until Task 8.

- [ ] **Step 6: Commit**

```bash
git add app/components/file-manager/FileBulkToolbar.vue app/components/file-manager/FileTable.vue test/file-manager/FileBulkToolbar.spec.ts test/file-manager/FileTable.spec.ts
/commit-message en auto
```

Expected header: `perf(file-table): streamline selection and row actions`.

---

### Task 7: Localize dialogs and replace browser confirmation with AlertDialog

**Files:**

- Modify: `app/composables/file-manager/useFileOperations.ts`
- Modify: `app/composables/file-manager/useBatchFileOperations.ts`
- Modify: `app/components/FileManager.vue`
- Modify: `app/components/file-manager/UploadDialog.vue`
- Modify: `app/components/file-manager/PreviewDialog.vue`
- Modify: `app/components/file-manager/RenameDialog.vue`
- Modify: `app/components/file-manager/MoveDialog.vue`
- Modify: `app/components/file-manager/BatchMoveDialog.vue`
- Modify: `app/components/file-manager/FileDropOverlay.vue`
- Create: `app/components/file-manager/DeleteAlertDialog.vue`
- Create: `app/components/file-manager/BatchDeleteAlertDialog.vue`
- Modify: `test/file-manager/useFileOperations.spec.ts`
- Modify: `test/file-manager/useBatchFileOperations.spec.ts`
- Create: `test/file-manager/DeleteAlertDialog.spec.ts`

**Interfaces:**

- Operation composables expose open/close/confirm state for delete instead of calling `confirmAction`.
- `DeleteAlertDialog` consumes `open`, `fileName`, and `isDeleting`; emits `update:open`, `confirm`, and `cancel`.
- `BatchDeleteAlertDialog` consumes `open`, `count`, and `isDeleting`; emits the same events.

- [ ] **Step 1: Write failing composable tests for controlled confirmation**

Change operation tests to assert:

```ts
operations.openDeleteDialog("cat.png");
expect(operations.showDeleteDialog.value).toBe(true);
expect(operations.deletePath.value).toBe("cat.png");
expect(api.operate).not.toHaveBeenCalled();

await operations.confirmDelete();
expect(api.operate).toHaveBeenCalledWith({ action: "delete", path: "cat.png" });
```

Do the equivalent for batch delete and remove `confirmAction` from both composable dependency types.

- [ ] **Step 2: Run tests and verify controlled state is missing**

Run:

```bash
pnpm test --run test/file-manager/useFileOperations.spec.ts test/file-manager/useBatchFileOperations.spec.ts
```

Expected: FAIL because the new state and methods do not exist.

- [ ] **Step 3: Implement controlled delete state in both composables**

Single-file state:

```ts
const showDeleteDialog = ref(false);
const deletePath = ref("");
const isDeleting = ref(false);

function openDeleteDialog(pathname: string) {
  deletePath.value = pathname;
  showDeleteDialog.value = true;
}

function closeDeleteDialog() {
  if (isDeleting.value) return;
  showDeleteDialog.value = false;
  deletePath.value = "";
}
```

`confirmDelete` performs the existing API operation, closes only after success, reports failures through the existing notifier, and refreshes through the existing callbacks. Batch delete mirrors this behavior and retains failed selections after partial completion.

- [ ] **Step 4: Implement localized AlertDialog components**

Use shadcn `AlertDialog`, `AlertDialogContent`, `AlertDialogHeader`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogCancel`, and `AlertDialogAction`. The action stays disabled while deleting and uses destructive styling. Do not use `window.confirm` anywhere in `app/`.

- [ ] **Step 5: Localize and restyle every existing dialog**

For each dialog:

- Replace literal Chinese strings with `t(...)`.
- Add translated descriptions and accessible labels.
- Preserve all existing props and emits unless the delete-dialog contract explicitly changes.
- Keep path input behavior and folder-tree selection unchanged.
- Use semantic surfaces and borders only.
- Ensure confirm buttons expose their busy labels.

Update the current `FileManager.vue` in the same task so it stops passing `confirmAction`, opens the new controlled dialogs from delete events, and renders both alert-dialog components. Keep the rest of the current list layout unchanged until Task 8.

- [ ] **Step 6: Run dialog, composable, and regression tests**

Run:

```bash
pnpm test --run test/file-manager/useFileOperations.spec.ts test/file-manager/useBatchFileOperations.spec.ts test/file-manager/DeleteAlertDialog.spec.ts test/file-manager/useFileUpload.spec.ts test/file-manager/useFilePreview.spec.ts
pnpm typecheck
rg -n "window\.confirm|[\u4e00-\u9fff]" app/components/file-manager app/composables/file-manager
```

Expected: tests PASS; `window.confirm` returns no matches. Chinese matches are allowed only in technical comments or test data and should otherwise be moved to locale files.

- [ ] **Step 7: Commit**

```bash
git add app/components/FileManager.vue app/components/file-manager app/composables/file-manager test/file-manager i18n/locales
/commit-message en auto
```

Expected header: `perf(file-actions): add accessible localized confirmations`.

---

### Task 8: Integrate the dashboard components in FileManager

**Files:**

- Modify: `app/components/FileManager.vue`
- Modify: `app/pages/index.vue`
- Modify: `app/composables/file-manager/useFileSelection.ts`
- Modify: `test/file-manager/useFileSelection.spec.ts`
- Modify: `test/file-manager/FileManager.spec.ts`
- Delete: `app/components/file-manager/FileManagerToolbar.vue`
- Delete: `app/components/file-manager/FileViewControls.vue`
- Delete: `app/components/file-manager/FileList.vue`
- Delete: `test/file-manager/FileManagerToolbar.spec.ts`
- Delete: `test/file-manager/FileViewControls.spec.ts`
- Delete: `test/file-manager/FileList.spec.ts`

**Interfaces:**

- Consumes all component and composable interfaces from Tasks 2–7.
- Produces the completed dashboard screen without changing server requests.
- `FileManager.vue` remains the only component that creates the file API client.

- [ ] **Step 1: Write failing always-on selection tests**

Replace the first two tests in `useFileSelection.spec.ts` with:

```ts
it("selects files without entering a separate mode", () => {
  const selection = useFileSelection(ref(files));
  selection.toggleFileSelection("a.png");
  expect(selection.hasSelection.value).toBe(true);
  expect([...selection.selectedFiles.value]).toEqual(["a.png"]);
});

it("selects and clears every visible file", () => {
  const selection = useFileSelection(ref(files));
  selection.toggleSelectAll();
  expect(selection.allSelected.value).toBe(true);
  selection.toggleSelectAll();
  expect(selection.selectedFiles.value.size).toBe(0);
});
```

Assert that `"isSelectionMode" in selection` and `"toggleSelectionMode" in selection` are false.

- [ ] **Step 2: Run the selection test and verify the compatibility API remains**

Run: `pnpm test --run test/file-manager/useFileSelection.spec.ts`

Expected: FAIL because the old selection-mode properties still exist.

- [ ] **Step 3: Remove selection mode from the composable**

Delete `isSelectionMode`, `toggleSelectionMode`, and their return values. Preserve `selectedFiles`, `hasSelection`, `allSelected`, `clearSelection`, `replaceSelection`, `toggleFileSelection`, and `toggleSelectAll` without changing their path semantics.

- [ ] **Step 4: Rewrite the orchestration test stubs for the new component graph**

Replace old `FileManagerToolbar`, `FileViewControls`, and `FileList` stubs with:

```ts
const SidebarStub = defineComponent({
  name: "AppSidebar",
  emits: ["navigate", "files-selected"],
  setup(_, { emit }) {
    return () =>
      h("aside", [
        h("button", { "data-action": "navigate-docs", onClick: () => emit("navigate", "docs") }),
        h("button", {
          "data-action": "pick-files",
          onClick: () => emit("files-selected", createFileList([new File(["a"], "a.txt")])),
        }),
      ]);
  },
});

const TableStub = defineComponent({
  name: "FileTable",
  props: ["files", "selectedFiles", "searchQuery", "sortField", "sortDirection"],
  emits: ["update:search-query", "toggle-select-all", "delete"],
  setup(props, { emit }) {
    return () =>
      h("div", [
        h(
          "span",
          { "data-files": "value" },
          props.files.map((file: BlobFile) => file.pathname).join(","),
        ),
        h("span", { "data-selected": "value" }, [...props.selectedFiles].join(",")),
        h("button", {
          "data-action": "search-cat",
          onClick: () => emit("update:search-query", "cat"),
        }),
        h("button", { "data-action": "select-all", onClick: () => emit("toggle-select-all") }),
      ]);
  },
});
```

Retain existing tests for canonical path query, drag/drop, multipart upload, append/replace drop batches, partial batch selection, search clearing on navigation, and selection persistence across sorting.

- [ ] **Step 5: Run FileManager tests and verify old component assumptions fail**

Run: `pnpm test --run test/file-manager/FileManager.spec.ts`

Expected: FAIL until the new component graph is integrated.

- [ ] **Step 6: Integrate presentation, summary, shell, states, and table**

In `FileManager.vue`:

1. Read `locale` and `t` from `useI18n`.
2. Create presentation helpers with `computed(() => createFilePresentation(locale.value, t))`.
3. Compute summary from `filesData.value?.folders` and `filesData.value?.files`, never from visible results.
4. Use `SidebarProvider` around `AppSidebar` and `SidebarInset`; the layout provides only `TooltipProvider`.
5. Render `FileDashboardHeader`, page heading, upload action, `FileStats`, `FileBulkToolbar`, and `FileTable`.
6. Render `FileStatePanel` for pending, error, empty, and no-results conditions.
7. Wire `AppSidebar.navigate` to `navigateToDirectory`, then clear search.
8. Wire always-on selection without `isSelectionMode`.
9. Wire controlled delete dialogs from Task 7.
10. Keep every existing upload, preview, move, rename, and batch-move dialog.

Determine fetch failure explicitly:

```ts
const filesError = computed(() =>
  filesResponse.value && !filesResponse.value.ok ? filesResponse.value.error : undefined,
);
const isEmptyDirectory = computed(
  () =>
    !hasActiveSearch.value &&
    !hasSourceItems.value &&
    status.value !== "pending" &&
    !filesError.value,
);
const hasNoResults = computed(
  () => hasActiveSearch.value && hasSourceItems.value && resultCount.value === 0,
);
```

- [ ] **Step 7: Delete superseded components and keep the page route thin**

`app/pages/index.vue` remains middleware-protected and renders only `<FileManager />`. Remove redundant wrapper markup.

Delete the old list, toolbar, view controls, and their tests only after `FileManager.vue` no longer imports them.

- [ ] **Step 8: Run orchestration and complete file-manager tests**

Run:

```bash
pnpm test --run test/file-manager/FileManager.spec.ts test/file-manager
pnpm typecheck
```

Expected: all file-manager tests PASS and no imports reference removed components.

- [ ] **Step 9: Commit**

```bash
git add app/components/FileManager.vue app/components/file-manager app/composables/file-manager/useFileSelection.ts app/pages/index.vue test/file-manager
/commit-message en auto
```

Expected header: `perf(file-manager): integrate dashboard workspace`.

---

### Task 9: Localize global surfaces and complete responsive/theme verification

**Files:**

- Modify: `app/app.vue`
- Modify: `app/pages/login.vue`
- Modify: `app/components/ThemeToggle.vue`
- Modify: `app/components/UserMenu.vue`
- Modify: `app/assets/css/main.css`
- Modify: `README.md`
- Create: `test/file-manager/LoginPage.spec.ts`
- Create: `test/file-manager/responsive-contract.spec.ts`
- Modify: any file-manager tests still containing hard-coded UI copy

**Interfaces:**

- Global SEO metadata derives from locale messages without changing routes.
- Login and account surfaces render complete English and Simplified Chinese copy.
- Responsive behavior remains class-driven and testable without a viewport-specific runtime dependency.

- [ ] **Step 1: Write failing global-localization and responsive contract tests**

Create assertions that:

```ts
it.each(["en", "zh-CN"] as const)("renders login actions in %s", (locale) => {
  const wrapper = mountLogin(locale);
  expect(wrapper.get('a[href="/api/auth/github"]').text()).toBe(
    locale === "en" ? "Continue with GitHub" : "使用 GitHub 登录",
  );
});

it("keeps critical mobile targets and responsive columns explicit", () => {
  const files = [
    "app/components/AppSidebar.vue",
    "app/components/file-manager/FileDashboardHeader.vue",
    "app/components/file-manager/FileTable.vue",
    "app/components/file-manager/FileBulkToolbar.vue",
  ]
    .map((path) => readFileSync(path, "utf8"))
    .join("\n");
  expect(files).toMatch(/size-11|min-h-11|h-11/);
  expect(files).toMatch(/md:/);
  expect(files).toMatch(/hidden.*sm:table-cell|hidden.*md:table-cell/);
});
```

- [ ] **Step 2: Run tests and verify untranslated global surfaces fail**

Run: `pnpm test --run test/file-manager/LoginPage.spec.ts test/file-manager/responsive-contract.spec.ts`

Expected: FAIL because the login page and responsive contracts are incomplete.

- [ ] **Step 3: Localize application metadata, login, theme, and account copy**

- Replace every literal UI string in `app.vue`, `login.vue`, `ThemeToggle.vue`, and `UserMenu.vue` with locale keys.
- Keep login error mapping based on the existing `error` query.
- Use locale-aware SEO metadata through `useSeoMeta(() => ({ title: t("app.name"), description: t("app.description") }))`.
- Keep GitHub OAuth URL and logout API unchanged.
- Ensure locale and theme controls have 44px mobile targets and compact desktop sizes.

- [ ] **Step 4: Complete responsive and theme polish**

Verify in code:

- Sidebar drawer overlays correctly and traps focus through the generated primitive.
- Breadcrumb scrolls horizontally without wrapping.
- Stats use one column on narrow mobile, two on tablet, and four on wide desktop.
- Table name/actions remain visible; size and updated columns appear only at declared breakpoints.
- Dialogs fit within `calc(100vw - 2rem)` and use scrollable content when tall.
- Dark theme uses semantic surfaces with no fixed `bg-white`, `text-black`, or light-only gray classes in business components.
- `prefers-reduced-motion` disables nonessential transition effects.

Add this shared rule only if generated primitives do not already cover it:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 5: Update README feature documentation**

Document the responsive dashboard shell, persistent language behavior, and light/dark/system modes. Do not add setup steps beyond the new dependency installation already represented by `pnpm install`.

- [ ] **Step 6: Run the full automated verification suite**

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

Expected:

- Oxfmt and Oxlint exit 0.
- Nuxt typecheck exits 0.
- All Vitest files pass.
- Node preset and Cloudflare module builds exit 0.
- Only known upstream sourcemap/annotation/MIME warnings may remain.
- `git diff --check` prints no output.

- [ ] **Step 7: Perform manual visual and interaction verification**

Start `pnpm dev` and verify this matrix:

| Viewport | Theme  | Locale  | Required checks                                                          |
| -------- | ------ | ------- | ------------------------------------------------------------------------ |
| 1440×900 | Light  | English | Expanded/collapsed sidebar, four cards, full table, keyboard row menu    |
| 1440×900 | Dark   | zh-CN   | Contrast, long translated labels, dialogs, destructive confirmation      |
| 768×1024 | System | English | Sidebar drawer, two-column cards, reduced table columns                  |
| 390×844  | Light  | zh-CN   | 44px targets, breadcrumb scroll, upload, selection, row menu, dialog fit |
| 390×844  | Dark   | English | Empty/error/no-results states, locale/theme persistence after reload     |

Also verify drag/drop, preview, raw URL copy, Markdown copy, rename, move, delete, batch move, batch partial failure, and logout.

- [ ] **Step 8: Commit**

```bash
git add app README.md test/file-manager i18n/locales
/commit-message en auto
```

Expected header: `perf(dashboard): polish responsive localized experience`.

---

## Final Completion Gate

- [ ] Re-run the full verification commands from Task 9 on the final tree.
- [ ] Confirm `git status --short` is empty.
- [ ] Use `superpowers:requesting-code-review` before integration.
- [ ] Address review findings with `superpowers:receiving-code-review` and TDD.
- [ ] Use `superpowers:verification-before-completion` before claiming completion.
- [ ] Use `superpowers:finishing-a-development-branch` to choose push/PR/merge handling.
