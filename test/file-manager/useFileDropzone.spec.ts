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

type EntryStub = { isDirectory: boolean; isFile: boolean };

function createItem(file: File | null, entry?: EntryStub): DataTransferItem {
  return {
    kind: "file",
    type: file?.type ?? "",
    getAsFile: () => file,
    webkitGetAsEntry: () => entry ?? null,
  } as DataTransferItem;
}

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
});
