import { blob } from "hub:blob";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const prefix = normalizeDirectoryPrefix(query.prefix);

  const { blobs, folders: foldedFolders } = await listAllBlobs(blob, {
    prefix,
    folded: true,
  });
  const folders = new Set(
    foldedFolders
      .map((folder) => toRelativeFolderName(folder, prefix))
      .filter((folder): folder is string => folder !== null),
  );

  return {
    folders: Array.from(folders).toSorted(),
    files: blobs.toSorted(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
    ),
    currentPath: prefix,
  };
});
