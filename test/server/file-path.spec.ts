import { describe, expect, it } from "vitest";
import { normalizeDirectoryPrefix, toRelativeFolderName } from "../../server/utils/file-path";

describe("file paths", () => {
  it.each([
    [undefined, ""],
    ["", ""],
    ["/", ""],
    ["/photos//2026/", "photos/2026/"],
    ["photos", "photos/"],
  ])("normalizes %j to %j", (input, expected) => {
    expect(normalizeDirectoryPrefix(input)).toBe(expected);
  });

  it("converts folded paths to direct child names", () => {
    expect(toRelativeFolderName("photos/2026/", "photos/")).toBe("2026");
    expect(toRelativeFolderName("docs/", "")).toBe("docs");
    expect(toRelativeFolderName("photos/", "photos/")).toBeNull();
  });
});
