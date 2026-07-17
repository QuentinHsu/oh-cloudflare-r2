import { describe, expect, it } from "vitest";
import { createFilePresentation } from "../../app/composables/file-manager/useFilePresentation";
import type { BlobFile } from "../../app/components/file-manager/types";

const files: BlobFile[] = [
  {
    pathname: "hero.png",
    contentType: "image/png",
    size: 1536,
    uploadedAt: "2026-07-17T08:00:00Z",
  },
  {
    pathname: "notes.txt",
    contentType: "text/plain",
    size: 512,
    uploadedAt: "2026-07-16T08:00:00Z",
  },
];

const translate = (key: string, values?: Record<string, unknown>) =>
  values ? `${key}:${JSON.stringify(values)}` : key;

describe("createFilePresentation", () => {
  it("summarizes unfiltered current-directory data", () => {
    const presentation = createFilePresentation(
      "en",
      translate,
      () => new Date("2026-07-17T09:00:00Z"),
    );

    expect(presentation.summarizeDirectory(["docs", "images"], files)).toEqual({
      fileCount: 2,
      imageCount: 1,
      folderCount: 2,
      totalSize: 2048,
      latestFile: files[0],
    });
  });

  it("formats bytes and dates using the active locale", () => {
    const en = createFilePresentation("en", translate);
    const zhCN = createFilePresentation("zh-CN", translate);

    expect(en.formatSize(1536)).toMatch(/1\.5\s?kB/i);
    expect(zhCN.formatDate("2026-07-17T08:00:00Z")).not.toBe(en.formatDate("2026-07-17T08:00:00Z"));
  });

  it("uses file extensions for readable types", () => {
    const presentation = createFilePresentation("en", translate);

    expect(presentation.formatFileType(files[0])).toBe("PNG");
    expect(presentation.formatFileType(files[1])).toBe("TXT");
  });

  it("formats recent values as relative time", () => {
    const presentation = createFilePresentation(
      "en",
      translate,
      () => new Date("2026-07-17T09:00:00Z"),
    );

    expect(presentation.formatRelativeTime("2026-07-17T08:00:00Z")).toContain("hour");
  });
});
