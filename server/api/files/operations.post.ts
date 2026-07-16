import { blob } from "hub:blob";
import { createBlobFileRepository } from "../../repositories/blob-file-repository";
import { createFileService } from "../../services/file-service";
import { respondFileError, success } from "../../utils/file-api";
import { parseFileOperation } from "../../utils/file-contracts";

const service = createFileService(createBlobFileRepository(blob));

export default defineEventHandler(async (event) => {
  try {
    const operation = parseFileOperation(await readBody(event));
    await service.execute(operation);
    return success({ operation });
  } catch (error: unknown) {
    return respondFileError(event, error);
  }
});
