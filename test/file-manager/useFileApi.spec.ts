import { describe, expect, it, vi } from "vitest";
import { createFileApi, readFileApiError } from "../../app/composables/file-manager/useFileApi";

describe("file API", () => {
  it("returns successful data", async () => {
    const request = vi.fn<(url: string, options?: Record<string, unknown>) => Promise<unknown>>();
    request.mockResolvedValue({
      ok: true,
      data: { operation: { action: "delete", path: "a.txt" } },
    });

    await expect(
      createFileApi(request).execute({ action: "delete", path: "a.txt" }),
    ).resolves.toEqual({ operation: { action: "delete", path: "a.txt" } });
  });

  it("throws the stable API error from a rejected response", async () => {
    const request = vi.fn<(url: string, options?: Record<string, unknown>) => Promise<unknown>>();
    request.mockRejectedValue({
      data: {
        ok: false,
        error: { code: "DESTINATION_EXISTS", message: "目标文件已存在" },
      },
    });

    await expect(
      createFileApi(request).execute({
        action: "move",
        source: "a.txt",
        destination: "b.txt",
      }),
    ).rejects.toMatchObject({ code: "DESTINATION_EXISTS" });
  });

  it("decodes nested authorization failures and hides unknown errors", () => {
    expect(
      readFileApiError({
        data: {
          data: { ok: false, error: { code: "FORBIDDEN", message: "无权执行此操作" } },
        },
      }),
    ).toMatchObject({ code: "FORBIDDEN" });
    expect(readFileApiError(new Error("private"))).toEqual({
      code: "STORAGE_READ_FAILED",
      message: "Storage is temporarily unavailable",
    });
  });
});
