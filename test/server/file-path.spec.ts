import { describe, expect, it } from "vitest";
import {
  MAX_FILE_NAME_BYTES,
  MAX_FILE_PATH_BYTES,
  joinFilePath,
  parseDirectoryPath,
  parseFilePath,
  toRelativeFolderName,
} from "../../server/utils/file-path";

describe("file paths", () => {
  it.each([
    [undefined, ""],
    ["", ""],
    ["photos", "photos"],
    ["photos/2026", "photos/2026"],
  ])("accepts canonical directory %j", (input, expected) => {
    expect(parseDirectoryPath(input)).toBe(expected);
  });

  it.each(["/photos", "photos/", "photos//2026", "photos\\2026", ".", "..", "a/../b", "a\u0000b"])(
    "rejects invalid directory %j",
    (input) => {
      expect(() => parseDirectoryPath(input)).toThrow("INVALID_PATH");
    },
  );

  it("requires a non-empty file path", () => {
    expect(parseFilePath("photos/cat.png")).toBe("photos/cat.png");
    expect(() => parseFilePath("")).toThrow("INVALID_PATH");
  });

  it("enforces UTF-8 byte limits", () => {
    expect(() => parseFilePath("a".repeat(MAX_FILE_NAME_BYTES + 1))).toThrow("INVALID_PATH");
    const oversizedPath = `${"a/".repeat(MAX_FILE_PATH_BYTES / 2)}x`;
    expect(() => parseFilePath(oversizedPath)).toThrow("INVALID_PATH");
  });

  it("joins a validated directory and filename", () => {
    expect(joinFilePath("photos", "cat.png")).toBe("photos/cat.png");
    expect(joinFilePath("", "cat.png")).toBe("cat.png");
  });

  it("converts folded paths to direct child names", () => {
    expect(toRelativeFolderName("photos/2026/", "photos/")).toBe("2026");
    expect(toRelativeFolderName("docs/", "")).toBe("docs");
    expect(toRelativeFolderName("photos/", "photos/")).toBeNull();
  });
});
