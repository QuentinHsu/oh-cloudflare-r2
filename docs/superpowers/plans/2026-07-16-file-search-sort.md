# File Search and Sorting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add immediate current-folder search and deterministic client-side sorting to the file manager without changing server APIs or R2 requests.

**Architecture:** Introduce a pure `useFileView` composable that derives visible folders and files from existing `useFetch` data. Add a controlled `FileViewControls` component for search and sort inputs, then wire both through `FileManager.vue` so `FileList` and `useFileSelection` operate on the visible file set.

**Tech Stack:** Nuxt 4, Vue 3 Composition API, TypeScript, shadcn-vue/reka-ui, Tailwind CSS 4, Vitest, Vue Test Utils, Oxfmt, Oxlint.

## Global Constraints

- Search only the direct folders and files already returned for the current directory.
- Search both folders and files, ignoring case and trimming surrounding whitespace.
- Keep folders above files and always sort folders by name ascending.
- Support file sorting by `name`, `uploadedAt`, and `size` in ascending or descending order.
- Preserve the existing default file order: `uploadedAt` descending.
- Break file sort ties by display filename ascending, then full pathname ascending.
- Treat invalid `uploadedAt` values as timestamp `0`.
- Clear search on directory navigation while preserving sort field and direction.
- Clear selection when search changes; preserve selection when only sorting changes.
- Select all only from the visible file set.
- Do not add debounce, persistence, global shortcuts, server APIs, R2 requests, or runtime dependencies.
- Preserve existing API routes, request bodies, R2 path semantics, mutation behavior, and primary product copy outside the new search UI.
- Use Oxfmt and Oxlint only; do not introduce ESLint or Prettier.
- At the end of every task, stage only that task's files and invoke the installed `commit-message` skill in `en auto` mode. Normalize the message with `/Users/quentin/.agents/skills/commit-message/scripts/format_commit_message.py` and commit with `git commit -F`.
- Execute inline in the current `codex/file-search-sort` worktree; do not dispatch subagents.

---

## File Structure

- Create `app/composables/file-manager/useFileView.ts`: own search and sort state, normalize queries, filter current-folder items, and perform deterministic sorting.
- Create `test/file-manager/useFileView.spec.ts`: verify search, all sort fields and directions, stable tie-breaking, invalid dates, and exposed actions.
- Create `app/components/file-manager/FileViewControls.vue`: render controlled search and sort inputs with accessible icon actions.
- Create `test/file-manager/FileViewControls.spec.ts`: verify emitted updates, result summary, conditional clear action, and accessible names.
- Modify `app/components/FileManager.vue`: connect raw API data to `useFileView`, pass visible data into selection and list rendering, and reset search on navigation.
- Modify `app/components/file-manager/FileList.vue`: distinguish an empty source directory from an active search with no results.
- Modify `test/file-manager/FileList.spec.ts`: verify both empty states and the clear-search event.
- Modify `test/file-manager/useFileSelection.spec.ts`: verify select-all follows a reactive visible file list.
- Create `test/file-manager/FileManager.spec.ts`: verify search updates visible rows and selection, navigation clears search, and sorting does not clear selection.

---

### Task 1: Derive Visible Folders and Files

**Files:**

- Create: `app/composables/file-manager/useFileView.ts`
- Create: `test/file-manager/useFileView.spec.ts`

**Interfaces:**

- Consumes: `MaybeRefOrGetter<readonly string[]>`, `MaybeRefOrGetter<readonly BlobFile[]>`, and `getFileName(pathname: string): string`.
- Produces: `SortField`, `SortDirection`, and `useFileView(folders, files)` returning `searchQuery`, `sortField`, `sortDirection`, `visibleFolders`, `visibleFiles`, `hasActiveSearch`, `resultCount`, `clearSearch`, and `toggleSortDirection`.

- [ ] **Step 1: Write failing search and default-order tests**

Create `test/file-manager/useFileView.spec.ts` with the initial behavior tests:

```ts
import { describe, expect, it } from "vitest";
import { ref } from "vue";
import { useFileView } from "../../app/composables/file-manager/useFileView";
import type { BlobFile } from "../../app/components/file-manager/types";

const files: BlobFile[] = [
  {
    pathname: "photos/Zebra-10.png",
    contentType: "image/png",
    size: 100,
    uploadedAt: "2026-01-03T00:00:00Z",
  },
  {
    pathname: "photos/alpha-2.png",
    contentType: "image/png",
    size: 300,
    uploadedAt: "2026-01-01T00:00:00Z",
  },
  {
    pathname: "photos/alpha-10.png",
    contentType: "image/png",
    size: 200,
    uploadedAt: "2026-01-02T00:00:00Z",
  },
];

describe("useFileView", () => {
  it("filters current-folder folders and filenames without case sensitivity", () => {
    const view = useFileView(ref(["Receipts", "Travel"]), ref(files));

    view.searchQuery.value = "  ALPHA  ";

    expect(view.visibleFolders.value).toEqual([]);
    expect(view.visibleFiles.value.map((file) => file.pathname)).toEqual([
      "photos/alpha-10.png",
      "photos/alpha-2.png",
    ]);
    expect(view.hasActiveSearch.value).toBe(true);
    expect(view.resultCount.value).toBe(2);

    view.searchQuery.value = "receipt";
    expect(view.visibleFolders.value).toEqual(["Receipts"]);
    expect(view.visibleFiles.value).toEqual([]);
  });

  it("treats blank search as inactive and keeps uploadedAt descending by default", () => {
    const view = useFileView(ref(["Travel", "docs"]), ref(files));

    view.searchQuery.value = "   ";

    expect(view.hasActiveSearch.value).toBe(false);
    expect(view.visibleFolders.value).toEqual(["docs", "Travel"]);
    expect(view.visibleFiles.value.map((file) => file.pathname)).toEqual([
      "photos/Zebra-10.png",
      "photos/alpha-10.png",
      "photos/alpha-2.png",
    ]);
    expect(view.resultCount.value).toBe(5);
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
mise exec node@22.16.0 -- pnpm test --run test/file-manager/useFileView.spec.ts
```

Expected: FAIL because `app/composables/file-manager/useFileView.ts` does not exist.

- [ ] **Step 3: Implement the minimal composable for search and default sorting**

Create `app/composables/file-manager/useFileView.ts`:

```ts
import { computed, ref, toValue, type MaybeRefOrGetter } from "vue";
import type { BlobFile } from "../../components/file-manager/types";
import { getFileName } from "../../components/file-manager/utils";

export type SortField = "name" | "uploadedAt" | "size";
export type SortDirection = "asc" | "desc";

function getTimestamp(value: string) {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function useFileView(
  folders: MaybeRefOrGetter<readonly string[]>,
  files: MaybeRefOrGetter<readonly BlobFile[]>,
) {
  const searchQuery = ref("");
  const sortField = ref<SortField>("uploadedAt");
  const sortDirection = ref<SortDirection>("desc");
  const collator = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: "base",
  });
  const normalizedQuery = computed(() => searchQuery.value.trim().toLocaleLowerCase());
  const hasActiveSearch = computed(() => normalizedQuery.value.length > 0);

  function matchesSearch(name: string) {
    return name.toLocaleLowerCase().includes(normalizedQuery.value);
  }

  const visibleFolders = computed(() =>
    toValue(folders)
      .filter((folder) => !hasActiveSearch.value || matchesSearch(folder))
      .toSorted((left, right) => collator.compare(left, right)),
  );

  function compareFiles(left: BlobFile, right: BlobFile) {
    const leftName = getFileName(left.pathname);
    const rightName = getFileName(right.pathname);
    let primary = 0;

    if (sortField.value === "name") primary = collator.compare(leftName, rightName);
    if (sortField.value === "uploadedAt") {
      primary = getTimestamp(left.uploadedAt) - getTimestamp(right.uploadedAt);
    }
    if (sortField.value === "size") primary = left.size - right.size;

    if (primary !== 0) return sortDirection.value === "asc" ? primary : -primary;

    const filenameResult = collator.compare(leftName, rightName);
    return filenameResult || collator.compare(left.pathname, right.pathname);
  }

  const visibleFiles = computed(() =>
    toValue(files)
      .filter((file) => !hasActiveSearch.value || matchesSearch(getFileName(file.pathname)))
      .toSorted(compareFiles),
  );

  const resultCount = computed(() => visibleFolders.value.length + visibleFiles.value.length);

  function clearSearch() {
    searchQuery.value = "";
  }

  function toggleSortDirection() {
    sortDirection.value = sortDirection.value === "asc" ? "desc" : "asc";
  }

  return {
    searchQuery,
    sortField,
    sortDirection,
    visibleFolders,
    visibleFiles,
    hasActiveSearch,
    resultCount,
    clearSearch,
    toggleSortDirection,
  };
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```bash
mise exec node@22.16.0 -- pnpm test --run test/file-manager/useFileView.spec.ts
```

Expected: 1 test file and 2 tests pass.

- [ ] **Step 5: Add failing tests for every sort mode, tie-breaker, invalid date, and actions**

Append tests that set `sortField` and `sortDirection` directly and assert exact pathname arrays:

```ts
it.each([
  ["name", "asc", ["photos/alpha-2.png", "photos/alpha-10.png", "photos/Zebra-10.png"]],
  ["name", "desc", ["photos/Zebra-10.png", "photos/alpha-10.png", "photos/alpha-2.png"]],
  ["uploadedAt", "asc", ["photos/alpha-2.png", "photos/alpha-10.png", "photos/Zebra-10.png"]],
  ["uploadedAt", "desc", ["photos/Zebra-10.png", "photos/alpha-10.png", "photos/alpha-2.png"]],
  ["size", "asc", ["photos/Zebra-10.png", "photos/alpha-10.png", "photos/alpha-2.png"]],
  ["size", "desc", ["photos/alpha-2.png", "photos/alpha-10.png", "photos/Zebra-10.png"]],
] as const)("sorts by %s %s", (field, direction, expected) => {
  const view = useFileView(ref([]), ref(files));
  view.sortField.value = field;
  view.sortDirection.value = direction;

  expect(view.visibleFiles.value.map((file) => file.pathname)).toEqual(expected);
});

it("uses filename and pathname as deterministic ascending tie-breakers", () => {
  const tied: BlobFile[] = [
    { pathname: "b/same.png", contentType: "image/png", size: 10, uploadedAt: "2026-01-01" },
    { pathname: "c/zeta.png", contentType: "image/png", size: 10, uploadedAt: "2026-01-01" },
    { pathname: "a/same.png", contentType: "image/png", size: 10, uploadedAt: "2026-01-01" },
  ];
  const view = useFileView(ref([]), ref(tied));
  view.sortField.value = "size";
  view.sortDirection.value = "desc";

  expect(view.visibleFiles.value.map((file) => file.pathname)).toEqual([
    "a/same.png",
    "b/same.png",
    "c/zeta.png",
  ]);
});

it("treats invalid dates as timestamp zero", () => {
  const dated: BlobFile[] = [
    { pathname: "valid.png", contentType: "image/png", size: 1, uploadedAt: "2026-01-01" },
    { pathname: "invalid.png", contentType: "image/png", size: 1, uploadedAt: "not-a-date" },
  ];
  const view = useFileView(ref([]), ref(dated));
  view.sortDirection.value = "asc";

  expect(view.visibleFiles.value.map((file) => file.pathname)).toEqual([
    "invalid.png",
    "valid.png",
  ]);
});

it("clears search and toggles direction without resetting the sort field", () => {
  const view = useFileView(ref([]), ref(files));
  view.searchQuery.value = "alpha";
  view.sortField.value = "size";

  view.clearSearch();
  view.toggleSortDirection();

  expect(view.searchQuery.value).toBe("");
  expect(view.sortField.value).toBe("size");
  expect(view.sortDirection.value).toBe("asc");
});
```

- [ ] **Step 6: Run the expanded test and verify RED where behavior is incomplete**

Run the focused test command again. Expected: any incomplete comparator or action behavior fails with an exact ordering mismatch; do not change assertions to match implementation output.

- [ ] **Step 7: Complete and refactor the composable while keeping behavior minimal**

Ensure the implementation exactly matches the interface and comparator rules shown in Step 3. Keep `Intl.Collator` and date parsing private to the module, return new sorted arrays, and do not mutate source refs.

- [ ] **Step 8: Verify task tests and static checks**

Run:

```bash
mise exec node@22.16.0 -- pnpm test --run test/file-manager/useFileView.spec.ts test/file-manager/utils.spec.ts
mise exec node@22.16.0 -- pnpm exec oxlint app/composables/file-manager/useFileView.ts test/file-manager/useFileView.spec.ts
mise exec node@22.16.0 -- pnpm exec oxfmt --check app/composables/file-manager/useFileView.ts test/file-manager/useFileView.spec.ts
```

Expected: all focused tests pass, Oxlint exits 0, and Oxfmt reports both files correctly formatted.

- [ ] **Step 9: Commit Task 1 with `commit-message en auto`**

Stage only:

```bash
git add app/composables/file-manager/useFileView.ts test/file-manager/useFileView.spec.ts
```

Read `git diff --cached`, generate an English Conventional Commit message from the staged behavior, normalize it with the installed formatter script, and commit via `git commit -F`. Expected intent: `feat(file-manager)` because search and sorting are new user capabilities.

---

### Task 2: Add Accessible Search and Sort Controls

**Files:**

- Create: `app/components/file-manager/FileViewControls.vue`
- Create: `test/file-manager/FileViewControls.spec.ts`

**Interfaces:**

- Consumes: `SortField` and `SortDirection` from `useFileView.ts`.
- Produces: props `searchQuery`, `sortField`, `sortDirection`, `hasActiveSearch`, `resultCount`; emits `update:search-query`, `update:sort-field`, `toggle-sort-direction`, and `clear-search`.

- [ ] **Step 1: Write the failing component tests**

Create `test/file-manager/FileViewControls.spec.ts`. Stub shadcn components with native controls so tests exercise the public component interface:

```ts
import { describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import { mount } from "@vue/test-utils";
import FileViewControls from "../../app/components/file-manager/FileViewControls.vue";

const ButtonStub = defineComponent({
  name: "Button",
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    return () => h("button", attrs, slots.default?.());
  },
});

const InputStub = defineComponent({
  name: "Input",
  inheritAttrs: false,
  props: { modelValue: { type: [String, Number], default: "" } },
  emits: ["update:modelValue"],
  setup(props, { attrs, emit }) {
    return () =>
      h("input", {
        ...attrs,
        value: props.modelValue,
        onInput: (event: Event) =>
          emit("update:modelValue", (event.target as HTMLInputElement).value),
      });
  },
});

const SelectStub = defineComponent({
  name: "Select",
  props: { modelValue: String },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    return () =>
      h(
        "select",
        {
          "aria-label": "排序字段",
          value: props.modelValue,
          onChange: (event: Event) =>
            emit("update:modelValue", (event.target as HTMLSelectElement).value),
        },
        [
          h("option", { value: "name" }, "名称"),
          h("option", { value: "uploadedAt" }, "更新时间"),
          h("option", { value: "size" }, "大小"),
        ],
      );
  },
});

function mountControls(hasActiveSearch = true) {
  return mount(FileViewControls, {
    props: {
      searchQuery: hasActiveSearch ? "cat" : "",
      sortField: "uploadedAt",
      sortDirection: "desc",
      hasActiveSearch,
      resultCount: 2,
    },
    global: {
      stubs: {
        Button: ButtonStub,
        Input: InputStub,
        Select: SelectStub,
        SelectTrigger: true,
        SelectValue: true,
        SelectContent: true,
        SelectItem: true,
      },
    },
  });
}

describe("FileViewControls", () => {
  it("emits controlled search and sort updates", async () => {
    const wrapper = mountControls();

    await wrapper.get('input[aria-label="搜索当前文件夹"]').setValue("dog");
    await wrapper.get('select[aria-label="排序字段"]').setValue("size");

    expect(wrapper.emitted("update:search-query")?.at(-1)).toEqual(["dog"]);
    expect(wrapper.emitted("update:sort-field")?.at(-1)).toEqual(["size"]);
  });

  it("exposes accessible icon actions and result count", async () => {
    const wrapper = mountControls();
    const clear = wrapper.get('button[aria-label="清除搜索"]');
    const direction = wrapper.get('button[aria-label="切换为升序"]');

    expect(clear.attributes("title")).toBe("清除搜索");
    expect(direction.attributes("title")).toBe("切换为升序");
    expect(wrapper.text()).toContain("找到 2 项");

    await clear.trigger("click");
    await direction.trigger("click");
    expect(wrapper.emitted("clear-search")).toHaveLength(1);
    expect(wrapper.emitted("toggle-sort-direction")).toHaveLength(1);
  });

  it("hides clear action and summary without active search", () => {
    const wrapper = mountControls(false);
    expect(wrapper.find('button[aria-label="清除搜索"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain("找到");
  });
});
```

- [ ] **Step 2: Run the component test and verify RED**

Run:

```bash
mise exec node@22.16.0 -- pnpm test --run test/file-manager/FileViewControls.spec.ts
```

Expected: FAIL because `FileViewControls.vue` does not exist.

- [ ] **Step 3: Implement the controlled component**

Create `app/components/file-manager/FileViewControls.vue`:

```vue
<script setup lang="ts">
import { ArrowDown, ArrowUp, Search, X } from "@lucide/vue";
import { computed } from "vue";
import type { SortDirection, SortField } from "../../composables/file-manager/useFileView";

const props = defineProps<{
  searchQuery: string;
  sortField: SortField;
  sortDirection: SortDirection;
  hasActiveSearch: boolean;
  resultCount: number;
}>();

const emit = defineEmits<{
  (event: "update:search-query", value: string): void;
  (event: "update:sort-field", value: SortField): void;
  (event: "toggle-sort-direction"): void;
  (event: "clear-search"): void;
}>();

function handleSearchUpdate(value: string | number) {
  emit("update:search-query", String(value));
}

function handleSortFieldUpdate(value: unknown) {
  if (value === "name" || value === "uploadedAt" || value === "size") {
    emit("update:sort-field", value);
  }
}

const directionAction = computed(() =>
  props.sortDirection === "asc" ? "切换为降序" : "切换为升序",
);
</script>

<template>
  <div class="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3">
    <div class="relative min-w-64 flex-1">
      <Search
        aria-hidden="true"
        class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        :model-value="props.searchQuery"
        aria-label="搜索当前文件夹"
        placeholder="搜索当前文件夹"
        class="pl-9 pr-9"
        @update:model-value="handleSearchUpdate"
      />
      <Button
        v-if="props.hasActiveSearch"
        type="button"
        variant="ghost"
        size="icon"
        class="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
        aria-label="清除搜索"
        title="清除搜索"
        @click="emit('clear-search')"
      >
        <X aria-hidden="true" class="h-4 w-4" />
      </Button>
    </div>

    <Select :model-value="props.sortField" @update:model-value="handleSortFieldUpdate">
      <SelectTrigger class="w-36" aria-label="排序字段">
        <SelectValue placeholder="排序方式" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="name">名称</SelectItem>
        <SelectItem value="uploadedAt">更新时间</SelectItem>
        <SelectItem value="size">大小</SelectItem>
      </SelectContent>
    </Select>

    <Button
      type="button"
      variant="outline"
      size="icon"
      :aria-label="directionAction"
      :title="directionAction"
      @click="emit('toggle-sort-direction')"
    >
      <ArrowUp v-if="props.sortDirection === 'asc'" aria-hidden="true" class="h-4 w-4" />
      <ArrowDown v-else aria-hidden="true" class="h-4 w-4" />
    </Button>

    <p v-if="props.hasActiveSearch" class="text-sm text-muted-foreground" aria-live="polite">
      找到 {{ props.resultCount }} 项
    </p>
  </div>
</template>
```

- [ ] **Step 4: Run the component test and verify GREEN**

Run the focused test again. Expected: 1 test file and 3 tests pass.

- [ ] **Step 5: Verify task tests, type safety, lint, and formatting**

Run:

```bash
mise exec node@22.16.0 -- pnpm test --run test/file-manager/FileViewControls.spec.ts
mise exec node@22.16.0 -- pnpm typecheck
mise exec node@22.16.0 -- pnpm exec oxlint app/components/file-manager/FileViewControls.vue test/file-manager/FileViewControls.spec.ts
mise exec node@22.16.0 -- pnpm exec oxfmt --check app/components/file-manager/FileViewControls.vue test/file-manager/FileViewControls.spec.ts
```

Expected: focused tests pass, Nuxt typecheck exits 0, Oxlint exits 0, and Oxfmt reports correct formatting.

- [ ] **Step 6: Commit Task 2 with `commit-message en auto`**

Stage only:

```bash
git add app/components/file-manager/FileViewControls.vue test/file-manager/FileViewControls.spec.ts
```

Read the staged diff, normalize an English Conventional Commit message, and commit via `git commit -F`. Expected intent: `feat(file-manager)` because the controls expose the new search and sorting workflow.

---

### Task 3: Wire Visible Data, Selection, Navigation, and Empty States

**Files:**

- Modify: `app/components/FileManager.vue`
- Modify: `app/components/file-manager/FileList.vue`
- Modify: `test/file-manager/FileList.spec.ts`
- Modify: `test/file-manager/useFileSelection.spec.ts`
- Create: `test/file-manager/FileManager.spec.ts`

**Interfaces:**

- Consumes: `useFileView`, `FileViewControls`, existing `useFolderBrowser`, existing `useFileSelection`, and existing `FileList` events.
- Produces: `FileList` props `hasActiveSearch`, `searchQuery`, and `hasSourceItems`; `FileList` event `clear-search`; wrapped directory navigation that clears search while preserving sort state.

- [ ] **Step 1: Write failing FileList empty-state tests**

Update the `mountList` helper in `test/file-manager/FileList.spec.ts` to accept prop overrides and include:

```ts
const baseProps = {
  status: "success",
  folders,
  files,
  isSelectionMode: false,
  selectedFiles: new Set<string>(),
  allSelected: false,
  hasSelection: false,
  hasActiveSearch: false,
  searchQuery: "",
  hasSourceItems: true,
};

const mountList = (overrides: Partial<typeof baseProps> = {}) =>
  mount(FileList, {
    props: { ...baseProps, ...overrides },
    global: {
      stubs: {
        Button: ButtonStub,
        Card: defineComponent({
          name: "Card",
          setup(_, { slots }) {
            return () => h("div", slots.default?.());
          },
        }),
        ScrollArea: defineComponent({
          name: "ScrollArea",
          setup(_, { slots }) {
            return () => h("div", slots.default?.());
          },
        }),
      },
    },
  });
```

Adjust existing calls to `mountList()` and `mountList({ isSelectionMode: true })`, then add:

```ts
it("shows the ordinary empty state for an empty source directory", () => {
  const wrapper = mountList({ folders: [], files: [], hasSourceItems: false });
  expect(wrapper.text()).toContain("暂无文件");
  expect(wrapper.text()).not.toContain("没有找到");
});

it("shows and clears an active search with no visible results", async () => {
  const wrapper = mountList({
    folders: [],
    files: [],
    hasActiveSearch: true,
    searchQuery: "invoice",
    hasSourceItems: true,
  });

  expect(wrapper.text()).toContain("没有找到与“invoice”匹配的文件或文件夹");
  await wrapper.get("button").trigger("click");
  expect(wrapper.emitted("clear-search")).toHaveLength(1);
});
```

- [ ] **Step 2: Run FileList tests and verify RED**

Run:

```bash
mise exec node@22.16.0 -- pnpm test --run test/file-manager/FileList.spec.ts
```

Expected: FAIL because `FileList` does not accept the new props and does not render the search no-results state.

- [ ] **Step 3: Implement explicit FileList empty-state inputs and event**

Add props to `FileList.vue`:

```ts
hasActiveSearch: boolean;
searchQuery: string;
hasSourceItems: boolean;
```

Add the event signature:

```ts
(e: "clear-search"): void;
```

Replace the current single empty-state branch with:

```vue
<div
  v-else-if="
    props.hasActiveSearch && props.hasSourceItems && !props.folders.length && !props.files.length
  "
  class="py-8 text-center text-muted-foreground"
>
  <SearchX class="mx-auto mb-2 h-12 w-12 opacity-50" />
  <p>没有找到与“{{ props.searchQuery.trim() }}”匹配的文件或文件夹</p>
  <Button type="button" variant="link" class="mt-2" @click="emit('clear-search')">
    清除搜索
  </Button>
</div>

<div
  v-else-if="!props.folders.length && !props.files.length"
  class="py-8 text-center text-muted-foreground"
>
  <Folder class="mx-auto mb-2 h-12 w-12 opacity-50" />
  <p>暂无文件</p>
</div>
```

Import `SearchX` from `@lucide/vue`. Keep loading state precedence unchanged.

- [ ] **Step 4: Run FileList tests and verify GREEN**

Run the focused FileList test again. Expected: all FileList tests pass.

- [ ] **Step 5: Add a visible-file selection regression test**

Append to `test/file-manager/useFileSelection.spec.ts`:

```ts
it("selects only files in the reactive visible list", () => {
  const visibleFiles = ref(files);
  const selection = useFileSelection(visibleFiles);
  selection.toggleSelectionMode();

  visibleFiles.value = [files[1]];
  selection.toggleSelectAll();

  expect([...selection.selectedFiles.value]).toEqual(["b.png"]);
  expect(selection.allSelected.value).toBe(true);
});
```

Run the focused selection test. Expected: PASS against the existing composable, establishing that container wiring can safely pass `visibleFiles` without changing `useFileSelection.ts`.

- [ ] **Step 6: Write failing FileManager integration tests**

Create `test/file-manager/FileManager.spec.ts`. Stub `useFetch` before mounting, render the async component under `Suspense`, and use controlled child stubs to trigger public events:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, flushPromises, h, ref, Suspense } from "vue";
import { mount } from "@vue/test-utils";
import FileManager from "../../app/components/FileManager.vue";
import type { BlobFile, FilesResponse } from "../../app/components/file-manager/types";

const sourceFiles: BlobFile[] = [
  { pathname: "cat.png", contentType: "image/png", size: 2, uploadedAt: "2026-01-01" },
  { pathname: "dog.png", contentType: "image/png", size: 1, uploadedAt: "2026-01-02" },
];

const ControlsStub = defineComponent({
  name: "FileViewControls",
  props: ["searchQuery", "sortField", "sortDirection", "hasActiveSearch", "resultCount"],
  emits: ["update:search-query", "update:sort-field", "toggle-sort-direction", "clear-search"],
  setup(props, { emit }) {
    return () =>
      h("div", [
        h("span", { "data-search": "value" }, String(props.searchQuery)),
        h("button", {
          "data-action": "search-cat",
          onClick: () => emit("update:search-query", "cat"),
        }),
        h("button", {
          "data-action": "sort-size",
          onClick: () => emit("update:sort-field", "size"),
        }),
        h("button", {
          "data-action": "toggle-direction",
          onClick: () => emit("toggle-sort-direction"),
        }),
      ]);
  },
});

const ToolbarStub = defineComponent({
  name: "FileManagerToolbar",
  emits: ["navigate"],
  setup(_, { emit }) {
    return () =>
      h("button", { "data-action": "navigate-root", onClick: () => emit("navigate", -1) });
  },
});

const FileListStub = defineComponent({
  name: "FileList",
  props: ["folders", "files", "selectedFiles", "allSelected"],
  emits: ["navigate-folder", "toggle-select-all"],
  setup(props, { emit }) {
    return () =>
      h("div", [
        h(
          "span",
          { "data-files": "value" },
          (props.files as BlobFile[]).map((file) => file.pathname).join(","),
        ),
        h(
          "span",
          { "data-selected": "value" },
          [...(props.selectedFiles as Set<string>)].join(","),
        ),
        h("button", { "data-action": "select-all", onClick: () => emit("toggle-select-all") }),
        h("button", {
          "data-action": "navigate-folder",
          onClick: () => emit("navigate-folder", "docs"),
        }),
      ]);
  },
});

async function mountManager() {
  const allFolders = ref({ folders: ["docs"] });
  const data = ref<FilesResponse>({ folders: ["docs"], files: sourceFiles, currentPath: "" });
  vi.stubGlobal(
    "useFetch",
    vi
      .fn()
      .mockResolvedValueOnce({ data: allFolders, refresh: vi.fn() })
      .mockResolvedValueOnce({ data, refresh: vi.fn(), status: ref("success") }),
  );
  vi.stubGlobal("$fetch", vi.fn());

  const Host = defineComponent({
    setup: () => () => h(Suspense, null, { default: () => h(FileManager) }),
  });
  const wrapper = mount(Host, {
    global: {
      stubs: {
        FileViewControls: ControlsStub,
        FileManagerToolbar: ToolbarStub,
        FileList: FileListStub,
        UploadDialog: true,
        PreviewDialog: true,
        RenameDialog: true,
        MoveDialog: true,
        BatchMoveDialog: true,
      },
    },
  });
  await flushPromises();
  return wrapper;
}

describe("FileManager view workflow", () => {
  beforeEach(() => vi.unstubAllGlobals());

  it("filters visible files and selects only the search result", async () => {
    const wrapper = await mountManager();
    await wrapper.get('[data-action="search-cat"]').trigger("click");
    await wrapper.get('[data-action="select-all"]').trigger("click");

    expect(wrapper.get('[data-files="value"]').text()).toBe("cat.png");
    expect(wrapper.get('[data-selected="value"]').text()).toBe("cat.png");
  });

  it("clears selection on search changes but preserves it for sorting", async () => {
    const wrapper = await mountManager();
    await wrapper.get('[data-action="select-all"]').trigger("click");
    await wrapper.get('[data-action="sort-size"]').trigger("click");
    expect(wrapper.get('[data-selected="value"]').text()).toContain("cat.png");

    await wrapper.get('[data-action="search-cat"]').trigger("click");
    expect(wrapper.get('[data-selected="value"]').text()).toBe("");
  });

  it.each(["navigate-root", "navigate-folder"])("clears search after %s", async (action) => {
    const wrapper = await mountManager();
    await wrapper.get('[data-action="search-cat"]').trigger("click");
    await wrapper.get(`[data-action="${action}"]`).trigger("click");
    expect(wrapper.get('[data-search="value"]').text()).toBe("");
  });
});
```

- [ ] **Step 7: Run FileManager integration tests and verify RED**

Run:

```bash
mise exec node@22.16.0 -- pnpm test --run test/file-manager/FileManager.spec.ts
```

Expected: FAIL because `FileManager.vue` does not render `FileViewControls`, still passes raw files to selection and FileList, and does not clear search during navigation.

- [ ] **Step 8: Wire `useFileView` into FileManager**

Update `app/components/FileManager.vue` imports:

```ts
import { computed, watch } from "vue";
import FileViewControls from "./file-manager/FileViewControls.vue";
import { useFileView } from "../composables/file-manager/useFileView";
```

After the file `useFetch`, create the view state before selection:

```ts
const {
  searchQuery,
  sortField,
  sortDirection,
  visibleFolders,
  visibleFiles,
  hasActiveSearch,
  resultCount,
  clearSearch,
  toggleSortDirection,
} = useFileView(
  () => data.value?.folders ?? [],
  () => data.value?.files ?? [],
);

const hasSourceItems = computed(() =>
  Boolean(data.value?.folders.length || data.value?.files.length),
);
```

Change selection input from raw files to visible files:

```ts
} = useFileSelection(visibleFiles);

watch(searchQuery, clearSelection);
```

Add navigation wrappers after composable setup:

```ts
function handleNavigateFolder(folder: string) {
  navigateToFolder(folder);
  clearSearch();
}

function handleNavigatePath(index: number) {
  navigateToPath(index);
  clearSearch();
}
```

Render controls between toolbar and list:

```vue
<FileViewControls
  :search-query="searchQuery"
  :sort-field="sortField"
  :sort-direction="sortDirection"
  :has-active-search="hasActiveSearch"
  :result-count="resultCount"
  @update:search-query="searchQuery = $event"
  @update:sort-field="sortField = $event"
  @toggle-sort-direction="toggleSortDirection"
  @clear-search="clearSearch"
/>
```

Replace toolbar and list bindings:

```vue
<FileManagerToolbar ... @navigate="handleNavigatePath" />

<FileList
  :status="status"
  :folders="visibleFolders"
  :files="visibleFiles"
  :is-selection-mode="isSelectionMode"
  :selected-files="selectedFiles"
  :all-selected="allSelected"
  :has-selection="hasSelection"
  :has-active-search="hasActiveSearch"
  :search-query="searchQuery"
  :has-source-items="hasSourceItems"
  @navigate-folder="handleNavigateFolder"
  @clear-search="clearSearch"
  ...
/>
```

Retain all omitted existing props and events exactly as they are. Do not change mutation, preview, upload, dialog, API, or Toast wiring.

- [ ] **Step 9: Run all focused workflow tests and verify GREEN**

Run:

```bash
mise exec node@22.16.0 -- pnpm test --run \
  test/file-manager/useFileView.spec.ts \
  test/file-manager/FileViewControls.spec.ts \
  test/file-manager/FileList.spec.ts \
  test/file-manager/useFileSelection.spec.ts \
  test/file-manager/FileManager.spec.ts
```

Expected: all focused tests pass. If the async component test fails due to test harness setup, correct only the Suspense/stub harness until it exercises the real `FileManager` wiring; do not weaken product assertions.

- [ ] **Step 10: Run task-level static and regression checks**

Run:

```bash
mise exec node@22.16.0 -- pnpm exec oxfmt --check \
  app/components/FileManager.vue \
  app/components/file-manager/FileList.vue \
  test/file-manager/FileList.spec.ts \
  test/file-manager/useFileSelection.spec.ts \
  test/file-manager/FileManager.spec.ts
mise exec node@22.16.0 -- pnpm lint
mise exec node@22.16.0 -- pnpm typecheck
mise exec node@22.16.0 -- pnpm test --run
```

Expected: Oxfmt passes, Oxlint exits 0, Nuxt typecheck exits 0, and the complete Vitest suite passes with no failures.

- [ ] **Step 11: Commit Task 3 with `commit-message en auto`**

Stage only:

```bash
git add \
  app/components/FileManager.vue \
  app/components/file-manager/FileList.vue \
  test/file-manager/FileList.spec.ts \
  test/file-manager/useFileSelection.spec.ts \
  test/file-manager/FileManager.spec.ts
```

Read the staged diff, normalize an English Conventional Commit message, and commit via `git commit -F`. Expected intent: `feat(file-manager)` because this commit completes the searchable and sortable workflow.

---

### Task 4: Complete Production Verification

**Files:**

- Modify only if a verification command exposes a concrete issue: files already changed by Tasks 1-3.

**Interfaces:**

- Consumes: the complete search and sorting workflow from Tasks 1-3.
- Produces: verification evidence for formatting, lint, types, tests, Nuxt builds, Cloudflare compatibility, and Wrangler packaging.

- [ ] **Step 1: Run the complete project verification gate**

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

Expected: every command exits 0. Record the final Vitest file/test counts and note that both Nuxt builds and Wrangler dry-run complete without `node:events` validation errors.

- [ ] **Step 2: Inspect the final branch diff against main**

Run:

```bash
git diff --check main...HEAD
git diff --stat main...HEAD
git status --short --branch
```

Expected: no whitespace errors, only the design/plan and search-sort implementation files are changed, and the worktree is clean.

- [ ] **Step 3: Fix only verified issues with a new TDD cycle**

If a command fails because of product behavior, add a failing regression test that reproduces the failure, verify RED, implement the smallest correction, and rerun the failed command plus the full gate. If only formatting fails, run Oxfmt on the named files and review the resulting mechanical diff.

- [ ] **Step 4: Commit any verification-driven correction with `commit-message en auto`**

Only when Step 3 changes files, stage those exact files, read the staged diff, normalize one English Conventional Commit message, and commit via `git commit -F`. Do not create an empty verification commit.

---

## Final Acceptance Checklist

- [ ] Search matches current-folder folders and display filenames case-insensitively.
- [ ] Blank and whitespace-only searches remain inactive.
- [ ] Folder results stay above files and sort by name ascending.
- [ ] Files support all three fields in both directions with deterministic tie-breaking.
- [ ] Invalid dates behave as timestamp `0`.
- [ ] Search changes clear selection and select-all targets visible files only.
- [ ] Sorting preserves selected pathnames.
- [ ] Folder-row and breadcrumb navigation clear search but preserve sorting.
- [ ] Empty directory and no-search-results states are distinct.
- [ ] Search, clear, and sort direction controls have accessible names.
- [ ] No server API, R2 request, runtime dependency, or persistence behavior changed.
- [ ] Every implementation task has an English auto-generated Conventional Commit.
- [ ] Oxfmt, Oxlint, Nuxt typecheck, all tests, both builds, and Wrangler dry-run pass.
