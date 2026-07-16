import { onBeforeUnmount, onMounted, ref, toValue, type MaybeRefOrGetter, type Ref } from "vue";

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
type ExtractedDrop = { files: File[]; directoryCount: number };

function getDataTransfer(event: Event): DataTransfer | null {
  if (!("dataTransfer" in event)) return null;
  return (event as DragEventWithTransfer).dataTransfer;
}

function containsFiles(dataTransfer: DataTransfer | null): boolean {
  return Boolean(dataTransfer && Array.from(dataTransfer.types).includes("Files"));
}

function extractDrop(dataTransfer: DataTransfer): ExtractedDrop {
  const items = Array.from(dataTransfer.items ?? []);
  if (!items.length) {
    return { files: Array.from(dataTransfer.files ?? []), directoryCount: 0 };
  }

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

  function register(target: EventTarget): void {
    activeTarget = target;
    target.addEventListener("dragenter", handleDragEnter);
    target.addEventListener("dragover", handleDragOver);
    target.addEventListener("dragleave", handleDragLeave);
    target.addEventListener("drop", handleDrop);
    target.addEventListener("blur", resetDragState);
  }

  function unregister(): void {
    activeTarget?.removeEventListener("dragenter", handleDragEnter);
    activeTarget?.removeEventListener("dragover", handleDragOver);
    activeTarget?.removeEventListener("dragleave", handleDragLeave);
    activeTarget?.removeEventListener("drop", handleDrop);
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
