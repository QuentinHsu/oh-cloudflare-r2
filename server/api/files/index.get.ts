import { blob } from "hub:blob";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const prefix = (query.prefix as string) || "";

  const { blobs } = await blob.list({ prefix });

  // 构建文件夹结构
  const folders = new Set<string>();
  const files: typeof blobs = [];

  for (const item of blobs) {
    const relativePath = prefix ? item.pathname.slice(prefix.length) : item.pathname;
    const parts = relativePath.split("/").filter(Boolean);

    if (parts.length > 1) {
      // 这是子文件夹中的文件，添加第一级文件夹
      folders.add(parts[0]);
    } else if (parts.length === 1) {
      // 这是当前目录的文件
      files.push(item);
    }
  }

  return {
    folders: Array.from(folders).toSorted(),
    files: files.toSorted(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
    ),
    currentPath: prefix,
  };
});
