import type { ApiFailure, FileErrorCode } from "../../shared/types/files";

const ERROR_DEFINITIONS: Record<FileErrorCode, { statusCode: number; message: string }> = {
  INVALID_PATH: { statusCode: 400, message: "文件路径无效" },
  INVALID_FILE: { statusCode: 400, message: "文件无效" },
  SOURCE_NOT_FOUND: { statusCode: 404, message: "源文件不存在" },
  DESTINATION_EXISTS: { statusCode: 409, message: "目标文件已存在" },
  SOURCE_EQUALS_DESTINATION: { statusCode: 400, message: "源路径与目标路径相同" },
  STORAGE_READ_FAILED: { statusCode: 500, message: "存储服务暂时不可用" },
  STORAGE_WRITE_FAILED: { statusCode: 500, message: "文件写入失败" },
  STORAGE_DELETE_FAILED: { statusCode: 500, message: "文件删除失败" },
  MOVE_PARTIALLY_COMPLETED: {
    statusCode: 409,
    message: "目标副本已创建，但源文件删除失败",
  },
  UNAUTHORIZED: { statusCode: 401, message: "请先登录" },
  FORBIDDEN: { statusCode: 403, message: "无权执行此操作" },
};

export class FileDomainError extends Error {
  constructor(
    readonly code: FileErrorCode,
    readonly details?: Record<string, unknown>,
  ) {
    super(code);
  }
}

export function isFileDomainError(error: unknown): error is FileDomainError {
  return error instanceof FileDomainError;
}

export function toApiFailure(error: unknown): { statusCode: number; body: ApiFailure } {
  const domainError = isFileDomainError(error) ? error : new FileDomainError("STORAGE_READ_FAILED");
  const definition = ERROR_DEFINITIONS[domainError.code];

  return {
    statusCode: definition.statusCode,
    body: {
      ok: false,
      error: {
        code: domainError.code,
        message: definition.message,
        ...(domainError.details ? { details: domainError.details } : {}),
      },
    },
  };
}
