import { blob } from "hub:blob";
import { createBlobFileRepository } from "../../repositories/blob-file-repository";
import { respondFileError, success, toClientBlobFile } from "../../utils/file-api";
import { parseDirectoryPath, toBlobPrefix, toRelativeFolderName } from "../../utils/file-path";

const repository = createBlobFileRepository(blob);

export default defineEventHandler(async (event) => {
  try {
    const path = parseDirectoryPath(getQuery(event).path);
    const prefix = toBlobPrefix(path);
    const { blobs, folders: foldedFolders } = await repository.list({ prefix, folded: true });
    const folders = [
      ...new Set(
        foldedFolders
          .map((folder) => toRelativeFolderName(folder, prefix))
          .filter((folder): folder is string => folder !== null),
      ),
    ].toSorted();
    const files = blobs
      .toSorted((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())
      .map(toClientBlobFile);

    return success({ folders, files, currentPath: path });
  } catch (error: unknown) {
    return respondFileError(event, error);
  }
});
