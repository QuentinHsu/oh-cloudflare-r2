# FileManager Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the 566-line `FileManager.vue` into focused, testable composables and pure helpers while fixing loading cleanup, refresh consistency, typed error handling, and clipboard failure feedback.

**Architecture:** Keep Nuxt `useFetch` calls and template composition in `FileManager.vue`. Move deterministic path/tree/link transformations into one pure utility module, move navigation and selection into independent composables, and isolate mutation and preview I/O behind injected dependencies so tests do not require Nuxt runtime globals.

**Tech Stack:** Nuxt 4.2.2, Vue 3.5, TypeScript, Vitest 4.0.16, Vue Test Utils 2.4.6, Oxlint 1.74.0, Oxfmt 0.59.0, pnpm 10.25.0

## Global Constraints

- Communicate with the user in Chinese, while commit messages are English.
- Do not change server API paths, request bodies, response shapes, page layout, Dialog structure, or primary interaction copy.
- Do not add Pinia, another state manager, or any new runtime dependency.
- Keep batch delete and batch move sequential.
- Use explicit dependency injection for network, refresh, confirmation, notification, origin, and clipboard I/O.
- Do not use `any`; catch values remain `unknown` and pass through a type guard.
- Every production behavior change follows red-green-refactor: add a failing test, confirm the expected failure, implement minimally, and confirm green.
- At the end of every task, stage only that task's files and invoke the installed `commit-message` skill in `en auto` mode. It must normalize the message with `/Users/quentin/.agents/skills/commit-message/scripts/format_commit_message.py` and commit with `git commit -F`.

---

## File Map

- `app/components/file-manager/utils.ts`: pure path, folder-tree, link, and error-message helpers.
- `app/composables/file-manager/useFolderBrowser.ts`: current path, breadcrumbs, folder tree, and expanded-folder state.
- `app/composables/file-manager/useFileSelection.ts`: selection mode, selected path set, and select-all state.
- `app/composables/file-manager/useFileMutations.ts`: upload, delete, move, batch, rename, Dialog, loading, notification, and refresh workflows.
- `app/composables/file-manager/useFilePreview.ts`: preview state, public URL construction, and asynchronous clipboard workflows.
- `app/components/FileManager.vue`: Nuxt data fetching and view/composable composition only.
- `test/file-manager/utils.spec.ts`: pure helper boundaries.
- `test/file-manager/useFolderBrowser.spec.ts`: navigation and folder expansion behavior.
- `test/file-manager/useFileSelection.spec.ts`: selection state behavior.
- `test/file-manager/useFileMutations.spec.ts`: request, loading, refresh, validation, and batch behavior.
- `test/file-manager/useFilePreview.spec.ts`: preview and clipboard resolve/reject behavior.

### Task 1: Extract pure file-manager utilities

**Files:**

- Create: `app/components/file-manager/utils.ts`
- Create: `test/file-manager/utils.spec.ts`

**Interfaces:**

- Consumes: `FolderNode` from `app/components/file-manager/types.ts`.
- Produces:
  - `normalizeDirectoryPath(path: string): string`
  - `getFileName(pathname: string): string`
  - `getParentDirectory(pathname: string): string`
  - `buildDestinationPath(directory: string, filename: string): string`
  - `buildFolderTree(folders: readonly string[]): FolderNode[]`
  - `getExpandedParentPaths(path: string): string[]`
  - `buildFileLink(origin: string, pathname: string, type: "raw" | "markdown"): string`
  - `getRequestErrorMessage(error: unknown): string | undefined`

- [ ] **Step 1: Write failing pure-helper tests**

Create `test/file-manager/utils.spec.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  buildDestinationPath,
  buildFileLink,
  buildFolderTree,
  getExpandedParentPaths,
  getFileName,
  getParentDirectory,
  getRequestErrorMessage,
  normalizeDirectoryPath,
} from "../../app/components/file-manager/utils";

describe("file-manager utils", () => {
  it("normalizes directory paths without inventing segments", () => {
    expect(normalizeDirectoryPath(" /photos//2026/ ")).toBe("photos/2026");
    expect(normalizeDirectoryPath("///")).toBe("");
  });

  it("derives file names, parent directories, and destination paths", () => {
    expect(getFileName("photos/cat.png")).toBe("cat.png");
    expect(getFileName("")).toBe("");
    expect(getParentDirectory("photos/cat.png")).toBe("photos");
    expect(getParentDirectory("cat.png")).toBe("");
    expect(buildDestinationPath(" /archive//2026/ ", "cat.png")).toBe("archive/2026/cat.png");
    expect(buildDestinationPath("", "cat.png")).toBe("cat.png");
  });

  it("builds a sorted tree from duplicate and unordered folder paths", () => {
    expect(buildFolderTree(["photos/dogs", "docs", "photos/cats", "photos/cats"])).toEqual([
      { name: "docs", path: "docs", children: [] },
      {
        name: "photos",
        path: "photos",
        children: [
          { name: "cats", path: "photos/cats", children: [] },
          { name: "dogs", path: "photos/dogs", children: [] },
        ],
      },
    ]);
  });

  it("returns every parent path in expansion order", () => {
    expect(getExpandedParentPaths("photos/2026/events/")).toEqual([
      "photos",
      "photos/2026",
      "photos/2026/events",
    ]);
    expect(getExpandedParentPaths("")).toEqual([]);
  });

  it("builds raw and Markdown links", () => {
    expect(buildFileLink("https://cdn.example.com/", "photos/cat.png", "raw")).toBe(
      "https://cdn.example.com/api/blob/photos/cat.png",
    );
    expect(buildFileLink("https://cdn.example.com", "photos/cat.png", "markdown")).toBe(
      "![cat.png](https://cdn.example.com/api/blob/photos/cat.png)",
    );
  });

  it("reads only non-empty server messages from unknown errors", () => {
    expect(getRequestErrorMessage({ data: { message: "目标文件已存在" } })).toBe("目标文件已存在");
    expect(getRequestErrorMessage({ data: { message: "" } })).toBeUndefined();
    expect(getRequestErrorMessage(new Error("private detail"))).toBeUndefined();
    expect(getRequestErrorMessage(null)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the helper test and confirm red**

Run:

```bash
pnpm test --run test/file-manager/utils.spec.ts
```

Expected: FAIL because `app/components/file-manager/utils.ts` does not exist.

- [ ] **Step 3: Implement the pure helpers**

Create `app/components/file-manager/utils.ts`:

```ts
import type { FolderNode } from "./types";

export type FileLinkType = "raw" | "markdown";

export function normalizeDirectoryPath(path: string) {
  return path
    .trim()
    .replace(/\/{2,}/g, "/")
    .replace(/^\/+|\/+$/g, "");
}

export function getFileName(pathname: string) {
  const normalized = normalizeDirectoryPath(pathname);
  return normalized.split("/").pop() ?? "";
}

export function getParentDirectory(pathname: string) {
  const parts = normalizeDirectoryPath(pathname).split("/").filter(Boolean);
  return parts.slice(0, -1).join("/");
}

export function buildDestinationPath(directory: string, filename: string) {
  const normalizedDirectory = normalizeDirectoryPath(directory);
  const normalizedFilename = filename.trim();
  return normalizedDirectory ? `${normalizedDirectory}/${normalizedFilename}` : normalizedFilename;
}

export function buildFolderTree(folders: readonly string[]): FolderNode[] {
  const root: FolderNode[] = [];
  const normalizedFolders = [
    ...new Set(folders.map(normalizeDirectoryPath).filter(Boolean)),
  ].toSorted();

  for (const folderPath of normalizedFolders) {
    const parts = folderPath.split("/");
    let level = root;

    parts.forEach((name, index) => {
      const path = parts.slice(0, index + 1).join("/");
      let node = level.find((candidate) => candidate.name === name);
      if (!node) {
        node = { name, path, children: [] };
        level.push(node);
      }
      level = node.children;
    });
  }

  return root;
}

export function getExpandedParentPaths(path: string) {
  const parts = normalizeDirectoryPath(path).split("/").filter(Boolean);
  return parts.map((_, index) => parts.slice(0, index + 1).join("/"));
}

export function buildFileLink(origin: string, pathname: string, type: FileLinkType) {
  const url = `${origin.replace(/\/+$/g, "")}/api/blob/${pathname}`;
  return type === "markdown" ? `![${getFileName(pathname)}](${url})` : url;
}

export function getRequestErrorMessage(error: unknown) {
  if (!error || typeof error !== "object" || !("data" in error)) return undefined;
  const data = error.data;
  if (!data || typeof data !== "object" || !("message" in data)) return undefined;
  return typeof data.message === "string" && data.message.trim() ? data.message : undefined;
}
```

- [ ] **Step 4: Run focused checks**

Run:

```bash
pnpm test --run test/file-manager/utils.spec.ts
pnpm exec oxlint app/components/file-manager/utils.ts test/file-manager/utils.spec.ts
pnpm exec oxfmt --check app/components/file-manager/utils.ts test/file-manager/utils.spec.ts
```

Expected: 6 tests pass, Oxlint reports no errors, and Oxfmt reports correct formatting.

- [ ] **Step 5: Auto-commit Task 1**

Stage only:

```bash
git add app/components/file-manager/utils.ts test/file-manager/utils.spec.ts
```

Invoke `$commit-message en auto`. Expected classification: `refactor(file-manager)` with an English subject describing extracted path and folder helpers.

---

### Task 2: Extract folder browsing and file selection state

**Files:**

- Create: `app/composables/file-manager/useFolderBrowser.ts`
- Create: `app/composables/file-manager/useFileSelection.ts`
- Create: `test/file-manager/useFolderBrowser.spec.ts`
- Create: `test/file-manager/useFileSelection.spec.ts`

**Interfaces:**

- Consumes: `buildFolderTree` and `getExpandedParentPaths` from Task 1, plus `BlobFile`.
- Produces:
  - `useFolderBrowser(folders: MaybeRefOrGetter<readonly string[]>)`
  - `useFileSelection(files: MaybeRefOrGetter<readonly BlobFile[]>)`

- [ ] **Step 1: Write failing browsing tests**

Create `test/file-manager/useFolderBrowser.spec.ts`:

```ts
import { describe, expect, it } from "vitest";
import { ref } from "vue";
import { useFolderBrowser } from "../../app/composables/file-manager/useFolderBrowser";

describe("useFolderBrowser", () => {
  it("navigates folders and breadcrumbs", () => {
    const browser = useFolderBrowser(ref(["photos/2026", "docs"]));

    browser.navigateToFolder("photos");
    browser.navigateToFolder("2026");
    expect(browser.currentPath.value).toBe("photos/2026/");
    expect(browser.pathParts.value).toEqual(["photos", "2026"]);

    browser.navigateToPath(0);
    expect(browser.currentPath.value).toBe("photos/");
    browser.navigateToPath(-1);
    expect(browser.currentPath.value).toBe("");
  });

  it("builds the tree and expands parents without duplicates", () => {
    const browser = useFolderBrowser(ref(["photos/2026/events", "photos/2025"]));

    expect(browser.folderTree.value[0]?.name).toBe("photos");
    browser.expandPathParents("photos/2026/events");
    browser.expandPathParents("photos/2026");
    expect(browser.expandedFolders.value).toEqual(["photos", "photos/2026", "photos/2026/events"]);

    browser.toggleFolder("photos/2026");
    expect(browser.expandedFolders.value).toEqual(["photos", "photos/2026/events"]);
  });
});
```

- [ ] **Step 2: Write failing selection tests**

Create `test/file-manager/useFileSelection.spec.ts`:

```ts
import { describe, expect, it } from "vitest";
import { ref } from "vue";
import { useFileSelection } from "../../app/composables/file-manager/useFileSelection";
import type { BlobFile } from "../../app/components/file-manager/types";

const files: BlobFile[] = [
  { pathname: "a.png", contentType: "image/png", size: 1, uploadedAt: "2026-01-01" },
  { pathname: "b.png", contentType: "image/png", size: 1, uploadedAt: "2026-01-01" },
];

describe("useFileSelection", () => {
  it("toggles individual and all-file selection", () => {
    const selection = useFileSelection(ref(files));

    selection.toggleSelectionMode();
    selection.toggleFileSelection("a.png");
    expect(selection.hasSelection.value).toBe(true);
    expect(selection.allSelected.value).toBe(false);

    selection.toggleSelectAll();
    expect(selection.allSelected.value).toBe(true);
    selection.toggleSelectAll();
    expect(selection.selectedFiles.value.size).toBe(0);
  });

  it("clears selection when leaving selection mode", () => {
    const selection = useFileSelection(ref(files));
    selection.toggleSelectionMode();
    selection.toggleFileSelection("a.png");
    selection.toggleSelectionMode();

    expect(selection.isSelectionMode.value).toBe(false);
    expect(selection.selectedFiles.value.size).toBe(0);
  });

  it("does not report all-selected for an empty list", () => {
    const selection = useFileSelection(ref([]));
    selection.toggleSelectAll();
    expect(selection.allSelected.value).toBe(false);
  });
});
```

- [ ] **Step 3: Run both tests and confirm red**

Run:

```bash
pnpm test --run test/file-manager/useFolderBrowser.spec.ts test/file-manager/useFileSelection.spec.ts
```

Expected: FAIL because both composable modules do not exist.

- [ ] **Step 4: Implement `useFolderBrowser`**

Create `app/composables/file-manager/useFolderBrowser.ts`:

```ts
import { computed, ref, toValue, type MaybeRefOrGetter } from "vue";
import { buildFolderTree, getExpandedParentPaths } from "../../components/file-manager/utils";

export function useFolderBrowser(folders: MaybeRefOrGetter<readonly string[]>) {
  const currentPath = ref("");
  const expandedFolders = ref<string[]>([]);
  const pathParts = computed(() => currentPath.value.split("/").filter(Boolean));
  const folderTree = computed(() => buildFolderTree(toValue(folders)));

  function navigateToFolder(folder: string) {
    currentPath.value = currentPath.value ? `${currentPath.value}${folder}/` : `${folder}/`;
  }

  function navigateToPath(index: number) {
    currentPath.value = index === -1 ? "" : `${pathParts.value.slice(0, index + 1).join("/")}/`;
  }

  function toggleFolder(path: string) {
    const index = expandedFolders.value.indexOf(path);
    if (index === -1) expandedFolders.value.push(path);
    else expandedFolders.value.splice(index, 1);
  }

  function expandPathParents(path: string) {
    for (const parent of getExpandedParentPaths(path)) {
      if (!expandedFolders.value.includes(parent)) expandedFolders.value.push(parent);
    }
  }

  return {
    currentPath,
    expandedFolders,
    pathParts,
    folderTree,
    navigateToFolder,
    navigateToPath,
    toggleFolder,
    expandPathParents,
  };
}
```

- [ ] **Step 5: Implement `useFileSelection`**

Create `app/composables/file-manager/useFileSelection.ts`:

```ts
import { computed, ref, toValue, type MaybeRefOrGetter } from "vue";
import type { BlobFile } from "../../components/file-manager/types";

export function useFileSelection(files: MaybeRefOrGetter<readonly BlobFile[]>) {
  const selectedFiles = ref(new Set<string>());
  const isSelectionMode = ref(false);
  const hasSelection = computed(() => selectedFiles.value.size > 0);
  const allSelected = computed(() => {
    const currentFiles = toValue(files);
    return (
      currentFiles.length > 0 &&
      currentFiles.every((file) => selectedFiles.value.has(file.pathname))
    );
  });

  function clearSelection() {
    selectedFiles.value.clear();
  }

  function toggleSelectionMode() {
    isSelectionMode.value = !isSelectionMode.value;
    if (!isSelectionMode.value) clearSelection();
  }

  function toggleFileSelection(pathname: string) {
    if (selectedFiles.value.has(pathname)) selectedFiles.value.delete(pathname);
    else selectedFiles.value.add(pathname);
  }

  function toggleSelectAll() {
    const currentFiles = toValue(files);
    if (!currentFiles.length) return;
    if (allSelected.value) clearSelection();
    else currentFiles.forEach((file) => selectedFiles.value.add(file.pathname));
  }

  return {
    selectedFiles,
    isSelectionMode,
    hasSelection,
    allSelected,
    clearSelection,
    toggleSelectionMode,
    toggleFileSelection,
    toggleSelectAll,
  };
}
```

- [ ] **Step 6: Run focused checks**

Run:

```bash
pnpm test --run test/file-manager/useFolderBrowser.spec.ts test/file-manager/useFileSelection.spec.ts
pnpm exec oxlint app/composables/file-manager test/file-manager/useFolderBrowser.spec.ts test/file-manager/useFileSelection.spec.ts
pnpm exec oxfmt --check app/composables/file-manager test/file-manager/useFolderBrowser.spec.ts test/file-manager/useFileSelection.spec.ts
```

Expected: 5 tests pass and both OXC checks pass.

- [ ] **Step 7: Auto-commit Task 2**

Stage only the four Task 2 files and invoke `$commit-message en auto`. Expected classification: `refactor(file-manager)` describing extracted browsing and selection state.

---

### Task 3: Extract mutation workflows and reliability fixes

**Files:**

- Create: `app/composables/file-manager/useFileMutations.ts`
- Create: `test/file-manager/useFileMutations.spec.ts`

**Interfaces:**

- Consumes: path/error helpers from Task 1, `BlobFile`, `Ref<string>`, `Ref<Set<string>>`, `clearSelection`, and `expandPathParents`.
- Produces: `useFileMutations(dependencies: FileMutationDependencies)` with the upload, delete, move, batch, and rename state/method names currently used by `FileManager.vue`.

- [ ] **Step 1: Write failing mutation tests**

Create `test/file-manager/useFileMutations.spec.ts` with injected mocks and these concrete cases:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { useFileMutations } from "../../app/composables/file-manager/useFileMutations";
import type { BlobFile } from "../../app/components/file-manager/types";

const file: BlobFile = {
  pathname: "photos/cat.png",
  contentType: "image/png",
  size: 1,
  uploadedAt: "2026-01-01",
};

describe("useFileMutations", () => {
  const request = vi.fn();
  const refreshFiles = vi.fn();
  const refreshFolders = vi.fn();
  const confirmAction = vi.fn(() => true);
  const notify = { success: vi.fn(), warning: vi.fn(), error: vi.fn() };
  const selectedFiles = ref(new Set<string>());
  const clearSelection = vi.fn(() => selectedFiles.value.clear());
  const expandPathParents = vi.fn();

  const createMutations = () =>
    useFileMutations({
      request,
      refreshFiles,
      refreshFolders,
      confirmAction,
      notify,
      currentPath: ref("photos/"),
      selectedFiles,
      clearSelection,
      expandPathParents,
    });

  beforeEach(() => {
    vi.clearAllMocks();
    selectedFiles.value.clear();
    request.mockResolvedValue(undefined);
    refreshFiles.mockResolvedValue(undefined);
    refreshFolders.mockResolvedValue(undefined);
  });

  it("uploads files, closes the dialog, and refreshes both indexes", async () => {
    const mutations = createMutations();
    mutations.handleFilesSelected([new File(["cat"], "cat.png")]);
    await mutations.confirmUpload();

    expect(request).toHaveBeenCalledWith("/api/files/upload?prefix=photos%2F", {
      method: "POST",
      body: expect.any(FormData),
    });
    expect(mutations.isUploading.value).toBe(false);
    expect(mutations.showUploadDialog.value).toBe(false);
    expect(refreshFiles).toHaveBeenCalledOnce();
    expect(refreshFolders).toHaveBeenCalledOnce();
  });

  it("restores move loading and keeps the dialog open on request failure", async () => {
    request.mockRejectedValue({ data: { message: "目标文件已存在" } });
    const mutations = createMutations();
    mutations.openMoveDialog(file);
    mutations.moveTargetPath.value = "archive";
    await mutations.confirmMove();

    expect(mutations.isMoving.value).toBe(false);
    expect(mutations.showMoveDialog.value).toBe(true);
    expect(notify.error).toHaveBeenCalledWith("目标文件已存在");
  });

  it("refreshes both indexes when one refresh rejects", async () => {
    refreshFiles.mockRejectedValue(new Error("refresh failed"));
    const mutations = createMutations();
    await mutations.deleteFile(file.pathname);

    expect(refreshFiles).toHaveBeenCalledOnce();
    expect(refreshFolders).toHaveBeenCalledOnce();
    expect(notify.success).toHaveBeenCalledWith("删除成功");
    expect(notify.error).toHaveBeenCalledWith("刷新文件列表失败");
  });

  it("reports partial batch delete results and always restores loading", async () => {
    selectedFiles.value = new Set(["a.png", "b.png"]);
    request.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("failed"));
    const mutations = createMutations();
    await mutations.batchDelete();

    expect(notify.warning).toHaveBeenCalledWith("删除完成：1 成功，1 失败");
    expect(mutations.isBatchDeleting.value).toBe(false);
    expect(clearSelection).toHaveBeenCalledOnce();
  });

  it("validates rename input before sending a move request", async () => {
    const mutations = createMutations();
    mutations.openRenameDialog(file);
    mutations.newFileName.value = "bad/name.png";
    await mutations.confirmRename();

    expect(request).not.toHaveBeenCalled();
    expect(notify.error).toHaveBeenCalledWith("文件名不能包含 / 或 \\ 字符");
  });

  it("reports partial batch move results and closes the dialog", async () => {
    selectedFiles.value = new Set(["photos/a.png", "photos/b.png"]);
    request.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("failed"));
    const mutations = createMutations();
    mutations.openBatchMoveDialog();
    mutations.batchMoveTargetPath.value = "archive";
    await mutations.confirmBatchMove();

    expect(notify.warning).toHaveBeenCalledWith("移动完成：1 成功，1 失败");
    expect(mutations.isBatchMoving.value).toBe(false);
    expect(mutations.showBatchMoveDialog.value).toBe(false);
    expect(clearSelection).toHaveBeenCalledOnce();
  });

  it("renames through the move endpoint and refreshes both indexes", async () => {
    const mutations = createMutations();
    mutations.openRenameDialog(file);
    mutations.newFileName.value = "dog.png";
    await mutations.confirmRename();

    expect(request).toHaveBeenCalledWith("/api/files/move", {
      method: "POST",
      body: { oldPath: "photos/cat.png", newPath: "photos/dog.png" },
    });
    expect(mutations.showRenameDialog.value).toBe(false);
    expect(refreshFiles).toHaveBeenCalledOnce();
    expect(refreshFolders).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run mutation tests and confirm red**

Run:

```bash
pnpm test --run test/file-manager/useFileMutations.spec.ts
```

Expected: FAIL because `useFileMutations.ts` does not exist.

- [ ] **Step 3: Implement the complete mutation composable**

Create `app/composables/file-manager/useFileMutations.ts`:

```ts
import { computed, ref, type Ref } from "vue";
import type { BlobFile } from "../../components/file-manager/types";
import {
  buildDestinationPath,
  getFileName,
  getParentDirectory,
  getRequestErrorMessage,
  normalizeDirectoryPath,
} from "../../components/file-manager/utils";

interface RequestOptions {
  method: "POST" | "DELETE";
  body?: FormData | { oldPath: string; newPath: string };
}

interface FileMutationDependencies {
  request: (url: string, options: RequestOptions) => Promise<unknown>;
  refreshFiles: () => Promise<unknown>;
  refreshFolders: () => Promise<unknown>;
  confirmAction: (message: string) => boolean;
  notify: {
    success: (message: string) => void;
    warning: (message: string) => void;
    error: (message: string) => void;
  };
  currentPath: Ref<string>;
  selectedFiles: Ref<Set<string>>;
  clearSelection: () => void;
  expandPathParents: (path: string) => void;
}

export function useFileMutations(dependencies: FileMutationDependencies) {
  const isUploading = ref(false);
  const showUploadDialog = ref(false);
  const uploadPathInput = ref("");
  const pendingFiles = ref<File[] | null>(null);
  const showMoveDialog = ref(false);
  const moveFile = ref<BlobFile | null>(null);
  const moveTargetPath = ref("");
  const isMoving = ref(false);
  const isBatchMoving = ref(false);
  const isBatchDeleting = ref(false);
  const showBatchMoveDialog = ref(false);
  const batchMoveTargetPath = ref("");
  const showRenameDialog = ref(false);
  const renameFile = ref<BlobFile | null>(null);
  const newFileName = ref("");
  const isRenaming = ref(false);
  const finalUploadPath = computed(() => {
    const path = normalizeDirectoryPath(uploadPathInput.value);
    return path ? `${path}/` : "";
  });

  async function refreshIndexes() {
    const results = await Promise.allSettled([
      Promise.resolve().then(() => dependencies.refreshFiles()),
      Promise.resolve().then(() => dependencies.refreshFolders()),
    ]);
    if (results.some((result) => result.status === "rejected")) {
      dependencies.notify.error("刷新文件列表失败");
    }
  }

  function handleFilesSelected(files: FileList | File[]) {
    const selected = Array.isArray(files) ? files : Array.from(files);
    if (!selected.length) return;
    pendingFiles.value = selected;
    uploadPathInput.value = normalizeDirectoryPath(dependencies.currentPath.value);
    dependencies.expandPathParents(uploadPathInput.value);
    showUploadDialog.value = true;
  }

  function cancelUpload() {
    showUploadDialog.value = false;
    pendingFiles.value = null;
  }

  function handleUploadDialogOpenChange(open: boolean) {
    if (open) showUploadDialog.value = true;
    else cancelUpload();
  }

  function selectFolder(path: string) {
    uploadPathInput.value = path;
  }

  async function confirmUpload() {
    if (!pendingFiles.value?.length) return;
    isUploading.value = true;
    const formData = new FormData();
    pendingFiles.value.forEach((file) => formData.append("files", file));
    try {
      await dependencies.request(
        `/api/files/upload?prefix=${encodeURIComponent(finalUploadPath.value)}`,
        { method: "POST", body: formData },
      );
      dependencies.notify.success("上传成功");
      cancelUpload();
      await refreshIndexes();
    } catch {
      dependencies.notify.error("上传失败");
    } finally {
      isUploading.value = false;
    }
  }

  async function deleteFile(pathname: string) {
    if (!dependencies.confirmAction("确定要删除这个文件吗？")) return;
    try {
      await dependencies.request(`/api/files/${encodeURIComponent(pathname)}`, {
        method: "DELETE",
      });
      dependencies.notify.success("删除成功");
      await refreshIndexes();
    } catch {
      dependencies.notify.error("删除失败");
    }
  }

  function openMoveDialog(file: BlobFile) {
    moveFile.value = file;
    moveTargetPath.value = getParentDirectory(file.pathname);
    dependencies.expandPathParents(moveTargetPath.value);
    showMoveDialog.value = true;
  }

  function closeMoveDialog() {
    showMoveDialog.value = false;
    moveFile.value = null;
    moveTargetPath.value = "";
  }

  function handleMoveDialogOpenChange(open: boolean) {
    if (open) showMoveDialog.value = true;
    else closeMoveDialog();
  }

  async function confirmMove() {
    if (!moveFile.value) return;
    const filename = getFileName(moveFile.value.pathname);
    const newPath = buildDestinationPath(moveTargetPath.value, filename);
    if (!filename) {
      dependencies.notify.error("移动失败");
      return;
    }
    if (newPath === moveFile.value.pathname) {
      dependencies.notify.error("目标路径与原路径相同");
      return;
    }

    isMoving.value = true;
    try {
      await dependencies.request("/api/files/move", {
        method: "POST",
        body: { oldPath: moveFile.value.pathname, newPath },
      });
      dependencies.notify.success("移动成功");
      closeMoveDialog();
      await refreshIndexes();
    } catch (error: unknown) {
      dependencies.notify.error(getRequestErrorMessage(error) ?? "移动失败");
    } finally {
      isMoving.value = false;
    }
  }

  async function batchDelete() {
    if (!dependencies.selectedFiles.value.size) return;
    if (
      !dependencies.confirmAction(
        `确定要删除选中的 ${dependencies.selectedFiles.value.size} 个文件吗？`,
      )
    ) {
      return;
    }

    isBatchDeleting.value = true;
    const paths = [...dependencies.selectedFiles.value];
    let successCount = 0;
    let failCount = 0;
    try {
      for (const pathname of paths) {
        try {
          await dependencies.request(`/api/files/${encodeURIComponent(pathname)}`, {
            method: "DELETE",
          });
          successCount += 1;
        } catch {
          failCount += 1;
        }
      }

      if (failCount === 0) dependencies.notify.success(`成功删除 ${successCount} 个文件`);
      else dependencies.notify.warning(`删除完成：${successCount} 成功，${failCount} 失败`);
      dependencies.clearSelection();
      await refreshIndexes();
    } finally {
      isBatchDeleting.value = false;
    }
  }

  function openBatchMoveDialog() {
    if (!dependencies.selectedFiles.value.size) return;
    batchMoveTargetPath.value = normalizeDirectoryPath(dependencies.currentPath.value);
    dependencies.expandPathParents(batchMoveTargetPath.value);
    showBatchMoveDialog.value = true;
  }

  function closeBatchMoveDialog() {
    showBatchMoveDialog.value = false;
    batchMoveTargetPath.value = "";
  }

  function handleBatchMoveDialogOpenChange(open: boolean) {
    if (open) showBatchMoveDialog.value = true;
    else closeBatchMoveDialog();
  }

  async function confirmBatchMove() {
    if (!dependencies.selectedFiles.value.size) return;
    isBatchMoving.value = true;
    const paths = [...dependencies.selectedFiles.value];
    let successCount = 0;
    let failCount = 0;
    try {
      for (const oldPath of paths) {
        const filename = getFileName(oldPath);
        const newPath = buildDestinationPath(batchMoveTargetPath.value, filename);
        if (!filename) {
          failCount += 1;
          continue;
        }
        if (newPath === oldPath) continue;

        try {
          await dependencies.request("/api/files/move", {
            method: "POST",
            body: { oldPath, newPath },
          });
          successCount += 1;
        } catch {
          failCount += 1;
        }
      }

      if (failCount === 0) dependencies.notify.success(`成功移动 ${successCount} 个文件`);
      else dependencies.notify.warning(`移动完成：${successCount} 成功，${failCount} 失败`);
      dependencies.clearSelection();
      closeBatchMoveDialog();
      await refreshIndexes();
    } finally {
      isBatchMoving.value = false;
    }
  }

  function openRenameDialog(file: BlobFile) {
    renameFile.value = file;
    newFileName.value = getFileName(file.pathname);
    showRenameDialog.value = true;
  }

  function closeRenameDialog() {
    showRenameDialog.value = false;
    renameFile.value = null;
    newFileName.value = "";
  }

  function handleRenameDialogOpenChange(open: boolean) {
    if (open) showRenameDialog.value = true;
    else closeRenameDialog();
  }

  async function confirmRename() {
    if (!renameFile.value) return;
    const trimmedName = newFileName.value.trim();
    if (!trimmedName) {
      dependencies.notify.error("文件名不能为空");
      return;
    }
    if (trimmedName === getFileName(renameFile.value.pathname)) {
      dependencies.notify.error("文件名未改变");
      return;
    }
    if (/[/\\]/.test(trimmedName)) {
      dependencies.notify.error("文件名不能包含 / 或 \\ 字符");
      return;
    }

    const newPath = buildDestinationPath(
      getParentDirectory(renameFile.value.pathname),
      trimmedName,
    );
    isRenaming.value = true;
    try {
      await dependencies.request("/api/files/move", {
        method: "POST",
        body: { oldPath: renameFile.value.pathname, newPath },
      });
      dependencies.notify.success("重命名成功");
      closeRenameDialog();
      await refreshIndexes();
    } catch (error: unknown) {
      dependencies.notify.error(getRequestErrorMessage(error) ?? "重命名失败");
    } finally {
      isRenaming.value = false;
    }
  }

  return {
    isUploading,
    showUploadDialog,
    uploadPathInput,
    pendingFiles,
    showMoveDialog,
    moveFile,
    moveTargetPath,
    isMoving,
    isBatchMoving,
    isBatchDeleting,
    showBatchMoveDialog,
    batchMoveTargetPath,
    showRenameDialog,
    renameFile,
    newFileName,
    isRenaming,
    handleFilesSelected,
    confirmUpload,
    cancelUpload,
    handleUploadDialogOpenChange,
    selectFolder,
    deleteFile,
    openMoveDialog,
    closeMoveDialog,
    handleMoveDialogOpenChange,
    confirmMove,
    batchDelete,
    openBatchMoveDialog,
    closeBatchMoveDialog,
    handleBatchMoveDialogOpenChange,
    confirmBatchMove,
    openRenameDialog,
    closeRenameDialog,
    handleRenameDialogOpenChange,
    confirmRename,
  };
}
```

- [ ] **Step 4: Run focused mutation checks**

Run:

```bash
pnpm test --run test/file-manager/useFileMutations.spec.ts
pnpm exec oxlint app/composables/file-manager/useFileMutations.ts test/file-manager/useFileMutations.spec.ts
pnpm exec oxfmt --check app/composables/file-manager/useFileMutations.ts test/file-manager/useFileMutations.spec.ts
```

Expected: all mutation tests pass and OXC checks pass.

- [ ] **Step 5: Auto-commit Task 3**

Stage only the mutation composable and its test. Invoke `$commit-message en auto`. Expected classification: `fix(file-manager)` because loading, refresh, and typed failure behavior become reliable.

---

### Task 4: Extract preview and clipboard workflow

**Files:**

- Create: `app/composables/file-manager/useFilePreview.ts`
- Create: `test/file-manager/useFilePreview.spec.ts`

**Interfaces:**

- Consumes: `BlobFile`, `buildFileLink`, and injected origin/clipboard/notification dependencies.
- Produces: preview refs, `getFileUrl`, preview open/close methods, and async raw/Markdown copy methods.

- [ ] **Step 1: Write failing preview tests**

Create `test/file-manager/useFilePreview.spec.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { useFilePreview } from "../../app/composables/file-manager/useFilePreview";
import type { BlobFile } from "../../app/components/file-manager/types";

const file: BlobFile = {
  pathname: "photos/cat.png",
  contentType: "image/png",
  size: 1,
  uploadedAt: "2026-01-01",
};

describe("useFilePreview", () => {
  it("opens and clears preview state", () => {
    const preview = useFilePreview({
      getOrigin: () => "https://cdn.example.com",
      writeClipboard: vi.fn(),
      notify: { success: vi.fn(), error: vi.fn() },
    });

    preview.openPreview(file);
    expect(preview.previewFile.value).toEqual(file);
    preview.handlePreviewOpenChange(false);
    expect(preview.previewFile.value).toBeNull();
  });

  it("waits for clipboard success before notifying", async () => {
    let resolveWrite!: () => void;
    const writeClipboard = vi.fn(() => new Promise<void>((resolve) => (resolveWrite = resolve)));
    const notify = { success: vi.fn(), error: vi.fn() };
    const preview = useFilePreview({
      getOrigin: () => "https://cdn.example.com",
      writeClipboard,
      notify,
    });

    const pending = preview.copyUrl(file.pathname, "raw");
    expect(notify.success).not.toHaveBeenCalled();
    resolveWrite();
    await pending;
    expect(notify.success).toHaveBeenCalledWith("链接已复制");
  });

  it("reports clipboard rejection without an unhandled error", async () => {
    const notify = { success: vi.fn(), error: vi.fn() };
    const preview = useFilePreview({
      getOrigin: () => "https://cdn.example.com",
      writeClipboard: vi.fn().mockRejectedValue(new Error("denied")),
      notify,
    });

    await expect(preview.copyUrl(file.pathname, "markdown")).resolves.toBeUndefined();
    expect(notify.success).not.toHaveBeenCalled();
    expect(notify.error).toHaveBeenCalledWith("复制失败");
  });
});
```

- [ ] **Step 2: Run preview tests and confirm red**

Run:

```bash
pnpm test --run test/file-manager/useFilePreview.spec.ts
```

Expected: FAIL because `useFilePreview.ts` does not exist.

- [ ] **Step 3: Implement preview and clipboard behavior**

Create `app/composables/file-manager/useFilePreview.ts`:

```ts
import { ref } from "vue";
import type { BlobFile } from "../../components/file-manager/types";
import { buildFileLink, type FileLinkType } from "../../components/file-manager/utils";

interface FilePreviewDependencies {
  getOrigin: () => string;
  writeClipboard: (text: string) => Promise<void>;
  notify: {
    success: (message: string) => void;
    error: (message: string) => void;
  };
}

export function useFilePreview(dependencies: FilePreviewDependencies) {
  const previewFile = ref<BlobFile | null>(null);
  const showPreviewDialog = ref(false);

  function getFileUrl(pathname: string) {
    return `/api/blob/${pathname}`;
  }

  function openPreview(file: BlobFile) {
    previewFile.value = file;
    showPreviewDialog.value = true;
  }

  function handlePreviewOpenChange(open: boolean) {
    showPreviewDialog.value = open;
    if (!open) previewFile.value = null;
  }

  async function copyUrl(pathname: string, type: FileLinkType) {
    try {
      await dependencies.writeClipboard(buildFileLink(dependencies.getOrigin(), pathname, type));
      dependencies.notify.success(type === "markdown" ? "Markdown 链接已复制" : "链接已复制");
    } catch {
      dependencies.notify.error("复制失败");
    }
  }

  async function copyPreviewRaw() {
    if (previewFile.value) await copyUrl(previewFile.value.pathname, "raw");
  }

  async function copyPreviewMarkdown() {
    if (previewFile.value) await copyUrl(previewFile.value.pathname, "markdown");
  }

  return {
    previewFile,
    showPreviewDialog,
    getFileUrl,
    openPreview,
    handlePreviewOpenChange,
    copyUrl,
    copyPreviewRaw,
    copyPreviewMarkdown,
  };
}
```

- [ ] **Step 4: Run focused preview checks**

Run:

```bash
pnpm test --run test/file-manager/useFilePreview.spec.ts
pnpm exec oxlint app/composables/file-manager/useFilePreview.ts test/file-manager/useFilePreview.spec.ts
pnpm exec oxfmt --check app/composables/file-manager/useFilePreview.ts test/file-manager/useFilePreview.spec.ts
```

Expected: 3 tests pass and OXC checks pass.

- [ ] **Step 5: Auto-commit Task 4**

Stage only the preview composable and its test. Invoke `$commit-message en auto`. Expected classification: `fix(file-manager)` describing clipboard failure handling.

---

### Task 5: Recompose the FileManager container

**Files:**

- Modify: `app/components/FileManager.vue`
- Modify: `app/components/file-manager/types.ts`

**Interfaces:**

- Consumes: all four composables and their exact return names from Tasks 2-4.
- Produces: the existing FileManager template contract with data fetching and event/prop composition only.

- [ ] **Step 1: Add a copy-event payload type**

Append to `app/components/file-manager/types.ts`:

```ts
export interface CopyUrlPayload {
  pathname: string;
  type: "raw" | "markdown";
}
```

- [ ] **Step 2: Replace the `FileManager.vue` script with composable wiring**

Keep the template unchanged. Replace the current `<script setup>` implementation with imports and wiring following this exact order:

```ts
<script setup lang="ts">
import { toast } from "vue-sonner";
import FileManagerToolbar from "./file-manager/FileManagerToolbar.vue";
import FileList from "./file-manager/FileList.vue";
import UploadDialog from "./file-manager/UploadDialog.vue";
import PreviewDialog from "./file-manager/PreviewDialog.vue";
import RenameDialog from "./file-manager/RenameDialog.vue";
import MoveDialog from "./file-manager/MoveDialog.vue";
import BatchMoveDialog from "./file-manager/BatchMoveDialog.vue";
import { useFolderBrowser } from "../composables/file-manager/useFolderBrowser";
import { useFileSelection } from "../composables/file-manager/useFileSelection";
import { useFileMutations } from "../composables/file-manager/useFileMutations";
import { useFilePreview } from "../composables/file-manager/useFilePreview";
import type { CopyUrlPayload, FilesResponse } from "./file-manager/types";

const { data: allFolders, refresh: refreshAllFolders } = await useFetch<{ folders: string[] }>(
  "/api/files/folders",
);

const {
  currentPath,
  pathParts,
  folderTree,
  expandedFolders,
  navigateToFolder,
  navigateToPath,
  toggleFolder,
  expandPathParents,
} = useFolderBrowser(() => allFolders.value?.folders ?? []);

const { data, refresh, status } = await useFetch<FilesResponse>("/api/files", {
  query: { prefix: currentPath },
  watch: [currentPath],
});

const {
  selectedFiles,
  isSelectionMode,
  hasSelection,
  allSelected,
  clearSelection,
  toggleSelectionMode,
  toggleFileSelection,
  toggleSelectAll,
} = useFileSelection(() => data.value?.files ?? []);

const mutations = useFileMutations({
  request: (url, options) => $fetch(url, options),
  refreshFiles: refresh,
  refreshFolders: refreshAllFolders,
  confirmAction: (message) => window.confirm(message),
  notify: toast,
  currentPath,
  selectedFiles,
  clearSelection,
  expandPathParents,
});

const preview = useFilePreview({
  getOrigin: () => window.location.origin,
  writeClipboard: (text) => navigator.clipboard.writeText(text),
  notify: toast,
});

function handleCopyUrl(payload: CopyUrlPayload) {
  void preview.copyUrl(payload.pathname, payload.type);
}

const {
  isUploading,
  showUploadDialog,
  uploadPathInput,
  pendingFiles,
  showMoveDialog,
  moveFile,
  moveTargetPath,
  isMoving,
  isBatchMoving,
  isBatchDeleting,
  showBatchMoveDialog,
  batchMoveTargetPath,
  showRenameDialog,
  renameFile,
  newFileName,
  isRenaming,
  handleFilesSelected,
  confirmUpload,
  cancelUpload,
  handleUploadDialogOpenChange,
  selectFolder,
  deleteFile,
  openMoveDialog,
  closeMoveDialog,
  handleMoveDialogOpenChange,
  confirmMove,
  batchDelete,
  openBatchMoveDialog,
  closeBatchMoveDialog,
  handleBatchMoveDialogOpenChange,
  confirmBatchMove,
  openRenameDialog,
  closeRenameDialog,
  handleRenameDialogOpenChange,
  confirmRename,
} = mutations;

const {
  previewFile,
  showPreviewDialog,
  getFileUrl,
  openPreview,
  handlePreviewOpenChange,
  copyPreviewRaw,
  copyPreviewMarkdown,
} = preview;
</script>
```

- [ ] **Step 3: Run typecheck and correct only interface mismatches**

Run:

```bash
pnpm typecheck
```

Expected: PASS. If `$fetch` overload inference rejects `RequestOptions`, change the adapter only to:

```ts
request: async (url, options) => {
  await $fetch(url, options);
},
```

Do not weaken either side to `any`.

- [ ] **Step 4: Verify the container no longer owns extracted logic**

Run:

```bash
if rg -n 'for \(const pathname|buildFolderTree|navigator\.clipboard\.writeText|selectedFiles\.value\.(add|delete|clear)|catch \([^)]*: any\)' app/components/FileManager.vue; then
  exit 1
fi
wc -l app/components/FileManager.vue
```

Expected: the forbidden logic search has no matches and the component is materially smaller than 566 lines.

- [ ] **Step 5: Run complete verification**

Run:

```bash
pnpm check
pnpm build
NITRO_PRESET=cloudflare_module pnpm build
pnpm exec wrangler deploy --dry-run
```

Expected:

- Oxfmt and Oxlint pass.
- Nuxt typecheck passes without `any` workarounds.
- All original and new Vitest files pass.
- Normal build uses the filesystem Blob driver and completes.
- Cloudflare build uses `cloudflare-r2` and `cloudflare-module`.
- Wrangler lists `env.BLOB` and `env.ASSETS`, then exits with `--dry-run: exiting now`.

- [ ] **Step 6: Review final scope**

Run:

```bash
git diff --check
git status --short
git diff --stat main...HEAD
```

Expected: only FileManager refactor code, its tests, design, and plan files differ from `main`; package dependencies, server APIs, and UI component templates are unchanged.

- [ ] **Step 7: Auto-commit Task 5**

Stage only `app/components/FileManager.vue` and `app/components/file-manager/types.ts`. Invoke `$commit-message en auto`. Expected classification: `refactor(file-manager)` describing container composition.

---

## Final Verification

After all task commits, run fresh:

```bash
pnpm check
pnpm build
NITRO_PRESET=cloudflare_module pnpm build
pnpm exec wrangler deploy --dry-run
git status --short --branch
git log --oneline --decorate main..HEAD
```

Expected:

- Every quality, test, and build command exits 0.
- The worktree is clean on `codex/file-manager-refactor`.
- The branch contains one design commit, one plan commit, and five implementation commits with English Conventional Commit messages.
