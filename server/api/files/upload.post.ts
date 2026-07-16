import { blob } from "hub:blob";
import { createBlobFileRepository } from "../../repositories/blob-file-repository";
import { createFileService } from "../../services/file-service";
import { respondFileError, success, toClientBlobFile } from "../../utils/file-api";

const service = createFileService(createBlobFileRepository(blob));

export default defineEventHandler(async (event) => {
  try {
    const formData = await readFormData(event);
    const directory = formData.get("directory");
    const files = formData.getAll("files").filter((value): value is File => value instanceof File);
    const uploaded = await service.upload(directory, files);

    return success({ files: uploaded.map(toClientBlobFile) });
  } catch (error: unknown) {
    return respondFileError(event, error);
  }
});
