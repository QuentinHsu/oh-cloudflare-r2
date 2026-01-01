export async function postDeleteFolder(prefix: string) {
  return useAPI<void>('/api/blob/delete-folder', {
    body: JSON.stringify({ prefix }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });
}

export async function postDeleteBlob(pathnames: string[]) {
  return useAPI<void>('/api/blob/delete', {
    body: JSON.stringify({ pathnames }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });
}
