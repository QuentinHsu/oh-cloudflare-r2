import { blob } from "hub:blob";

export default defineEventHandler(async (event) => {
  const { oldPath, newPath } = await readBody(event);

  if (!oldPath || !newPath) {
    throw createError({ statusCode: 400, message: "oldPath and newPath are required" });
  }

  if (oldPath === newPath) {
    throw createError({ statusCode: 400, message: "Source and destination paths are the same" });
  }

  try {
    // 1. 获取原文件
    const file = await blob.get(oldPath);
    if (!file) {
      throw createError({ statusCode: 404, message: "Source file not found" });
    }

    // 2. 复制到新位置
    await blob.put(newPath, file, {
      contentType: file.type,
    });

    // 3. 删除原文件
    await blob.del(oldPath);

    return { success: true, oldPath, newPath };
  } catch (error: any) {
    if (error.statusCode) throw error;
    throw createError({ statusCode: 500, message: error.message || "Failed to move file" });
  }
});
