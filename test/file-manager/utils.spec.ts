import { describe, expect, it } from "vitest";
import {
  buildDestinationPath,
  buildFileLink,
  buildFolderTree,
  getExpandedParentPaths,
  getFileName,
  getParentDirectory,
  normalizeDirectoryPath,
} from "../../app/components/file-manager/utils";

describe("file-manager utils", () => {
  it("normalizes directory paths without inventing segments", () => {
    expect(normalizeDirectoryPath(" /photos//2026/ ")).toBe("photos/2026");
    expect(normalizeDirectoryPath("///")).toBe("");
  });

  it("derives file names, parent directories, and destination paths", () => {
    expect(getFileName("photos/cat.png")).toBe("cat.png");
    expect(getFileName("")).toBe("");
    expect(getParentDirectory("photos/cat.png")).toBe("photos");
    expect(getParentDirectory("cat.png")).toBe("");
    expect(buildDestinationPath(" /archive//2026/ ", "cat.png")).toBe("archive/2026/cat.png");
    expect(buildDestinationPath("", "cat.png")).toBe("cat.png");
  });

  it("builds a sorted tree from duplicate and unordered folder paths", () => {
    expect(buildFolderTree(["photos/dogs", "docs", "photos/cats", "photos/cats"])).toEqual([
      { name: "docs", path: "docs", children: [] },
      {
        name: "photos",
        path: "photos",
        children: [
          { name: "cats", path: "photos/cats", children: [] },
          { name: "dogs", path: "photos/dogs", children: [] },
        ],
      },
    ]);
  });

  it("returns every parent path in expansion order", () => {
    expect(getExpandedParentPaths("photos/2026/events/")).toEqual([
      "photos",
      "photos/2026",
      "photos/2026/events",
    ]);
    expect(getExpandedParentPaths("")).toEqual([]);
  });

  it("builds raw and Markdown links", () => {
    expect(buildFileLink("https://cdn.example.com/", "photos/cat.png", "raw")).toBe(
      "https://cdn.example.com/api/blob/photos/cat.png",
    );
    expect(buildFileLink("https://cdn.example.com", "photos/cat.png", "markdown")).toBe(
      "![cat.png](https://cdn.example.com/api/blob/photos/cat.png)",
    );
  });
});
