import { blob } from "hub:blob";
import { createBlobFileRepository } from "../../repositories/blob-file-repository";
import { respondFileError, success } from "../../utils/file-api";

const repository = createBlobFileRepository(blob);

export default defineEventHandler(async (event) => {
  try {
    const { blobs } = await repository.list();
    const folders = new Set<string>();

    for (const item of blobs) {
      const parts = item.pathname.split("/");
      for (let index = 1; index < parts.length; index += 1) {
        folders.add(parts.slice(0, index).join("/"));
      }
    }

    return success({ folders: [...folders].toSorted() });
  } catch (error: unknown) {
    return respondFileError(event, error);
  }
});
