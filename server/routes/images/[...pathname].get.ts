import { blob } from "hub:blob";
import { respondFileError } from "../../utils/file-api";
import { parseFilePath } from "../../utils/file-path";

export default eventHandler(async (event) => {
  try {
    const pathname = parseFilePath(getRouterParam(event, "pathname"));
    setHeader(event, "Content-Security-Policy", "default-src 'none';");
    return blob.serve(event, pathname);
  } catch (error: unknown) {
    return respondFileError(event, error);
  }
});
