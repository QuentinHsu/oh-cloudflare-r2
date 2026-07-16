# Drag-and-Drop Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add window-level ordinary-file drag and drop that opens the existing upload confirmation flow, supports appending batches, and preserves all current API and R2 behavior.

**Architecture:** A focused `useFileDropzone` composable owns window event registration, drag-depth state, folder filtering, and upload-state rejection. `useFileMutations` remains the owner of pending upload batches and gains deterministic filename-based merging, while a presentational overlay and minimal container wiring provide feedback without duplicating upload requests.

**Tech Stack:** Nuxt 4, Vue 3 Composition API, TypeScript DOM APIs, shadcn-vue, Tailwind CSS 4, Vitest, Vue Test Utils, Oxfmt, Oxlint.

## Global Constraints

- Dropped files must open the existing upload confirmation dialog; never upload immediately.
- Accept ordinary files from both drag-and-drop and the toolbar file picker.
- Do not support recursive directory upload or preserve local directory structure.
- Listen at window level so dropping while the portaled upload dialog is open still appends files.
- Show the drag overlay only over the file manager region.
- Append files to an open pending batch while preserving the current upload path.
- Replace pending files by filename with the most recently added File object and report the exact replacement count.
- Reject new files during an active upload with `正在上传，请稍后再试`.
- Ignore directories; when a drop contains only directories, report `暂不支持上传文件夹`.
- Non-file text and link drags must not activate or be prevented.
- Keep the existing upload URL, FormData `files` field, response handling, R2 pathname semantics, and refresh behavior.
- Do not add runtime dependencies, background queues, progress bars, pause/resume, or clipboard upload.
- Do not log file contents, local paths, environment variables, bucket names, or private R2 configuration.
- Use Oxfmt and Oxlint only; do not introduce ESLint or Prettier.
- At the end of every task, stage only that task's files and invoke the installed `commit-message` skill in `en auto` mode. Normalize the message with `/Users/quentin/.agents/skills/commit-message/scripts/format_commit_message.py` and commit with `git commit -F`.
- Execute inline in the current `codex/drag-and-drop-upload` worktree; do not dispatch subagents.

---

## File Structure

- Create `app/composables/file-manager/useFileDropzone.ts`: register window drag listeners, maintain drag depth, extract ordinary files, filter folders, reject drops during upload, and clean up listeners.
- Create `test/file-manager/useFileDropzone.spec.ts`: verify file detection, nested events, default prevention, folder filtering, rejection, blur reset, and unmount cleanup.
- Modify `app/composables/file-manager/useFileMutations.ts`: merge pending batches by filename, preserve paths while appending, reject inputs during upload, and retain failed upload state.
- Modify `test/file-manager/useFileMutations.spec.ts`: verify new-batch initialization, append behavior, replacement counts, upload guards, and retry state.
- Create `app/components/file-manager/FileDropOverlay.vue`: render an accessible non-interactive release prompt.
- Create `test/file-manager/FileDropOverlay.spec.ts`: verify copy, ARIA status semantics, decorative icon behavior, and pointer-event pass-through.
- Modify `app/components/file-manager/FileManagerToolbar.vue`: remove image-only input filtering.
- Modify `test/file-manager/FileManagerToolbar.spec.ts`: verify ordinary non-image selection and input attributes.
- Modify `app/components/FileManager.vue`: connect the dropzone to existing mutation state and render the overlay.
- Modify `test/file-manager/FileManager.spec.ts`: verify window drag feedback and drop-to-dialog integration.

---

### Task 1: Window-Level File Dropzone State

**Files:**

- Create: `app/composables/file-manager/useFileDropzone.ts`
- Create: `test/file-manager/useFileDropzone.spec.ts`

**Interfaces:**

- Consumes: `MaybeRefOrGetter<boolean>` upload state, `onFilesDropped(files: File[]): void`, `notify.warning(message: string): void`, and optional `windowTarget?: EventTarget`.
- Produces: `UseFileDropzoneReturn` with `isDraggingFiles: Ref<boolean>` and `resetDragState(): void`.

- [ ] **Step 1: Write failing tests for file activation, nested drag depth, and non-file drags**

Create `test/file-manager/useFileDropzone.spec.ts` with a mounted harness so Vue lifecycle hooks run:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, ref } from "vue";
import { mount, type VueWrapper } from "@vue/test-utils";
import {
  useFileDropzone,
  type UseFileDropzoneReturn,
} from "../../app/composables/file-manager/useFileDropzone";

type DropFiles = (files: File[]) => void;
type Notify = (message: string) => void;

type DataTransferStub = {
  types: string[];
  files: File[];
  items: DataTransferItem[];
  dropEffect: DataTransfer["dropEffect"];
};

function createDragEvent(type: string, dataTransfer: DataTransferStub): Event {
  const event = new Event(type, { cancelable: true });
  Object.defineProperty(event, "dataTransfer", { value: dataTransfer });
  return event;
}

function createDataTransfer(overrides: Partial<DataTransferStub> = {}): DataTransferStub {
  return {
    types: ["Files"],
    files: [],
    items: [],
    dropEffect: "none",
    ...overrides,
  };
}

function mountDropzone(isUploading = ref(false)) {
  const windowTarget = new EventTarget();
  const onFilesDropped = vi.fn<DropFiles>();
  const warning = vi.fn<Notify>();
  let dropzone: UseFileDropzoneReturn | undefined;

  const Harness = defineComponent({
    setup() {
      dropzone = useFileDropzone({
        isUploading,
        onFilesDropped,
        notify: { warning },
        windowTarget,
      });
      return () => h("div");
    },
  });

  const wrapper = mount(Harness);
  if (!dropzone) throw new Error("dropzone was not created");

  return { wrapper, windowTarget, onFilesDropped, warning, dropzone };
}

const wrappers: VueWrapper[] = [];

afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
});

describe("useFileDropzone", () => {
  it("activates for file drags and waits for the final nested leave", () => {
    const harness = mountDropzone();
    wrappers.push(harness.wrapper);
    const transfer = createDataTransfer();

    const firstEnter = createDragEvent("dragenter", transfer);
    const secondEnter = createDragEvent("dragenter", transfer);
    harness.windowTarget.dispatchEvent(firstEnter);
    harness.windowTarget.dispatchEvent(secondEnter);
    expect(firstEnter.defaultPrevented).toBe(true);
    expect(harness.dropzone.isDraggingFiles.value).toBe(true);

    harness.windowTarget.dispatchEvent(createDragEvent("dragleave", transfer));
    expect(harness.dropzone.isDraggingFiles.value).toBe(true);
    harness.windowTarget.dispatchEvent(createDragEvent("dragleave", transfer));
    expect(harness.dropzone.isDraggingFiles.value).toBe(false);
  });

  it("does not activate or prevent non-file drags", () => {
    const harness = mountDropzone();
    wrappers.push(harness.wrapper);
    const event = createDragEvent("dragenter", createDataTransfer({ types: ["text/plain"] }));

    harness.windowTarget.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(harness.dropzone.isDraggingFiles.value).toBe(false);
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
mise exec node@22.16.0 -- pnpm test --run test/file-manager/useFileDropzone.spec.ts
```

Expected: FAIL because `useFileDropzone.ts` does not exist.

- [ ] **Step 3: Implement lifecycle registration and drag-depth state**

Create `app/composables/file-manager/useFileDropzone.ts` with the public types and initial handlers:

```ts
import { onBeforeUnmount, onMounted, ref, type MaybeRefOrGetter, type Ref } from "vue";

type DropzoneDependencies = {
  isUploading: MaybeRefOrGetter<boolean>;
  onFilesDropped: (files: File[]) => void;
  notify: { warning: (message: string) => void };
  windowTarget?: EventTarget;
};

export type UseFileDropzoneReturn = {
  isDraggingFiles: Ref<boolean>;
  resetDragState: () => void;
};

type DragEventWithTransfer = Event & { dataTransfer: DataTransfer | null };

function getDataTransfer(event: Event): DataTransfer | null {
  if (!("dataTransfer" in event)) return null;
  return (event as DragEventWithTransfer).dataTransfer;
}

function containsFiles(dataTransfer: DataTransfer | null): boolean {
  return Boolean(dataTransfer && Array.from(dataTransfer.types).includes("Files"));
}

export function useFileDropzone(dependencies: DropzoneDependencies): UseFileDropzoneReturn {
  const isDraggingFiles = ref(false);
  let dragDepth = 0;
  let activeTarget: EventTarget | undefined;

  function resetDragState(): void {
    dragDepth = 0;
    isDraggingFiles.value = false;
  }

  function handleDragEnter(event: Event): void {
    if (!containsFiles(getDataTransfer(event))) return;
    event.preventDefault();
    dragDepth += 1;
    isDraggingFiles.value = true;
  }

  function handleDragOver(event: Event): void {
    const dataTransfer = getDataTransfer(event);
    if (!containsFiles(dataTransfer)) return;
    event.preventDefault();
    if (dataTransfer) dataTransfer.dropEffect = "copy";
  }

  function handleDragLeave(event: Event): void {
    if (!isDraggingFiles.value && !containsFiles(getDataTransfer(event))) return;
    dragDepth = Math.max(0, dragDepth - 1);
    isDraggingFiles.value = dragDepth > 0;
  }

  function register(target: EventTarget): void {
    activeTarget = target;
    target.addEventListener("dragenter", handleDragEnter);
    target.addEventListener("dragover", handleDragOver);
    target.addEventListener("dragleave", handleDragLeave);
    target.addEventListener("blur", resetDragState);
  }

  function unregister(): void {
    activeTarget?.removeEventListener("dragenter", handleDragEnter);
    activeTarget?.removeEventListener("dragover", handleDragOver);
    activeTarget?.removeEventListener("dragleave", handleDragLeave);
    activeTarget?.removeEventListener("blur", resetDragState);
    activeTarget = undefined;
    resetDragState();
  }

  onMounted(() => {
    const target =
      dependencies.windowTarget ?? (typeof window === "undefined" ? undefined : window);
    if (target) register(target);
  });
  onBeforeUnmount(unregister);

  return { isDraggingFiles, resetDragState };
}
```

- [ ] **Step 4: Run the initial tests and verify GREEN**

Run the focused test again. Expected: 1 file and 2 tests pass.

- [ ] **Step 5: Add failing tests for drop extraction, folders, upload rejection, blur, and cleanup**

Add a `createItem` helper and the remaining scenarios:

```ts
type EntryStub = { isDirectory: boolean; isFile: boolean };

function createItem(file: File | null, entry?: EntryStub): DataTransferItem {
  return {
    kind: "file",
    type: file?.type ?? "",
    getAsFile: () => file,
    webkitGetAsEntry: () => entry ?? null,
  } as DataTransferItem;
}

it("sets copy semantics and drops ordinary files", () => {
  const harness = mountDropzone();
  wrappers.push(harness.wrapper);
  const files = [new File(["a"], "a.txt"), new File(["b"], "b.pdf")];
  const transfer = createDataTransfer({
    files,
    items: files.map((file) => createItem(file, { isDirectory: false, isFile: true })),
  });

  const over = createDragEvent("dragover", transfer);
  harness.windowTarget.dispatchEvent(over);
  expect(over.defaultPrevented).toBe(true);
  expect(transfer.dropEffect).toBe("copy");

  harness.windowTarget.dispatchEvent(createDragEvent("drop", transfer));
  expect(harness.onFilesDropped).toHaveBeenCalledWith(files);
  expect(harness.dropzone.isDraggingFiles.value).toBe(false);
});

it("filters directories and warns when no ordinary files remain", () => {
  const harness = mountDropzone();
  wrappers.push(harness.wrapper);
  const transfer = createDataTransfer({
    items: [createItem(null, { isDirectory: true, isFile: false })],
  });

  harness.windowTarget.dispatchEvent(createDragEvent("drop", transfer));

  expect(harness.onFilesDropped).not.toHaveBeenCalled();
  expect(harness.warning).toHaveBeenCalledWith("暂不支持上传文件夹");
});

it("passes ordinary files from mixed file and directory drops", () => {
  const harness = mountDropzone();
  wrappers.push(harness.wrapper);
  const file = new File(["a"], "a.txt");
  const transfer = createDataTransfer({
    items: [
      createItem(null, { isDirectory: true, isFile: false }),
      createItem(file, { isDirectory: false, isFile: true }),
    ],
  });

  harness.windowTarget.dispatchEvent(createDragEvent("drop", transfer));
  expect(harness.onFilesDropped).toHaveBeenCalledWith([file]);
  expect(harness.warning).not.toHaveBeenCalled();
});

it("rejects drops during upload", () => {
  const isUploading = ref(true);
  const harness = mountDropzone(isUploading);
  wrappers.push(harness.wrapper);
  const file = new File(["a"], "a.txt");
  const transfer = createDataTransfer({ files: [file], items: [createItem(file)] });

  harness.windowTarget.dispatchEvent(createDragEvent("drop", transfer));
  expect(harness.onFilesDropped).not.toHaveBeenCalled();
  expect(harness.warning).toHaveBeenCalledWith("正在上传，请稍后再试");
});

it("resets on blur and removes listeners on unmount", () => {
  const harness = mountDropzone();
  const transfer = createDataTransfer();
  harness.windowTarget.dispatchEvent(createDragEvent("dragenter", transfer));
  harness.windowTarget.dispatchEvent(new Event("blur"));
  expect(harness.dropzone.isDraggingFiles.value).toBe(false);

  harness.wrapper.unmount();
  harness.windowTarget.dispatchEvent(createDragEvent("dragenter", transfer));
  expect(harness.dropzone.isDraggingFiles.value).toBe(false);
});
```

- [ ] **Step 6: Run the expanded tests and verify RED**

Run the focused test. Expected: drop scenarios fail because no `drop` handler or file extraction exists.

- [ ] **Step 7: Implement drop extraction and complete listener cleanup**

Add `toValue` to the existing Vue import, then add these helpers and handler to the composable:

```ts
type ExtractedDrop = { files: File[]; directoryCount: number };

function extractDrop(dataTransfer: DataTransfer): ExtractedDrop {
  const items = Array.from(dataTransfer.items ?? []);
  if (!items.length) return { files: Array.from(dataTransfer.files ?? []), directoryCount: 0 };

  const files: File[] = [];
  let directoryCount = 0;
  for (const item of items) {
    if (item.kind !== "file") continue;
    const entry = item.webkitGetAsEntry?.();
    if (entry?.isDirectory) {
      directoryCount += 1;
      continue;
    }
    const file = item.getAsFile();
    if (file) files.push(file);
  }
  return { files, directoryCount };
}

function handleDrop(event: Event): void {
  const dataTransfer = getDataTransfer(event);
  if (!containsFiles(dataTransfer) || !dataTransfer) return;
  event.preventDefault();
  resetDragState();

  if (toValue(dependencies.isUploading)) {
    dependencies.notify.warning("正在上传，请稍后再试");
    return;
  }

  const dropped = extractDrop(dataTransfer);
  if (dropped.files.length) {
    dependencies.onFilesDropped(dropped.files);
    return;
  }
  if (dropped.directoryCount > 0) {
    dependencies.notify.warning("暂不支持上传文件夹");
  }
}
```

Register and remove the `drop` handler alongside the other event handlers.

- [ ] **Step 8: Verify Task 1**

Run:

```bash
mise exec node@22.16.0 -- pnpm test --run test/file-manager/useFileDropzone.spec.ts
mise exec node@22.16.0 -- pnpm exec oxlint app/composables/file-manager/useFileDropzone.ts test/file-manager/useFileDropzone.spec.ts
mise exec node@22.16.0 -- pnpm exec oxfmt --check app/composables/file-manager/useFileDropzone.ts test/file-manager/useFileDropzone.spec.ts
```

Expected: all dropzone tests pass, Oxlint exits 0, and Oxfmt reports both files correctly formatted.

- [ ] **Step 9: Commit Task 1 with `commit-message en auto`**

Stage only the composable and its test. Expected commit intent: `feat(file-manager)` for a new drag-and-drop workflow primitive.

---

### Task 2: Pending Upload Batch Merging

**Files:**

- Modify: `app/composables/file-manager/useFileMutations.ts`
- Modify: `test/file-manager/useFileMutations.spec.ts`

**Interfaces:**

- Consumes: existing `handleFilesSelected(files: FileList | File[])`, `pendingFiles`, `showUploadDialog`, `uploadPathInput`, `isUploading`, current path, and warning notifications.
- Produces: filename-based later-wins merging while preserving the existing public composable return shape.

- [ ] **Step 1: Add failing tests for append, replacement, path preservation, and upload guards**

Add these tests to `test/file-manager/useFileMutations.spec.ts`:

```ts
it("appends files to an open upload batch and preserves the chosen path", () => {
  const mutations = createMutations();
  mutations.handleFilesSelected([new File(["a"], "a.txt")]);
  mutations.uploadPathInput.value = "archive/manual";

  mutations.handleFilesSelected([new File(["b"], "b.pdf")]);

  expect(mutations.pendingFiles.value?.map((file) => file.name)).toEqual(["a.txt", "b.pdf"]);
  expect(mutations.uploadPathInput.value).toBe("archive/manual");
  expect(expandPathParents).toHaveBeenCalledOnce();
});

it("replaces pending files by name with the most recent File object", () => {
  const first = new File(["old"], "same.txt", { type: "text/plain" });
  const second = new File(["new"], "same.txt", { type: "text/plain" });
  const mutations = createMutations();
  mutations.handleFilesSelected([first]);

  mutations.handleFilesSelected([second]);

  expect(mutations.pendingFiles.value).toEqual([second]);
  expect(notify.warning).toHaveBeenCalledWith("已替换 1 个同名文件");
});

it("uses the last duplicate inside one incoming batch", () => {
  const first = new File(["first"], "same.txt");
  const second = new File(["second"], "same.txt");
  const mutations = createMutations();

  mutations.handleFilesSelected([first, second]);

  expect(mutations.pendingFiles.value).toEqual([second]);
  expect(notify.warning).toHaveBeenCalledWith("已替换 1 个同名文件");
});

it("rejects new files while uploading without changing the pending batch", async () => {
  let resolveRequest: (() => void) | undefined;
  request.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        resolveRequest = resolve;
      }),
  );
  const mutations = createMutations();
  const first = new File(["a"], "a.txt");
  mutations.handleFilesSelected([first]);
  const upload = mutations.confirmUpload();

  mutations.handleFilesSelected([new File(["b"], "b.txt")]);
  expect(mutations.pendingFiles.value).toEqual([first]);
  expect(notify.warning).toHaveBeenCalledWith("正在上传，请稍后再试");

  resolveRequest?.();
  await upload;
});
```

- [ ] **Step 2: Run mutation tests and verify RED**

Run the focused mutation suite. Expected: append and replacement assertions fail because `handleFilesSelected` currently replaces the whole batch, and the upload guard fails because new files still replace pending state.

- [ ] **Step 3: Implement immutable filename-based batch merging**

Add a private helper above the composable:

```ts
type MergeFilesResult = { files: File[]; replacedCount: number };

function mergePendingFiles(current: readonly File[], incoming: readonly File[]): MergeFilesResult {
  const files = [...current];
  const indexByName = new Map(files.map((file, index) => [file.name, index]));
  let replacedCount = 0;

  for (const file of incoming) {
    const existingIndex = indexByName.get(file.name);
    if (existingIndex === undefined) {
      indexByName.set(file.name, files.length);
      files.push(file);
      continue;
    }
    files[existingIndex] = file;
    replacedCount += 1;
  }

  return { files, replacedCount };
}
```

Replace `handleFilesSelected` with:

```ts
function handleFilesSelected(files: FileList | File[]): void {
  const incomingFiles = Array.isArray(files) ? files : Array.from(files);
  if (!incomingFiles.length) return;
  if (isUploading.value) {
    dependencies.notify.warning("正在上传，请稍后再试");
    return;
  }

  const isAppending = showUploadDialog.value;
  const currentFiles = isAppending ? (pendingFiles.value ?? []) : [];
  const merged = mergePendingFiles(currentFiles, incomingFiles);
  pendingFiles.value = merged.files;

  if (!isAppending) {
    uploadPathInput.value = normalizeDirectoryPath(dependencies.currentPath.value);
    dependencies.expandPathParents(uploadPathInput.value);
    showUploadDialog.value = true;
  }
  if (merged.replacedCount > 0) {
    dependencies.notify.warning(`已替换 ${merged.replacedCount} 个同名文件`);
  }
}
```

- [ ] **Step 4: Run mutation tests and verify GREEN**

Run the focused mutation suite. Expected: existing tests plus the three new merge tests pass.

- [ ] **Step 5: Add the failed-upload retry-state regression contract**

Add:

```ts
it("keeps the upload dialog, files, and path after request failure", async () => {
  request.mockRejectedValueOnce(new Error("failed"));
  const mutations = createMutations();
  const file = new File(["a"], "a.txt");
  mutations.handleFilesSelected([file]);
  mutations.uploadPathInput.value = "retry-target";

  await mutations.confirmUpload();

  expect(mutations.showUploadDialog.value).toBe(true);
  expect(mutations.pendingFiles.value).toEqual([file]);
  expect(mutations.uploadPathInput.value).toBe("retry-target");
  expect(mutations.isUploading.value).toBe(false);
});
```

- [ ] **Step 6: Run tests and verify the retry-state regression**

The failed-upload state test should pass with the existing catch behavior; keep it as a regression contract and do not change production code if it already passes.

- [ ] **Step 7: Verify Task 2**

Run the focused mutation tests, Oxlint on both files, and Oxfmt check on both files. Expected: all pass.

- [ ] **Step 8: Commit Task 2 with `commit-message en auto`**

Stage only `useFileMutations.ts` and its test. Expected intent: `feat(file-manager)` because users can build and revise one pending upload batch.

---

### Task 3: Accessible Overlay and Ordinary File Picker

**Files:**

- Create: `app/components/file-manager/FileDropOverlay.vue`
- Create: `test/file-manager/FileDropOverlay.spec.ts`
- Modify: `app/components/file-manager/FileManagerToolbar.vue`
- Modify: `test/file-manager/FileManagerToolbar.spec.ts`

**Interfaces:**

- Produces: a stateless `FileDropOverlay` component and a toolbar file input without MIME filtering.

- [ ] **Step 1: Write failing overlay component tests**

Create `test/file-manager/FileDropOverlay.spec.ts`:

```ts
import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import FileDropOverlay from "../../app/components/file-manager/FileDropOverlay.vue";

describe("FileDropOverlay", () => {
  it("renders accessible release guidance without intercepting pointer events", () => {
    const wrapper = mount(FileDropOverlay);
    const status = wrapper.get('[role="status"]');

    expect(status.text()).toContain("释放以上传文件");
    expect(status.text()).toContain("支持同时上传多个文件");
    expect(status.attributes("aria-live")).toBe("polite");
    expect(status.attributes("aria-atomic")).toBe("true");
    expect(status.classes()).toContain("pointer-events-none");
    expect(status.get("svg").attributes("aria-hidden")).toBe("true");
  });
});
```

- [ ] **Step 2: Run the overlay test and verify RED**

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement the overlay**

Create:

```vue
<script setup lang="ts">
import { UploadCloud } from "@lucide/vue";
</script>

<template>
  <div
    role="status"
    aria-live="polite"
    aria-atomic="true"
    class="pointer-events-none absolute inset-0 z-[60] flex items-center justify-center rounded-lg border-2 border-dashed border-primary/60 bg-background/90 p-6 backdrop-blur-sm"
  >
    <div class="flex max-w-sm flex-col items-center gap-3 text-center">
      <div class="rounded-full bg-primary/10 p-3 text-primary">
        <UploadCloud aria-hidden="true" class="h-7 w-7" />
      </div>
      <div>
        <p class="font-medium">释放以上传文件</p>
        <p class="mt-1 text-sm text-muted-foreground">支持同时上传多个文件</p>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 4: Run the overlay test and verify GREEN**

Expected: 1 test passes.

- [ ] **Step 5: Add failing toolbar tests for ordinary files**

Update the existing file-input test to use `notes.txt`, then add:

```ts
it("accepts ordinary files without MIME filtering", () => {
  const wrapper = mount(FileManagerToolbar, {
    props: baseProps,
    global: { stubs: { Button: ButtonStub } },
  });
  const input = wrapper.get('input[type="file"]');
  expect(input.attributes("accept")).toBeUndefined();
  expect(input.attributes("multiple")).toBeDefined();
});
```

- [ ] **Step 6: Run toolbar tests and verify RED**

Expected: the accept assertion fails because the input still has `accept="image/*"`.

- [ ] **Step 7: Remove the image-only input restriction**

Delete only `accept="image/*"` from the hidden input. Preserve `multiple`, change handling, cloning, and value reset.

- [ ] **Step 8: Verify Task 3**

Run both component test files, targeted Oxlint, Nuxt typecheck, and targeted Oxfmt. Expected: all pass.

- [ ] **Step 9: Commit Task 3 with `commit-message en auto`**

Stage only the overlay, toolbar, and their tests. Expected intent: `feat(file-manager)`.

---

### Task 4: FileManager Integration and Production Verification

**Files:**

- Modify: `app/components/FileManager.vue`
- Modify: `test/file-manager/FileManager.spec.ts`

**Interfaces:**

- Consumes: `useFileDropzone`, `FileDropOverlay`, mutation `isUploading`, and `handleFilesSelected`.
- Produces: visible window drag feedback and drop-to-existing-dialog behavior with no new network path.

- [ ] **Step 1: Add failing FileManager integration tests**

Extend the manager test harness with a real `UploadDialog` stub and overlay marker:

```ts
const UploadDialogStub = defineComponent({
  name: "UploadDialog",
  props: ["open", "pendingCount", "uploadPath"],
  emits: ["confirm"],
  setup(props, { emit }) {
    return () =>
      h(
        "div",
        {
          "data-upload-open": String(props.open),
          "data-pending-count": String(props.pendingCount),
          "data-upload-path": String(props.uploadPath),
        },
        [h("button", { "data-action": "confirm-upload", onClick: () => emit("confirm") })],
      );
  },
});

const DropOverlayStub = defineComponent({
  name: "FileDropOverlay",
  setup: () => () => h("div", { "data-drop-overlay": "visible" }),
});

type DataTransferStub = {
  types: string[];
  files: File[];
  items: DataTransferItem[];
  dropEffect: DataTransfer["dropEffect"];
};

function createDataTransfer(files: File[]): DataTransferStub {
  return {
    types: ["Files"],
    files,
    items: files.map(
      (file) =>
        ({
          kind: "file",
          type: file.type,
          getAsFile: () => file,
          webkitGetAsEntry: () => null,
        }) as DataTransferItem,
    ),
    dropEffect: "none",
  };
}

function createDragEvent(type: string, dataTransfer: DataTransferStub): Event {
  const event = new Event(type, { cancelable: true });
  Object.defineProperty(event, "dataTransfer", { value: dataTransfer });
  return event;
}
```

Use these stubs instead of `UploadDialog: true`. Add tests:

```ts
it("shows drag feedback and opens the existing upload dialog after drop", async () => {
  const wrapper = await mountManager();
  const file = new File(["notes"], "notes.txt");
  const transfer = createDataTransfer([file]);

  window.dispatchEvent(createDragEvent("dragenter", transfer));
  await nextTick();
  expect(wrapper.find('[data-drop-overlay="visible"]').exists()).toBe(true);

  window.dispatchEvent(createDragEvent("drop", transfer));
  await nextTick();
  expect(wrapper.find('[data-drop-overlay="visible"]').exists()).toBe(false);
  expect(wrapper.get("[data-upload-open]").attributes("data-upload-open")).toBe("true");
  expect(wrapper.get("[data-pending-count]").attributes("data-pending-count")).toBe("1");
});

it("appends a second drop to the open upload batch", async () => {
  const wrapper = await mountManager();
  window.dispatchEvent(createDragEvent("drop", createDataTransfer([new File(["a"], "a.txt")])));
  window.dispatchEvent(createDragEvent("drop", createDataTransfer([new File(["b"], "b.txt")])));
  await nextTick();

  expect(wrapper.get("[data-pending-count]").attributes("data-pending-count")).toBe("2");
});

it("keeps one pending file when a later drop replaces the same filename", async () => {
  const wrapper = await mountManager();
  window.dispatchEvent(
    createDragEvent("drop", createDataTransfer([new File(["old"], "same.txt")])),
  );
  window.dispatchEvent(
    createDragEvent("drop", createDataTransfer([new File(["new"], "same.txt")])),
  );
  await nextTick();

  expect(wrapper.get("[data-pending-count]").attributes("data-pending-count")).toBe("1");
});
```

For the upload-in-progress integration case, replace the harness's anonymous `$fetch` mock with a typed shared mock:

```ts
type Request = (url: string, options?: unknown) => Promise<unknown>;
const request = vi.fn<Request>();

vi.stubGlobal("$fetch", request);
```

Then add:

```ts
it("does not append a drop while the current upload is pending", async () => {
  let resolveRequest: (() => void) | undefined;
  request.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        resolveRequest = resolve;
      }),
  );
  const wrapper = await mountManager();
  window.dispatchEvent(createDragEvent("drop", createDataTransfer([new File(["a"], "a.txt")])));
  await wrapper.get('[data-action="confirm-upload"]').trigger("click");

  window.dispatchEvent(createDragEvent("drop", createDataTransfer([new File(["b"], "b.txt")])));
  await nextTick();
  expect(wrapper.get("[data-pending-count]").attributes("data-pending-count")).toBe("1");

  resolveRequest?.();
  await flushPromises();
});
```

Ensure every mounted manager wrapper is unmounted after each test so window listeners cannot leak between cases. Reset the shared request mock before each test and default it to `mockResolvedValue(undefined)`.

- [ ] **Step 2: Run manager tests and verify RED**

Expected: overlay and upload dialog assertions fail because FileManager has not created the dropzone or rendered the overlay.

- [ ] **Step 3: Wire dropzone state into FileManager**

Add imports:

```ts
import FileDropOverlay from "./file-manager/FileDropOverlay.vue";
import { useFileDropzone } from "../composables/file-manager/useFileDropzone";
```

After mutation outputs are destructured, create the dropzone:

```ts
const { isDraggingFiles } = useFileDropzone({
  isUploading,
  onFilesDropped: handleFilesSelected,
  notify: { warning: toast.warning },
});
```

Change the root container and render the overlay first:

```diff
-  <div class="space-y-4">
+  <div class="relative space-y-4">
+    <FileDropOverlay v-if="isDraggingFiles" />
```

Apply this as a minimal template patch: change only the root class and insert the overlay as the first child. Keep every existing toolbar, control, dialog, list, and preview sibling in its current order.

- [ ] **Step 4: Run manager tests and verify GREEN**

Expected: all existing view workflow tests and new drop workflow tests pass with wrappers unmounted cleanly.

- [ ] **Step 5: Run the complete production gate**

Run:

```bash
mise exec node@22.16.0 -- pnpm format:check
mise exec node@22.16.0 -- pnpm lint
mise exec node@22.16.0 -- pnpm typecheck
mise exec node@22.16.0 -- pnpm test --run
mise exec node@22.16.0 -- pnpm build
mise exec node@22.16.0 -- env NITRO_PRESET=cloudflare_module pnpm build
mise exec node@22.16.0 -- pnpm exec wrangler deploy --dry-run
```

Expected: every command exits 0; record final Vitest counts and confirm Wrangler has no `node:events` validation error.

- [ ] **Step 6: Review final behavior and diff boundaries**

Run `git diff --check`, inspect `git diff --stat main`, and verify no server API, package manifest, lockfile, or R2 route changed. After Task 4 is committed, use `git diff --check main...HEAD` for the final branch review.

- [ ] **Step 7: Commit Task 4 with `commit-message en auto`**

Stage only `FileManager.vue` and `FileManager.spec.ts`. Expected intent: `feat(file-manager)` because the commit exposes the completed drag-and-drop workflow.

- [ ] **Step 8: Commit verification-driven fixes only when necessary**

If the full gate exposes a real issue, reproduce behavioral failures with a new failing test, make the smallest correction, rerun the complete gate, and auto-commit only the affected files. Do not create an empty verification commit.

---

## Final Acceptance Checklist

- [ ] Ordinary file drags activate an accessible overlay over the file manager.
- [ ] Nested drag events do not flicker, and drop/blur/unmount always clear state.
- [ ] Text and link drags remain untouched.
- [ ] Directories are filtered and directory-only drops show the approved warning.
- [ ] Dropped files open the existing upload confirmation dialog.
- [ ] Open batches append new filenames and replace same-name files with later inputs.
- [ ] Appending preserves the manually selected upload path.
- [ ] Uploading rejects both drop and direct selection batch changes.
- [ ] Failed uploads retain the dialog, files, and path for retry.
- [ ] Toolbar file selection accepts ordinary non-image files.
- [ ] No API, FormData, R2 pathname, dependency, or server behavior changes.
- [ ] Every implementation task has an English auto-generated Conventional Commit.
- [ ] Oxfmt, Oxlint, Nuxt typecheck, all tests, both builds, and Wrangler dry-run pass.
