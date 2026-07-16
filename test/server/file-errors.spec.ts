import { describe, expect, it } from "vitest";
import { FileDomainError, toApiFailure } from "../../server/utils/file-errors";

describe("file errors", () => {
  it("preserves safe domain details", () => {
    expect(
      toApiFailure(
        new FileDomainError("MOVE_PARTIALLY_COMPLETED", {
          source: "a.txt",
          destination: "b.txt",
        }),
      ),
    ).toEqual({
      statusCode: 409,
      body: {
        ok: false,
        error: {
          code: "MOVE_PARTIALLY_COMPLETED",
          message: "目标副本已创建，但源文件删除失败",
          details: { source: "a.txt", destination: "b.txt" },
        },
      },
    });
  });

  it("hides unknown exception details", () => {
    expect(toApiFailure(new Error("bucket secret"))).toEqual({
      statusCode: 500,
      body: {
        ok: false,
        error: { code: "STORAGE_READ_FAILED", message: "存储服务暂时不可用" },
      },
    });
  });
});
