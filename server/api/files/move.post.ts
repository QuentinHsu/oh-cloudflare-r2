import { blob } from 'hub:blob';

export default defineEventHandler(async event => {
  const { oldPath, newPath } = await readBody(event);

  if (!oldPath || !newPath) {
    throw createError({
      message: 'oldPath and newPath are required',
      statusCode: 400,
    });
  }

  if (oldPath === newPath) {
    throw createError({
      message: 'Source and destination paths are the same',
      statusCode: 400,
    });
  }

  try {
    // 1. 获取原文件
    const file = await blob.get(oldPath);
    if (!file) {
      throw createError({ message: 'Source file not found', statusCode: 404 });
    }

    // 2. 复制到新位置
    await blob.put(newPath, file, {
      contentType: file.type,
    });

    // 3. 删除原文件
    await blob.del(oldPath);

    return { newPath, oldPath, success: true };
  } catch (error: unknown) {
    if (error instanceof Error && 'statusCode' in error) throw error;
    throw createError({
      message: error instanceof Error ? error.message : 'Failed to move file',
      statusCode: 500,
    });
  }
});
