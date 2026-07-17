import type { BlobFile } from "../../components/file-manager/types";
import { getFileName } from "../../components/file-manager/utils";

export type DirectorySummary = {
  fileCount: number;
  imageCount: number;
  folderCount: number;
  totalSize: number;
  latestFile?: BlobFile;
};

type Translate = (key: string, values?: Record<string, unknown>) => string;

function getTimestamp(value: string): number {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function createFilePresentation(
  locale: string,
  translate: Translate,
  now: () => Date = () => new Date(),
) {
  const numberFormatter = new Intl.NumberFormat(locale);
  const sizeFormatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const relativeFormatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${numberFormatter.format(bytes)} B`;
    if (bytes < 1024 ** 2) return `${sizeFormatter.format(bytes / 1024)} kB`;
    if (bytes < 1024 ** 3) return `${sizeFormatter.format(bytes / 1024 ** 2)} MB`;
    return `${sizeFormatter.format(bytes / 1024 ** 3)} GB`;
  }

  function formatDate(value: string): string {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : dateFormatter.format(parsed);
  }

  function formatRelativeTime(value: string): string {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;

    const minutes = Math.round((parsed.getTime() - now().getTime()) / 60_000);
    if (Math.abs(minutes) < 60) return relativeFormatter.format(minutes, "minute");

    const hours = Math.round(minutes / 60);
    if (Math.abs(hours) < 24) return relativeFormatter.format(hours, "hour");

    return relativeFormatter.format(Math.round(hours / 24), "day");
  }

  function formatFileType(file: BlobFile): string {
    const filename = getFileName(file.pathname);
    const extension = filename.split(".").pop();
    if (extension && extension !== filename) return extension.toLocaleUpperCase(locale);

    return (
      file.contentType.split("/").pop()?.toLocaleUpperCase(locale) ?? translate("files.typeUnknown")
    );
  }

  function summarizeDirectory(
    folders: readonly string[],
    files: readonly BlobFile[],
  ): DirectorySummary {
    const latestFile = files.toSorted(
      (left, right) => getTimestamp(right.uploadedAt) - getTimestamp(left.uploadedAt),
    )[0];

    return {
      fileCount: files.length,
      imageCount: files.filter((file) => file.contentType.startsWith("image/")).length,
      folderCount: folders.length,
      totalSize: files.reduce((total, file) => total + file.size, 0),
      latestFile,
    };
  }

  return {
    formatSize,
    formatDate,
    formatRelativeTime,
    formatFileType,
    summarizeDirectory,
  };
}
