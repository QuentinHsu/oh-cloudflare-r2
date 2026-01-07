import { blob } from 'hub:blob';

export default defineEventHandler(async event => {
  const query = getQuery(event);
  const prefix = (query.prefix as string) || '';

  const formData = await readFormData(event);
  const files = formData.getAll('files') as File[];

  if (!files.length) {
    throw createError({ message: 'No files provided', statusCode: 400 });
  }

  const results: Awaited<ReturnType<typeof blob.put>>[] = [];

  for (const file of files) {
    const pathname = prefix ? `${prefix}${file.name}` : file.name;

    const result = await blob.put(pathname, file, {
      contentType: file.type,
    });

    results.push(result);
  }

  return results;
});
