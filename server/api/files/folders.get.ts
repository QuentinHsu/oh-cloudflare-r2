import { blob } from 'hub:blob';

export default defineEventHandler(async () => {
  const { blobs } = await blob.list();

  // 收集所有唯一的文件夹路径
  const folders = new Set<string>();

  for (const item of blobs) {
    const parts = item.pathname.split('/');
    // 构建所有层级的路径
    let path = '';
    for (let i = 0; i < parts.length - 1; i++) {
      path += `${parts[i]}/`;
      folders.add(path);
    }
  }

  return {
    folders: Array.from(folders).sort(),
  };
});
