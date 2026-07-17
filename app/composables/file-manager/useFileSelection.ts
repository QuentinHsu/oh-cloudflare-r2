import { computed, ref, toValue, type MaybeRefOrGetter } from "vue";
import type { BlobFile } from "../../components/file-manager/types";

export function useFileSelection(files: MaybeRefOrGetter<readonly BlobFile[]>) {
  const selectedFiles = ref(new Set<string>());
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

  function replaceSelection(paths: Iterable<string>) {
    selectedFiles.value = new Set(paths);
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
    hasSelection,
    allSelected,
    clearSelection,
    replaceSelection,
    toggleFileSelection,
    toggleSelectAll,
  };
}
