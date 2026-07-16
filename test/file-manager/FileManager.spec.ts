import { beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, ref, Suspense } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import FileManager from "../../app/components/FileManager.vue";
import type { BlobFile, FilesResponse } from "../../app/components/file-manager/types";

const sourceFiles: BlobFile[] = [
  {
    pathname: "cat.png",
    contentType: "image/png",
    size: 2,
    uploadedAt: "2026-01-01",
  },
  {
    pathname: "dog.png",
    contentType: "image/png",
    size: 1,
    uploadedAt: "2026-01-02",
  },
];

type Refresh = () => Promise<unknown>;

const ControlsStub = defineComponent({
  name: "FileViewControls",
  props: ["searchQuery", "sortField", "sortDirection", "hasActiveSearch", "resultCount"],
  emits: ["update:search-query", "update:sort-field", "toggle-sort-direction", "clear-search"],
  setup(props, { emit }) {
    return () =>
      h("div", [
        h("span", { "data-search": "value" }, String(props.searchQuery)),
        h("span", { "data-sort-field": "value" }, String(props.sortField)),
        h("span", { "data-sort-direction": "value" }, String(props.sortDirection)),
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
        h("button", {
          "data-action": "select-all",
          onClick: () => emit("toggle-select-all"),
        }),
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
      .mockResolvedValueOnce({ data: allFolders, refresh: vi.fn<Refresh>() })
      .mockResolvedValueOnce({ data, refresh: vi.fn<Refresh>(), status: ref("success") }),
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
    await wrapper.get('[data-action="toggle-direction"]').trigger("click");
    expect(wrapper.get('[data-selected="value"]').text()).toContain("cat.png");

    await wrapper.get('[data-action="search-cat"]').trigger("click");
    expect(wrapper.get('[data-selected="value"]').text()).toBe("");
  });

  it.each(["navigate-root", "navigate-folder"])("clears search after %s", async (action) => {
    const wrapper = await mountManager();
    await wrapper.get('[data-action="search-cat"]').trigger("click");
    await wrapper.get('[data-action="sort-size"]').trigger("click");
    await wrapper.get('[data-action="toggle-direction"]').trigger("click");
    await wrapper.get(`[data-action="${action}"]`).trigger("click");
    expect(wrapper.get('[data-search="value"]').text()).toBe("");
    expect(wrapper.get('[data-sort-field="value"]').text()).toBe("size");
    expect(wrapper.get('[data-sort-direction="value"]').text()).toBe("asc");
  });
});
