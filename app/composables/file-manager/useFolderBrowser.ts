import { computed, ref, toValue, type MaybeRefOrGetter } from "vue";
import { buildFolderTree, getExpandedParentPaths } from "../../components/file-manager/utils";

export function useFolderBrowser(folders: MaybeRefOrGetter<readonly string[]>) {
  const currentPath = ref("");
  const expandedFolders = ref<string[]>([]);
  const pathParts = computed(() => currentPath.value.split("/").filter(Boolean));
  const folderTree = computed(() => buildFolderTree(toValue(folders)));

  function navigateToFolder(folder: string) {
    currentPath.value = [...pathParts.value, folder].join("/");
  }

  function navigateToPath(index: number) {
    currentPath.value = index === -1 ? "" : pathParts.value.slice(0, index + 1).join("/");
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
