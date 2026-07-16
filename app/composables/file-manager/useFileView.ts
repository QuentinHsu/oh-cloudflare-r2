import { computed, ref, toValue, type ComputedRef, type MaybeRefOrGetter, type Ref } from "vue";
import type { BlobFile } from "../../components/file-manager/types";
import { getFileName } from "../../components/file-manager/utils";

export type SortField = "name" | "uploadedAt" | "size";
export type SortDirection = "asc" | "desc";

export type UseFileViewReturn = {
  searchQuery: Ref<string>;
  sortField: Ref<SortField>;
  sortDirection: Ref<SortDirection>;
  visibleFolders: ComputedRef<string[]>;
  visibleFiles: ComputedRef<BlobFile[]>;
  hasActiveSearch: ComputedRef<boolean>;
  resultCount: ComputedRef<number>;
  clearSearch: () => void;
  toggleSortDirection: () => void;
};

function getTimestamp(value: string): number {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function useFileView(
  folders: MaybeRefOrGetter<readonly string[]>,
  files: MaybeRefOrGetter<readonly BlobFile[]>,
): UseFileViewReturn {
  const searchQuery = ref("");
  const sortField = ref<SortField>("uploadedAt");
  const sortDirection = ref<SortDirection>("desc");
  const collator = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: "base",
  });
  const normalizedQuery = computed(() => searchQuery.value.trim().toLocaleLowerCase());
  const hasActiveSearch = computed(() => normalizedQuery.value.length > 0);

  function matchesSearch(name: string): boolean {
    return name.toLocaleLowerCase().includes(normalizedQuery.value);
  }

  const visibleFolders = computed(() =>
    toValue(folders)
      .filter((folder) => !hasActiveSearch.value || matchesSearch(folder))
      .toSorted((left, right) => collator.compare(left, right)),
  );

  function compareFiles(left: BlobFile, right: BlobFile): number {
    const leftName = getFileName(left.pathname);
    const rightName = getFileName(right.pathname);
    let primaryResult = 0;

    if (sortField.value === "name") {
      primaryResult = collator.compare(leftName, rightName);
    }

    if (sortField.value === "uploadedAt") {
      primaryResult = getTimestamp(left.uploadedAt) - getTimestamp(right.uploadedAt);
    }

    if (sortField.value === "size") {
      primaryResult = left.size - right.size;
    }

    if (primaryResult !== 0) {
      return sortDirection.value === "asc" ? primaryResult : -primaryResult;
    }

    const filenameResult = collator.compare(leftName, rightName);
    return filenameResult || collator.compare(left.pathname, right.pathname);
  }

  const visibleFiles = computed(() =>
    toValue(files)
      .filter((file) => !hasActiveSearch.value || matchesSearch(getFileName(file.pathname)))
      .toSorted(compareFiles),
  );

  const resultCount = computed(() => visibleFolders.value.length + visibleFiles.value.length);

  function clearSearch(): void {
    searchQuery.value = "";
  }

  function toggleSortDirection(): void {
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
