import type { H3Event } from "h3";
import { afterEach, describe, expect, it, vi } from "vitest";
import { respondFileError, success, toClientBlobFile } from "../../server/utils/file-api";
import { FileDomainError } from "../../server/utils/file-errors";

describe("file API helpers", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("wraps successful data", () => {
    expect(success({ value: 1 })).toEqual({ ok: true, data: { value: 1 } });
  });

  it("sets the status and returns a stable failure", () => {
    const event = {} as H3Event;
    vi.stubGlobal("setResponseStatus", vi.fn<(event: H3Event, statusCode: number) => void>());

    expect(respondFileError(event, new FileDomainError("SOURCE_NOT_FOUND"))).toMatchObject({
      ok: false,
      error: { code: "SOURCE_NOT_FOUND" },
    });
    expect(setResponseStatus).toHaveBeenCalledWith(event, 404);
  });

  it("converts storage metadata to the browser contract", () => {
    expect(
      toClientBlobFile({
        pathname: "a.txt",
        contentType: undefined,
        size: undefined,
        httpEtag: undefined,
        uploadedAt: new Date("2026-01-01T00:00:00.000Z"),
        httpMetadata: {},
        customMetadata: {},
      }),
    ).toEqual({
      pathname: "a.txt",
      contentType: "application/octet-stream",
      size: 0,
      uploadedAt: "2026-01-01T00:00:00.000Z",
    });
  });
});
