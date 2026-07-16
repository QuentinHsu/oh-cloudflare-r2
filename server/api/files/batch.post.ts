import { blob } from "hub:blob";
import { createBlobFileRepository } from "../../repositories/blob-file-repository";
import { createFileService } from "../../services/file-service";
import { respondFileError, success } from "../../utils/file-api";
import { parseBatchOperations } from "../../utils/file-contracts";

const service = createFileService(createBlobFileRepository(blob));

export default defineEventHandler(async (event) => {
  try {
    const operations = parseBatchOperations(await readBody(event));
    return success(await service.batch(operations));
  } catch (error: unknown) {
    return respondFileError(event, error);
  }
});
