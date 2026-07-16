import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseBatchOperations, parseFileOperation } from "../../server/utils/file-contracts";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("file request contracts", () => {
  it("parses move and delete operations", () => {
    expect(parseFileOperation({ action: "move", source: "a.txt", destination: "b.txt" })).toEqual({
      action: "move",
      source: "a.txt",
      destination: "b.txt",
    });
    expect(parseFileOperation({ action: "delete", path: "a.txt" })).toEqual({
      action: "delete",
      path: "a.txt",
    });
  });

  it.each([
    null,
    {},
    { action: "copy", path: "a.txt" },
    { action: "delete" },
    { action: "move", source: "a.txt" },
  ])("rejects malformed operation %j", (operation) => {
    expect(() => parseFileOperation(operation)).toThrow("INVALID_FILE");
  });

  it("requires an operations array for batches", () => {
    expect(parseBatchOperations({ operations: [{ action: "delete", path: "a.txt" }] })).toEqual([
      { action: "delete", path: "a.txt" },
    ]);
    expect(() => parseBatchOperations({ operations: "invalid" })).toThrow("INVALID_FILE");
  });

  it("keeps blob access out of management handlers", () => {
    for (const path of [
      "server/api/files/index.get.ts",
      "server/api/files/folders.get.ts",
      "server/api/files/upload.post.ts",
      "server/api/files/operations.post.ts",
      "server/api/files/batch.post.ts",
    ]) {
      expect(read(path)).not.toMatch(/blob\.(list|get|put|del|delete)/);
    }
  });

  it("removes legacy move and pathname-delete handlers", () => {
    expect(existsSync(resolve(process.cwd(), "server/api/files/move.post.ts"))).toBe(false);
    expect(existsSync(resolve(process.cwd(), "server/api/files/[...pathname].delete.ts"))).toBe(
      false,
    );
  });
});
