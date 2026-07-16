import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, ref, Suspense } from "vue";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
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
type Request = (url: string, options?: unknown) => Promise<unknown>;

const request = vi.fn<Request>();
const mountedWrappers: VueWrapper[] = [];

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
  vi.stubGlobal("$fetch", request);

  const Host = defineComponent({
    setup: () => () => h(Suspense, null, { default: () => h(FileManager) }),
  });
  const wrapper = mount(Host, {
    global: {
      stubs: {
        FileViewControls: ControlsStub,
        FileManagerToolbar: ToolbarStub,
        FileList: FileListStub,
        FileDropOverlay: DropOverlayStub,
        UploadDialog: UploadDialogStub,
        PreviewDialog: true,
        RenameDialog: true,
        MoveDialog: true,
        BatchMoveDialog: true,
      },
    },
  });
  await flushPromises();
  mountedWrappers.push(wrapper);
  return wrapper;
}

describe("FileManager view workflow", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    request.mockReset();
    request.mockResolvedValue(undefined);
  });

  afterEach(() => {
    mountedWrappers.splice(0).forEach((wrapper) => wrapper.unmount());
    vi.unstubAllGlobals();
  });

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
});
